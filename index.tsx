
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  Loader2, 
  Zap,
  Target,
  Activity,
  Settings2,
  Flame,
  Edit2,
  Cpu,
  Wifi,
  Radio,
  Terminal,
  BrainCircuit,
  Lock,
  Trophy,
  ChevronRight,
  TrendingUp,
  LineChart,
  Volume2,
  VolumeX,
  Bell,
  BellRing,
  Clock,
  X,
  ShieldAlert,
  AlertTriangle,
  Circle,
  Music,
  Waves,
  Sun,
  Moon,
  ZapOff,
  Calendar,
  Repeat,
  LayoutGrid,
  Filter,
  Layers,
  Award,
  ShieldCheck,
  ZapIcon,
  Timer,
  CheckCircle2,
  Star,
  MessageSquare,
  Bot,
  Command,
  Briefcase,
  TrendingDown,
  Power,
  Globe,
  PieChart,
  User,
  Coffee,
  Heart,
  Laptop,
  BarChart3,
  AreaChart as AreaChartIcon
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bar, 
  XAxis, 
  YAxis,
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  ComposedChart, 
  Line,
  CartesianGrid,
  Area,
  AreaChart,
  BarChart
} from 'recharts';

// --- Types ---
type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
type CompletionSound = 'DIGITAL' | 'HARMONIC' | 'DATA';
type ReminderSound = 'BEAM' | 'RADAR' | 'SIGNAL';
type AppMode = 'NORMAL' | 'FOUNDER';
type AppTheme = 'DARK' | 'LIGHT';
type Frequency = 'DAILY' | 'WEEKLY' | 'CUSTOM';

interface Habit {
  id: string;
  text: string;
  icon: string;
  entries: Record<string, boolean>;
  reminders: string[];
  priority: Priority;
  frequency: Frequency;
  daysOfWeek: number[];
  category: string;
  createdAt: number;
}

interface UserProfile {
  name: string;
  avatar: string;
  onboarded: boolean;
  completionSound: CompletionSound;
  reminderSound: ReminderSound;
  theme: AppTheme;
  mode: AppMode;
  companyName?: string;
}

interface JarvisMessage {
  role: 'assistant' | 'user';
  content: string;
  timestamp: number;
}

interface Goals {
  daily: number;
  weekly: number;
}

interface Medal {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  isUnlocked: boolean;
  progress: number;
  metricLabel: string;
}

const NORMAL_CATEGORIES = ['HEALTH', 'WORK', 'GROWTH', 'SOCIAL', 'ROUTINE'];
const FOUNDER_VERTICALS = ['STRATEGY', 'OPERATIONS', 'NETWORKING', 'PRODUCT', 'WELLNESS', 'CAPITAL'];
const AVATARS = ["🤴", "👔", "🚀", "📈", "🦾", "💎", "🦁", "🦅", "🥷", "⚡"];

const getIconForText = (text: string) => {
  const map: any = {
    "Strategy": "🎯", "Meeting": "🤝", "Deep Work": "🧠", "Email": "📨", "Health": "🥗",
    "Capital": "💰", "Growth": "📈", "Product": "🛠️", "Gym": "🏋️", "Water": "💧", "Default": "⚡"
  };
  for (const key in map) if (text.toLowerCase().includes(key.toLowerCase())) return map[key];
  return map.Default;
};

// --- Tactical Audio Engine ---
let audioCtx: AudioContext | null = null;
const initAudio = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
};

const playTacticalSound = (type: 'success' | 'click' | 'alert' | 'reminder', profile?: CompletionSound | ReminderSound) => {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const createOsc = (f: number, t: OscillatorType, start: number, dur: number, g: number) => {
    const o = audioCtx!.createOscillator();
    const gn = audioCtx!.createGain();
    o.type = t; o.frequency.setValueAtTime(f, start);
    o.connect(gn); gn.connect(audioCtx!.destination);
    gn.gain.setValueAtTime(0, start); gn.gain.linearRampToValueAtTime(g, start + 0.01);
    gn.gain.exponentialRampToValueAtTime(0.001, start + dur);
    o.start(start); o.stop(start + dur);
  };
  if (type === 'click') createOsc(440, 'square', now, 0.05, 0.05);
  else if (type === 'alert') createOsc(110, 'sawtooth', now, 0.2, 0.1);
  else if (type === 'success') {
    const p = profile || 'DIGITAL';
    if (p === 'DIGITAL') createOsc(880, 'sine', now, 0.15, 0.1);
    else if (p === 'HARMONIC') { [440, 660, 880].forEach((f, i) => createOsc(f, 'sine', now + i*0.05, 0.3, 0.04)); }
  } else if (type === 'reminder') createOsc(1200, 'sine', now, 0.1, 0.05);
};

