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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- 1. DATA MODELS ---
class ChatRequest(BaseModel):
    question: str
    context: str


# --- 2. SMART MODEL SELECTOR ---
def get_optimal_model():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key: return None

    genai.configure(api_key=api_key)
    try:
        available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        print(f"✅ FOUND MODELS: {available_models}")

        priorities = ['models/gemini-2.5-flash', 'models/gemini-1.5-flash', 'models/gemini-pro']
        for p in priorities:
            if p in available_models:
                print(f"👉 Selected: {p}")
                return genai.GenerativeModel(p)

        # Fallback
        return genai.GenerativeModel(available_models[0]) if available_models else None
    except:
        return genai.GenerativeModel('gemini-1.5-flash')


# --- 3. ENDPOINTS ---
@app.get("/")
def home():
    return {"status": "alive", "message": "Backend is running"}


@app.post("/chat")
async def chat_with_syllabus(request: ChatRequest):
    if not request.context: return {"answer": "No context available."}

    model = get_optimal_model()
    if not model: return {"answer": "AI Unavailable."}

    try:
        response = model.generate_content(f"Context: {request.context[:30000]} \n Question: {request.question}")
        return {"answer": response.text}
    except Exception as e:
        return {"answer": f"Error: {str(e)}"}


@app.post("/process-syllabus")
async def process_syllabus(files: List[UploadFile] = File(...), user_notes: str = Form(""),
                           preference: str = Form("Any")):
    # 1. READ FILES
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

    if not combined_text:
        raise HTTPException(status_code=400, detail="Empty PDF")

    # 2. ASK AI
    prompt = f"""
    TASK: Extract schedule from syllabus.
    DATA: {combined_text[:30000]}

    OUTPUT JSON FORMAT ONLY:
    {{ 
        "class_timetable": [ {{"subject": "Math", "day": "Mon", "time": "10:00"}} ], 
        "exam_calendar": [ {{"title": "Exam 1", "date": "2024-05-20"}} ], 
        "study_plan": {{ "explanation": "Study hard." }} 
    }}
    """

    model = get_optimal_model()
    if not model: raise HTTPException(status_code=500, detail="No AI model found")

    try:
        response = model.generate_content(prompt)
        raw_text = response.text
        # Clean Markdown
        clean_json = raw_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_json)
    except Exception as e:
        print(f"❌ PARSING ERROR: {e}")
        # Fallback empty data so we don't crash
        data = {"class_timetable": [], "exam_calendar": [],
                "study_plan": {"explanation": "Could not parse AI response."}}

    # 3. GENERATE PDFS (CRASH-PROOF VERSION)
    def make_pdf(lines):
        b = io.BytesIO()
        c = canvas.Canvas(b, pagesize=letter)
        y = 750
        for line in lines:
            c.drawString(40, y, str(line))
            y -= 20
        c.save()
        return base64.b64encode(b.getvalue()).decode()

    # SAFE PARSING: Use .get() to handle missing keys
    timetable_lines = []
    for item in data.get('class_timetable', []):
        day = item.get('day', 'Unknown Day')
        time = item.get('time', 'Unknown Time')
        subj = item.get('subject', 'Unknown Subject')
        timetable_lines.append(f"{day} {time}: {subj}")

    exam_lines = []
    for item in data.get('exam_calendar', []):
        date = item.get('date', 'Unknown Date')
        title = item.get('title', 'Unknown Exam')
        exam_lines.append(f"{date}: {title}")

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