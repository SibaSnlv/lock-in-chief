import os
import json
import base64
import io
import requests
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from dotenv import load_dotenv
from pydantic import BaseModel
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- 1. SETUP GOOGLE GEMINI ---
def get_valid_api_url():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("❌ ERROR: Missing GOOGLE_API_KEY")
        return None
    # Default to Gemini 1.5 Flash
    return f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"


ACTIVE_API_URL = get_valid_api_url()


def call_google_api(prompt_text):
    if not ACTIVE_API_URL: return None
    headers = {"Content-Type": "application/json"}
    payload = {"contents": [{"parts": [{"text": prompt_text}]}]}
    try:
        response = requests.post(ACTIVE_API_URL, headers=headers, json=payload)
        if response.status_code != 200:
            return None
        return response.json()["candidates"][0]["content"]["parts"][0]["text"]
    except:
        return None


# --- 2. DATA MODELS ---
class ChatRequest(BaseModel):
    question: str
    context: str


# --- 3. ENDPOINTS ---

@app.get("/")
def home():
    return {"status": "alive", "message": "Lock-In Chief Backend is Running"}


@app.post("/chat")
async def chat_with_syllabus(request: ChatRequest):
    # Construct the prompt using the syllabus text
    prompt = f"""
    You are a helpful academic assistant. 
    Answer the student's question based ONLY on the syllabus text provided below.

    SYLLABUS CONTEXT:
    {request.context[:30000]} 

    STUDENT QUESTION:
    {request.question}
    """

    answer = call_google_api(prompt)
    return {"answer": answer if answer else "Sorry, I'm having trouble connecting to the AI right now."}


@app.post("/process-syllabus")
async def process_syllabus(files: List[UploadFile] = File(...), user_notes: str = Form(""),
                           preference: str = Form("Any")):
    try:
        # Extract Text
        combined_text = ""
        for idx, f in enumerate(files):
            pdf_bytes = await f.read()
            try:
                reader = PdfReader(io.BytesIO(pdf_bytes))
                for page in reader.pages:
                    combined_text += page.extract_text() + "\n"
            except:
                continue

        # AI Analysis
        pref_text = ""
        if preference == "Morning": pref_text = "Prioritize Morning classes (08:00-12:00)."
        if preference == "Afternoon": pref_text = "Prioritize Afternoon classes (13:00-17:00)."

        prompt = f"""
        TASK: Create a Weekly Timetable from this syllabus.
        USER NOTES: {user_notes}
        PREFERENCE: {pref_text}
        DATA: {combined_text[:40000]}

        RETURN JSON ONLY: 
        {{ 
            "class_timetable": [ {{"subject": "Math", "day": "Monday", "time": "10:00", "venue": "Room 1"}} ], 
            "exam_calendar": [ {{"title": "Math Exam", "date": "2024-06-01", "time": "09:00"}} ], 
            "study_plan": {{ "strategy_name": "...", "explanation": "..." }} 
        }}
        """

        raw_json = call_google_api(prompt)
        data = json.loads(raw_json.replace("```json", "").replace("```", "").strip())

        # Generate PDFs (Simplified)
        def make_pdf(lines):
            b = io.BytesIO()
            c = canvas.Canvas(b, pagesize=letter)
            y = 750
            for line in lines:
                c.drawString(40, y, str(line))
                y -= 20
            c.save()
            return base64.b64encode(b.getvalue()).decode()

        timetable_lines = [f"{x['day']} {x['time']}: {x['subject']} ({x['venue']})" for x in
                           data.get('class_timetable', [])]
        exam_lines = [f"{x['date']}: {x['title']}" for x in data.get('exam_calendar', [])]
        strat_lines = [data.get('study_plan', {}).get('explanation', 'No strategy')]

        return {
            "message": "Success",
            "raw_text": combined_text,  # <--- CRITICAL FOR CHAT
            "ai_response": data,
            "files": {
                "timetable_pdf": make_pdf(timetable_lines),
                "exams_pdf": make_pdf(exam_lines),
                "strategy_pdf": make_pdf(strat_lines)
            }
        }
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))