import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  Loader2, 
  Zap,
  BarChart3,
  X,
  Lock,
  Unlock,
  Trophy,
  Target,
  Activity,
  History,
  TrendingUp,
  Settings2,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Flame,
  CheckCircle2,
  User,
  LogOut,
  Edit2,
  Info,
  ArrowRight
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
  Brush
} from 'recharts';

// --- Tactical Types ---
interface Habit {
  id: string;
  text: string;
  icon: string;
  entries: Record<string, boolean>;
  createdAt: number;
}

interface UserProfile {
  name: string;
  avatar: string;
  onboarded: boolean;
}

interface AIResponse {
  content: string;
  loading: boolean;
}

interface Goals {
  daily: number;
  weekly: number;
}

const iconMap: Record<string, string> = {
  "Wake up": "⏰",
  "Bed": "🛏️",
  "Shower": "🚿",
  "Reading": "📖",
  "Gym": "🏋️",
  "Meditation": "🧘",
  "Work": "💼",
  "Deep Work": "🧠",
  "Water": "💧",
  "Default": "⚡"
};

const AVATARS = [
  "🥷", "⚡", "🦾", "🧬", "🌌", "🎯", "🔥", "🦅"
];

const getIconForText = (text: string) => {
  for (const key in iconMap) {
    if (text.toLowerCase().includes(key.toLowerCase())) return iconMap[key];
  }
  return iconMap.Default;
};

const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    const pattern = style === 'light' ? [10] : style === 'medium' ? [20] : [50];
    window.navigator.vibrate(pattern);
  }
};

const ProgressRing = ({ percentage, color = "stroke-blue-500", size = 48 }: { percentage: number, color?: string, size?: number }) => {
  const radius = size * 0.4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, percentage) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle className="stroke-white/5" strokeWidth="4" fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
        <motion.circle
          className={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-black text-white">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
};

