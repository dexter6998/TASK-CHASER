
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Plus, 
  Trash2, 
  Target,
  Trophy,
  X,
  ShieldCheck,
  CheckCircle2,
  Bot,
  Fingerprint,
  Settings2,
  Skull,
  Timer,
  Activity,
  Backpack,
  Mic,
  MicOff,
  Loader2,
  Sparkles,
  ZapOff,
  Sword,
  Shield,
  FlaskConical,
  Coins,
  Crown,
  Star,
  Rocket,
  Zap,
  LayoutDashboard,
  Box,
  Binary,
  Heart,
  Flame,
  Calendar,
  Download,
  Clock,
  ChevronRight,
  Monitor,
  ClipboardList,
  AlertCircle,
  Waves
} from 'lucide-react';
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ResponsiveContainer, 
  Area,
  AreaChart,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis
} from 'recharts';

// --- Types & Config ---
type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
type PersonaType = 'SYSTEM' | 'SERGEANT' | 'MENTOR' | 'SIDEKICK';

interface Habit {
  id: string;
  text: string;
  icon: string;
  entries: Record<string, boolean>; 
  priority: Priority;
  category: string;
  scheduleTime?: string; // HH:mm format
}

interface UserProfile {
  name: string;
  persona: PersonaType;
  gold: number;
}

const PERSONA_CONFIG: Record<PersonaType, { name: string, icon: any, color: string, voice: string, instruction: string }> = {
  SYSTEM: {
    name: "Architect",
    icon: ShieldCheck,
    color: "#3b82f6",
    voice: "Zephyr",
    instruction: "Solo Leveling Architect. Robotic, direct, technical. Hunter terminology."
  },
  SERGEANT: {
    name: "Drill Sergeant",
    icon: Skull,
    color: "#ef4444",
    voice: "Fenrir",
    instruction: "Aggressive, high-intensity, no excuses. Call them Recruit."
  },
  MENTOR: {
    name: "Calm Mentor",
    icon: Sparkles,
    color: "#10b981",
    voice: "Kore",
    instruction: "Wise, serene, focused on growth. Gentle encouragement."
  },
  SIDEKICK: {
    name: "Witty Sidekick",
    icon: Bot,
    color: "#fbbf24",
    voice: "Puck",
    instruction: "Witty, sarcastic, informal. Modern slang."
  }
};

// --- Utilities ---
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(blob);
  });
};

const decode = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

const generateICS = (habits: Habit[]) => {
  let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//TaskChaser//NONSGML v1.0//EN\n";
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  
  habits.forEach(h => {
    const time = h.scheduleTime || "08:00";
    const [hh, mm] = time.split(':');
    icsContent += "BEGIN:VEVENT\n";
    icsContent += `SUMMARY:Objective: ${h.text}\n`;
    icsContent += `DTSTART:${dateStr}T${hh}${mm}00\n`;
    icsContent += `DTEND:${dateStr}T${(parseInt(hh)+1).toString().padStart(2, '0')}${mm}00\n`;
    icsContent += "RRULE:FREQ=DAILY\n";
    icsContent += `DESCRIPTION:Task Chaser Quest - ${h.category}\n`;
    icsContent += "END:VEVENT\n";
  });
  icsContent += "END:VCALENDAR";
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "TaskChaser_Schedule.ics";
  link.click();
};

// --- Components ---

const SystemMessage = ({ title, content, onClose, persona }: { title: string, content: string, onClose: () => void, persona: PersonaType }) => {
  const config = PERSONA_CONFIG[persona];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <config.icon size={12} style={{ color: config.color }} />
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: config.color }}>{config.name} Uplink</span>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors"><X size={14}/></button>
        </div>
        <div className="p-8 text-center space-y-6">
          <h3 className="text-lg font-black uppercase tracking-tighter text-white">{title}</h3>
          <p className="text-sm text-zinc-400 font-medium leading-relaxed italic">"{content}"</p>
          <button onClick={onClose} className="w-full py-4 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all" style={{ backgroundColor: config.color }}>Acknowledge Directive</button>
        </div>
      </div>
    </motion.div>
  );
};

const VoiceWave = () => (
  <div className="voice-wave">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="voice-bar" style={{ animationDelay: `${i * 0.1}s` }} />
    ))}
  </div>
);

