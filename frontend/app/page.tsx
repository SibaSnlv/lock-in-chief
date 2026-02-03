"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, BookOpen, MessageSquare, GraduationCap, Upload, Loader2, Home, ArrowRight, Download, FileText, CheckCircle, ChevronDown, Terminal } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const API_URL = "https://lock-in-chief.onrender.com"; 

const stringToGrey = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const lightness = 85 + (Math.abs(hash) % 10); 
  return `hsl(0, 0%, ${lightness}%)`; 
};

const downloadPDF = async (elementId: string, fileName: string, orientation: 'p' | 'l' = 'p') => {
  const element = document.getElementById(elementId);
  if (!element) return;
  const originalCursor = document.body.style.cursor;
  document.body.style.cursor = 'wait';
  try {
    const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF(orientation, 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    pdf.addImage(imgData, 'PNG', 0, 10, imgWidth * ratio, imgHeight * ratio);
    pdf.save(fileName);
  } catch (err) { alert("Could not generate PDF."); } 
  finally { document.body.style.cursor = originalCursor; }
};

const FileUpload = ({ name, label, icon: Icon }: any) => {
  const [fileName, setFileName] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-gray-900 uppercase tracking-widest">{label}</label>
      <div className="relative flex flex-col items-center justify-center w-full h-40 border border-gray-300 border-dashed rounded-none hover:bg-gray-50 transition group">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {fileName ? <CheckCircle className="w-8 h-8 mb-3 text-black" /> : <Icon className="w-8 h-8 mb-3 text-gray-400 group-hover:text-black transition" />}
          <p className="mb-2 text-sm text-gray-500 font-medium">
            {fileName ? <span className="text-black font-bold">{fileName}</span> : "Drop files here or click to upload"}
          </p>
        </div>
        <input 
          type="file" name={name} multiple className="absolute w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) setFileName(`${e.target.files.length} file(s) ready`);
          }} 
        />
      </div>
    </div>
  );
};


const Landing = ({ setView }: { setView: (view: string) => void }) => {
  return (
    <div className="bg-white text-black font-sans">

      <section className="min-h-[90vh] flex flex-col justify-center items-start px-8 md:px-20 max-w-7xl mx-auto relative">
        <div className="absolute top-0 right-0 w-1/3 h-full -z-10 hidden lg:block">
          <img src="/hero.jpg" alt="Background" className="w-full h-full object-cover grayscale opacity-50" />
        </div>
        <div className="max-w-3xl z-10">
          <h1 className="text-7xl md:text-9xl font-extrabold tracking-tighter mb-8 leading-[0.9]">
            LOCK IN <br/> CHIEF.
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-xl leading-relaxed">
            A web-app for university students. 
            Turning chaos into structure using AI.
          </p>
          <div className="flex flex-wrap gap-4">
            <button onClick={() => setView('timetable')} className="bg-black text-white px-8 py-4 text-lg font-bold hover:bg-gray-800 transition flex items-center gap-2">
              Get Started <ArrowRight size={20}/>
            </button>
            <button onClick={() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
            }} className="px-8 py-4 text-lg font-bold border border-gray-200 hover:border-black transition text-black">
              Learn More
            </button>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 px-8 md:px-20 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center border-t border-gray-100">
        <div className="bg-gray-100 h-[400px] w-full overflow-hidden grayscale">

           <img src="/desk.jpg" className="w-full h-full object-cover hover:scale-105 transition duration-700" alt="Desk" />
        </div>
        <div>
          <div className="w-12 h-12 bg-black text-white flex items-center justify-center mb-6"><Calendar size={24}/></div>
          <h2 className="text-4xl font-bold mb-6 tracking-tight">Timetable Architect.</h2>
          <p className="text-lg text-gray-600 leading-relaxed mb-8">
            Stop taking hours sitting down trying to put together a timetable. Upload your syllabus PDF, and our AI extracts venue codes, groups, and times to build a conflict-free schedule.
          </p>
          <button onClick={() => setView('timetable')} className="text-black font-bold border-b-2 border-black pb-1 hover:text-gray-600 hover:border-gray-600 transition">
            Build Schedule →
          </button>
        </div>
      </section>

      <section className="py-24 px-8 md:px-20 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center border-t border-gray-100">
        <div className="order-2 md:order-1">
          <div className="w-12 h-12 bg-black text-white flex items-center justify-center mb-6"><BookOpen size={24}/></div>
          <h2 className="text-4xl font-bold mb-6 tracking-tight">Strategy Guide.</h2>
          <p className="text-lg text-gray-600 leading-relaxed mb-8">
            Work smarter, not harder. AI will analyze the difficulty of your modules and generate a custom study strategy to maximize your effort and performance.
          </p>
          <button onClick={() => setView('strategy')} className="text-black font-bold border-b-2 border-black pb-1 hover:text-gray-600 hover:border-gray-600 transition">
            Analyze Modules →
          </button>
        </div>
        <div className="order-1 md:order-2 bg-gray-100 h-[400px] w-full overflow-hidden grayscale">
           <img src="/books.jpg" className="w-full h-full object-cover hover:scale-105 transition duration-700" alt="Books" />
        </div>
      </section>

      <footer className="bg-black text-white py-12 text-center">
        <p className="text-gray-500 text-sm font-medium">© 2024 LOCK IN CHIEF. DESIGNED FOR ACADEMIC VALIDATION.</p>
      </footer>
    </div>
  );
};

