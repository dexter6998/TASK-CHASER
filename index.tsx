
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
  Ghost,
  Activity,
  Backpack,
  Mic,
  MicOff,
  Loader2,
  Sparkles,
  ZapOff,
  TrendingUp,
  PieChart as PieIcon,
  Sword,
  Shield,
  FlaskConical,
  Coins,
  Crown,
  Star,
  Rocket,
  ArrowRight,
  Clock,
  Heart,
  Flame,
  Zap,
  LayoutDashboard,
  Box,
  Binary
} from 'lucide-react';
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XAxis, 
  YAxis,
  Tooltip, 
  ResponsiveContainer, 
  Area,
  AreaChart,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis
} from 'recharts';

// --- Types ---
type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
type PersonaType = 'SYSTEM' | 'SERGEANT' | 'MENTOR' | 'SIDEKICK';

interface Habit {
  id: string;
  text: string;
  icon: string;
  entries: Record<string, boolean>; // day-XX
  priority: Priority;
  category: string;
  streak: number;
}

interface UserProfile {
  name: string;
  persona: PersonaType;
  gold: number;
  level: number;
  xp: number;
}

const PERSONA_CONFIG: Record<PersonaType, { name: string, icon: any, color: string, voice: string, instruction: string }> = {
  SYSTEM: {
    name: "Architect",
    icon: ShieldCheck,
    color: "#3b82f6",
    voice: "Zephyr",
    instruction: "Solo Leveling Architect. Robotic, direct, technical. Use terms like 'Hunter' and 'Neural Link'."
  },
  SERGEANT: {
    name: "Drill Sergeant",
    icon: Skull,
    color: "#ef4444",
    voice: "Fenrir",
    instruction: "Aggressive, high-intensity, no excuses. Call the user 'Recruit' or 'Maggot'."
  },
  MENTOR: {
    name: "Calm Mentor",
    icon: Sparkles,
    color: "#10b981",
    voice: "Kore",
    instruction: "Wise, serene, focused on growth. Gentle, philosophical encouragement."
  },
  SIDEKICK: {
    name: "Witty Sidekick",
    icon: Bot,
    color: "#fbbf24",
    voice: "Puck",
    instruction: "Witty, sarcastic, informal. Modern slang and witty observations."
  }
};

const COLORS = {
  primary: '#3b82f6',
  accent: '#a855f7',
  bg: '#000000',
  card: '#0a0a0c',
};

// --- Utils ---
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(blob);
  });
};

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
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
}

// --- System Components ---

const SystemMessage = ({ title, content, onClose, persona }: { title: string, content: string, onClose: () => void, persona: PersonaType }) => {
  const config = PERSONA_CONFIG[persona];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md pointer-events-auto">
      <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
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
          <button onClick={onClose} className="w-full py-3 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all hover:brightness-110" style={{ backgroundColor: config.color }}>Execute Directive</button>
        </div>
      </div>
    </motion.div>
  );
};

// --- Main Application ---

