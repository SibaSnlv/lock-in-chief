"use client";

import React, { useState } from 'react';

// CORRECTED: Uses Next.js environment variable for Vercel deployment
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function Home() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [userNotes, setUserNotes] = useState("");
  const [preference, setPreference] = useState("Any");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // Chat States
  const [chatOpen, setChatOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(e.target.files);
    }
  };

  const handleUpload = async () => {
    if (!files || files.length === 0) return alert("Please select a PDF first!");
    setLoading(true);

    const formData = new FormData();
    // Loop through the FileList
    for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
    }
    formData.append("user_notes", userNotes);
    formData.append("preference", preference);

    try {
      const res = await fetch(`${API_BASE}/process-syllabus`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      alert("Error connecting to server. Is backend running?");
      console.error(error);
    }
    setLoading(false);
  };

  const downloadPDF = (base64Str: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${base64Str}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sendChat = async () => {
    if (!question || !result) return;
    const newHistory = [...chatHistory, { role: 'user', text: question }];
    setChatHistory(newHistory);
    setQuestion("");

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context: result.raw_text })
      });
      const data = await res.json();
      setChatHistory([...newHistory, { role: 'ai', text: data.answer }]);
    } catch (e) {
      setChatHistory([...newHistory, { role: 'ai', text: "Error connecting." }]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 font-sans">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-blue-400">Lock In Chief 🔒</h1>
        <p className="mb-8 text-gray-400">Upload your syllabus. Get your optimized schedule.</p>

        {/* UPLOAD SECTION */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
          <input 
            type="file" multiple accept=".pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-400 mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />
          
          <textarea 
            placeholder="Any extra notes? (e.g., I work on Fridays)"
            className="w-full p-3 bg-gray-700 rounded text-white mb-4 border border-gray-600 focus:outline-none focus:border-blue-500"
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
          />

          <div className="mb-4">
            <label className="block text-sm font-bold mb-2 text-gray-300">Preferred Schedule:</label>
            <select 
              value={preference} 
              onChange={(e) => setPreference(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
            >
              <option value="Any">No Preference</option>
              <option value="Morning">Morning Classes (8am - 1pm)</option>
              <option value="Afternoon">Afternoon Classes (12pm - 6pm)</option>
            </select>
          </div>

          <button 
            onClick={handleUpload}
            disabled={loading}
            className={`w-full py-3 rounded font-bold text-lg transition ${loading ? 'bg-gray-600' : 'bg-blue-600 hover:bg-blue-500'}`}
          >
            {loading ? "Analyzing..." : "Generate Schedule"}
          </button>
        </div>

        {/* RESULTS SECTION */}
        {result && (
          <div className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => downloadPDF(result.files.timetable_pdf, "Timetable.pdf")} className="p-4 bg-green-600 rounded hover:bg-green-500 font-bold">📄 Download Timetable</button>
                <button onClick={() => downloadPDF(result.files.exams_pdf, "Exam_Schedule.pdf")} className="p-4 bg-purple-600 rounded hover:bg-purple-500 font-bold">📅 Download Exam Dates</button>
                <button onClick={() => downloadPDF(result.files.strategy_pdf, "Strategy_Plan.pdf")} className="p-4 bg-orange-600 rounded hover:bg-orange-500 font-bold">🧠 Download Strategy</button>
             </div>
             
             {/* CHAT BUTTON */}
             <button onClick={() => setChatOpen(!chatOpen)} className="w-full p-3 bg-gray-700 rounded hover:bg-gray-600 mt-4">
                {chatOpen ? "Close Chat" : "💬 Chat with your Syllabus"}
             </button>
          </div>
        )}

        {/* CHAT INTERFACE */}
        {chatOpen && result && (
          <div className="mt-6 bg-gray-800 p-4 rounded border border-gray-700">
             <div className="h-64 overflow-y-auto mb-4 bg-gray-900 p-3 rounded">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`mb-2 ${msg.role === 'user' ? 'text-right text-blue-400' : 'text-left text-green-400'}`}>
                    <span className="text-xs text-gray-500 block">{msg.role === 'user' ? 'You' : 'AI'}</span>
                    {msg.text}
                  </div>
                ))}
             </div>
             <div className="flex gap-2">
               <input 
                 value={question}
                 onChange={(e) => setQuestion(e.target.value)}
                 className="flex-1 p-2 rounded bg-gray-700 text-white"
                 placeholder="Ask about deadlines..."
               />
               <button onClick={sendChat} className="bg-blue-600 px-4 rounded">Send</button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}