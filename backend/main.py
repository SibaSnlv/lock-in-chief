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


# --- SMART MODEL SELECTOR ---
def get_optimal_model():
    """Asks Google what models are available and picks the best one."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("🚨 CRITICAL: GOOGLE_API_KEY is missing.")
        return None

    genai.configure(api_key=api_key)

    try:
        # List all models available to your API Key
        print("🔍 Scanning for available Google Models...")
        available_models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                available_models.append(m.name)

        print(f"✅ FOUND MODELS: {available_models}")

        # Priority list (Try these in order)
        priorities = ['models/gemini-1.5-flash', 'models/gemini-1.5-pro', 'models/gemini-1.0-pro', 'models/gemini-pro']

        # 1. Check if any priority model exists in the list
        for p in priorities:
            if p in available_models:
                print(f"👉 Selected Model: {p}")
                return genai.GenerativeModel(p)

        # 2. Fallback: Just take the first "gemini" model found
        for m in available_models:
            if "gemini" in m:
                print(f"👉 Fallback Selection: {m}")
                return genai.GenerativeModel(m)

        print("❌ No Gemini models found in the list.")
        return None

    except Exception as e:
        print(f"❌ MODEL SCAN ERROR: {e}")
        # Last ditch effort: Try the standard name blindly
        return genai.GenerativeModel('gemini-1.5-flash')


# --- 2. ENDPOINTS ---
@app.get("/")
def home():
    return {"status": "alive", "message": "Backend is running"}


@app.post("/chat")
async def chat_with_syllabus(request: ChatRequest):
    if not request.context:
        return {"answer": "I don't have the syllabus context yet."}

    prompt = f"Context: {request.context[:30000]} \n Question: {request.question}"

    model = get_optimal_model()
    if not model:
        return {"answer": "Error: Could not connect to any Google AI models."}

    try:
        response = model.generate_content(prompt)
        return {"answer": response.text}
    except Exception as e:
        return {"answer": f"AI Error: {str(e)}"}


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
        raise HTTPException(status_code=400, detail="Corrupt PDF file.")

    if not combined_text:
        raise HTTPException(status_code=400, detail="No text found in PDF.")

    # 2. ASK AI
    prompt = f"""
    TASK: Create a Weekly Timetable.
    DATA: {combined_text[:30000]}
    RETURN JSON ONLY: 
    {{ "class_timetable": [], "exam_calendar": [], "study_plan": {{ "explanation": "..." }} }}
    """

    model = get_optimal_model()
    if not model:
        raise HTTPException(status_code=500, detail="No AI models available.")

    try:
        response = model.generate_content(prompt)
        raw_text = response.text
    except Exception as e:
        print(f"❌ GENERATION ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"AI Generation Failed: {e}")

    # 3. PARSE
    try:
        clean_json = raw_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_json)
    except:
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