"use client";

import React, { useState } from 'react';
import { Calendar, BookOpen, MessageSquare, GraduationCap, Upload, Loader2, Home, ArrowRight } from 'lucide-react';

// --- COMPONENTS ---

// 1. HOME LANDING PAGE
const Landing = ({ setView }: { setView: (view: string) => void }) => (
  <div className="p-8 max-w-4xl mx-auto">
    <h1 className="text-4xl font-extrabold mb-6 text-blue-700">Lock In Chief 🔒</h1>
    <p className="text-xl text-gray-900 mb-8 font-medium">Your Academic Operating System. Select a tool to begin.</p>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <button onClick={() => setView('timetable')} className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-blue-600 text-left">
        <Calendar className="w-8 h-8 text-blue-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Timetable Architect</h2>
        <p className="text-gray-800 mt-2 flex items-center gap-1 font-medium">
          Upload <ArrowRight size={16}/> Schedule with venues and groups.
        </p>
      </button>
      
      <button onClick={() => setView('exams')} className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-red-600 text-left">
        <GraduationCap className="w-8 h-8 text-red-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Exam HQ</h2>
        <p className="text-gray-800 mt-2 font-medium">Extract dates and generate a countdown study strategy.</p>
      </button>

      <button onClick={() => setView('strategy')} className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-purple-600 text-left">
        <BookOpen className="w-8 h-8 text-purple-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Strategy Guide</h2>
        <p className="text-gray-800 mt-2 font-medium">AI analysis of how to ace your specific modules.</p>
      </button>

      <button onClick={() => setView('chat')} className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-green-600 text-left">
        <MessageSquare className="w-8 h-8 text-green-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Syllabus Chat</h2>
        <p className="text-gray-800 mt-2 font-medium">Chat with your documents NotebookLM style.</p>
      </button>
    </div>
  </div>
);

