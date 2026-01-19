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


# --- 1. SMART MODEL SELECTOR ---
def get_valid_api_url():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("❌ ERROR: Missing GOOGLE_API_KEY")
        return None

    print("🔎 Searching for best available Gemini model...")
    list_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

    try:
        response = requests.get(list_url)
        data = response.json()
        available_models = []
        if "models" in data:
            for m in data["models"]:
                if "generateContent" in m.get("supportedGenerationMethods", []):
                    available_models.append(m["name"])

        # Priority: Flash (Speed/Limit) -> Pro (Power)
        chosen_model = None
        for m in available_models:
            if "gemini-1.5-flash" in m:
                chosen_model = m
                break
        if not chosen_model:
            for m in available_models:
                if "flash" in m.lower():
                    chosen_model = m
                    break
        if not chosen_model:
            chosen_model = "models/gemini-pro"

        print(f"✅ LOCKED ONTO: {chosen_model}")
        return f"https://generativelanguage.googleapis.com/v1beta/{chosen_model}:generateContent?key={api_key}"

    except Exception as e:
        print(f"❌ Discovery Failed: {e}. Defaulting to Flash.")
        return f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"


ACTIVE_API_URL = get_valid_api_url()


# --- 2. ROBUST API CALLER ---
def call_google_api(prompt_text):
    if not ACTIVE_API_URL: return None
    headers = {"Content-Type": "application/json"}
    payload = {"contents": [{"parts": [{"text": prompt_text}]}]}

    try:
        response = requests.post(ACTIVE_API_URL, headers=headers, json=payload)
        if response.status_code == 429:
            return None  # Rate limit
        if response.status_code != 200:
            print(f"API Error: {response.text}")
            return None
        return response.json()["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print(f"Connection Error: {e}")
        return None


# --- 3. TEXT EXTRACTION ---
def extract_text_from_pdfs(files_bytes_list):
    combined_text = ""
    for idx, file_bytes in enumerate(files_bytes_list):
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            file_text = ""
            for page in reader.pages:
                file_text += page.extract_text() + "\n"
            combined_text += f"\n--- DOC {idx + 1} ---\n{file_text}\n"
        except:
            continue
    return combined_text


# --- 4. AI ANALYSIS (WITH PREFERENCES) ---
def analyze_academic_data(text, user_prompt="", time_preference="Any"):
    print(f"⚡ Processing (Pref: {time_preference})...")

    pref_instruction = ""
    if time_preference == "Morning":
        pref_instruction = "PRIORITY: Pick groups meeting 08:00-13:00. Avoid afternoons."
    elif time_preference == "Afternoon":
        pref_instruction = "PRIORITY: Pick groups meeting 12:00-18:00. Avoid mornings."

    prompt = f"""
    You are an Academic Scheduler.
    USER CONTEXT: "{user_prompt}"
    DATA: {text[:50000]}

    TASK: Create a RIGID Weekly Timetable.
    STRICT RULES: 
    1. For every module, pick ONE Lecture Group and ONE Practical Group.
    2. {pref_instruction}
    3. No "TBD" or empty subjects.

    RETURN JSON ONLY: 
    {{ 
        "class_timetable": [ {{"subject": "Math", "day": "Monday", "time": "10:00", "venue": "Room 1"}} ], 
        "exam_calendar": [ {{"title": "Math Exam", "date": "2024-06-01", "time": "09:00"}} ], 
        "study_plan": {{ "strategy_name": "...", "explanation": "..." }} 
    }}
    """

    json_text = call_google_api(prompt)
    if not json_text:
        return {"class_timetable": [], "exam_calendar": [],
                "study_plan": {"explanation": "Server Busy. Please wait 1 minute."}}

    try:
        clean = json_text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean)
    except:
        return {"class_timetable": [], "study_plan": {"explanation": "Data Error."}}


# --- 5. PDF GENERATORS ---
def generate_pdf(title, lines):
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(40, 750, title)
    c.setFont("Helvetica", 12)
    y = 700
    for line in lines:
        c.drawString(40, y, line)
        y -= 20
        if y < 50: c.showPage(); y = 750
    c.save()
    buffer.seek(0)
    return buffer.getvalue()


# --- 6. ENDPOINTS ---
@app.post("/process-syllabus")
async def process_syllabus(files: List[UploadFile] = File(...), user_notes: str = Form(""),
                           preference: str = Form("Any")):
    try:
        files_bytes = [await f.read() for f in files]
        text = extract_text_from_pdfs(files_bytes)
        data = analyze_academic_data(text, user_notes, preference)

        # Format Data for PDFs
        timetable_lines = [f"{x['day']} {x['time']}: {x['subject']} ({x['venue']})" for x in
                           data.get('class_timetable', [])]
        exam_lines = [f"{x['date']}: {x['title']}" for x in data.get('exam_calendar', [])]
        strat_lines = [data.get('study_plan', {}).get('explanation', 'No strategy generated.')]

        return {
            "ai_response": data,
            "files": {
                "timetable_pdf": base64.b64encode(generate_pdf("Timetable", timetable_lines)).decode('utf-8'),
                "exams_pdf": base64.b64encode(generate_pdf("Exams", exam_lines)).decode('utf-8'),
                "strategy_pdf": base64.b64encode(generate_pdf("Strategy", strat_lines)).decode('utf-8')
            }
        }
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


class ChatRequest(BaseModel):
    question: str
    context: str


@app.post("/chat")
async def chat(request: ChatRequest):
    ans = call_google_api(f"Context: {request.context[:30000]} Question: {request.question}")
    return {"answer": ans if ans else "Error."}