import os
import json
import base64
import io
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from dotenv import load_dotenv
from pydantic import BaseModel
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import google.generativeai as genai

load_dotenv()
app = FastAPI()

# INCREASE TIMEOUTS & ALLOW EVERYTHING
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    question: str
    context: str


def get_optimal_model():
    """Finds the best available Google Model"""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key: return None
    genai.configure(api_key=api_key)
    try:
        # Check available models
        models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]

        # Priority: Fast > Stable > Legacy
        for m in ['models/gemini-2.5-flash', 'models/gemini-1.5-flash', 'models/gemini-pro']:
            if m in models: return genai.GenerativeModel(m)

        return genai.GenerativeModel(models[0]) if models else None
    except:
        return genai.GenerativeModel('gemini-1.5-flash')


@app.get("/")
def home():
    return {"status": "alive", "message": "Backend is running"}


@app.post("/chat")
async def chat_with_syllabus(request: ChatRequest):
    # Truncate context to prevent network timeout on large PDFs
    safe_context = request.context[:20000]

    model = get_optimal_model()
    if not model: return {"answer": "AI is currently sleeping. Try again in 1 minute."}

    try:
        # Chat instruction
        prompt = f"""
        You are a helpful student assistant. 
        Answer the question based strictly on the syllabus below.
        Keep answers short and direct.

        CONTEXT: {safe_context}
        QUESTION: {request.question}
        """
        response = model.generate_content(prompt)
        return {"answer": response.text}
    except Exception as e:
        print(f"Chat Error: {e}")
        return {"answer": "I'm having trouble reading the syllabus right now."}


@app.post("/process-syllabus")
async def process_syllabus(files: List[UploadFile] = File(...), user_notes: str = Form(""),
                           preference: str = Form("Any")):
    combined_text = ""
    try:
        for f in files:
            pdf_bytes = await f.read()
            reader = PdfReader(io.BytesIO(pdf_bytes))
            for page in reader.pages:
                text = page.extract_text()
                if text: combined_text += text + "\n"
    except:
        raise HTTPException(status_code=400, detail="Invalid PDF")

    # --- THE LOGIC FIX: AGGRESSIVE PROMPT ---
    prompt = f"""
    ROLE: You are a University Scheduler.
    TASK: Create a SINGLE, CONFLICT-FREE weekly timetable for one student.

    CRITICAL RULES:
    1. The syllabus lists ALL possible groups (Group A, Group B, etc.). DO NOT LIST THEM ALL.
    2. YOU MUST CHOOSE EXACTLY ONE SLOT per subject.
    3. If a subject has options (e.g., "Mon 10am OR Tue 2pm"), pick the one that fits best.
    4. USER PREFERENCE: {preference} (Try to fit this preference).
    5. USER NOTES: {user_notes}

    DATA: {combined_text[:30000]}

    OUTPUT JSON ONLY (No markdown, no intro):
    {{ 
        "class_timetable": [ 
            {{"subject": "Math 101", "day": "Monday", "time": "10:00 - 12:00", "venue": "Room 5"}} 
        ], 
        "exam_calendar": [ 
            {{"title": "Math Exam", "date": "2024-06-01"}} 
        ], 
        "study_plan": {{ 
            "explanation": "I selected Group A for Math to leave your Friday free as requested." 
        }} 
    }}
    """

    model = get_optimal_model()
    if not model: raise HTTPException(status_code=500, detail="No AI model found")

    try:
        response = model.generate_content(prompt)
        clean_json = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_json)
    except Exception as e:
        print(f"Parsing Error: {e}")
        data = {"class_timetable": [], "exam_calendar": [], "study_plan": {"explanation": "Could not parse schedule."}}

    # PDF Generation
    def make_pdf(lines):
        b = io.BytesIO()
        c = canvas.Canvas(b, pagesize=letter)
        y = 750
        for line in lines:
            c.drawString(40, y, str(line))
            y -= 20
        c.save()
        return base64.b64encode(b.getvalue()).decode()

    # Robust Parsing
    timetable_lines = []
    for x in data.get('class_timetable', []):
        timetable_lines.append(f"{x.get('day', '?')} {x.get('time', '?')}: {x.get('subject', '?')}")

    exam_lines = []
    for x in data.get('exam_calendar', []):
        exam_lines.append(f"{x.get('date', '?')}: {x.get('title', '?')}")

    return {
        "message": "Success",
        "raw_text": combined_text,
        "ai_response": data,
        "files": {
            "timetable_pdf": make_pdf(timetable_lines),
            "exams_pdf": make_pdf(exam_lines),
            "strategy_pdf": make_pdf([data.get('study_plan', {}).get('explanation', '')])
        }
    }