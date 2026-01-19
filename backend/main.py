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


# --- UTILS ---
def get_model():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key: return None
    genai.configure(api_key=api_key)
    try:
        # Priority Search for the Best Model
        models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        priorities = ['models/gemini-2.5-flash', 'models/gemini-1.5-flash', 'models/gemini-pro']
        for p in priorities:
            if p in models: return genai.GenerativeModel(p)
        return genai.GenerativeModel(models[0]) if models else None
    except:
        return genai.GenerativeModel('gemini-1.5-flash')


async def extract_text(files):
    combined = ""
    for f in files:
        pdf_bytes = await f.read()
        reader = PdfReader(io.BytesIO(pdf_bytes))
        for page in reader.pages:
            text = page.extract_text()
            if text: combined += text + "\n"
    return combined


def make_pdf(lines):
    b = io.BytesIO()
    c = canvas.Canvas(b, pagesize=letter)
    y = 750
    for line in lines:
        c.drawString(40, y, str(line))
        y -= 20
    c.save()
    return base64.b64encode(b.getvalue()).decode()


# --- 1. TIMETABLE TAB ENDPOINT ---
@app.post("/generate-timetable")
async def generate_timetable(files: List[UploadFile] = File(...), preference: str = Form("Any")):
    text = await extract_text(files)
    model = get_model()

    # FORCE VENUE AND GROUP IN JSON
    prompt = f"""
    ROLE: University Scheduler.
    TASK: Create a weekly timetable.
    DATA: {text[:40000]}

    STRICT RULES:
    1. If multiple groups exist, PICK ONE (e.g., Group A) and stick to it for all sessions of that module.
    2. Extract VENUE (Room/Building) and GROUP NAME explicitly.
    3. PREFERENCE: {preference}

    OUTPUT JSON ONLY:
    {{ 
        "timetable": [ 
            {{
                "subject": "Math 101", 
                "day": "Monday", 
                "time": "10:00 - 12:00", 
                "venue": "Science Bldg Room 4", 
                "group": "Group A",
                "type": "Lecture"
            }} 
        ]
    }}
    """
    try:
        res = model.generate_content(prompt)
        data = json.loads(res.text.replace("```json", "").replace("```", "").strip())
    except:
        data = {"timetable": []}

    # Create PDF Line strings
    pdf_lines = [f"{x['day']} {x['time']}: {x['subject']} ({x.get('venue', 'TBA')})" for x in data.get('timetable', [])]

    return {"data": data, "pdf": make_pdf(pdf_lines), "raw_text": text}


# --- 2. EXAM & STUDY PLAN ENDPOINT ---
@app.post("/generate-exams")
async def generate_exams(files: List[UploadFile] = File(...)):
    text = await extract_text(files)
    model = get_model()

    prompt = f"""
    ROLE: Exam Strategist.
    TASK: Extract Exam Dates and create a countdown study schedule.
    DATA: {text[:40000]}

    OUTPUT JSON ONLY:
    {{ 
        "exams": [ {{"title": "Biology Final", "date": "2024-06-15", "venue": "Hall B"}} ],
        "study_schedule": [ 
            {{"week": "Week 1", "focus": "Review Chapter 1-3", "method": "Active Recall"}} 
        ]
    }}
    """
    try:
        res = model.generate_content(prompt)
        data = json.loads(res.text.replace("```json", "").replace("```", "").strip())
    except:
        data = {"exams": [], "study_schedule": []}

    pdf_lines = [f"EXAM: {x['title']} on {x['date']}" for x in data.get('exams', [])]
    return {"data": data, "pdf": make_pdf(pdf_lines), "raw_text": text}


# --- 3. STRATEGY GUIDE ENDPOINT ---
@app.post("/generate-strategy")
async def generate_strategy(files: List[UploadFile] = File(...)):
    text = await extract_text(files)
    model = get_model()

    prompt = f"""
    ROLE: Academic Coach.
    TASK: Analyze this syllabus/study guide and explain HOW to pass.
    DATA: {text[:40000]}

    OUTPUT JSON ONLY:
    {{ 
        "modules": [
            {{
                "name": "Math 101",
                "difficulty": "High",
                "key_topics": ["Calculus", "Algebra"],
                "best_resources": "Khan Academy, Past Papers",
                "strategy": "Focus on weekly problem sets. Do not fall behind."
            }}
        ],
        "general_advice": "This semester requires consistent practice..."
    }}
    """
    try:
        res = model.generate_content(prompt)
        data = json.loads(res.text.replace("```json", "").replace("```", "").strip())
    except:
        data = {"modules": [], "general_advice": "Error parsing strategy."}

    # Simple Strategy PDF
    pdf_lines = [data.get('general_advice', '')]
    return {"data": data, "pdf": make_pdf(pdf_lines), "raw_text": text}


# --- 4. CHAT ENDPOINT (Fixed) ---
@app.post("/chat")
async def chat(request: ChatRequest):
    # Slice context to avoid "Failed to Fetch" network timeout
    safe_context = request.context[:12000]

    model = get_model()
    if not model: return {"answer": "AI unavailable."}

    prompt = f"""
    CONTEXT: {safe_context}
    USER QUESTION: {request.question}

    INSTRUCTION: Answer strictly based on the context provided. Be concise.
    """
    try:
        res = model.generate_content(prompt)
        return {"answer": res.text}
    except Exception as e:
        return {"answer": f"Connection Error: {str(e)}"}