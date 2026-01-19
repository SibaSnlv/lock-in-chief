import os
import json
import base64
import io
import logging
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from dotenv import load_dotenv
from pydantic import BaseModel
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import google.generativeai as genai

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()
app = FastAPI()

# 1. ALLOW LARGE REQUESTS & ALL ORIGINS
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


# 2. ROBUST MODEL FINDER
def get_optimal_model():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        logger.error("Google API Key missing")
        return None
    genai.configure(api_key=api_key)

    try:
        models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        logger.info(f"Available Models: {models}")

        # Priority: Fast > Stable
        priorities = ['models/gemini-2.5-flash', 'models/gemini-1.5-flash', 'models/gemini-pro']
        for p in priorities:
            if p in models: return genai.GenerativeModel(p)

        return genai.GenerativeModel(models[0]) if models else None
    except Exception as e:
        logger.error(f"Model scan failed: {e}")
        return genai.GenerativeModel('gemini-1.5-flash')


@app.get("/")
def home():
    return {"status": "alive", "message": "Backend is online"}


@app.post("/chat")
async def chat_with_syllabus(request: ChatRequest):
    try:
        # FIX 1: AGGRESSIVE TRUNCATION
        # We only send the first 15,000 chars to keep the chat fast.
        # Sending 50k+ chars causes timeouts on free servers.
        safe_context = request.context[:15000]

        model = get_optimal_model()
        if not model: return {"answer": "AI is initializing. Please try again."}

        prompt = f"""
        You are a helpful study assistant. 
        Answer based ONLY on the provided syllabus context.
        Keep answers short (max 3 sentences).

        CONTEXT: {safe_context}
        QUESTION: {request.question}
        """

        response = model.generate_content(prompt)
        return {"answer": response.text}

    except Exception as e:
        logger.error(f"Chat Error: {e}")
        # Return a polite error instead of crashing
        return {"answer": "I'm having trouble connecting right now. Try a shorter question."}


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
    except Exception as e:
        logger.error(f"PDF Error: {e}")
        raise HTTPException(status_code=400, detail="Corrupt PDF")

    # FIX 2: "GROUP-AWARE" PROMPT
    prompt = f"""
    ROLE: University Scheduler.
    TASK: Create a coherent weekly timetable.

    STRICT RULES FOR GROUPS:
    1. If a module has multiple groups (e.g., Group A, Group B), YOU MUST PICK ONE GROUP.
    2. ONCE YOU PICK A GROUP (e.g., Group A), YOU MUST SCHEDULE ALL SESSIONS FOR THAT GROUP.
       (Example: If Group A has a Lecture on Mon AND a Tutorial on Wed, schedule BOTH).
    3. Do NOT mix groups (e.g., Do not take Group A Lecture and Group B Tutorial).
    4. Ignore other groups entirely.

    USER PREFERENCE: {preference}
    USER NOTES: {user_notes}

    DATA: {combined_text[:35000]}

    OUTPUT JSON ONLY:
    {{ 
        "class_timetable": [ 
            {{"subject": "Math 101", "day": "Monday", "time": "10:00 - 12:00", "type": "Lecture (Group A)"}},
            {{"subject": "Math 101", "day": "Wednesday", "time": "14:00 - 15:00", "type": "Tutorial (Group A)"}}
        ], 
        "exam_calendar": [ 
            {{"title": "Math Exam", "date": "2024-06-01"}} 
        ], 
        "study_plan": {{ 
            "explanation": "I selected Group A because it fits your morning preference, including both the Monday lecture and Wednesday tutorial." 
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
        logger.error(f"AI Parse Error: {e}")
        data = {"class_timetable": [], "exam_calendar": [], "study_plan": {"explanation": "Parsing error."}}

    # PDF Helper
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
        line = f"{x.get('day', '?')} {x.get('time', '?')}: {x.get('subject', '?')} ({x.get('type', '')})"
        timetable_lines.append(line)

    exam_lines = [f"{x.get('date', '?')}: {x.get('title', '?')}" for x in data.get('exam_calendar', [])]

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