const TacticalTooltip = ({ active, payload, label, dailyGoal }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const daily = data.daily || 0;
    const weekly = data.weeklyVelocity || 0;
    const streak = data.missionStreak || 0;
    const completedList = data.completedDetails || [];
    const isGoalMet = daily >= dailyGoal;
    const progressPerc = Math.min(100, (daily / Math.max(1, dailyGoal)) * 100);

    return (
      <div className="bg-[#0e0e10]/98 backdrop-blur-2xl border border-white/10 p-5 rounded-[1.5rem] shadow-2xl min-w-[220px] pointer-events-none z-[2000] border-t-blue-500/30">
        <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
           <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label} OVERVIEW</p>
           {streak > 1 && (
             <div className="flex items-center gap-1 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
               <Flame size={10} className="text-orange-500 fill-orange-500" />
               <span className="text-[9px] font-black text-orange-500">{streak} DAY STREAK</span>
             </div>
           )}
        </div>
        
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between items-end">
              <span className="text-[8px] font-bold text-zinc-500 uppercase">Daily Objective</span>
              <span className={`text-xs font-black italic ${isGoalMet ? 'text-emerald-500' : 'text-white'}`}>
                {daily}/{dailyGoal}
              </span>
            </div>
            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
               <div 
                 className={`h-full transition-all duration-500 ${isGoalMet ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-blue-600'}`} 
                 style={{ width: `${progressPerc}%` }}
               />
            </div>
          </div>

          <div className="space-y-2">
             <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest border-l-2 border-zinc-800 pl-2">Secured Protocols</p>
             <div className="flex flex-wrap gap-1.5">
               {completedList.length > 0 ? completedList.map((h: any, idx: number) => (
                 <div key={idx} className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center text-xs" title={h.text}>
                   {h.icon}
                 </div>
               )) : (
                 <p className="text-[9px] font-black text-zinc-800 italic uppercase">No protocols secured</p>
               )}
             </div>
          </div>

          <div className="pt-2 flex justify-between items-center border-t border-white/5">
             <span className="text-[8px] font-bold text-zinc-500 uppercase">Velocity</span>
             <span className="text-[10px] font-black text-blue-500 italic">{weekly} AVG</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// --- Main Application ---

const DailyAchiever = () => {
  // --- Persistent User State ---
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('achiever_matrix_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('achiever_matrix_habits');
    return saved ? JSON.parse(saved) : [
      { id: '1', text: 'WAKE UP AT 05:00', icon: '⏰', entries: {}, createdAt: Date.now() },
      { id: '2', text: 'MAKE MY BED', icon: '🛏️', entries: {}, createdAt: Date.now() },
      { id: '3', text: 'COLD SHOWER', icon: '🚿', entries: {}, createdAt: Date.now() },
      { id: '4', text: '5 PAGE READING', icon: '📖', entries: {}, createdAt: Date.now() }
    ];
  });

  const [goals, setGoals] = useState<Goals>(() => {
    const saved = localStorage.getItem('achiever_matrix_goals');
    return saved ? JSON.parse(saved) : { daily: 4, weekly: 25 };
  });

  // --- UI State ---
  const [activeView, setActiveView] = useState<'OPERATIONS' | 'MERIT'>('OPERATIONS');
  const [inputValue, setInputValue] = useState('');
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSettingGoals, setIsSettingGoals] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);

  // Persistence Effects
  useEffect(() => {
    if (profile) localStorage.setItem('achiever_matrix_profile', JSON.stringify(profile));
    else localStorage.removeItem('achiever_matrix_profile');
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('achiever_matrix_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('achiever_matrix_goals', JSON.stringify(goals));
  }, [goals]);

  // --- Core Logic ---
  const todayIdx = useMemo(() => new Date().getDate(), []);
  const currentMonthName = useMemo(() => new Date().toLocaleString('default', { month: 'long' }).toUpperCase(), []);
  const prevMonthAccuracy = 62;

  const toggleHabitDate = useCallback((habitId: string, dayIndex: number) => {
    if (dayIndex !== todayIdx) return;
    const dateKey = `day-${dayIndex}`;
    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        const isDone = !h.entries[dateKey];
        triggerHaptic(isDone ? 'medium' : 'light');
        return {
          ...h,
          entries: { ...h.entries, [dateKey]: isDone }
        };
      }
      return h;
    }));
  }, [todayIdx]);

  const addHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    triggerHaptic('medium');
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      text: inputValue.toUpperCase(),
      icon: getIconForText(inputValue),
      entries: {},
      createdAt: Date.now()
    };
    setHabits(prev => [...prev, newHabit]);
    setInputValue('');
    setIsAdding(false);
  };

  const deleteHabit = (id: string) => {
    triggerHaptic('heavy');
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  const updateHabitText = (id: string, newText: string) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, text: newText.toUpperCase(), icon: getIconForText(newText) } : h));
    setEditingHabitId(null);
    triggerHaptic('light');
  };

  const updateGoals = (newGoals: Partial<Goals>) => {
    triggerHaptic('light');
    setGoals(prev => ({ ...prev, ...newGoals }));
  };

  const getEfficacy = (habit: Habit) => {
    const completions = Object.values(habit.entries).filter(Boolean).length;
    return Math.round((completions / 30) * 100);
  };

  // --- Performance Metrics ---
  const dailyProgress = useMemo(() => {
    const dayKey = `day-${todayIdx}`;
    return habits.reduce((acc, h) => acc + (h.entries[dayKey] ? 1 : 0), 0);
  }, [habits, todayIdx]);

  const weeklyProgress = useMemo(() => {
    let total = 0;
    for (let i = Math.max(1, todayIdx - 6); i <= todayIdx; i++) {
      const dayKey = `day-${i}`;
      total += habits.reduce((acc, h) => acc + (h.entries[dayKey] ? 1 : 0), 0);
    }
    return total;
  }, [habits, todayIdx]);

  const accuracyRate = useMemo(() => {
    const totalCompletions = habits.reduce((acc, h) => acc + Object.values(h.entries).filter(Boolean).length, 0);
    const totalSlots = (habits.length || 1) * 30;
    return Math.round((totalCompletions / totalSlots) * 100);
  }, [habits]);

  const accuracyDelta = useMemo(() => accuracyRate - prevMonthAccuracy, [accuracyRate]);

  const analyticsPayload = useMemo(() => {
    const history = Array.from({ length: 30 }, (_, i) => {
      const day = i + 1;
      const completedHabitsOnDay = habits.filter(h => h.entries[`day-${day}`]);
      return { day, count: completedHabitsOnDay.length, completedDetails: completedHabitsOnDay.map(h => ({ icon: h.icon, text: h.text })) };
    });

    return history.map((h, i) => {
      let weeklySum = 0;
      let windowSize = 0;
      for (let j = Math.max(0, i - 6); j <= i; j++) {
        weeklySum += history[j].count;
        windowSize++;
      }
      const weeklyAvg = Number((weeklySum / windowSize).toFixed(1));
      const baselineFactor = (prevMonthAccuracy / 100) * (habits.length || 1);
      const prevCycleAvg = Number((baselineFactor + Math.sin(h.day * 0.5) * 0.5).toFixed(1));

      let streak = 0;
      for (let k = i; k >= 0; k--) {
        if (history[k].count >= goals.daily) streak++;
        else break;
      }

      return { 
        day: `D${h.day}`, 
        daily: h.count, 
        completedDetails: h.completedDetails,
        missionStreak: streak,
        weeklyVelocity: weeklyAvg,
        prevCycle: prevCycleAvg
      };
    });
  }, [habits, goals.daily]);

  // --- AI Coaching ---
  const callCoach = async () => {
    triggerHaptic('medium');
    setAiResponse({ content: '', loading: true });
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const prompt = `User: ${profile?.name || 'Operative'}. Efficiency ${accuracyRate}%. Goal: ${goals.daily} daily. Today: ${dailyProgress}. Streak: ${analyticsPayload[todayIdx-1]?.missionStreak || 0}. Provide a 15-word mission directive for extreme ownership.`;
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction: "You are an Elite Tactical Strategist. Use military brevity. Address the user by name if possible." }
      });
      setAiResponse({ content: result.text || "PROTOCOL ERROR.", loading: false });
    } catch (e) {
      setAiResponse({ content: "COMS LINK DOWN. DISCIPLINE IS THE ONLY SOLUTION.", loading: false });
    }
  };

  // --- Render Components ---

  if (!profile) {
    return <Onboarding onComplete={(p) => setProfile({ ...p, onboarded: false })} />;
  }

  if (!profile.onboarded) {
    return <Introduction onFinish={() => setProfile({ ...profile, onboarded: true })} userName={profile.name} />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#f0f0f0] font-sans pb-[120px] antialiased overflow-x-hidden">
      
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px] sm:bg-[size:32px_32px]"></div>
        <div className="absolute top-[-20%] right-[-10%] w-[120vw] h-[120vw] bg-blue-600/5 blur-[120px] rounded-full opacity-60"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 safe-pt space-y-8 sm:space-y-12">
        
        {/* Profile Header */}
        <header className="flex flex-col gap-6 pt-4 sm:pt-12 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsEditingProfile(true)}
                className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-2xl"
              >
                {profile.avatar}
              </motion.button>
              <div>
                <p className="text-[10px] font-black tracking-widest text-zinc-600 uppercase">OPERATIVE LOGS</p>
                <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">{profile.name}</h2>
              </div>
            </div>
            <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
              <p className="text-[9px] font-black tracking-[0.2em] text-blue-500 uppercase">{currentMonthName}</p>
            </div>
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-5xl sm:text-7xl xl:text-8xl font-black italic tracking-tighter uppercase text-white leading-none">TASK CHASER</h1>
          </div>
          
          <div className="flex gap-2 w-full max-w-sm mx-auto">
             <button onClick={() => setIsSettingGoals(true)} className="flex-1 px-4 py-4 bg-[#0e0e10] border border-white/5 rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-900 transition-all text-[10px] font-black uppercase tracking-widest text-zinc-400 active:scale-95">
                <Settings2 size={16} /> CALIBRATE
              </button>
             <button onClick={callCoach} className="flex-[1.5] px-6 py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl">
                <Sparkles size={16} /> ADVISOR
              </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeView === 'OPERATIONS' && (
            <motion.div key="ops" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8 sm:space-y-16">
              
              {/* Stats HUD */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: 'EFFICIENCY', val: `${accuracyRate}%`, icon: <Activity size={12} />, color: 'text-blue-500', ring: <ProgressRing percentage={accuracyRate} color="stroke-blue-500" /> },
                  { label: 'DAILY QUOTA', val: `${dailyProgress}/${goals.daily}`, icon: <Target size={12} />, color: 'text-emerald-500', ring: <ProgressRing percentage={(dailyProgress / Math.max(1, goals.daily)) * 100} color="stroke-emerald-500" /> },
                  { label: 'WEEKLY TARGET', val: `${weeklyProgress}/${goals.weekly}`, icon: <Zap size={12} />, color: 'text-orange-500', ring: <ProgressRing percentage={(weeklyProgress / Math.max(1, goals.weekly)) * 100} color="stroke-orange-500" /> },
                  { label: 'MONTHLY DELTA', val: `${accuracyDelta >= 0 ? '+' : ''}${accuracyDelta}%`, icon: <TrendingUp size={12} />, color: 'text-zinc-500', ring: <div className={`text-xs font-black italic ${accuracyDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{accuracyDelta >= 0 ? 'UP' : 'DN'}</div> },
                ].map((stat, i) => (
                  <div key={i} className="bg-[#0e0e10]/60 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-32 sm:h-36">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={stat.color}>{stat.icon}</span>
                        <p className="text-[7px] sm:text-[9px] font-black text-zinc-600 uppercase tracking-widest truncate">{stat.label}</p>
                      </div>
                      <h4 className="text-lg sm:text-2xl font-black text-white italic leading-none">{stat.val}</h4>
                    </div>
                    <div className="flex justify-end">{stat.ring}</div>
                  </div>
                ))}
              </section>

              {/* Density Chart */}
              <div className="bg-[#0e0e10]/80 backdrop-blur-3xl border border-white/5 p-4 sm:p-10 rounded-[2rem] h-[400px] sm:h-[500px] flex flex-col group relative overflow-hidden">
                <div className="flex items-center justify-between mb-8 sm:mb-12 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-600 rounded-full" />
                    <h4 className="text-[9px] sm:text-[11px] font-black tracking-[0.2em] text-white uppercase">Execution Density Profile</h4>
                  </div>
                </div>
                <div className="flex-1 w-full relative z-10 touch-pan-x">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analyticsPayload} margin={{ top: 0, right: 0, left: -45, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#ffffff03" strokeDasharray="3 3" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#27272a', fontSize: 8, fontWeight: 800}} dy={10} />
                      <YAxis hide domain={[0, habits.length + 1]} />
                      <Tooltip content={<TacticalTooltip dailyGoal={goals.daily} />} cursor={{ fill: '#ffffff05' }} trigger="hover" allowEscapeViewBox={{ x: false, y: true }} />
                      <Area type="monotone" dataKey="prevCycle" fill="#18181b" stroke="#27272a" strokeWidth={1} fillOpacity={0.2} activeDot={false} />
                      <Bar dataKey="daily" barSize={10} radius={[2, 2, 0, 0]}>
                        {analyticsPayload.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index + 1 === todayIdx ? '#fff' : (entry.daily >= goals.daily ? '#2563eb' : '#27272a')} />
                        ))}
                      </Bar>
                      <Line type="monotone" dataKey="weeklyVelocity" stroke="#fff" strokeWidth={1.5} dot={{ r: 1.5, fill: '#fff' }} activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }} />
                      <Brush dataKey="day" height={30} stroke="#18181b" fill="#050505" className="tactical-brush" startIndex={Math.max(0, todayIdx - 5)} endIndex={Math.min(29, todayIdx + 5)} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Habit List */}
              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                    <h2 className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase text-white">Logic Lockdown</h2>
                  </div>
                  <button onClick={() => setIsAdding(true)} className="w-12 h-12 bg-white text-black rounded-xl flex items-center justify-center active:scale-90 transition-all shadow-lg">
                    <Plus size={24} strokeWidth={3} />
                  </button>
                </div>

                <div className="space-y-4">
                  {habits.map((habit) => (
                    <motion.div 
                      layout 
                      key={habit.id} 
                      className="bg-[#0e0e10]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4 sm:p-6 transition-all group overflow-hidden relative"
                    >
                      <div className="flex flex-col gap-6 relative z-10">
                        <div className="flex items-center gap-4">
                          <motion.div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-xl sm:text-2xl border border-white/5 bg-zinc-900 transition-all duration-500">
                            {habit.icon}
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            {editingHabitId === habit.id ? (
                              <input 
                                autoFocus
                                className="bg-black border border-blue-500/50 rounded px-2 py-1 text-white text-sm font-black w-full outline-none"
                                defaultValue={habit.text}
                                onBlur={(e) => updateHabitText(habit.id, e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && updateHabitText(habit.id, (e.target as HTMLInputElement).value)}
                              />
                            ) : (
                              <h4 onClick={() => setEditingHabitId(habit.id)} className="text-sm sm:text-lg font-black text-white italic tracking-wider uppercase truncate mb-1 cursor-text hover:text-blue-400 transition-colors">{habit.text}</h4>
                            )}
                            <div className="flex items-center gap-2">
                              <div className="h-1 flex-1 max-w-[120px] bg-zinc-900 rounded-full overflow-hidden">
                                <motion.div animate={{ width: `${getEfficacy(habit)}%` }} className="h-full bg-blue-600" />
                              </div>
                              <span className="text-[7px] font-black text-zinc-600 uppercase">{getEfficacy(habit)}% COMPLIANCE</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setEditingHabitId(habit.id)} className="p-2 text-zinc-800 hover:text-blue-500 transition-colors"><Edit2 size={14} /></button>
                            <button onClick={() => deleteHabit(habit.id)} className="p-2 text-zinc-800 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                          </div>
                        </div>

                        <div className="overflow-x-auto scrollbar-hide touch-pan-x">
                          <div className="flex gap-4 pb-1 min-w-max">
                            {[0, 1, 2, 3].map(weekIdx => (
                              <div key={weekIdx} className="flex gap-1.5">
                                {Array.from({ length: 7 }).map((_, dIdx) => {
                                  const dayNum = weekIdx * 7 + dIdx + 1;
                                  if (dayNum > 30) return null;
                                  const isDone = habit.entries[`day-${dayNum}`];
                                  const isToday = dayNum === todayIdx;
                                  return (
                                    <motion.button 
                                      key={dayNum} 
                                      disabled={!isToday}
                                      onClick={() => toggleHabitDate(habit.id, dayNum)}
                                      whileTap={isToday ? { scale: 0.9 } : {}}
                                      className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-[8px] font-black border transition-all relative overflow-hidden
                                        ${isToday ? 'bg-zinc-900 border-blue-500/50 text-blue-500' : 'bg-black/20 border-white/5 text-zinc-800'}
                                        ${isDone && isToday ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : ''}
                                        ${isDone && !isToday ? 'bg-zinc-800 border-zinc-700 text-zinc-400 opacity-60' : ''}
                                      `}
                                    >
                                      <span className="text-[5px] opacity-40 mb-0.5">{dayNum}</span>
                                      {isDone ? <Zap size={10} fill="currentColor" /> : (isToday ? 'ACT' : <Lock size={8} className="opacity-10" />)}
                                    </motion.button>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {activeView === 'MERIT' && (
            <motion.div key="merit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4 space-y-6">
              <section className="bg-[#0e0e10]/60 border border-white/5 rounded-[2rem] p-8 relative overflow-hidden">
                <h2 className="text-3xl font-black italic uppercase text-white tracking-tighter mb-10">Merit Awards</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { title: 'Obsidian Resolve', desc: '14-day absolute protocol.', locked: accuracyRate < 90 },
                    { title: 'Zero Defect', desc: 'Complete 30-day mission.', locked: true },
                    { title: 'Architect', desc: '10+ concurrent protocols.', locked: habits.length < 10 },
                    { title: 'Integrity', desc: 'Maintain +10% efficiency delta.', locked: accuracyDelta < 10 },
                  ].map((award, i) => (
                    <div key={i} className="bg-black/40 border border-white/5 p-6 rounded-2xl flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${award.locked ? 'bg-zinc-900 border-white/5 text-zinc-800' : 'bg-blue-600/10 border-blue-600/30 text-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.1)]'}`}>
                          {award.locked ? <Lock size={18} /> : <Trophy size={18} />}
                       </div>
                       <div className="flex-1">
                          <h4 className={`text-xs font-black uppercase tracking-widest ${award.locked ? 'text-zinc-700' : 'text-white'}`}>{award.title}</h4>
                          <p className="text-[7px] font-bold text-zinc-700 uppercase mt-0.5">{award.desc}</p>
                       </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals & Overlays */}
      <AnimatePresence>
        {aiResponse && (
          <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAiResponse(null)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="bg-[#0e0e10] border-t sm:border border-white/10 p-8 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-lg relative z-10">
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-500"><Sparkles size={20} className="animate-pulse" /></div>
                  <h2 className="text-lg font-black italic uppercase text-white tracking-widest">Directive</h2>
                </div>
                {aiResponse.loading ? (
                  <div className="py-12 flex flex-col items-center gap-4"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
                ) : (
                  <p className="text-xl sm:text-2xl font-black italic text-zinc-200 leading-tight">"{aiResponse.content}"</p>
                )}
                <button onClick={() => setAiResponse(null)} className="w-full py-5 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-95 transition-all shadow-xl font-bold">ACKNOWLEDGE</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditingProfile(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-[#0e0e10] p-8 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-sm border-t border-white/10 relative z-10">
              <h3 className="text-lg font-black uppercase italic text-white mb-8">Personalize Profile</h3>
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2 justify-center mb-6">
                  {AVATARS.map(a => (
                    <button key={a} onClick={() => setProfile({ ...profile, avatar: a })} className={`w-12 h-12 rounded-xl text-xl border transition-all ${profile.avatar === a ? 'bg-blue-600 border-blue-400 scale-110' : 'bg-black border-white/5'}`}>{a}</button>
                  ))}
                </div>
                <input 
                  value={profile.name} 
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })} 
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-black uppercase text-sm outline-none focus:border-blue-600"
                />
                <div className="flex flex-col gap-2">
                  <button onClick={() => setIsEditingProfile(false)} className="w-full py-4 bg-white text-black rounded-xl text-[10px] font-black uppercase">SAVE CHANGES</button>
                  <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full py-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"><LogOut size={14} /> WIPE ALL DATA</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Goal Modal */}
      <AnimatePresence>
        {isSettingGoals && (
          <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSettingGoals(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-[#0e0e10] p-8 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-sm border-t border-white/10 relative z-10">
              <h3 className="text-lg font-black italic uppercase text-white mb-8 text-center">Protocol Calibration</h3>
              <div className="space-y-8">
                <div className="space-y-4">
                   <div className="flex justify-between items-center px-1">
                      <p className="text-[10px] font-black text-zinc-500 uppercase">Daily Task Quota</p>
                      <span className="text-lg font-black text-blue-500">{goals.daily}</span>
                   </div>
                   <input type="range" min="1" max={Math.max(1, habits.length)} step="1" value={goals.daily} onChange={(e) => updateGoals({ daily: parseInt(e.target.value) })} className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                </div>
                <button onClick={() => setIsSettingGoals(false)} className="w-full py-5 bg-zinc-900 border border-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-95 transition-all">CLOSE</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Adding Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdding(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-[#0e0e10] p-8 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-sm border-t border-white/10 relative z-10">
              <h3 className="text-lg font-black italic uppercase text-white mb-8">New Protocol</h3>
              <form onSubmit={addHabit} className="space-y-6">
                <input autoFocus value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="PROTOCOL NAME..." className="w-full bg-black border border-white/10 rounded-xl px-5 py-4 text-sm font-black uppercase focus:border-blue-600 outline-none text-white transition-all" />
                <button type="submit" className="w-full py-4 bg-white text-black rounded-xl text-[9px] font-black uppercase font-bold">COMMISSION</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-[500] safe-pb px-4 pb-4">
        <div className="max-w-md mx-auto bg-[#0e0e10]/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-2 flex items-center justify-around shadow-2xl relative">
          <button onClick={() => { triggerHaptic(); setActiveView('OPERATIONS'); }} className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-full transition-all relative ${activeView === 'OPERATIONS' ? 'text-blue-500' : 'text-zinc-700'}`}>
            <BarChart3 size={20} />
            <span className="text-[7px] font-black tracking-widest uppercase">OPS</span>
            {activeView === 'OPERATIONS' && <motion.div layoutId="nav-bg" className="absolute inset-0 bg-blue-600/10 rounded-full z-[-1]" />}
          </button>
          
          <button onClick={() => setIsAdding(true)} className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-black shadow-xl active:scale-90 transition-all -mt-8 border-4 border-[#050505]">
            <Plus size={24} strokeWidth={4} />
          </button>
          
          <button onClick={() => { triggerHaptic(); setActiveView('MERIT'); }} className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-full transition-all relative ${activeView === 'MERIT' ? 'text-blue-500' : 'text-zinc-700'}`}>
            <Trophy size={20} />
            <span className="text-[7px] font-black tracking-widest uppercase">HONOR</span>
            {activeView === 'MERIT' && <motion.div layoutId="nav-bg" className="absolute inset-0 bg-blue-600/10 rounded-full z-[-1]" />}
          </button>
        </div>
      </nav>

    </div>
  );
};

// --- Sub-screens ---

const Onboarding = ({ onComplete }: { onComplete: (p: { name: string, avatar: string }) => void }) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🥷');

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-white relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[100vw] h-[100vw] bg-blue-600/10 blur-[150px] rounded-full" />
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-12 relative z-10">
        <div className="text-center space-y-4">
           <div className="w-20 h-20 bg-blue-600/20 border border-blue-500/30 rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-2xl shadow-blue-500/10">{avatar}</div>
           <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">IDENTITY SECURE</h1>
           <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Enter operative designation</p>
        </div>

        <div className="space-y-8">
          <div className="flex justify-center gap-3">
            {AVATARS.slice(0, 4).map(a => (
              <button key={a} onClick={() => { triggerHaptic('light'); setAvatar(a); }} className={`w-12 h-12 rounded-xl text-xl border transition-all ${avatar === a ? 'bg-blue-600 border-blue-400 scale-110 shadow-lg' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>{a}</button>
            ))}
          </div>
          <div className="space-y-4">
            <input 
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="YOUR NAME..."
              className="w-full bg-black border border-white/10 rounded-2xl px-6 py-5 text-lg font-black uppercase tracking-widest text-center focus:border-blue-600 outline-none transition-all placeholder:text-zinc-800"
            />
            <button 
              disabled={!name.trim()}
              onClick={() => onComplete({ name, avatar })}
              className="w-full py-5 bg-white text-black font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-20 disabled:grayscale"
            >
              INITIALIZE LOGS <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const Introduction = ({ userName, onFinish }: { userName: string, onFinish: () => void }) => {
  const steps = [
    { icon: <Target className="text-blue-500" />, title: "The Mission", desc: "Define your daily protocols. Every task completed is a victory in discipline." },
    { icon: <BarChart3 className="text-indigo-500" />, title: "The Density Profile", desc: "Track execution velocity over 30 days. Visualize where you excel and where you lag." },
    { icon: <Sparkles className="text-emerald-500" />, title: "Tactical Advisor", desc: "Gemini AI reviews your metrics and issues critical directives to keep you sharp." }
  ];

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col p-8 sm:p-20 text-white relative">
      <div className="space-y-2 mt-12 sm:mt-0">
        <p className="text-blue-500 text-xs font-black tracking-[0.3em] uppercase">System Initialized</p>
        <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter uppercase leading-none">Welcome, {userName}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 sm:mt-24">
        {steps.map((s, i) => (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.2 }} key={i} className="bg-zinc-900/40 border border-white/5 p-8 rounded-[2rem] space-y-6">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">{s.icon}</div>
            <div className="space-y-2">
              <h3 className="text-lg font-black uppercase italic">{s.title}</h3>
              <p className="text-sm text-zinc-500 font-medium leading-relaxed">{s.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-auto pt-12 flex justify-end">
        <button onClick={onFinish} className="px-10 py-5 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4">
          ENTER THE MATRIX <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

// --- Mount App ---
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DailyAchiever />);
}