const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if (window.navigator?.vibrate) {
    const p = style === 'light' ? [10] : style === 'medium' ? [25] : [50, 20, 50];
    window.navigator.vibrate(p);
  }
};

const getThemeColors = (mode: AppMode, theme: AppTheme) => {
  const isDark = theme === 'DARK';
  const isFounder = mode === 'FOUNDER';

  if (isFounder) {
    return {
      bg: isDark ? 'bg-[#0a0a0b]' : 'bg-orange-50',
      card: isDark ? 'bg-[#121214]' : 'bg-white',
      text: isDark ? 'text-[#f4f4f5]' : 'text-zinc-900',
      textMuted: 'text-zinc-500',
      border: isDark ? 'border-white/5' : 'border-orange-100',
      accent: 'amber-400',
      accentText: 'text-amber-500',
      accentBg: 'bg-amber-500',
      ring: 'ring-amber-400/10',
      chart: '#fbbf24',
      jarvis: 'bg-amber-500'
    };
  }

  return {
    bg: isDark ? 'bg-[#050505]' : 'bg-slate-50',
    card: isDark ? 'bg-[#0e0e10]' : 'bg-white',
    text: isDark ? 'text-[#e2e8f0]' : 'text-slate-900',
    textMuted: 'text-zinc-500',
    border: isDark ? 'border-white/5' : 'border-slate-200',
    accent: 'blue-500',
    accentText: 'text-blue-500',
    accentBg: 'bg-blue-600',
    ring: 'ring-blue-500/10',
    chart: '#3b82f6',
    jarvis: 'bg-blue-600'
  };
};

// --- Dashboard Components (Inspired by User Image) ---

const ProgressRingLarge = ({ percentage, color, theme }: { percentage: number, color: string, theme: AppTheme }) => {
  const r = 50; const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, percentage) / 100) * c;
  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg className="transform -rotate-90" width="128" height="128" viewBox="0 0 128 128">
        <circle className={theme === 'DARK' ? 'stroke-white/5' : 'stroke-zinc-100'} strokeWidth="12" fill="transparent" r={r} cx="64" cy="64" />
        <motion.circle 
          className={color} 
          strokeWidth="12" 
          strokeDasharray={c} 
          initial={{ strokeDashoffset: c }} 
          animate={{ strokeDashoffset: offset }} 
          transition={{ duration: 1, ease: "easeOut" }}
          strokeLinecap="round" 
          fill="transparent" 
          r={r} cx="64" cy="64" 
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-3xl font-black italic">{Math.round(percentage)}%</span>
        <span className="text-[7px] font-bold uppercase opacity-30 tracking-tighter">Capacity</span>
      </div>
    </div>
  );
};

const MiniDailySnapshot = ({ day, percentage, color, theme }: { day: string, percentage: number, color: string, theme: AppTheme }) => {
  const r = 24; const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, percentage) / 100) * c;
  return (
    <div className={`flex flex-col items-center justify-between p-4 rounded-3xl border ${theme === 'DARK' ? 'bg-white/[0.03] border-white/5' : 'bg-zinc-50 border-zinc-100'} w-24 h-32`}>
      <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">{day}</p>
      <div className="relative flex items-center justify-center w-12 h-12">
        <svg className="transform -rotate-90" width="48" height="48">
          <circle className={theme === 'DARK' ? 'stroke-white/10' : 'stroke-zinc-200'} strokeWidth="5" fill="transparent" r={r-4} cx="24" cy="24" />
          <motion.circle 
            className={color} 
            strokeWidth="5" 
            strokeDasharray={c-8} 
            initial={{ strokeDashoffset: c-8 }} 
            animate={{ strokeDashoffset: offset }} 
            strokeLinecap="round" 
            fill="transparent" 
            r={r-4} cx="24" cy="24" 
          />
        </svg>
        <span className="absolute text-[8px] font-black">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
};