// 2. TIMETABLE TAB
const Timetable = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch('https://lock-in-chief.onrender.com/generate-timetable', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error("Server Error");
      const result = await res.json();
      setData(result);
    } catch (err) {
      alert("Error generating timetable. Please check your file.");
    }
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-3xl font-extrabold flex items-center gap-2 text-gray-900"><Calendar className="text-blue-600"/> Timetable Architect</h2>
      
      {!data ? (
        <form onSubmit={handleUpload} className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <label className="block font-bold text-gray-900">1. Upload Syllabus PDFs</label>
          {/* UPDATED: Darker file text */}
          <input type="file" name="files" multiple className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-100 file:text-blue-800 hover:file:bg-blue-200" />
          
          <label className="block font-bold text-gray-900">2. Preferences</label>
          {/* UPDATED: Black text when typing */}
          <input type="text" name="preference" placeholder="e.g. I prefer morning classes..." className="w-full p-3 border border-gray-300 rounded-lg text-black placeholder-gray-500 font-medium" />
          
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-3 rounded-lg w-full font-bold text-lg hover:bg-blue-700 transition">
            {loading ? <Loader2 className="animate-spin mx-auto"/> : "Generate Schedule"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.data.timetable.map((cls: any, i: number) => (
              <div key={i} className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
                <h3 className="font-bold text-lg text-black">{cls.subject}</h3>
                <p className="text-sm text-gray-900 font-medium">{cls.type} • {cls.group}</p>
                <div className="mt-2 flex items-center gap-2 text-sm font-bold text-gray-800 bg-gray-100 p-2 rounded">
                  <span>{cls.day}</span>
                  <span>{cls.time}</span>
                </div>
                <p className="mt-2 text-sm font-bold text-blue-700 uppercase tracking-wide">📍 {cls.venue}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-4">
            <a href={`data:application/pdf;base64,${data.pdf}`} download="timetable.pdf" className="inline-block bg-gray-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-black">Download PDF</a>
            <button onClick={() => setData(null)} className="text-gray-700 font-bold underline hover:text-black">Start Over</button>
          </div>
        </div>
      )}
    </div>
  );
};

// 3. EXAMS TAB
const Exams = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch('https://lock-in-chief.onrender.com/generate-exams', { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Server Error");
      setData(await res.json());
    } catch(e) { alert("Error extracting exams."); }
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-3xl font-extrabold flex items-center gap-2 text-gray-900"><GraduationCap className="text-red-600"/> Exam HQ</h2>
      {!data ? (
        <form onSubmit={handleUpload} className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <label className="block font-bold text-gray-900">Upload Exam Scope / Timetable</label>
          <input type="file" name="files" multiple className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-red-100 file:text-red-800" />
          <button type="submit" disabled={loading} className="bg-red-600 text-white px-6 py-3 rounded-lg w-full font-bold text-lg hover:bg-red-700 transition">
            {loading ? <Loader2 className="animate-spin mx-auto"/> : "Extract Exams"}
          </button>
        </form>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-extrabold text-xl mb-4 text-black border-b pb-2">Exam Dates</h3>
            {data.data.exams.map((ex: any, i: number) => (
              <div key={i} className="flex justify-between border-b border-gray-100 py-3">
                <span className="font-bold text-gray-800">{ex.title}</span>
                <span className="font-bold font-mono bg-red-100 text-red-900 px-3 py-1 rounded">{ex.date}</span>
              </div>
            ))}
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-extrabold text-xl mb-4 text-black border-b pb-2">Study Plan</h3>
            {data.data.study_schedule.map((s: any, i: number) => (
              <div key={i} className="mb-4 bg-gray-50 p-3 rounded">
                <div className="font-bold text-black">{s.week}</div>
                <div className="text-sm text-gray-900 font-medium mt-1">{s.focus}</div>
                <div className="text-xs text-blue-700 font-bold mt-1">{s.method}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 4. STRATEGY TAB
const Strategy = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch('https://lock-in-chief.onrender.com/generate-strategy', { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Server Error");
      setData(await res.json());
    } catch(e) { alert("Error generating strategy."); }
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-3xl font-extrabold flex items-center gap-2 text-gray-900"><BookOpen className="text-purple-600"/> Strategy Guide</h2>
      {!data ? (
        <form onSubmit={handleUpload} className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <p className="text-base text-gray-900 font-medium">Upload Study Guides or Syllabus for analysis.</p>
          <input type="file" name="files" multiple className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-purple-100 file:text-purple-800" />
          <button type="submit" disabled={loading} className="bg-purple-600 text-white px-6 py-3 rounded-lg w-full font-bold text-lg hover:bg-purple-700 transition">
            {loading ? <Loader2 className="animate-spin mx-auto"/> : "Analyze Strategy"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-600">
            <h3 className="font-bold text-blue-900 text-lg mb-2">General Advice</h3>
            <p className="text-blue-950 font-medium leading-relaxed">{data.data.general_advice}</p>
          </div>
          <div className="grid gap-6">
            {data.data.modules.map((mod: any, i: number) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-extrabold text-xl text-black">{mod.name}</h3>
                  <span className="bg-yellow-100 text-yellow-900 text-xs font-bold px-3 py-1 rounded uppercase border border-yellow-200">{mod.difficulty}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wide mb-2">Key Topics</h4>
                    <ul className="list-disc list-inside text-sm text-gray-900 font-medium space-y-1">
                      {mod.key_topics.map((t: string) => <li key={t}>{t}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wide mb-2">Strategy</h4>
                    <p className="text-sm text-gray-900 leading-relaxed font-medium">{mod.strategy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 5. CHAT TAB
const Chat = () => {
  const [context, setContext] = useState("");
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setLoading(true);
    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i++) {
      formData.append('files', e.target.files[i]);
    }
    try {
      const res = await fetch('https://lock-in-chief.onrender.com/generate-timetable', { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Server Error");
      const json = await res.json();
      setContext(json.raw_text);
      setMessages([{ role: "system", content: "Documents loaded. I'm ready to answer your questions!" }]);
    } catch(e) { alert("Error loading documents."); }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input) return;
    const newMsgs = [...messages, { role: "user", content: input }];
    setMessages(newMsgs);
    setInput("");
    
    try {
      const res = await fetch('https://lock-in-chief.onrender.com/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input, context: context })
      });
      const data = await res.json();
      setMessages([...newMsgs, { role: "ai", content: data.answer }]);
    } catch (err) {
      setMessages([...newMsgs, { role: "ai", content: "Error connecting to AI." }]);
    }
  };

  return (
    <div className="h-full flex flex-col p-6">
      <h2 className="text-3xl font-extrabold flex items-center gap-2 mb-4 text-gray-900"><MessageSquare className="text-green-600"/> Syllabus Chat</h2>
      
      {!context ? (
        <div className="flex-1 flex flex-col justify-center items-center bg-white rounded-xl border-2 border-dashed border-gray-300 p-12">
          <Upload className="w-16 h-16 text-gray-400 mb-6" />
          <p className="text-2xl text-gray-800 font-bold mb-4">Upload documents to start chatting</p>
          <input type="file" multiple onChange={handleUpload} className="block w-64 text-sm text-gray-700 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:bg-green-100 file:text-green-800 font-bold hover:file:bg-green-200 cursor-pointer" />
          {loading && <p className="mt-4 text-green-700 font-bold animate-pulse">Reading documents...</p>}
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden h-[600px]">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`p-4 rounded-xl max-w-[85%] font-medium leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white ml-auto shadow-md' : 'bg-white text-gray-900 border border-gray-200 shadow-sm'}`}>
                {m.content}
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-200 bg-white flex gap-3">
            <input 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask a question about your syllabus..." 
              className="flex-1 p-3 border border-gray-300 rounded-lg text-black placeholder-gray-500 font-medium focus:ring-2 focus:ring-blue-500 outline-none" 
            />
            <button onClick={sendMessage} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 transition shadow-md">Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN LAYOUT ---
export default function Page() {
  const [view, setView] = useState('home');

  return (
    <div className="flex bg-gray-100 min-h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white h-screen fixed left-0 top-0 p-4 flex flex-col z-10 shadow-2xl">
        <div className="mb-10 p-2 border-b border-gray-800 pb-6">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Lock In Chief 🔒</h1>
        </div>
        <nav className="space-y-3">
          <button onClick={() => setView('home')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition font-bold ${view === 'home' ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
            <Home size={20}/> Home
          </button>
          <button onClick={() => setView('timetable')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition font-bold ${view === 'timetable' ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
            <Calendar size={20}/> Timetable
          </button>
          <button onClick={() => setView('exams')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition font-bold ${view === 'exams' ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
            <GraduationCap size={20}/> Exams
          </button>
          <button onClick={() => setView('strategy')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition font-bold ${view === 'strategy' ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
            <BookOpen size={20}/> Strategy
          </button>
          <button onClick={() => setView('chat')} className={`w-full flex items-center gap-3 p-3 rounded-lg transition font-bold ${view === 'chat' ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
            <MessageSquare size={20}/> Chat
          </button>
        </nav>
        <div className="mt-auto p-4 bg-gray-800 rounded-xl border border-gray-700">
          <p className="text-xs text-gray-300 font-bold">Status: <span className="text-green-400 animate-pulse">● Online</span></p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="ml-64 flex-1">
        {view === 'home' && <Landing setView={setView} />}
        {view === 'timetable' && <Timetable />}
        {view === 'exams' && <Exams />}
        {view === 'strategy' && <Strategy />}
        {view === 'chat' && <Chat />}
      </div>
    </div>
  );
}