const Timetable = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('timetableData');
    if (saved) setData(JSON.parse(saved));
  }, []);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      // UPDATED: Using API_URL variable
      const res = await fetch(`${API_URL}/generate-timetable`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Server Error");
      const result = await res.json();
      setData(result);
      localStorage.setItem('timetableData', JSON.stringify(result)); // Save to memory
    } catch (err) { alert("Error generating timetable."); }
    setLoading(false);
  };

  const getClassForSlot = (day: string, hour: string) => {
    if (!data) return null;
    return data.data.timetable.find((t: any) => t.day.toLowerCase() === day.toLowerCase() && t.time.startsWith(hour));
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const times = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18'];

  return (
    <div className="p-8 space-y-8 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex justify-between items-end border-b-2 border-black pb-4">
        <div>
           <h2 className="text-4xl font-extrabold text-black tracking-tight">TIMETABLE</h2>
           <p className="text-gray-500 mt-1">Weekly Grid View</p>
        </div>
        {data && (
          <button onClick={() => downloadPDF('timetable-view', 'My_Timetable.pdf', 'l')} className="bg-black text-white px-5 py-3 font-bold hover:bg-gray-800 flex items-center gap-2">
            <Download size={18} /> Export PDF
          </button>
        )}
      </div>
      
      {!data ? (
        <form onSubmit={handleUpload} className="bg-white p-10 border border-gray-200 shadow-sm space-y-8 max-w-2xl mx-auto mt-10">
          <FileUpload name="files" label="1. Upload Syllabus PDFs" icon={Upload} />
          <div>
            <label className="block text-sm font-bold text-gray-900 uppercase tracking-widest mb-3">2. Preferences</label>
            <input type="text" name="preference" placeholder="e.g. I prefer morning classes..." className="w-full p-4 bg-gray-50 border border-gray-200 text-black placeholder-gray-400 focus:outline-none focus:border-black transition" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-black text-white py-4 font-bold text-lg hover:bg-gray-800 transition flex justify-center items-center gap-2">
            {loading ? <Loader2 className="animate-spin"/> : "GENERATE SCHEDULE"}
          </button>
        </form>
      ) : (
        <div className="flex-1 overflow-auto bg-white border border-gray-200" id="timetable-view">
           <div className="p-6">
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                <tr>
                  <th className="sticky top-0 z-10 p-4 bg-black text-white text-left text-sm font-bold uppercase tracking-wider w-20">Time</th>
                  {days.map(day => (
                    <th key={day} className="sticky top-0 z-10 p-4 bg-black text-white text-left text-sm font-bold uppercase tracking-wider w-1/5 border-l border-gray-800">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {times.map(time => (
                  <tr key={time}>
                    <td className="p-4 border-b border-gray-200 bg-gray-50 text-sm font-bold text-gray-500">{time}:00</td>
                    {days.map(day => {
                      const cls = getClassForSlot(day, time);
                      return (
                        <td key={`${day}-${time}`} className="border-b border-l border-gray-200 p-1 h-32 align-top relative hover:bg-gray-50 transition">
                          {cls && (
                            <div style={{ backgroundColor: stringToGrey(cls.subject) }} className="p-3 h-full border border-black/10 flex flex-col justify-between group cursor-pointer">
                              <div>
                                <p className="font-extrabold text-sm text-black uppercase tracking-tight">{cls.subject}</p>
                                <p className="text-gray-800 text-xs font-bold mt-1">{cls.type} ({cls.group})</p>
                              </div>
                              <p className="text-black text-xs font-medium border-t border-black/10 pt-2 mt-2">📍 {cls.venue}</p>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-200 bg-gray-50">
             <button onClick={() => { setData(null); localStorage.removeItem('timetableData'); }} className="text-gray-500 text-sm font-bold hover:text-black uppercase tracking-wide">← Reset System</button>
          </div>
        </div>
      )}
    </div>
  );
};

const Exams = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('examData');
    if (saved) setData(JSON.parse(saved));
  }, []);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      // UPDATED: Using API_URL variable
      const res = await fetch(`${API_URL}/generate-exams`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Server Error");
      const result = await res.json();
      setData(result);
      localStorage.setItem('examData', JSON.stringify(result));
    } catch(e) { alert("Error extracting exams."); }
    setLoading(false);
  };

  return (
    <div className="p-8 space-y-8 h-full animate-in fade-in duration-500">
      <div className="flex justify-between items-end border-b-2 border-black pb-4">
         <div>
            <h2 className="text-4xl font-extrabold text-black tracking-tight">EXAM HQ</h2>
            <p className="text-gray-500 mt-1">Dates & Study Plan</p>
         </div>
         {data && (
          <button onClick={() => downloadPDF('exam-view', 'Exam_Plan.pdf', 'p')} className="bg-black text-white px-5 py-3 font-bold hover:bg-gray-800 flex items-center gap-2">
            <Download size={18} /> Export PDF
          </button>
        )}
      </div>

      {!data ? (
        <form onSubmit={handleUpload} className="bg-white p-10 border border-gray-200 shadow-sm space-y-8 max-w-2xl mx-auto mt-10">
          <FileUpload name="files" label="Upload Exam Scope" icon={FileText} />
          <button type="submit" disabled={loading} className="w-full bg-black text-white py-4 font-bold text-lg hover:bg-gray-800 transition flex justify-center items-center gap-2">
            {loading ? <Loader2 className="animate-spin"/> : "EXTRACT EXAMS"}
          </button>
        </form>
      ) : (
        <div id="exam-view" className="bg-white p-10 border border-gray-200">
          <div className="grid grid-cols-1 gap-12">
            <div>
              <h3 className="font-bold text-lg mb-6 text-black uppercase tracking-widest border-b border-gray-200 pb-2">Schedule</h3>
              <div className="space-y-4">
                {data.data.exams.map((ex: any, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-gray-50 p-6 border border-gray-100">
                    <span className="font-bold text-black text-xl">{ex.title}</span>
                    <span className="font-mono font-bold text-black bg-white border border-black px-4 py-2">{ex.date}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-6 text-black uppercase tracking-widest border-b border-gray-200 pb-2">Study Countdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.data.study_schedule.map((s: any, i: number) => (
                  <div key={i} className="bg-white border border-gray-300 p-6 hover:border-black transition duration-300">
                    <div className="flex justify-between items-start mb-4">
                       <div className="font-extrabold text-xl text-black">{s.week}</div>
                       <span className="text-[10px] font-bold text-white bg-black px-2 py-1 uppercase">{s.method}</span>
                    </div>
                    <p className="text-gray-600 font-medium leading-relaxed">{s.focus}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Strategy = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch(`${API_URL}/generate-strategy`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Server Error");
      setData(await res.json());
    } catch(e) { alert("Error generating strategy."); }
    setLoading(false);
  };

  return (
    <div className="p-8 space-y-8 h-full animate-in fade-in duration-500">
       <div className="flex justify-between items-end border-b-2 border-black pb-4">
         <div>
            <h2 className="text-4xl font-extrabold text-black tracking-tight">STRATEGY</h2>
            <p className="text-gray-500 mt-1">Module Mastery Guide</p>
         </div>
         {data && (
          <button onClick={() => downloadPDF('strategy-view', 'Strategy_Guide.pdf', 'p')} className="bg-black text-white px-5 py-3 font-bold hover:bg-gray-800 flex items-center gap-2">
            <Download size={18} /> Export PDF
          </button>
        )}
      </div>

      {!data ? (
        <form onSubmit={handleUpload} className="bg-white p-10 border border-gray-200 shadow-sm space-y-8 max-w-2xl mx-auto mt-10">
           <FileUpload name="files" label="Upload Study Guides" icon={BookOpen} />
           <button type="submit" disabled={loading} className="w-full bg-black text-white py-4 font-bold text-lg hover:bg-gray-800 transition flex justify-center items-center gap-2">
            {loading ? <Loader2 className="animate-spin"/> : "ANALYZE MODULES"}
          </button>
        </form>
      ) : (
        <div id="strategy-view" className="bg-white p-8 border border-gray-200">
          <div className="space-y-10">
            <div className="bg-gray-100 p-8 border-l-4 border-black">
              <h3 className="font-bold text-black uppercase tracking-widest mb-4">Executive Summary</h3>
              <p className="text-gray-800 font-medium leading-loose text-lg">{data.data.general_advice}</p>
            </div>
            <div className="grid gap-8">
              {data.data.modules.map((mod: any, i: number) => (
                <div key={i} className="bg-white p-8 border border-gray-200 shadow-sm hover:shadow-lg transition duration-300">
                  <div className="flex justify-between items-start mb-8 border-b border-gray-100 pb-4">
                    <h3 className="font-extrabold text-3xl text-black tracking-tight">{mod.name}</h3>
                    <span className="bg-black text-white text-xs font-bold px-4 py-2 uppercase tracking-widest">{mod.difficulty}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div>
                      <h4 className="font-bold text-xs text-gray-400 uppercase tracking-widest mb-4">Key Concepts</h4>
                      <ul className="space-y-3">
                        {mod.key_topics.map((t: string) => (
                          <li key={t} className="flex items-start gap-3 text-sm text-gray-900 font-bold border-b border-gray-50 pb-2">
                            <span className="text-gray-400">01.</span> {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-gray-400 uppercase tracking-widest mb-4">Tactical Approach</h4>
                      <p className="text-gray-700 leading-relaxed font-medium">{mod.strategy}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
      const res = await fetch(`${API_URL}/generate-timetable`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Server Error");
      const json = await res.json();
      setContext(json.raw_text);
      setMessages([{ role: "system", content: "System initialized. Knowledge base loaded." }]);
    } catch(e) { alert("Error loading documents."); }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input) return;
    const newMsgs = [...messages, { role: "user", content: input }];
    setMessages(newMsgs);
    setInput("");
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input, context: context })
      });
      const data = await res.json();
      setMessages([...newMsgs, { role: "ai", content: data.answer }]);
    } catch (err) { setMessages([...newMsgs, { role: "ai", content: "Connection Error." }]); }
  };

  return (
    <div className="h-full flex flex-col p-8 animate-in fade-in duration-500">
      <div className="border-b-2 border-black pb-4 mb-6">
        <h2 className="text-4xl font-extrabold text-black tracking-tight">CHAT ASSISTANT</h2>
        <p className="text-gray-500 mt-1">Interrogate your Syllabus</p>
      </div>
      
      {!context ? (
        <div className="flex-1 flex flex-col justify-center items-center bg-gray-50 border border-gray-200">
          <div className="bg-white p-6 rounded-full shadow-sm mb-6">
             <Terminal className="w-12 h-12 text-black" />
          </div>
          <p className="text-2xl text-black font-extrabold mb-2 tracking-tight">Initialize Knowledge Base</p>
          <p className="text-gray-500 mb-8 font-medium">Upload documents to begin session</p>
          <div className="relative group">
             <input type="file" multiple onChange={handleUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
             <button className="bg-black text-white px-10 py-4 font-bold hover:bg-gray-800 transition shadow-lg">SELECT SOURCE FILES</button>
          </div>
          {loading && <p className="mt-8 text-black font-bold animate-pulse flex items-center gap-2"><Loader2 className="animate-spin"/> PROCESSING DATA...</p>}
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-white border border-gray-200 shadow-xl h-[600px]">
          <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-6 max-w-[80%] font-medium leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-black text-white' : 'bg-white text-black border border-gray-200'}`}>
                  <p className="text-xs font-bold opacity-50 mb-2 uppercase tracking-widest">{m.role === 'user' ? 'YOU' : 'SYSTEM'}</p>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 border-t border-gray-200 bg-white flex gap-4">
            <input 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Enter command..." 
              className="flex-1 p-4 bg-gray-50 border border-gray-200 text-black font-mono placeholder-gray-400 focus:outline-none focus:border-black transition" 
            />
            <button onClick={sendMessage} className="bg-black text-white px-8 py-4 font-bold hover:bg-gray-800 transition">SEND</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Page() {
  const [view, setView] = useState('home');

  return (
    <div className="flex bg-white min-h-screen font-sans text-gray-900 selection:bg-black selection:text-white">

      {view !== 'home' && (
        <div className="w-20 lg:w-72 bg-black text-white h-screen fixed left-0 top-0 flex flex-col z-20 shadow-2xl transition-all duration-300">
          <div className="p-6 lg:p-8 border-b border-gray-800 hidden lg:block">
            <h1 className="text-2xl font-extrabold tracking-tight">LOCK IN CHIEF.</h1>
            <p className="text-[10px] text-gray-500 font-bold mt-2 uppercase tracking-widest">v1.2 // STABLE</p>
          </div>
          
          <div className="p-6 lg:hidden flex justify-center border-b border-gray-800">
             <span className="font-extrabold text-xl">L.</span>
          </div>

          <nav className="flex-1 p-4 space-y-2 mt-4">
            {[
              { id: 'home', icon: Home, label: 'Dashboard' },
              { id: 'timetable', icon: Calendar, label: 'Timetable' },
              { id: 'exams', icon: GraduationCap, label: 'Exams' },
              { id: 'strategy', icon: BookOpen, label: 'Strategy' },
              { id: 'chat', icon: MessageSquare, label: 'Assistant' },
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => setView(item.id)} 
                className={`w-full flex items-center justify-center lg:justify-start gap-4 p-4 transition-all duration-200 font-bold ${
                  view === item.id 
                    ? "bg-white text-black shadow-lg translate-x-1" 
                    : "text-gray-500 hover:text-white hover:bg-gray-900"
                }`}
              >
                <item.icon size={20}/> <span className="hidden lg:block">{item.label}</span>
              </button>
            ))}
          </nav>
          
          <div className="p-6 border-t border-gray-800 hidden lg:block">
            <div className="flex items-center gap-3 bg-gray-900 p-3 border border-gray-800">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
              <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Online</p>
            </div>
          </div>
        </div>
      )}

      <div className={`flex-1 ${view !== 'home' ? 'ml-20 lg:ml-72' : 'ml-0'}`}>
         {view === 'home' && <Landing setView={setView} />}
         {view === 'timetable' && <Timetable />}
         {view === 'exams' && <Exams />}
         {view === 'strategy' && <Strategy />}
         {view === 'chat' && <Chat />}
      </div>
    </div>
  );
}