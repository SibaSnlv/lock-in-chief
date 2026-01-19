import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Calendar, BookOpen, MessageSquare, GraduationCap, Upload, Download, Loader2, Home } from 'lucide-react';
import './App.css';

// --- COMPONENTS ---

// 1. HOME LANDING PAGE
const Landing = () => (
  <div className="p-8 max-w-4xl mx-auto">
    <h1 className="text-4xl font-bold mb-6 text-blue-600">Lock In Chief 🔒</h1>
    <p className="text-xl text-gray-600 mb-8">Your Academic Operating System. Select a tool to begin.</p>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Link to="/timetable" className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-blue-500">
        <Calendar className="w-8 h-8 text-blue-500 mb-4" />
        <h2 className="text-2xl font-bold">Timetable Architect</h2>
        <p className="text-gray-500 mt-2">Upload syllabus -> Get a conflict-free schedule with venues & groups.</p>
      </Link>
      
      <Link to="/exams" className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-red-500">
        <GraduationCap className="w-8 h-8 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold">Exam HQ</h2>
        <p className="text-gray-500 mt-2">Extract dates & generate a countdown study strategy.</p>
      </Link>

      <Link to="/strategy" className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-purple-500">
        <BookOpen className="w-8 h-8 text-purple-500 mb-4" />
        <h2 className="text-2xl font-bold">Strategy Guide</h2>
        <p className="text-gray-500 mt-2">AI analysis of how to ace your specific modules.</p>
      </Link>

      <Link to="/chat" className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-green-500">
        <MessageSquare className="w-8 h-8 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold">Syllabus Chat</h2>
        <p className="text-gray-500 mt-2">Chat with your documents NotebookLM style.</p>
      </Link>
    </div>
  </div>
);

// 2. TIMETABLE TAB
const Timetable = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    try {
      const res = await fetch('https://lock-in-backend.onrender.com/generate-timetable', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      setData(result);
    } catch (err) {
      alert("Error generating timetable");
    }
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-3xl font-bold flex items-center gap-2"><Calendar /> Timetable Architect</h2>
      
      {!data ? (
        <form onSubmit={handleUpload} className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <label className="block font-medium">1. Upload Syllabus PDFs</label>
          <input type="file" name="files" multiple className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          <input type="text" name="preference" placeholder="Preferences (e.g. No Friday classes)" className="w-full p-2 border rounded" />
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg w-full font-bold">
            {loading ? <Loader2 className="animate-spin mx-auto"/> : "Generate Schedule"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.data.timetable.map((cls, i) => (
              <div key={i} className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-400">
                <h3 className="font-bold text-lg">{cls.subject}</h3>
                <p className="text-sm text-gray-600">{cls.type} • {cls.group}</p>
                <div className="mt-2 flex items-center gap-2 text-sm font-mono bg-gray-50 p-2 rounded">
                  <span>{cls.day}</span>
                  <span>{cls.time}</span>
                </div>
                <p className="mt-2 text-xs font-bold text-blue-600 uppercase tracking-wide">📍 {cls.venue}</p>
              </div>
            ))}
          </div>
          <a href={`data:application/pdf;base64,${data.pdf}`} download="timetable.pdf" className="inline-block bg-gray-800 text-white px-4 py-2 rounded">Download PDF</a>
          <button onClick={() => setData(null)} className="ml-4 text-gray-500 underline">Start Over</button>
        </div>
      )}
    </div>
  );
};

