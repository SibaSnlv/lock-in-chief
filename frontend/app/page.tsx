"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Upload, FileText, Loader2, Calendar as CalIcon, 
  FileDown, Sparkles, BookOpen, Clock, 
  ArrowRight, Search, Zap, GraduationCap, Bell, MapPin,
  MessageSquare, X, Play, Pause, Send, Headphones
} from "lucide-react";

// --- 1. WEEKLY GRID COMPONENT ---
const WeeklyGrid = ({ timetable }: { timetable: any[] }) => {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  
  // Helper to place blocks on the grid
  const getPosition = (time: string) => {
    if (!time) return 0;
    const [h] = time.split(":").map(Number);
    return h - 7; // Start grid at 7am
  };

  const getColor = (subject: string) => {
    const colors = [
      "bg-blue-100 border-blue-200 text-blue-700", 
      "bg-emerald-100 border-emerald-200 text-emerald-700", 
      "bg-purple-100 border-purple-200 text-purple-700", 
      "bg-orange-100 border-orange-200 text-orange-700",
      "bg-rose-100 border-rose-200 text-rose-700"
    ];
    let hash = 0;
    for (let i = 0; i < subject.length; i++) hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="overflow-x-auto pb-6">
      <div className="min-w-[800px] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-6 border-b border-gray-100 bg-gray-50">
          <div className="p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center border-r border-gray-100">Time</div>
          {days.map(d => (
            <div key={d} className="p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center border-r border-gray-100 last:border-0">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-6 h-[600px] relative">
           {/* Time Labels */}
           <div className="border-r border-gray-100 bg-gray-50/50">
             {[8,9,10,11,12,13,14,15,16,17].map(h => (
               <div key={h} className="h-[60px] text-xs text-gray-400 flex items-center justify-center border-b border-gray-50">
                 {h}:00
               </div>
             ))}
           </div>
           {/* Days Columns */}
           {days.map((day, colIndex) => (
             <div key={day} className="relative border-r border-gray-100 last:border-0 bg-white">
                {/* Grid Lines */}
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="absolute w-full h-[60px] border-b border-gray-50" style={{ top: `${i * 60}px` }} />
                ))}
                
                {/* Class Blocks */}
                {timetable
                  .filter(c => c.day === day)
                  .map((cls, idx) => (
                    <div 
                      key={idx}
                      className={`absolute w-[90%] left-[5%] p-2 rounded-lg text-xs font-medium border shadow-sm ${getColor(cls.subject)}`}
                      style={{ 
                        top: `${getPosition(cls.time) * 60}px`,
                        height: "55px" 
                      }}
                    >
                      <div className="font-bold truncate">{cls.subject}</div>
                      <div className="opacity-80 truncate">{cls.venue || "Room TBD"}</div>
                      <div className="absolute top-1 right-1 text-[10px] opacity-60">{cls.time}</div>
                    </div>
                ))}
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

// --- 2. MAIN APP COMPONENT ---
export default function Home() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  
  const [files, setFiles] = useState<FileList | null>(null);
  const [userNotes, setUserNotes] = useState("");
  const [preference, setPreference] = useState("Morning");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("idle"); // idle, uploading, processing, done
  const [result, setResult] = useState<any>(null);

  // Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{role:string, text:string}[]>([
    { role: 'ai', text: 'Hi! Once you generate your schedule, you can ask me anything about it here.' }
  ]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Server Wakeup
  useEffect(() => {
    fetch(`${API_BASE}/`).catch(() => console.log("Waking up server..."));
  }, []);

  const handleUpload = async () => {
    if (!files || files.length === 0) return alert("Please select a PDF first!");
    setLoading(true);
    setStage("uploading");

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append("files", files[i]);
    formData.append("user_notes", userNotes);
    formData.append("preference", preference);

    try {
      setStage("processing");
      // Add a visual delay if it's too fast, or just wait for server
      const res = await fetch(`${API_BASE}/process-syllabus`, { method: "POST", body: formData });
      
      if (!res.ok) throw new Error("Server Error");
      
      const data = await res.json();
      setResult(data);
      setStage("done");
    } catch (error) {
      alert("Server is waking up from sleep. Please try clicking 'Generate' one more time!");
      setStage("idle");
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || !result) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput("");
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg, context: result.raw_text })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.answer }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: "Connection error. Try again." }]);
    }
    setChatLoading(false);
  };

  const downloadFile = (base64: string, name: string) => {
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${base64}`;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-800 font-sans selection:bg-blue-100">
      
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg"><Sparkles className="w-5 h-5 text-white" /></div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">Lock In Chief</span>
          </div>
          <div className="text-sm font-medium text-gray-500">v1.0 Public Beta</div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-12">
        
        {/* HERO */}
        {!result && (
          <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Your Academic <span className="text-blue-600">Autopilot</span>
            </h1>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Upload your messy syllabus PDFs. We'll extract the dates, resolve clashes, and build your perfect strategy.
            </p>
          </div>
        )}

        {/* UPLOAD CARD */}
        {!result && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all duration-300">
            {/* Preference Toggles */}
            <div className="flex justify-center gap-4 mb-8">
              {['Morning', 'Afternoon', 'Any'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setPreference(opt)}
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                    preference === opt 
                    ? "bg-slate-900 text-white shadow-lg scale-105" 
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {opt} Classes
                </button>
              ))}
            </div>

            {/* File Input */}
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors group cursor-pointer relative">
              <input 
                type="file" multiple accept=".pdf"
                onChange={(e) => setFiles(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-700">
                    {files && files.length > 0 ? `${files.length} files selected` : "Drop syllabus PDFs here"}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">or click to browse</p>
                </div>
              </div>
            </div>

            {/* Notes Input */}
            <div className="mt-6">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Extra Constraints</label>
              <textarea 
                placeholder="e.g. I work on Fridays, No classes before 9am..."
                className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500 text-slate-700 resize-none h-24"
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
              />
            </div>

            {/* Action Button */}
            <button 
              onClick={handleUpload}
              disabled={loading}
              className={`w-full mt-6 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                loading ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-200 hover:shadow-xl"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  {stage === "uploading" ? "Uploading..." : "Analyzing (Takes ~30s)..."}
                </>
              ) : (
                <>
                  <Zap className="fill-current" /> Generate My Schedule
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-4">First run may take 60s while server wakes up.</p>
          </div>
        )}

        {/* RESULTS DASHBOARD */}
        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
            
            {/* Quick Actions */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Your Optimized Week</h2>
              <button onClick={() => setResult(null)} className="text-sm font-medium text-gray-500 hover:text-red-500">Reset</button>
            </div>

            {/* The Grid */}
            <WeeklyGrid timetable={result.ai_response.class_timetable} />

            {/* Downloads */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button onClick={() => downloadFile(result.files.timetable_pdf, "My_Timetable.pdf")} className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-left">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <CalIcon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-700">Timetable PDF</h3>
                <p className="text-xs text-gray-400 mt-1">Printable Version</p>
              </button>

              <button onClick={() => downloadFile(result.files.exams_pdf, "My_Exams.pdf")} className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-left">
                <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center mb-3 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-700">Exam Dates</h3>
                <p className="text-xs text-gray-400 mt-1">Synced Calendar</p>
              </button>

              <button onClick={() => downloadFile(result.files.strategy_pdf, "My_Strategy.pdf")} className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-left">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-700">Strategy Guide</h3>
                <p className="text-xs text-gray-400 mt-1">Study Plan</p>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* FLOATING CHAT WIDGET */}
      {result && (
        <div className={`fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300 z-50 ${chatOpen ? "translate-y-0 opacity-100" : "translate-y-[120%] opacity-0 pointer-events-none"}`}>
          <div className="bg-slate-900 p-4 flex justify-between items-center">
            <h3 className="text-white font-bold flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Syllabus AI</h3>
            <button onClick={() => setChatOpen(false)}><X className="text-white/50 hover:text-white w-5 h-5" /></button>
          </div>
          <div className="h-80 overflow-y-auto p-4 bg-gray-50 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-700 rounded-tl-none shadow-sm'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {chatLoading && <div className="text-xs text-gray-400 ml-2">Thinking...</div>}
          </div>
          <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask a question..."
              className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
            <button onClick={sendMessage} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* CHAT TOGGLE BUTTON */}
      {result && !chatOpen && (
        <button 
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 bg-slate-900 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform z-40"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

    </div>
  );
}