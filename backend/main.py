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
import google.generativeai as genai  # <--- USING THE OFFICIAL LIBRARY

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- 1. SETUP GOOGLE AI (THE OFFICIAL WAY) ---
def get_ai_response(prompt_text):
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("🚨 CRITICAL: GOOGLE_API_KEY is missing.")
        return None

    try:
        genai.configure(api_key=api_key)
        # We use 'gemini-1.5-flash' - it's fast and free
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt_text)
        return response.text
    except Exception as e:
        print(f"❌ GOOGLE AI ERROR: {e}")
        return None


# --- 2. DATA MODELS ---
class ChatRequest(BaseModel):
    question: str
    context: str


# --- 3. ENDPOINTS ---
@app.get("/")
def home():
    return {"status": "alive", "message": "Backend is running with Official Google Client"}


@app.post("/chat")
async def chat_with_syllabus(request: ChatRequest):
    if not request.context:
        return {"answer": "I don't have the syllabus context yet."}

    prompt = f"""
    You are a helpful academic assistant. 
    Answer the student's question based ONLY on the syllabus text provided below.

    SYLLABUS CONTEXT:
    {request.context[:30000]} 

    STUDENT QUESTION:
    {request.question}
    """

    answer = get_ai_response(prompt)
    if not answer:
        return {"answer": "I'm having trouble thinking right now. Check server logs."}
    return {"answer": answer}


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
    except Exception as e:
        print(f"❌ PDF READ ERROR: {e}")
        raise HTTPException(status_code=400, detail="Corrupt PDF file or missing cryptography library.")

    if not combined_text:
        raise HTTPException(status_code=400, detail="No text found in PDF.")

    # 2. ASK AI
    prompt = f"""
    TASK: Create a Weekly Timetable from this syllabus.
    USER NOTES: {user_notes}
    PREFERENCE: {preference}
    DATA: {combined_text[:30000]}

    RETURN JSON ONLY (No markdown formatting): 
    {{ 
        "class_timetable": [ {{"subject": "Math", "day": "Monday", "time": "10:00", "venue": "Room 1"}} ], 
        "exam_calendar": [ {{"title": "Math Exam", "date": "2024-06-01", "time": "09:00"}} ], 
        "study_plan": {{ "strategy_name": "...", "explanation": "..." }} 
    }}
    """

    raw_response = get_ai_response(prompt)

    # 3. SAFETY CHECK
    if not raw_response:
        raise HTTPException(status_code=500, detail="AI Generation failed. See logs.")

    # 4. CLEAN & PARSE
    try:
        # Remove potential markdown code blocks provided by AI
        clean_json = raw_response.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_json)
    except:
        print(f"❌ JSON PARSE ERROR. AI SAID: {raw_response}")
        # Fallback data so app doesn't crash
        data = {"class_timetable": [], "exam_calendar": [], "study_plan": {"explanation": "AI format error"}}

    # Helper for PDFs
    def make_pdf(lines):
        b = io.BytesIO()
        c = canvas.Canvas(b, pagesize=letter)
        y = 750
        for line in lines:
            c.drawString(40, y, str(line))
            y -= 20
        c.save()
        return base64.b64encode(b.getvalue()).decode()

    timetable_lines = [f"{x['day']} {x['time']}: {x['subject']}" for x in data.get('class_timetable', [])]
    exam_lines = [f"{x['date']}: {x['title']}" for x in data.get('exam_calendar', [])]

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