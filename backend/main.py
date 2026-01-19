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


# --- 1. ROBUST GOOGLE SETUP ---
def get_api_url():
    key = os.getenv("GOOGLE_API_KEY")
    if not key:
        print("🚨 CRITICAL ERROR: GOOGLE_API_KEY is missing in Environment Variables!")
        return None
    return f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"


def call_google_api(prompt_text):
    url = get_api_url()
    if not url: return None  # Fails safely if key is missing

    headers = {"Content-Type": "application/json"}
    payload = {"contents": [{"parts": [{"text": prompt_text}]}]}

    try:
        response = requests.post(url, headers=headers, json=payload)

        # DEBUGGING: Print exact error if Google fails
        if response.status_code != 200:
            print(f"❌ GOOGLE API ERROR: {response.status_code}")
            print(f"❌ MESSAGE: {response.text}")
            return None

        return response.json()["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print(f"❌ CONNECTION ERROR: {str(e)}")
        return None


# --- 2. DATA MODELS ---
class ChatRequest(BaseModel):
    question: str
    context: str


# --- 3. ENDPOINTS ---
@app.get("/")
def home():
    return {"status": "alive", "message": "Backend is running"}


@app.post("/chat")
async def chat_with_syllabus(request: ChatRequest):
    if not request.context:
        return {"answer": "I don't have the syllabus context yet. Please generate a schedule first."}

    prompt = f"""
    You are a helpful academic assistant. 
    Answer the student's question based ONLY on the syllabus text provided below.

    SYLLABUS CONTEXT:
    {request.context[:30000]} 

    STUDENT QUESTION:
    {request.question}
    """

    answer = call_google_api(prompt)
    if not answer:
        return {"answer": "I'm having trouble connecting to the AI. Check the server logs."}
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
        print(f"❌ PDF ERROR: {e}")
        raise HTTPException(status_code=400, detail="Corrupt PDF file")

    if not combined_text:
        raise HTTPException(status_code=400, detail="Could not read any text from the PDF.")

    # 2. ASK AI
    prompt = f"""
    TASK: Create a Weekly Timetable from this syllabus.
    USER NOTES: {user_notes}
    PREFERENCE: {preference}
    DATA: {combined_text[:30000]}

    RETURN JSON ONLY: 
    {{ 
        "class_timetable": [ {{"subject": "Math", "day": "Monday", "time": "10:00", "venue": "Room 1"}} ], 
        "exam_calendar": [ {{"title": "Math Exam", "date": "2024-06-01", "time": "09:00"}} ], 
        "study_plan": {{ "strategy_name": "...", "explanation": "..." }} 
    }}
    """

    raw_json = call_google_api(prompt)

    # 3. SAFETY CHECK (This fixes your crash)
    if not raw_json:
        print("❌ AI returned None. Aborting.")
        raise HTTPException(status_code=500, detail="AI generation failed. Check Render Logs for API Key errors.")

    # 4. PARSE & RETURN
    try:
        data = json.loads(raw_json.replace("```json", "").replace("```", "").strip())
    except:
        # Fallback if AI sends bad JSON
        data = {"class_timetable": [], "exam_calendar": [], "study_plan": {"explanation": "AI Error"}}

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