// 3. EXAMS TAB
const Exams = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const res = await fetch('https://lock-in-backend.onrender.com/generate-exams', { method: 'POST', body: formData });
    setData(await res.json());
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-3xl font-bold flex items-center gap-2"><GraduationCap /> Exam HQ</h2>
      {!data ? (
        <form onSubmit={handleUpload} className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <input type="file" name="files" multiple className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-red-50 file:text-red-700" />
          <button type="submit" disabled={loading} className="bg-red-600 text-white px-6 py-2 rounded-lg w-full font-bold">
            {loading ? <Loader2 className="animate-spin mx-auto"/> : "Extract Exams"}
          </button>
        </form>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-bold text-xl mb-4">Exam Dates</h3>
            {data.data.exams.map((ex, i) => (
              <div key={i} className="flex justify-between border-b py-2">
                <span>{ex.title}</span>
                <span className="font-mono bg-red-100 text-red-800 px-2 rounded">{ex.date}</span>
              </div>
            ))}
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-bold text-xl mb-4">Study Plan</h3>
            {data.data.study_schedule.map((s, i) => (
              <div key={i} className="mb-4">
                <div className="font-bold text-gray-700">{s.week}</div>
                <div className="text-sm text-gray-600">{s.focus}</div>
                <div className="text-xs text-blue-500">{s.method}</div>
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const res = await fetch('https://lock-in-backend.onrender.com/generate-strategy', { method: 'POST', body: formData });
    setData(await res.json());
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-3xl font-bold flex items-center gap-2"><BookOpen /> Strategy Guide</h2>
      {!data ? (
        <form onSubmit={handleUpload} className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <p className="text-sm text-gray-500">Upload Study Guides or Syllabus for analysis.</p>
          <input type="file" name="files" multiple className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-purple-50 file:text-purple-700" />
          <button type="submit" disabled={loading} className="bg-purple-600 text-white px-6 py-2 rounded-lg w-full font-bold">
            {loading ? <Loader2 className="animate-spin mx-auto"/> : "Analyze Strategy"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-bold text-blue-800">General Advice</h3>
            <p className="text-blue-900">{data.data.general_advice}</p>
          </div>
          <div className="grid gap-4">
            {data.data.modules.map((mod, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-xl">{mod.name}</h3>
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded uppercase">{mod.difficulty}</span>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-gray-500">Key Topics</h4>
                    <ul className="list-disc list-inside text-sm">{mod.key_topics.map(t => <li key={t}>{t}</li>)}</ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-500">Strategy</h4>
                    <p className="text-sm">{mod.strategy}</p>
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

// 5. CHAT TAB (NotebookLM Style)
const Chat = () => {
  const [context, setContext] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    setLoading(true);
    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i++) {
      formData.append('files', e.target.files[i]);
    }
    // We reuse the timetable endpoint just to extract text quickly, or use a new extract endpoint
    // For simplicity, let's hit the timetable one and grab raw_text
    const res = await fetch('https://lock-in-backend.onrender.com/generate-timetable', { method: 'POST', body: formData });
    const json = await res.json();
    setContext(json.raw_text); // STORE TEXT IN STATE
    setMessages([{ role: "system", content: "Documents loaded. Ask me anything!" }]);
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input) return;
    const newMsgs = [...messages, { role: "user", content: input }];
    setMessages(newMsgs);
    setInput("");
    
    try {
      const res = await fetch('https://lock-in-backend.onrender.com/chat', {
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
    <div className="h-[calc(100vh-2rem)] flex flex-col p-6">
      <h2 className="text-3xl font-bold flex items-center gap-2 mb-4"><MessageSquare /> Syllabus Chat</h2>
      
      {!context ? (
        <div className="flex-1 flex flex-col justify-center items-center bg-white rounded-lg border-2 border-dashed border-gray-300 p-12">
          <Upload className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-xl text-gray-600 mb-4">Upload documents to start chatting</p>
          <input type="file" multiple onChange={handleUpload} className="block w-64 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-green-50 file:text-green-700" />
          {loading && <p className="mt-4 text-green-600 font-bold">Reading documents...</p>}
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-white rounded-lg shadow overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`p-3 rounded-lg max-w-[80%] ${m.role === 'user' ? 'bg-blue-600 text-white ml-auto' : 'bg-gray-100 text-gray-800'}`}>
                {m.content}
              </div>
            ))}
          </div>
          <div className="p-4 border-t flex gap-2">
            <input 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about your syllabus..." 
              className="flex-1 p-2 border rounded" 
            />
            <button onClick={sendMessage} className="bg-green-600 text-white px-4 py-2 rounded">Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN LAYOUT & ROUTER ---
const Sidebar = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white";
  
  return (
    <div className="w-64 bg-gray-900 text-white h-screen fixed left-0 top-0 p-4 flex flex-col">
      <div className="mb-8 p-2">
        <h1 className="text-2xl font-bold text-white">Lock In Chief</h1>
      </div>
      <nav className="space-y-2">
        <Link to="/" className={`flex items-center gap-3 p-3 rounded-lg transition ${isActive('/')}`}><Home size={20}/> Home</Link>
        <Link to="/timetable" className={`flex items-center gap-3 p-3 rounded-lg transition ${isActive('/timetable')}`}><Calendar size={20}/> Timetable</Link>
        <Link to="/exams" className={`flex items-center gap-3 p-3 rounded-lg transition ${isActive('/exams')}`}><GraduationCap size={20}/> Exams</Link>
        <Link to="/strategy" className={`flex items-center gap-3 p-3 rounded-lg transition ${isActive('/strategy')}`}><BookOpen size={20}/> Strategy</Link>
        <Link to="/chat" className={`flex items-center gap-3 p-3 rounded-lg transition ${isActive('/chat')}`}><MessageSquare size={20}/> Chat</Link>
      </nav>
      <div className="mt-auto p-4 bg-gray-800 rounded-lg">
        <p className="text-xs text-gray-400">Status: <span className="text-green-400">Online</span></p>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar />
        <div className="ml-64 flex-1">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/timetable" element={<Timetable />} />
            <Route path="/exams" element={<Exams />} />
            <Route path="/strategy" element={<Strategy />} />
            <Route path="/chat" element={<Chat />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}