const PriorityBadge = ({ level, mode, colors }: { level: Priority, mode: AppMode, colors: any }) => {
  const isFounder = mode === 'FOUNDER';
  const config = {
    HIGH: { label: isFounder ? 'CRITICAL' : 'HIGH', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    MEDIUM: { label: isFounder ? 'STANDARD' : 'MEDIUM', color: colors.accentText, bg: `${colors.accentBg}/10`, border: `${colors.accentBg}/20` },
    LOW: { label: isFounder ? 'ROUTINE' : 'LOW', color: colors.textMuted, bg: 'bg-white/5', border: colors.border }
  }[level];

  return (
    <div className={`px-2 py-0.5 rounded-full border ${config.bg} ${config.border} flex items-center gap-1`}>
      <span className={`w-1 h-1 rounded-full ${level === 'HIGH' ? 'bg-rose-500 animate-pulse' : config.color.replace('text', 'bg')}`} />
      <span className={`text-[7px] font-black uppercase tracking-widest ${config.color}`}>{config.label}</span>
    </div>
  );
};

const FrequencyBadge = ({ frequency, colors }: { frequency: Frequency, colors: any }) => (
  <div className={`px-2 py-0.5 rounded-full border bg-white/5 ${colors.border} flex items-center gap-1`}>
    <Repeat size={8} className={colors.textMuted} />
    <span className={`text-[7px] font-black uppercase tracking-widest ${colors.textMuted}`}>{frequency}</span>
  </div>
);

// --- Main Application ---
const DailyAchiever = () => {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('achiever_nexus_profile_v3');
    return saved ? JSON.parse(saved) : null;
  });

  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('achiever_nexus_habits_v3');
    return saved ? JSON.parse(saved) : [];
  });

  const [goals, setGoals] = useState<Goals>(() => {
    const saved = localStorage.getItem('achiever_nexus_goals_v3');
    return saved ? JSON.parse(saved) : { daily: 3, weekly: 15 };
  });

  const [jarvisActive, setJarvisActive] = useState(false);
  const [jarvisHistory, setJarvisHistory] = useState<JarvisMessage[]>([]);
  const [jarvisInput, setJarvisInput] = useState('');
  const [jarvisThinking, setJarvisThinking] = useState(false);
  
  const [activeView, setActiveView] = useState<'OPS' | 'MERIT'>('OPS');
  const [selectedCat, setSelectedCat] = useState<string | 'ALL'>('ALL');
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const colors = useMemo(() => getThemeColors(profile?.mode || 'NORMAL', profile?.theme || 'DARK'), [profile?.mode, profile?.theme]);
  const isFounder = profile?.mode === 'FOUNDER';
  const categories = isFounder ? FOUNDER_VERTICALS : NORMAL_CATEGORIES;

  useEffect(() => { if (profile) localStorage.setItem('achiever_nexus_profile_v3', JSON.stringify(profile)); }, [profile]);
  useEffect(() => { localStorage.setItem('achiever_nexus_habits_v3', JSON.stringify(habits)); }, [habits]);

  const todayIdx = useMemo(() => new Date().getDate(), []);
  const getDayOfWeekForDate = useCallback((dayOfMonth: number) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return new Date(currentYear, currentMonth, dayOfMonth).getDay();
  }, []);

  // Metrics & Analytics Data
  const dailyProgressPercentage = useMemo(() => {
    if (habits.length === 0) return 0;
    const dayKey = `day-${todayIdx}`;
    const done = habits.reduce((acc, h) => acc + (h.entries[dayKey] ? 1 : 0), 0);
    return (done / habits.length) * 100;
  }, [habits, todayIdx]);

  const accuracyRate = useMemo(() => {
    const done = habits.reduce((acc, h) => acc + Object.values(h.entries).filter(Boolean).length, 0);
    let scheduled = 0;
    for (let d = 1; d <= 30; d++) {
        const dow = getDayOfWeekForDate(d);
        habits.forEach(h => { if (h.daysOfWeek.includes(dow)) scheduled++; });
    }
    return Math.round((done / Math.max(1, scheduled)) * 100);
  }, [habits, getDayOfWeekForDate]);

  const analyticsPayload = useMemo(() => {
    const DAYS_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return Array.from({ length: 14 }, (_, i) => {
      const targetDay = todayIdx - (13 - i);
      if (targetDay < 1) return { name: 'N/A', completed: 0, streak: 0 };
      const dow = getDayOfWeekForDate(targetDay);
      const count = habits.filter(h => h.entries[`day-${targetDay}`]).length;
      let streak = 0;
      for (let k = targetDay; k >= 1; k--) {
        const dCount = habits.filter(h => h.entries[`day-${k}`]).length;
        if (dCount >= goals.daily) streak++;
        else break;
      }
      return { 
        name: DAYS_NAMES[dow], 
        completed: count, 
        efficiency: Math.round((count / Math.max(1, habits.length)) * 100),
        streak 
      };
    });
  }, [habits, goals.daily, todayIdx, getDayOfWeekForDate]);

  const weeklySnapshotData = useMemo(() => {
    const last7 = analyticsPayload.slice(-7);
    return last7;
  }, [analyticsPayload]);

  const medals = useMemo<Medal[]>(() => {
    const todayStreak = analyticsPayload[13]?.streak || 0;
    const highPriorityToday = habits.filter(h => h.priority === 'HIGH' && h.daysOfWeek.includes(getDayOfWeekForDate(todayIdx)));
    const highPriorityCompleted = highPriorityToday.filter(h => h.entries[`day-${todayIdx}`]);
    
    if (isFounder) {
      return [
        { id: 'seed', title: 'Seed Phase', desc: 'Initialize protocols.', icon: <Briefcase />, isUnlocked: habits.length > 0, progress: 100, metricLabel: 'ACTIVE' },
        { id: 'series-a', title: 'Series A', desc: 'Maintain 70% efficiency.', icon: <TrendingUp />, isUnlocked: accuracyRate >= 70, progress: Math.min(100, (accuracyRate / 70) * 100), metricLabel: `${accuracyRate}%/70%` },
      ] as any;
    }

    return [
      { id: 'iron-focus', title: 'Iron Focus', desc: '80% accuracy over 30 days.', icon: <Award />, isUnlocked: accuracyRate >= 80, progress: Math.min(100, (accuracyRate / 80) * 100), metricLabel: `${accuracyRate}%/80%` },
      { id: 'vanguard', title: 'Vanguard Shield', desc: 'Complete all HIGH priority goals today.', icon: <ShieldCheck />, isUnlocked: highPriorityToday.length > 0 && highPriorityCompleted.length === highPriorityToday.length, progress: highPriorityToday.length > 0 ? (highPriorityCompleted.length / highPriorityToday.length) * 100 : 0, metricLabel: `${highPriorityCompleted.length}/${highPriorityToday.length}` },
    ];
  }, [accuracyRate, habits, todayIdx, analyticsPayload, getDayOfWeekForDate, isFounder]);

  const filteredHabits = useMemo(() => habits.filter(h => selectedCat === 'ALL' || h.category === selectedCat), [habits, selectedCat]);

  const groupedHabits = useMemo(() => {
    const groups: Record<string, Habit[]> = {};
    filteredHabits.forEach(h => {
      if (!groups[h.category]) groups[h.category] = [];
      groups[h.category].push(h);
    });
    return groups;
  }, [filteredHabits]);

  // JARVIS Logic
  const talkToJarvis = async (msg?: string) => {
    const input = msg || jarvisInput;
    if (!input.trim()) return;
    initAudio(); playTacticalSound('click');
    setJarvisThinking(true);
    const newHistory: JarvisMessage[] = [...jarvisHistory, { role: 'user', content: input, timestamp: Date.now() }];
    setJarvisHistory(newHistory);
    setJarvisInput('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stats = `Mode: ${profile?.mode}. Efficiency: ${accuracyRate}%. Goal: ${dailyProgressPercentage}%. Habits: ${habits.length}. Name: ${profile?.name}.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Previous history: ${JSON.stringify(newHistory.slice(-5))}. Stats: ${stats}. User input: ${input}. You are ${isFounder ? 'JARVIS' : 'Nexus AI'}. Respond tactically and concisely.`,
        config: { systemInstruction: "Sophisticated AI assistant.", thinkingConfig: { thinkingBudget: 16000 } }
      });
      setJarvisHistory([...newHistory, { role: 'assistant', content: response.text || 'Interface fail.', timestamp: Date.now() }]);
      playTacticalSound('success', profile?.completionSound);
    } catch (e) {
      setJarvisHistory([...newHistory, { role: 'assistant', content: 'Connection failure.', timestamp: Date.now() }]);
    } finally {
      setJarvisThinking(false);
    }
  };

  if (!profile) return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center p-8 overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg space-y-12">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] mx-auto flex items-center justify-center text-white shadow-[0_0_50px_rgba(37,99,235,0.3)]">
            <Cpu size={40} />
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-none">INITIALIZE <span className="text-blue-500">NEXUS</span></h1>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.4em]">Select Operations Interface</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <button onClick={() => { (document.getElementById('choice-normal') as any).classList.add('border-blue-500'); (document.getElementById('choice-founder') as any).classList.remove('border-amber-500'); }} id="choice-normal" className="p-8 bg-zinc-900 border border-white/5 rounded-[2.5rem] text-left hover:border-blue-500 transition-all active:scale-95">
              <Activity size={24} className="text-blue-500 mb-6" />
              <h3 className="text-xl font-black text-white italic mb-2 uppercase">LIFESTYLE</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">Habit tracking and wellness metrics.</p>
           </button>
           <button onClick={() => { (document.getElementById('choice-founder') as any).classList.add('border-amber-500'); (document.getElementById('choice-normal') as any).classList.remove('border-blue-500'); }} id="choice-founder" className="p-8 bg-zinc-900 border border-white/5 rounded-[2.5rem] text-left hover:border-amber-500 transition-all active:scale-95">
              <Briefcase size={24} className="text-amber-500 mb-6" />
              <h3 className="text-xl font-black text-white italic mb-2 uppercase">FOUNDER</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">Aggressive focus on strategic growth.</p>
           </button>
        </div>
        <div className="space-y-4">
          <input id="on-name" placeholder="IDENTIFIER" className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-5 text-white font-black uppercase outline-none text-center" />
          <button onClick={() => {
            const n = (document.getElementById('on-name') as HTMLInputElement).value;
            const mode = document.querySelector('.border-blue-500') ? 'NORMAL' : 'FOUNDER';
            if (n) setProfile({ name: n, avatar: AVATARS[0], onboarded: true, completionSound: 'DIGITAL', reminderSound: 'BEAM', theme: 'DARK', mode: mode as AppMode });
          }} className="w-full py-6 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:brightness-90 transition-all shadow-2xl">UPLINK</button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} font-sans pb-[120px] antialiased transition-colors duration-700 overflow-x-hidden`}>
      <div className={`fixed top-0 left-0 w-full h-[2px] ${colors.jarvis} opacity-30 shadow-[0_0_20px_rgba(255,255,255,0.4)] z-[200] animate-scan pointer-events-none`} />
      
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-12 space-y-12">
        <header className="flex flex-col gap-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <button onClick={() => setIsEditingProfile(true)} className={`w-16 h-16 rounded-2xl ${colors.card} border ${colors.border} flex items-center justify-center text-3xl shadow-2xl relative`}>
                {profile.avatar}
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${isFounder ? 'bg-amber-500' : 'bg-blue-500'} border-4 ${profile.theme === 'DARK' ? 'border-[#0a0a0b]' : 'border-white'} rounded-full`} />
              </button>
              <div>
                <p className={`text-[9px] font-black uppercase tracking-widest ${colors.accentText}`}>{profile.mode} CONSOLE</p>
                <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none">{profile.name}</h2>
              </div>
            </div>
            <button onClick={() => setJarvisActive(true)} className={`flex items-center gap-3 px-6 py-4 ${colors.card} border ${colors.border} rounded-2xl hover:bg-white/5 transition-all shadow-lg`}>
              <Bot size={20} className={isFounder ? "text-amber-500" : "text-blue-500"} />
              <span className="text-[10px] font-black tracking-widest uppercase">JARVIS</span>
            </button>
          </div>

          {/* New Situation Room Dashboard Section (Reference Image Inspired) */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 px-2">
               <AreaChartIcon size={16} className={colors.accentText} />
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Situation Room / Analytics</h3>
            </div>
            
            <div className={`grid grid-cols-1 xl:grid-cols-3 gap-6`}>
               {/* Main Trend Card */}
               <div className={`xl:col-span-2 ${colors.card} border ${colors.border} rounded-[2.5rem] p-8 space-y-8 shadow-2xl relative overflow-hidden`}>
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <h4 className="text-lg font-black italic uppercase tracking-wider">Overall Performance</h4>
                      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">14-Day Tactical Efficiency Delta</p>
                    </div>
                    <div className="flex gap-4 items-center">
                      <ProgressRingLarge percentage={dailyProgressPercentage} color={isFounder ? 'stroke-amber-500' : 'stroke-blue-500'} theme={profile.theme} />
                    </div>
                  </div>
                  
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsPayload}>
                        <defs>
                          <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={isFounder ? '#fbbf24' : '#3b82f6'} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={isFounder ? '#fbbf24' : '#3b82f6'} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={profile.theme === 'DARK' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'} vertical={false} />
                        <XAxis dataKey="name" hide />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                          itemStyle={{ fontWeight: 'black', textTransform: 'uppercase' }}
                        />
                        <Area type="monotone" dataKey="efficiency" stroke={isFounder ? '#fbbf24' : '#3b82f6'} fillOpacity={1} fill="url(#colorEff)" strokeWidth={3} />
                        <Area type="monotone" dataKey="completed" stroke={isFounder ? '#ffffff' : '#4ade80'} fill="transparent" strokeWidth={2} strokeDasharray="5 5" opacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               {/* Daily Mini-Stats Cluster */}
               <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-4 h-full`}>
                  {weeklySnapshotData.map((d, i) => (
                    <MiniDailySnapshot key={i} day={d.name} percentage={d.efficiency} color={isFounder ? 'stroke-amber-500' : 'stroke-blue-500'} theme={profile.theme} />
                  ))}
                  <div className={`${colors.card} border ${colors.border} rounded-3xl p-4 flex flex-col items-center justify-center space-y-2 opacity-50 hover:opacity-100 transition-opacity cursor-pointer`}>
                     <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"><ChevronRight size={18} /></div>
                     <span className="text-[8px] font-black uppercase">Archive</span>
                  </div>
               </div>
            </div>
          </section>
        </header>

        <AnimatePresence mode="wait">
          {activeView === 'OPS' && (
            <motion.div key="ops" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-10">
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                   <div className="flex items-center gap-2 opacity-50"><Filter size={12} /><span className="text-[9px] font-black uppercase tracking-widest">Sector Analysis</span></div>
                   <button onClick={() => setIsAdding(true)} className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${colors.accentText} hover:brightness-125`}><Plus size={14} /> INITIALIZE UNIT</button>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {['ALL', ...categories].map(v => (
                    <button 
                      key={v} 
                      onClick={() => { setSelectedCat(v); initAudio(); playTacticalSound('click'); }}
                      className={`px-5 py-4 rounded-2xl text-[9px] font-black border transition-all whitespace-nowrap
                        ${selectedCat === v ? `bg-white text-black border-white shadow-xl scale-105` : `${colors.card} ${colors.border} text-zinc-500 hover:border-white/20`}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-10 pb-20">
                {Object.entries(isFounder ? { 'CORE STRATEGY': filteredHabits } : groupedHabits).map(([sector, sectorHabits]) => (
                  <div key={sector} className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                      <div className={`w-1 h-4 ${isFounder ? 'bg-amber-500' : 'bg-blue-600'} rounded-full`} />
                      <h3 className="text-[10px] font-black tracking-[0.3em] uppercase opacity-40">{sector} UNIT</h3>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {(sectorHabits as Habit[]).map((habit) => (
                        <motion.div layout key={habit.id} className={`${colors.card} border ${habit.priority === 'HIGH' ? (isFounder ? 'border-amber-500/20' : 'border-rose-500/20') : colors.border} p-8 rounded-[2.5rem] group relative overflow-hidden shadow-2xl`}>
                          <div className="flex flex-col gap-8 relative z-10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-6">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border ${habit.priority === 'HIGH' ? (isFounder ? 'bg-amber-500 text-black' : 'bg-rose-600 text-white') : 'bg-black/20 border-white/10'}`}>
                                  {habit.icon}
                                </div>
                                <div>
                                    <h4 onClick={() => setEditingHabit(habit)} className={`text-xl font-black italic uppercase tracking-wider cursor-pointer hover:${colors.accentText}`}>{habit.text}</h4>
                                    <div className="flex items-center gap-2">
                                      <PriorityBadge level={habit.priority} mode={profile.mode} colors={colors} />
                                    </div>
                                </div>
                              </div>
                              <button onClick={() => setEditingHabit(habit)} className="p-2 opacity-20 group-hover:opacity-100"><Edit2 size={16} /></button>
                            </div>

                            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                               {[0,1,2,3].map(wIdx => (
                                 <div key={wIdx} className="flex gap-1 p-1 bg-black/40 rounded-2xl">
                                   {Array.from({ length: 7 }).map((_, dIdx) => {
                                     const dNum = wIdx * 7 + dIdx + 1;
                                     if (dNum > 30) return null;
                                     const isDone = habit.entries[`day-${dNum}`];
                                     const isToday = dNum === todayIdx;
                                     const dow = getDayOfWeekForDate(dNum);
                                     const isScheduled = habit.daysOfWeek.includes(dow);
                                     return (
                                       <button 
                                         key={dNum} disabled={!isToday || !isScheduled}
                                         onClick={() => {
                                           initAudio(); triggerHaptic('medium');
                                           const val = !habit.entries[`day-${dNum}`];
                                           if (val) playTacticalSound('success', profile.completionSound);
                                           setHabits(habits.map(h => h.id === habit.id ? { ...h, entries: { ...h.entries, [`day-${dNum}`]: val } } : h));
                                         }}
                                         className={`w-9 h-9 rounded-lg flex items-center justify-center text-[7px] font-black border transition-all
                                           ${isDone && isToday ? (isFounder ? 'bg-amber-500 text-black' : 'bg-blue-600 text-white') : ''}
                                           ${!isDone && isToday && isScheduled ? 'border-zinc-700 text-zinc-500' : ''}
                                           ${!isScheduled ? 'opacity-5 grayscale pointer-events-none' : ''}
                                         `}
                                       >
                                         {isDone ? <Zap size={12} fill="currentColor" /> : (isToday ? 'GO' : dNum)}
                                       </button>
                                     );
                                   })}
                                 </div>
                               ))}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeView === 'MERIT' && (
            <motion.div key="merit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 pb-32">
               <section className={`${colors.card} border ${colors.border} rounded-[3rem] p-12 relative overflow-hidden shadow-2xl`}>
                  <div className="flex items-center gap-6 mb-12 relative z-10">
                     <div className={`w-16 h-16 rounded-[1.5rem] ${isFounder ? 'bg-amber-500 text-black' : 'bg-blue-600 text-white'} flex items-center justify-center shadow-2xl`}>
                        <Award size={32} />
                     </div>
                     <div>
                        <h2 className="text-4xl font-black italic uppercase tracking-tighter">{isFounder ? 'Strategic Hall' : 'Combat Medals'}</h2>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Performance Milestones</p>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    {medals.map((m) => (
                      <div key={m.id} className={`p-8 rounded-[2.5rem] border ${m.isUnlocked ? 'bg-white/5 border-white/10 shadow-xl' : 'opacity-30 grayscale border-white/5'} transition-all`}>
                        <div className="flex items-start gap-6 mb-6">
                           <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${m.isUnlocked ? (isFounder ? 'bg-amber-500 text-black' : 'bg-blue-600 text-white') : 'bg-zinc-900'}`}>
                             {m.isUnlocked ? React.cloneElement(m.icon as React.ReactElement<any>, { size: 32 }) : <Lock size={24} />}
                           </div>
                           <div className="flex-1">
                              <h4 className="text-xl font-black italic uppercase">{m.title}</h4>
                              <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">{m.desc}</p>
                           </div>
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between text-[8px] font-black uppercase opacity-60"><span>Intensity</span><span>{m.metricLabel}</span></div>
                           <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${m.progress}%` }} className={`h-full ${isFounder ? 'bg-amber-500' : 'bg-blue-600'}`} />
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
               </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {jarvisActive && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setJarvisActive(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }} className={`w-full max-w-lg h-full ${colors.bg} border-l ${colors.border} relative z-10 flex flex-col`}>
              <div className={`p-8 border-b ${colors.border} flex items-center justify-between`}>
                <div className="flex items-center gap-4">
                   <div className={`w-12 h-12 ${isFounder ? 'bg-amber-500 text-black' : 'bg-blue-600 text-white'} rounded-2xl flex items-center justify-center`}>
                      <Bot size={24} className={jarvisThinking ? 'animate-pulse' : ''} />
                   </div>
                   <h3 className="text-xl font-black italic uppercase tracking-widest">{isFounder ? 'JARVIS' : 'NEXUS'}</h3>
                </div>
                <button onClick={() => setJarvisActive(false)} className="p-3 text-zinc-500 hover:text-white"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                {jarvisHistory.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] p-6 rounded-[2rem] ${m.role === 'user' ? `${colors.accentBg} text-white` : `${colors.card} border ${colors.border} text-zinc-200`}`}>
                       <p className="text-sm font-medium leading-relaxed">{m.content}</p>
                    </div>
                    <span className="text-[8px] font-bold uppercase opacity-20 mt-2">{new Date(m.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
                {jarvisThinking && <div className="text-[9px] font-black uppercase tracking-widest animate-pulse ml-2 opacity-50">Processing satellite link...</div>}
              </div>
              <div className={`p-8 border-t ${colors.border} space-y-4`}>
                <div className="relative">
                  <input value={jarvisInput} onChange={e => setJarvisInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && talkToJarvis()} placeholder="COMMAND..." className={`w-full ${colors.card} border ${colors.border} rounded-2xl px-8 py-6 text-white font-black uppercase outline-none focus:border-white pr-20`} />
                  <button onClick={() => talkToJarvis()} className={`absolute right-3 top-3 bottom-3 px-5 ${isFounder ? 'bg-amber-500 text-black' : 'bg-blue-600 text-white'} rounded-xl transition-all active:scale-95`}><Zap size={20} fill="currentColor" /></button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <nav className={`fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-sm h-20 ${colors.card}/80 backdrop-blur-2xl border ${colors.border} rounded-[2.5rem] flex items-center justify-between px-2 z-[500] shadow-2xl`}>
        <button onClick={() => setActiveView('OPS')} className={`flex-1 flex flex-col items-center gap-1 transition-all ${activeView === 'OPS' ? colors.accentText : 'text-zinc-600'}`}>
          <Target size={22} /><span className="text-[8px] font-black uppercase">Ops</span>
        </button>
        <button onClick={() => setJarvisActive(true)} className={`flex-1 flex flex-col items-center gap-1 ${colors.accentText}`}>
          <Bot size={22} className="animate-pulse" /><span className="text-[8px] font-black uppercase">AI</span>
        </button>
        <button onClick={() => setActiveView('MERIT')} className={`flex-1 flex flex-col items-center gap-1 transition-all ${activeView === 'MERIT' ? colors.accentText : 'text-zinc-600'}`}>
          <Award size={22} /><span className="text-[8px] font-black uppercase">Merit</span>
        </button>
      </nav>

      {isAdding && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
           <div className={`w-full max-w-lg ${colors.card} border ${colors.border} rounded-[3.5rem] p-10 shadow-2xl`}>
              <h3 className="text-2xl font-black italic uppercase mb-10 tracking-widest">INITIALIZE UNIT</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const text = (e.target as any).vName.value;
                const cat = (e.target as any).vCat.value;
                if (!text) return;
                const newH: Habit = { id: crypto.randomUUID(), text: text.toUpperCase(), icon: getIconForText(text), category: cat, entries: {}, reminders: [], priority: 'MEDIUM', frequency: 'DAILY', daysOfWeek: [0,1,2,3,4,5,6], createdAt: Date.now() };
                setHabits([...habits, newH]); setIsAdding(false); playTacticalSound('success', profile.completionSound);
              }} className="space-y-8">
                <input name="vName" autoFocus placeholder="DESIGNATION..." className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-5 text-white font-black uppercase outline-none focus:border-white transition-all" />
                <div className="grid grid-cols-3 gap-2">
                  {categories.map(v => (
                    <label key={v} className="relative cursor-pointer">
                      <input type="radio" name="vCat" value={v} defaultChecked={v === categories[0]} className="peer sr-only" />
                      <div className={`py-4 text-center border ${colors.border} rounded-xl text-[7px] font-black uppercase peer-checked:${isFounder ? 'bg-amber-500 text-black' : 'bg-blue-600 text-white'}`}>{v}</div>
                    </label>
                  ))}
                </div>
                <button type="submit" className={`w-full py-6 ${isFounder ? 'bg-amber-500 text-black' : 'bg-blue-600 text-white'} rounded-2xl font-black uppercase tracking-widest hover:brightness-110 active:scale-95`}>COMMISSION</button>
                <button type="button" onClick={() => setIsAdding(false)} className="w-full text-zinc-500 font-black uppercase text-[10px] tracking-widest py-2">CANCEL</button>
              </form>
           </div>
        </div>
      )}

      {isEditingProfile && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl">
           <div className={`w-full max-w-lg ${colors.card} border ${colors.border} rounded-[3rem] p-10`}>
              <h3 className="text-xl font-black uppercase mb-8 tracking-widest">Configuration Matrix</h3>
              <div className="space-y-8">
                 <div className="flex gap-2 p-2 bg-black/40 rounded-2xl">
                    <button onClick={() => setProfile({...profile, mode: 'NORMAL'})} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase ${profile.mode === 'NORMAL' ? 'bg-blue-600 text-white' : 'text-zinc-600'}`}>LIFESTYLE</button>
                    <button onClick={() => setProfile({...profile, mode: 'FOUNDER'})} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase ${profile.mode === 'FOUNDER' ? 'bg-amber-500 text-black' : 'text-zinc-600'}`}>FOUNDER</button>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                   <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="py-4 text-rose-500 text-[9px] font-black uppercase bg-rose-500/10 rounded-xl">TERMINATE SESSION</button>
                   <button onClick={() => setIsEditingProfile(false)} className="py-4 bg-white text-black text-[9px] font-black uppercase rounded-xl">RESUME</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {editingHabit && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
          <div className={`w-full max-w-lg ${colors.card} border ${colors.border} rounded-[3rem] p-10`}>
             <h3 className="text-xl font-black uppercase mb-8 italic">DECOMMISSION / EDIT</h3>
             <div className="space-y-6">
                <button onClick={() => { setHabits(habits.filter(h => h.id !== editingHabit.id)); setEditingHabit(null); }} className="w-full py-5 bg-rose-500/20 text-rose-500 rounded-2xl font-black uppercase text-[11px] tracking-[0.3em]">PURGE UNIT</button>
                <button onClick={() => setEditingHabit(null)} className="w-full text-zinc-500 font-black uppercase text-[10px] tracking-widest">CLOSE</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<DailyAchiever />);