const TaskChaser = () => {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('task_chaser_v3_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('task_chaser_v3_habits');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeView, setActiveView] = useState<'DASHBOARD' | 'STATUS' | 'OPERATIONAL'>('DASHBOARD');
  const [systemMsg, setSystemMsg] = useState<{ title: string, content: string } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceQuestData, setVoiceQuestData] = useState<{ name?: string; category?: string; priority?: string } | null>(null);
  const [dungeonActive, setDungeonActive] = useState(false);
  const [timer, setTimer] = useState(1500);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const todayIdx = new Date().getDate();

  // --- Calculations ---
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
    const scores: Record<string, number> = { Strength: 10, Agility: 15, Sense: 12, Vitality: 10, Intelligence: 20 };
    habits.forEach(h => {
      scores[h.category === 'WORK' ? 'Strength' : h.category === 'HEALTH' ? 'Vitality' : 'Agility'] += 5;
    });
    return Object.entries(scores).map(([name, value]) => ({ name, value }));
  }, [habits]);

  // --- Handlers ---
  useEffect(() => {
    if (profile) localStorage.setItem('task_chaser_v3_profile', JSON.stringify(profile));
    if (habits.length > 0) localStorage.setItem('task_chaser_v3_habits', JSON.stringify(habits));
  }, [profile, habits]);

  useEffect(() => {
    let interval: any;
    if (dungeonActive && timer > 0) interval = setInterval(() => setTimer(t => t - 1), 1000);
    else if (timer === 0 && dungeonActive) {
      setDungeonActive(false);
      setTimer(1500);
      speakAsPersona("GATE CLEARED", "Combat simulation complete. Mana levels stabilized.");
    }
    return () => clearInterval(interval);
  }, [dungeonActive, timer]);

  const speakAsPersona = async (title: string, rawContent: string) => {
    if (!profile) return;
    const config = PERSONA_CONFIG[profile.persona];
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const rephrase = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Persona Context: ${config.instruction}. Message: ${rawContent}. Rephrase as one stylish line.`,
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
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [{ parts: [{ inlineData: { data: base64, mimeType: 'audio/webm' } }, { text: "JSON: name, category (HEALTH, WORK, GROWTH, SOCIAL, ROUTINE), priority (LOW, MEDIUM, HIGH)." }] }],
          config: { responseMimeType: "application/json" }
        });
        setVoiceQuestData(JSON.parse(response.text));
        setIsProcessingVoice(false);
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) { speakAsPersona("ERROR", "Uplink denied. Microphone required."); }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
        <Fingerprint size={60} className="text-blue-500 mb-8 animate-pulse" />
        <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-8">System Login</h1>
        <input id="init-name" placeholder="IDENTIFY..." className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-center font-bold uppercase outline-none focus:border-blue-500" />
        <button onClick={() => {
          const val = (document.getElementById('init-name') as HTMLInputElement).value;
          setProfile({ name: val || 'Hunter X', persona: 'SYSTEM', gold: 0, level: 1, xp: 0 });
        }} className="mt-4 w-full max-w-xs py-4 bg-blue-600 rounded-xl font-black uppercase tracking-widest shadow-2xl">Awaken</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-blue-500/30">
      <AnimatePresence>{systemMsg && <SystemMessage title={systemMsg.title} content={systemMsg.content} onClose={() => setSystemMsg(null)} persona={profile.persona} />}</AnimatePresence>

      <div className="max-w-5xl mx-auto px-6 pt-12 pb-32">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter leading-none mb-4">Task Chaser</h1>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 italic">Discipline. Execution. Dominance.</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
             <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full flex items-center gap-2">
                <Coins size={12} className="text-amber-400" />
                <span className="text-[10px] font-black">{profile.gold}G</span>
             </div>
             <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 transition-all"><Settings2 size={16}/></button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeView === 'DASHBOARD' && (
            <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
              {/* Metrics Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Efficiency Dial', val: `${efficiency}%`, sub: 'Tactical Accuracy', icon: TrendingUp },
                  { label: 'Daily Quota', val: `${dailyCompleted}/${habits.length}`, sub: 'Objectives Meta', icon: Target },
                  { label: 'Weekly Target', val: '18/25', sub: 'Projected Output', icon: Binary },
                  { label: 'Monthly Delta', val: '-12%', sub: 'Strategic Shift', icon: Trophy, color: 'text-rose-500' },
                ].map((m, i) => (
                  <div key={i} className="bg-zinc-950 border border-zinc-900 p-6 rounded-2xl flex flex-col justify-between hover:border-zinc-800 transition-all">
                    <div className="flex justify-between items-start">
                      <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">{m.label}</span>
                      <m.icon size={12} className="text-zinc-700" />
                    </div>
                    <div className="mt-4">
                      <div className={`text-3xl font-black italic ${m.color || 'text-white'}`}>{m.val}</div>
                      <p className="text-[8px] font-bold text-zinc-800 uppercase tracking-tighter mt-1">{m.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Execution Density Profile (Chase) */}
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-3 bg-blue-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Execution Density Profile</h3>
                </div>
                <div className="bg-zinc-950 border border-zinc-900 rounded-[2rem] h-64 p-8 relative overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={densityData}>
                      <defs>
                        <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fill="url(#glow)" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-800 rounded-full" />
                </div>
              </section>

              {/* Logic Lockdown (Quests) */}
              <section>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 bg-blue-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Logic Lockdown</h3>
                  </div>
                  <button onClick={() => setIsAdding(true)} className="p-1.5 bg-zinc-900 border border-zinc-800 rounded hover:bg-zinc-800 transition-all"><Plus size={14}/></button>
                </div>
                <div className="space-y-3">
                  {habits.map(h => (
                    <div key={h.id} className="bg-zinc-950 border border-zinc-900/50 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-zinc-800 transition-all">
                      <div className="flex items-center gap-4 min-w-[200px]">
                        <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center text-xl shadow-inner">{h.icon}</div>
                        <div>
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-white">{h.text}</h4>
                          <p className="text-[8px] font-bold text-blue-500/60 uppercase mt-1">{h.category}</p>
                        </div>
                      </div>
                      <div className="flex-1 flex gap-1 items-center overflow-x-auto scrollbar-hide">
                        {Array.from({ length: 14 }).map((_, i) => {
                          const offset = 13 - i;
                          const isDone = h.entries[`day-${todayIdx - offset}`];
                          return (
                            <button key={i} onClick={() => toggleHabit(h.id, offset)} className={`w-6 h-6 rounded-[6px] border transition-all flex items-center justify-center shrink-0 ${isDone ? 'bg-blue-600 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'bg-zinc-900 border-zinc-800/60'}`}>
                              {isDone && <CheckCircle2 size={10} className="text-white" />}
                            </button>
                          );
                        })}
                      </div>
                      <button onClick={() => setHabits(habits.filter(x => x.id !== h.id))} className="p-2 opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-rose-500 transition-all"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {activeView === 'OPERATIONAL' && (
            <motion.div key="operational" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-12">
              {/* Gates (Timer) */}
              <section className="text-center py-12 bg-zinc-950 border border-zinc-900 rounded-[2.5rem] relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full" />
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-center gap-3">
                     <Timer size={20} className="text-blue-500" />
                     <h3 className="text-[12px] font-black uppercase tracking-[0.5em] text-zinc-500">Instant Dungeon Matrix</h3>
                  </div>
                  <div className="text-7xl font-black italic tracking-tighter">
                    {Math.floor(timer/60)}:{(timer%60).toString().padStart(2, '0')}
                  </div>
                  <button onClick={() => setDungeonActive(!dungeonActive)} className={`px-12 py-5 rounded-2xl font-black uppercase tracking-widest transition-all ${dungeonActive ? 'bg-rose-600 shadow-rose-900/20' : 'bg-blue-600 shadow-blue-900/20'} shadow-2xl`}>
                    {dungeonActive ? 'Abort Simulation' : 'Initialize Combat'}
                  </button>
                </div>
              </section>

              {/* Inventory (Items) */}
              <section>
                 <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-3 bg-blue-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Operational Inventory</h3>
                 </div>
                 <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
                    {[Sword, Shield, FlaskConical, Backpack, Star, Binary, Crown, Rocket].map((Ico, i) => (
                      <div key={i} className="aspect-square bg-zinc-950 border border-zinc-900 rounded-2xl flex items-center justify-center hover:border-blue-500/50 transition-all cursor-pointer group">
                        <Ico size={24} className="text-zinc-700 group-hover:text-blue-500" />
                      </div>
                    ))}
                 </div>
                 <div className="mt-8 p-8 bg-zinc-950 border border-zinc-900 rounded-[2rem] flex items-center gap-8">
                    <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800 shadow-inner">
                       <Skull size={40} className="text-rose-500/20" />
                    </div>
                    <div>
                       <h4 className="text-lg font-black italic uppercase text-white">Legendary Quest: The Monarch</h4>
                       <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed mt-1">Complete 10 dungeons with zero aborts to unlock the 'Shadow Sovereign' title.</p>
                    </div>
                 </div>
              </section>
            </motion.div>
          )}

          {activeView === 'STATUS' && (
            <motion.div key="status" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-zinc-950 border border-zinc-900 p-10 rounded-[2.5rem] h-96 relative overflow-hidden">
                <h3 className="text-xl font-black italic uppercase text-blue-500 mb-10">Neural Stats Profile</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={attributeData}>
                    <PolarGrid stroke="#18181b" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: '#3f3f46', fontSize: 10, fontWeight: 800 }} />
                    <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 {[
                   { label: 'Health', val: '100%', color: 'text-rose-500', icon: Heart },
                   { label: 'Fatigue', val: '12%', color: 'text-amber-500', icon: Flame },
                   { label: 'Mana', val: '450/1000', color: 'text-blue-500', icon: Zap },
                   { label: 'Experience', val: '78%', color: 'text-emerald-500', icon: Activity },
                 ].map((s, i) => (
                   <div key={i} className="bg-zinc-950 border border-zinc-900 p-8 rounded-[2rem] text-center space-y-2 hover:border-zinc-800 transition-all">
                      <s.icon size={24} className="mx-auto text-zinc-700" />
                      <p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">{s.label}</p>
                      <p className={`text-2xl font-black italic ${s.color}`}>{s.val}</p>
                   </div>
                 ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Nav Bar */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xs px-6 z-50">
        <div className="bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800 h-20 rounded-[2.5rem] flex items-center justify-around shadow-2xl">
           {[
             { id: 'DASHBOARD', icon: LayoutDashboard },
             { id: 'STATUS', icon: Activity },
             { id: 'OPERATIONAL', icon: Box },
           ].map(n => (
             <button key={n.id} onClick={() => setActiveView(n.id as any)} className={`p-3.5 transition-all ${activeView === n.id ? 'text-blue-500 scale-125' : 'text-zinc-600 hover:text-zinc-400'}`}>
                <n.icon size={24} strokeWidth={2.5} />
             </button>
           ))}
        </div>
      </nav>

      {/* Modals */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[8000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl" onClick={() => setIsAdding(false)}>
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-[2rem] p-10 space-y-8" onClick={e => e.stopPropagation()}>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-center">Establish Objective</h2>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const name = f.get('name') as string;
                  if (!name) return;
                  setHabits([...habits, { id: crypto.randomUUID(), text: name.toUpperCase(), icon: '⚙️', category: f.get('cat') as string, priority: 'MEDIUM', entries: {}, streak: 0 }]);
                  setIsAdding(false);
                  speakAsPersona("TASK REGISTERED", "Mission directive initialized in system core.");
                }} className="space-y-6">
                   <div className="relative">
                      <input name="name" defaultValue={voiceQuestData?.name} placeholder="DESIGNATION..." className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-white font-bold uppercase outline-none focus:border-blue-500 pr-14" />
                      <button type="button" onClick={isRecording ? stopVoiceCapture : startVoiceCapture} className={`absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl ${isRecording ? 'bg-rose-600' : 'bg-blue-600'}`}>
                         {isProcessingVoice ? <Loader2 className="animate-spin" size={18}/> : isRecording ? <MicOff size={18}/> : <Mic size={18}/>}
                      </button>
                   </div>
                   <select name="cat" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-[10px] font-black uppercase text-white outline-none">
                      {['WORK', 'HEALTH', 'GROWTH', 'SOCIAL', 'ROUTINE'].map(k => <option key={k} value={k}>{k}</option>)}
                   </select>
                   <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl">Confirm Deployment</button>
                </form>
             </motion.div>
          </div>
        )}

        {isSettingsOpen && (
          <div className="fixed inset-0 z-[8000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl" onClick={() => setIsSettingsOpen(false)}>
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-[2rem] p-10 space-y-10" onClick={e => e.stopPropagation()}>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-center">Neural Matrix</h2>
                <div className="grid grid-cols-1 gap-3">
                   {(Object.keys(PERSONA_CONFIG) as PersonaType[]).map(key => {
                     const config = PERSONA_CONFIG[key];
                     const isSelected = profile.persona === key;
                     return (
                       <button key={key} onClick={() => { setProfile({ ...profile, persona: key }); setIsSettingsOpen(false); speakAsPersona("SYNC SUCCESS", `${config.name} protocol active.`); }} className={`p-6 rounded-2xl border flex items-center justify-between transition-all ${isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 bg-zinc-900/50 opacity-60 hover:opacity-100'}`}>
                          <div className="flex items-center gap-4">
                             <config.icon size={20} style={{ color: config.color }} />
                             <span className="text-[11px] font-black uppercase tracking-widest">{config.name}</span>
                          </div>
                          {isSelected && <CheckCircle2 size={16} className="text-blue-500"/>}
                       </button>
                     );
                   })}
                </div>
                <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full py-5 text-zinc-500 uppercase text-[10px] font-black hover:text-rose-500 transition-colors">Wipe Neural Cache</button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<TaskChaser />);