const TaskChaser = () => {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('task_chaser_v6_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('task_chaser_v6_habits');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeView, setActiveView] = useState<'DASHBOARD' | 'OPERATIONAL' | 'STATUS'>('DASHBOARD');
  const [systemMsg, setSystemMsg] = useState<{ title: string, content: string } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [dungeonActive, setDungeonActive] = useState(false);
  const [timer, setTimer] = useState(1500);

  // Daily Summary State
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<{ text: string, rank: string } | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const todayIdx = new Date().getDate();

  // --- Statistics ---
  const efficiency = useMemo(() => {
    if (habits.length === 0) return 0;
    const completed = habits.filter(h => h.entries[`day-${todayIdx}`]).length;
    return Math.round((completed / habits.length) * 100);
  }, [habits, todayIdx]);

  const densityData = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => {
      const d = todayIdx - (13 - i);
      const label = d <= 0 ? (30 + d) : d;
      const count = habits.reduce((acc, h) => acc + (h.entries[`day-${label}`] ? 1 : 0), 0);
      return { name: label, value: count };
    });
  }, [habits, todayIdx]);

  const attributeData = useMemo(() => {
    const scores = { Strength: 10, Agility: 15, Sense: 12, Vitality: 10, Intelligence: 20 };
    habits.forEach(h => {
      if (h.category === 'WORK') scores.Strength += 2;
      if (h.category === 'HEALTH') scores.Vitality += 2;
      if (h.category === 'ROUTINE') scores.Agility += 2;
      if (h.category === 'GROWTH') scores.Intelligence += 2;
    });
    return Object.entries(scores).map(([name, value]) => ({ name, value }));
  }, [habits]);

  // --- Persistence ---
  useEffect(() => {
    if (profile) localStorage.setItem('task_chaser_v6_profile', JSON.stringify(profile));
    if (habits.length > 0) localStorage.setItem('task_chaser_v6_habits', JSON.stringify(habits));
  }, [profile, habits]);

  // --- Dungeon Timer ---
  useEffect(() => {
    let interval: any;
    if (dungeonActive && timer > 0) interval = setInterval(() => setTimer(t => t - 1), 1000);
    else if (timer === 0 && dungeonActive) {
      setDungeonActive(false);
      setTimer(1500);
      speakAsPersona("PHASE COMPLETE", "Gate cleared. Efficiency metrics spiking.");
    }
    return () => clearInterval(interval);
  }, [dungeonActive, timer]);

  // --- AI Logic ---
  const speakAsPersona = async (title: string, rawContent: string) => {
    if (!profile) return;
    const config = PERSONA_CONFIG[profile.persona];
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const rephrase = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Persona: ${config.instruction}. Message: ${rawContent}. One short, punchy hunter line.`,
      });
      const styled = rephrase.text.trim();
      setSystemMsg({ title, content: styled });

      const tts = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: styled }] }],
        config: { 
          responseModalities: [Modality.AUDIO], 
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voice } } } 
        },
      });
      const audioData = tts.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioData) {
        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
        const buffer = await decodeAudioData(decode(audioData), audioCtxRef.current, 24000, 1);
        const source = audioCtxRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtxRef.current.destination);
        source.start();
      }
    } catch (e) { setSystemMsg({ title, content: rawContent }); }
  };

  const generateDailyDebrief = async () => {
    if (!profile || habits.length === 0) return;
    setIsGeneratingSummary(true);
    const config = PERSONA_CONFIG[profile.persona];
    const completed = habits.filter(h => h.entries[`day-${todayIdx}`]);
    const missed = habits.filter(h => !h.entries[`day-${todayIdx}`]);
    
    let rank = 'F';
    if (efficiency >= 95) rank = 'S';
    else if (efficiency >= 80) rank = 'A';
    else if (efficiency >= 60) rank = 'B';
    else if (efficiency >= 40) rank = 'C';

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Persona: ${config.instruction}. 
      Status Report for Hunter ${profile.name}:
      Completed: ${completed.map(h => h.text).join(', ') || 'None'}
      Missed: ${missed.map(h => h.text).join(', ') || 'None'}
      Efficiency: ${efficiency}%
      Calculated Rank: ${rank}
      Generate a tactical summary de-briefing including motivational closing. Keep it under 60 words.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setSummaryData({ text: response.text.trim(), rank });
      setIsSummaryOpen(true);
    } catch (err) {
      setSummaryData({ text: "Critical system error during debrief. Summary unavailable.", rank: '?' });
      setIsSummaryOpen(true);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const toggleHabit = (id: string, offset: number) => {
    const day = todayIdx - offset;
    const key = `day-${day}`;
    setHabits(habits.map(h => h.id === id ? { ...h, entries: { ...h.entries, [key]: !h.entries[key] } } : h));
  };

  const startVoiceCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        setIsProcessingVoice(true);
        const base64 = await blobToBase64(audioBlob);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ 
              parts: [
                { inlineData: { data: base64, mimeType: 'audio/webm' } }, 
                { text: "Extract the habit details from this audio command. Format as JSON with keys: name (uppercase), category (choose from WORK, HEALTH, GROWTH, ROUTINE), priority (choose from LOW, MEDIUM, HIGH), scheduleTime (HH:mm, 24h format). If no time is mentioned, default to 08:00." }
              ] 
            }],
            config: { 
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  priority: { type: Type.STRING },
                  scheduleTime: { type: Type.STRING }
                },
                required: ["name", "category", "priority", "scheduleTime"]
              }
            }
          });
          
          const result = JSON.parse(response.text);
          setHabits([...habits, { 
            id: crypto.randomUUID(), 
            text: result.name.toUpperCase(), 
            icon: '⚡', 
            category: result.category, 
            priority: result.priority || 'MEDIUM', 
            entries: {},
            scheduleTime: result.scheduleTime || '08:00'
          }]);
          speakAsPersona("OBJECTIVE CAPTURED", `Syncing ${result.name} to operational grid.`);
        } catch (error) {
          console.error("AI Extraction failed:", error);
          speakAsPersona("COMM LINK ERR", "Neural extraction failed. Manual input required.");
        } finally {
          setIsProcessingVoice(false);
          setIsAdding(false);
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) { 
      speakAsPersona("SYNC ERROR", "Microphone access denied. Uplink severed."); 
    }
  };

  const stopVoiceCapture = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
        <Fingerprint size={100} className="text-blue-500 mb-10 animate-pulse" />
        <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-14 text-center">Neural Login Required</h1>
        <input id="init-name" placeholder="IDENTIFY HUNTER..." className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center font-bold uppercase outline-none focus:border-blue-500 transition-all mb-6" />
        <button onClick={() => {
          const val = (document.getElementById('init-name') as HTMLInputElement).value;
          setProfile({ name: val || 'Hunter X', persona: 'SYSTEM', gold: 0 });
        }} className="w-full max-w-sm py-6 bg-blue-600 rounded-3xl font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform">Initialize Connection</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden pb-48">
      <AnimatePresence>{systemMsg && <SystemMessage title={systemMsg.title} content={systemMsg.content} onClose={() => setSystemMsg(null)} persona={profile.persona} />}</AnimatePresence>

      <div className="max-w-6xl mx-auto px-6 pt-16">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <h1 className="text-7xl font-black uppercase italic tracking-tighter leading-none text-white">Task Chaser</h1>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_#3b82f6]" />
                <span className="text-[11px] font-black uppercase tracking-[0.6em] text-zinc-500">Hunter: {profile.name}</span>
              </div>
              <div className="h-4 w-px bg-zinc-800" />
              <div className="flex items-center gap-2">
                <Coins size={14} className="text-amber-500" />
                <span className="text-xs font-black tracking-widest">{profile.gold} Credits</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
             <button 
                onClick={generateDailyDebrief}
                disabled={isGeneratingSummary}
                className="px-8 py-3.5 bg-blue-600/10 border border-blue-500/50 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-blue-600/20 transition-all disabled:opacity-50"
             >
                {isGeneratingSummary ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <ClipboardList size={16} className="text-blue-500" />}
                Daily Debrief
             </button>
             <button onClick={() => setIsSettingsOpen(true)} className="p-4 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 transition-all"><Settings2 size={20}/></button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeView === 'DASHBOARD' && (
            <motion.div key="dash" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-16">
              
              {/* JARVIS Quick Action Section */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 bg-gradient-to-br from-blue-600/20 to-transparent border border-blue-500/30 p-10 rounded-[3rem] flex items-center justify-between group hover:border-blue-500/50 transition-all">
                   <div className="space-y-4">
                      <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Neural Link Active</span>
                      </div>
                      <h2 className="text-3xl font-black italic uppercase text-white tracking-tighter">Voice Command Objective</h2>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Speak naturally to add missions. "JARVIS, add a gym session tomorrow at 8 AM."</p>
                   </div>
                   <button 
                    onClick={() => { setIsAdding(true); setTimeout(() => startVoiceCapture(), 500); }} 
                    className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:scale-110 active:scale-95 transition-all"
                   >
                      <Mic size={32} />
                   </button>
                </div>
              </div>

              {/* Performance Hub */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Sync Accuracy', val: `${efficiency}%`, sub: 'Daily Delta', icon: Activity },
                  { label: 'Daily Quota', val: `${habits.filter(h => h.entries[`day-${todayIdx}`]).length}/${habits.length}`, sub: 'Objectives', icon: Target },
                  { label: 'Weekly Streak', val: '8 Days', sub: 'Continuity', icon: Trophy, color: 'text-amber-500' },
                  { label: 'Mana Reserve', val: '450', sub: 'Status', icon: Zap, color: 'text-blue-400' },
                ].map((m, i) => (
                  <div key={i} className="bg-zinc-950 border border-zinc-900 p-10 rounded-[2.5rem] flex flex-col justify-between hover:border-zinc-700 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex justify-between items-start">
                       <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400">{m.label}</span>
                       <m.icon size={16} className="text-zinc-800 group-hover:text-zinc-400" />
                    </div>
                    <div className="mt-8">
                      <div className={`text-5xl font-black italic tracking-tighter ${m.color || 'text-white'}`}>{m.val}</div>
                      <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-tighter mt-2">{m.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Intensity Profile */}
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 italic">Temporal Intensity Matrix</h3>
                </div>
                <div className="bg-zinc-950 border border-zinc-900 rounded-[3.5rem] h-80 p-12 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-blue-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={densityData}>
                      <defs>
                        <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={5} fill="url(#glow)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Objectives List */}
              <section>
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 italic">Logic Lockdown</h3>
                  </div>
                  <button onClick={() => setIsAdding(true)} className="px-6 py-2.5 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-3 shadow-lg shadow-blue-900/20">
                    <Plus size={16}/> New Mission
                  </button>
                </div>
                <div className="space-y-5">
                  {habits.map(h => {
                    // Calculate 7-day progress indicator
                    const weekProgress = Array.from({ length: 7 }).map((_, i) => {
                      const day = todayIdx - (6 - i);
                      return !!h.entries[`day-${day}`];
                    });

                    return (
                      <div key={h.id} className="bg-zinc-950 border border-zinc-900 p-8 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-10 group hover:border-zinc-700 transition-all">
                        <div className="flex items-center gap-6 min-w-[280px]">
                          <div className="w-16 h-16 bg-zinc-900 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-inner border border-zinc-800 group-hover:scale-105 transition-transform">{h.icon}</div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h4 className="text-sm font-black uppercase tracking-widest text-white">{h.text}</h4>
                            </div>
                            
                            {/* 7-Day Subtle Progress Indicator */}
                            <div className="flex items-center gap-1.5 mt-2.5 mb-1">
                               {weekProgress.map((done, i) => (
                                 <div key={i} className={`w-2.5 h-1 rounded-full transition-colors ${done ? 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]' : 'bg-zinc-800'}`} />
                               ))}
                               <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest ml-1">7D Clearance</span>
                            </div>

                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-[9px] font-bold text-zinc-600 uppercase bg-zinc-900 px-3 py-1 rounded-full">{h.category}</span>
                              <div className="flex items-center gap-1.5">
                                <Clock size={10} className="text-blue-500" />
                                <span className="text-[9px] font-bold text-blue-500 uppercase">{h.scheduleTime || '09:00'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 flex gap-2.5 items-center overflow-x-auto scrollbar-hide px-2">
                          {Array.from({ length: 14 }).map((_, i) => {
                            const offset = 13 - i;
                            const isDone = h.entries[`day-${todayIdx - offset}`];
                            return (
                              <button key={i} onClick={() => toggleHabit(h.id, offset)} className={`w-10 h-10 rounded-xl border transition-all flex items-center justify-center shrink-0 ${isDone ? 'bg-blue-600 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'bg-zinc-900 border-zinc-800/60 hover:border-zinc-500'}`}>
                                {isDone && <CheckCircle2 size={16} className="text-white" />}
                              </button>
                            );
                          })}
                        </div>
                        <button onClick={() => setHabits(habits.filter(x => x.id !== h.id))} className="p-4 opacity-0 group-hover:opacity-100 text-zinc-800 hover:text-rose-500 transition-all"><Trash2 size={20}/></button>
                      </div>
                    );
                  })}
                  {habits.length === 0 && (
                    <div className="py-32 text-center border-2 border-dashed border-zinc-900 rounded-[3.5rem] bg-zinc-950/20">
                      <Skull size={48} className="mx-auto text-zinc-900 mb-6" />
                      <p className="text-[11px] font-black uppercase tracking-[0.8em] text-zinc-800">Operational Grid Empty. Initialize Quest.</p>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {activeView === 'OPERATIONAL' && (
            <motion.div key="oper" initial={{ opacity: 0, x: 25 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -25 }} className="space-y-16">
              {/* Tactical Schedule & Combat View */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Visual Schedule View */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-[3.5rem] p-12 flex flex-col h-[500px]">
                  <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-3">
                      <Calendar size={20} className="text-blue-500" />
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Operational Timeline</h3>
                    </div>
                    <button onClick={() => generateICS(habits)} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl hover:text-blue-500 transition-all flex items-center gap-2">
                       <Download size={16}/><span className="text-[9px] font-black uppercase tracking-widest">Sync Device</span>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-4 space-y-4 scrollbar-hide">
                    {/* Time blocks 06:00 to 22:00 */}
                    {Array.from({ length: 17 }).map((_, i) => {
                      const hour = (6 + i).toString().padStart(2, '0');
                      const hourTasks = habits.filter(h => h.scheduleTime?.startsWith(hour));
                      return (
                        <div key={hour} className="flex gap-6 min-h-[60px] relative group">
                          <div className="w-10 text-[10px] font-black text-zinc-700 uppercase pt-1">{hour}:00</div>
                          <div className="flex-1 border-t border-zinc-900/50 pt-3 relative">
                             {hourTasks.map(ht => (
                               <motion.div key={ht.id} layoutId={ht.id} className="bg-blue-600/10 border-l-4 border-blue-500 p-4 rounded-xl flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-4">
                                    <span className="text-lg">{ht.icon}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white">{ht.text}</span>
                                  </div>
                                  <span className="text-[9px] font-bold text-zinc-500 uppercase">{ht.category}</span>
                               </motion.div>
                             ))}
                             {hourTasks.length === 0 && <div className="h-full w-full opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/10 rounded-xl" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Instant Dungeon / Pomodoro */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-[3.5rem] p-16 relative overflow-hidden flex flex-col items-center justify-center text-center space-y-10">
                  <div className="absolute inset-0 bg-blue-500/5 blur-[120px] rounded-full" />
                  <div className="relative z-10 space-y-6">
                    <div className="flex flex-col items-center gap-3">
                       <Timer size={32} className="text-blue-500 mb-2 animate-pulse" />
                       <h3 className="text-[12px] font-black uppercase tracking-[0.6em] text-zinc-500">Instant Dungeon Core</h3>
                    </div>
                    <div className="text-9xl font-black italic tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                      {Math.floor(timer/60)}:{(timer%60).toString().padStart(2, '0')}
                    </div>
                    <button onClick={() => setDungeonActive(!dungeonActive)} className={`px-16 py-6 rounded-[2rem] font-black uppercase tracking-widest transition-all ${dungeonActive ? 'bg-rose-600 shadow-rose-900/40' : 'bg-blue-600 shadow-blue-900/40'} shadow-2xl hover:scale-105 active:scale-95`}>
                      {dungeonActive ? 'Abort Simulation' : 'Enter Gate'}
                    </button>
                    <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest pt-4 italic">Time moves slower for the disciplined.</p>
                  </div>
                </div>
              </section>

              {/* Equipment Inventory */}
              <section>
                 <div className="flex items-center gap-3 mb-10">
                    <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Tactical Equipment Inventory</h3>
                 </div>
                 <div className="grid grid-cols-4 md:grid-cols-8 gap-6 mb-10">
                    {[Sword, Shield, FlaskConical, Backpack, Star, Binary, Crown, Rocket].map((Ico, i) => (
                      <div key={i} className="aspect-square bg-zinc-950 border border-zinc-900 rounded-[2rem] flex items-center justify-center hover:border-blue-500 hover:bg-blue-500/5 transition-all cursor-pointer group hover:-translate-y-2">
                        <Ico size={32} className="text-zinc-800 group-hover:text-blue-500 transition-colors" />
                      </div>
                    ))}
                 </div>
                 <div className="p-12 bg-zinc-950 border border-zinc-900 rounded-[3.5rem] flex items-center gap-12 group hover:border-zinc-700 transition-all">
                    <div className="w-28 h-28 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center border border-zinc-800 shadow-inner group-hover:scale-110 transition-transform">
                       <Crown size={56} className="text-amber-500/10 group-hover:text-amber-500 transition-colors" />
                    </div>
                    <div className="space-y-4 flex-1">
                       <div className="flex justify-between items-end">
                         <h4 className="text-3xl font-black italic uppercase text-white tracking-tight">The Monarch's Regalia</h4>
                         <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Tier: Legendary</span>
                       </div>
                       <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">System Mastery item. Increases Efficiency Multiplier by +2.0x. Unlock via 90%+ daily completion for 14 operational cycles.</p>
                       <div className="relative w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: '45%' }} className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                       </div>
                    </div>
                 </div>
              </section>
            </motion.div>
          )}

          {activeView === 'STATUS' && (
            <motion.div key="status" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-zinc-950 border border-zinc-900 p-16 rounded-[4rem] h-[550px] relative">
                <h3 className="text-[12px] font-black uppercase tracking-[0.6em] text-blue-500 mb-16 text-center">Neural Attribute Convergence</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={attributeData}>
                    <PolarGrid stroke="#18181b" strokeWidth={2} />
                    <PolarAngleAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 12, fontWeight: 900 }} />
                    <Radar dataKey="value" stroke="#3b82f6" strokeWidth={4} fill="#3b82f6" fillOpacity={0.15} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-6">
                 {[
                   { label: 'Cellular Health', val: '100%', color: 'text-rose-500', icon: Heart, sub: 'Optimized State' },
                   { label: 'Neural Burn', val: '12%', color: 'text-amber-500', icon: Flame, sub: 'Safe Parameters' },
                   { label: 'Essence Reserve', val: '450/1000', color: 'text-blue-500', icon: Zap, sub: 'Stable Load' },
                   { label: 'Evolutionary Tier', val: 'LV.14', color: 'text-emerald-500', icon: Binary, sub: 'High Potential' },
                 ].map((s, i) => (
                   <div key={i} className="bg-zinc-950 border border-zinc-900 p-12 rounded-[3.5rem] flex flex-col items-center justify-center space-y-6 hover:border-zinc-700 transition-all group shadow-xl">
                      <s.icon size={40} className="text-zinc-800 group-hover:text-white transition-colors" />
                      <div className="text-center space-y-2">
                        <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.4em]">{s.label}</p>
                        <p className={`text-4xl font-black italic ${s.color}`}>{s.val}</p>
                        <p className="text-[9px] font-bold text-zinc-800 uppercase tracking-widest pt-2">{s.sub}</p>
                      </div>
                   </div>
                 ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Primary Tactical HUD Navigation */}
      <nav className="fixed bottom-12 left-1/2 -translate-x-1/2 w-full max-w-sm px-8 z-[5000]">
        <div className="neo-blur border border-zinc-800/50 h-24 rounded-[3rem] flex items-center justify-around shadow-[0_50px_100px_rgba(0,0,0,0.95)] px-6">
           {[
             { id: 'DASHBOARD', icon: LayoutDashboard },
             { id: 'OPERATIONAL', icon: Box },
             { id: 'STATUS', icon: Activity },
           ].map(n => (
             <button key={n.id} onClick={() => setActiveView(n.id as any)} className={`p-5 transition-all flex items-center justify-center group ${activeView === n.id ? 'text-blue-500 scale-125' : 'text-zinc-700 hover:text-zinc-300'}`}>
                <n.icon size={28} strokeWidth={2.5} className="group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
             </button>
           ))}
        </div>
      </nav>

      {/* Modals --- */}
      <AnimatePresence>
        {isSummaryOpen && summaryData && (
          <div className="fixed inset-0 z-[8500] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl" onClick={() => setIsSummaryOpen(false)}>
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-[4rem] p-12 overflow-hidden relative shadow-2xl" onClick={e => e.stopPropagation()}>
               <div className="absolute top-0 right-0 p-20 opacity-[0.03] pointer-events-none">
                  <ClipboardList size={400} />
               </div>
               
               <div className="relative z-10 space-y-10">
                  <div className="flex justify-between items-center">
                    <div className="space-y-2">
                       <div className="flex items-center gap-3">
                         <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
                         <span className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500">End of Cycle Debrief</span>
                       </div>
                       <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter">Mission Summary</h2>
                    </div>
                    <div className="w-24 h-24 rounded-[2rem] bg-zinc-900 border border-zinc-800 flex items-center justify-center relative shadow-inner">
                       <span className={`text-5xl font-black italic ${summaryData.rank === 'S' ? 'text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'text-blue-500'}`}>{summaryData.rank}</span>
                       <span className="absolute -bottom-2 -right-2 text-[8px] font-black uppercase bg-zinc-800 px-2 py-1 rounded border border-zinc-700">RANK</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 py-8 border-y border-zinc-900">
                     <div className="space-y-4">
                        <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest flex items-center gap-2">
                           <CheckCircle2 size={12} /> S-Rank Clearance
                        </span>
                        <div className="space-y-2">
                          {habits.filter(h => h.entries[`day-${todayIdx}`]).slice(0, 4).map(h => (
                            <div key={h.id} className="text-[11px] font-bold text-zinc-300 uppercase tracking-tighter truncate">{h.text}</div>
                          ))}
                          {habits.filter(h => h.entries[`day-${todayIdx}`]).length > 4 && <div className="text-[9px] font-black text-zinc-600">... AND OTHERS</div>}
                        </div>
                     </div>
                     <div className="space-y-4 border-l border-zinc-900 pl-8">
                        <span className="text-[10px] font-black uppercase text-rose-500 tracking-widest flex items-center gap-2">
                           <AlertCircle size={12} /> Missed Objectives
                        </span>
                        <div className="space-y-2">
                          {habits.filter(h => !h.entries[`day-${todayIdx}`]).slice(0, 4).map(h => (
                            <div key={h.id} className="text-[11px] font-bold text-zinc-600 uppercase tracking-tighter truncate italic">{h.text}</div>
                          ))}
                          {habits.filter(h => !h.entries[`day-${todayIdx}`]).length === 0 && <div className="text-[10px] font-black text-emerald-500/30 uppercase">CLEARANCE 100%</div>}
                        </div>
                     </div>
                  </div>

                  <div className="bg-zinc-900/50 p-10 rounded-[2.5rem] border border-zinc-800 relative">
                     <div className="absolute -top-3 left-8 px-4 bg-zinc-950 border border-zinc-800 rounded-full text-[8px] font-black uppercase tracking-widest text-blue-500">
                        Advisor Commentary
                     </div>
                     <p className="text-sm font-medium italic text-zinc-400 leading-relaxed">
                        "{summaryData.text}"
                     </p>
                  </div>

                  <button onClick={() => setIsSummaryOpen(false)} className="w-full py-8 bg-zinc-900 border border-zinc-800 rounded-[2rem] text-xs font-black uppercase tracking-[0.4em] hover:bg-zinc-800 transition-all">
                     Terminate Session
                  </button>
               </div>
            </motion.div>
          </div>
        )}

        {isAdding && (
          <div className="fixed inset-0 z-[8000] flex items-center justify-center p-6 bg-black/98 backdrop-blur-2xl" onClick={() => { if (!isRecording) setIsAdding(false); }}>
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-[4rem] p-16 space-y-12" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">Neural Uplink</h2>
                  <button onClick={() => setIsAdding(false)} className="p-4 text-zinc-700 hover:text-white"><X size={24}/></button>
                </div>
                
                <div className="flex flex-col items-center gap-10 py-6">
                   <div className="relative">
                     <motion.button 
                      onClick={isRecording ? stopVoiceCapture : startVoiceCapture} 
                      animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-rose-600 shadow-[0_0_50px_rgba(225,29,72,0.5)]' : 'bg-blue-600 shadow-[0_0_50px_rgba(59,130,246,0.3)] hover:scale-105'}`}
                     >
                       {isProcessingVoice ? <Loader2 className="animate-spin text-white" size={48}/> : isRecording ? <MicOff size={48}/> : <Mic size={48}/>}
                     </motion.button>
                     {isRecording && <div className="absolute -bottom-12 left-1/2 -translate-x-1/2"><VoiceWave /></div>}
                   </div>
                   
                   <div className="text-center space-y-2">
                      <p className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-500">
                        {isRecording ? "Listening to User Input..." : isProcessingVoice ? "Processing Neural Data..." : "Tap to Speak Command"}
                      </p>
                      <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest max-w-[200px] mx-auto">
                        "Add a high priority work task for tomorrow at 10 AM."
                      </p>
                   </div>
                </div>

                <div className="pt-8 border-t border-zinc-900">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-8 text-center">Manual Intervention</h3>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const name = f.get('name') as string;
                    if (!name) return;
                    setHabits([...habits, { 
                      id: crypto.randomUUID(), 
                      text: name.toUpperCase(), 
                      icon: '⚡', 
                      category: f.get('cat') as string, 
                      priority: 'MEDIUM', 
                      entries: {},
                      scheduleTime: (f.get('time') as string) || '08:00'
                    }]);
                    setIsAdding(false);
                    speakAsPersona("SYNCHRONIZED", "The operational matrix has been updated manually.");
                  }} className="space-y-8">
                     <div className="relative">
                        <input name="name" placeholder="OBJECTIVE DESIGNATION..." className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-7 text-white font-bold uppercase outline-none focus:border-blue-500 transition-all shadow-inner text-sm" />
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <select name="cat" className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-[10px] font-black uppercase text-white outline-none appearance-none cursor-pointer">
                           {['WORK', 'HEALTH', 'GROWTH', 'ROUTINE'].map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                        <input type="time" name="time" defaultValue="08:00" className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-[10px] font-black uppercase text-white outline-none" />
                     </div>
                     <button type="submit" className="w-full py-6 bg-zinc-900 border border-zinc-800 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-zinc-800 transition-all">Execute Manual Sync</button>
                  </form>
                </div>
             </motion.div>
          </div>
        )}

        {isSettingsOpen && (
          <div className="fixed inset-0 z-[8000] flex items-center justify-center p-6 bg-black/98 backdrop-blur-2xl" onClick={() => setIsSettingsOpen(false)}>
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-[4rem] p-16 space-y-14" onClick={e => e.stopPropagation()}>
                <h2 className="text-5xl font-black uppercase italic tracking-tighter text-center text-white">Neural Interface Matrix</h2>
                <div className="grid grid-cols-1 gap-6">
                   {(Object.keys(PERSONA_CONFIG) as PersonaType[]).map(key => {
                     const config = PERSONA_CONFIG[key];
                     const isSelected = profile.persona === key;
                     return (
                       <button key={key} onClick={() => { setProfile({ ...profile, persona: key }); setIsSettingsOpen(false); speakAsPersona("SYNCED", `${config.name} online.`); }} className={`p-8 rounded-[2.5rem] border-2 flex items-center justify-between transition-all ${isSelected ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'border-zinc-900 bg-zinc-900/30 opacity-60 hover:opacity-100'}`}>
                          <div className="flex items-center gap-6">
                             <config.icon size={32} style={{ color: config.color }} />
                             <div className="text-left">
                                <span className="block text-sm font-black uppercase tracking-widest">{config.name}</span>
                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Uplink: {config.voice} Protocol</span>
                             </div>
                          </div>
                          {isSelected && <CheckCircle2 size={24} className="text-blue-500"/>}
                       </button>
                     );
                   })}
                </div>
                <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full py-8 text-zinc-800 uppercase text-[10px] font-black hover:text-rose-500 transition-colors flex items-center justify-center gap-4"><ZapOff size={20}/> Purge Neural Database</button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Execution ---
const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<TaskChaser />);
}
