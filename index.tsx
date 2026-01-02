
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  GripHorizontal
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

interface AIResponse {
  content: string;
  loading: boolean;
}

interface Goals {
  daily: number;
  weekly: number;
}

// --- Icons Mapping ---
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

const getIconForText = (text: string) => {
  for (const key in iconMap) {
    if (text.toLowerCase().includes(key.toLowerCase())) return iconMap[key];
  }
  return iconMap.Default;
};

// --- Haptic Utility ---
const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    const pattern = style === 'light' ? [10] : style === 'medium' ? [20] : [50];
    window.navigator.vibrate(pattern);
  }
};

// --- Visual Components ---
const ProgressRing = ({ percentage, color = "stroke-blue-500", size = 48 }: { percentage: number, color?: string, size?: number }) => {
  const radius = size * 0.4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, percentage) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="stroke-white/5"
          strokeWidth="4"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
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

const TacticalTooltip = ({ active, payload, label, habitsCount, dailyGoal }: any) => {
  if (active && payload && payload.length) {
    const daily = payload.find((p: any) => p.dataKey === 'daily')?.value || 0;
    const weekly = payload.find((p: any) => p.dataKey === 'weeklyVelocity')?.value || 0;
    const status = daily >= dailyGoal ? 'MISSION SUCCESS' : 'BELOW QUOTA';

    return (
      <div className="bg-[#0e0e10]/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl min-w-[160px] pointer-events-none">
        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2 border-b border-white/5 pb-1">{label}</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center gap-4">
            <span className="text-[8px] font-bold text-zinc-500 uppercase">Tasks</span>
            <span className="text-xs font-black text-white italic">{daily}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-[8px] font-bold text-zinc-500 uppercase">Velocity</span>
            <span className="text-xs font-black text-blue-500 italic">{weekly}</span>
          </div>
          <div className="pt-1 flex flex-col gap-0.5">
             <span className={`text-[9px] font-black tracking-tighter ${daily >= dailyGoal ? 'text-emerald-500' : 'text-rose-500'}`}>{status}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const DailyAchiever = () => {
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

  const [activeView, setActiveView] = useState<'OPERATIONS' | 'MERIT'>('OPERATIONS');
  const [inputValue, setInputValue] = useState('');
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSettingGoals, setIsSettingGoals] = useState(false);

  useEffect(() => {
    localStorage.setItem('achiever_matrix_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('achiever_matrix_goals', JSON.stringify(goals));
  }, [goals]);

  const todayIdx = useMemo(() => new Date().getDate(), []);
  const currentMonthName = useMemo(() => new Date().toLocaleString('default', { month: 'long' }).toUpperCase(), []);
  const prevMonthAccuracy = 62;

  // VERIFIED: Users can only interact with the current day
  const toggleHabitDate = useCallback((habitId: string, dayIndex: number) => {
    if (dayIndex !== todayIdx) return; // LOGIC FREEZE
    
    triggerHaptic('light');
    const dateKey = `day-${dayIndex}`;
    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        return {
          ...h,
          entries: { ...h.entries, [dateKey]: !h.entries[dateKey] }
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
    setHabits([...habits, newHabit]);
    setInputValue('');
    setIsAdding(false);
  };

  const deleteHabit = (id: string) => {
    triggerHaptic('heavy');
    if (window.confirm('DECOMMISSION PROTOCOL?')) {
      setHabits(habits.filter(h => h.id !== id));
    }
  };

  const updateGoals = (newGoals: Partial<Goals>) => {
    triggerHaptic('light');
    setGoals(prev => ({ ...prev, ...newGoals }));
  };

  const getEfficacy = (habit: Habit) => {
    const completions = Object.values(habit.entries).filter(Boolean).length;
    return Math.round((completions / 30) * 100);
  };

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

  const totalCompletions = useMemo(() => {
    return habits.reduce((acc, h) => acc + Object.values(h.entries).filter(Boolean).length, 0);
  }, [habits]);

  const accuracyRate = useMemo(() => {
    const totalSlots = habits.length * 30;
    return totalSlots > 0 ? Math.round((totalCompletions / totalSlots) * 100) : 0;
  }, [habits, totalCompletions]);

  const accuracyDelta = useMemo(() => accuracyRate - prevMonthAccuracy, [accuracyRate]);

  const analyticsPayload = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const day = i + 1;
      const count = habits.reduce((acc, h) => acc + (h.entries[`day-${day}`] ? 1 : 0), 0);
      let weeklySum = 0;
      let windowSize = 0;
      for (let j = Math.max(1, day - 6); j <= day; j++) {
        weeklySum += habits.reduce((acc, h) => acc + (h.entries[`day-${j}`] ? 1 : 0), 0);
        windowSize++;
      }
      const weeklyAvg = Number((weeklySum / windowSize).toFixed(1));
      const baselineFactor = (prevMonthAccuracy / 100) * (habits.length || 1);
      const seasonalNoise = Math.sin(day * 0.5) * 0.5;
      const prevCycleAvg = Number((baselineFactor + seasonalNoise).toFixed(1));

      return { 
        day: `D${day}`, 
        daily: count, 
        weeklyVelocity: weeklyAvg,
        prevCycle: prevCycleAvg
      };
    });
  }, [habits, prevMonthAccuracy]);

  const callCoach = async () => {
    triggerHaptic('medium');
    setAiResponse({ content: '', loading: true });
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const prompt = `Tactical Review: Efficiency ${accuracyRate}%. Goal: ${goals.daily} daily. Today: ${dailyProgress}. Review 30-day execution metrics and provide a 20-word mission-critical directive for elite discipline.`;
      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction: "You are an Elite Tactical Strategist. Speak in short, punchy, military-style commands." }
      });
      setAiResponse({ content: result.text || "PROTOCOL ERROR.", loading: false });
    } catch (e) {
      setAiResponse({ content: "COMS LINK DOWN. DISCIPLINE IS THE ONLY SOLUTION.", loading: false });
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#f0f0f0] font-sans pb-[120px] antialiased overflow-x-hidden">
      
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px] sm:bg-[size:32px_32px]"></div>
        <div className="absolute top-[-20%] right-[-10%] w-[120vw] h-[120vw] bg-blue-600/5 blur-[120px] rounded-full opacity-60"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 safe-pt space-y-8 sm:space-y-12">
        
        <header className="flex flex-col items-center gap-6 pt-4 sm:pt-12">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <div className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                <p className="text-[8px] sm:text-[10px] font-black tracking-[0.2em] text-blue-500 uppercase">{currentMonthName} OPS CYCLE</p>
              </div>
            </div>
            <h1 className="text-5xl sm:text-7xl xl:text-8xl font-black italic tracking-tighter uppercase text-white leading-none">TASK CHASER</h1>
          </div>
          
          <div className="flex gap-2 w-full max-w-sm">
             <button 
                onClick={() => setIsSettingGoals(true)}
                className="flex-1 px-4 py-4 bg-[#0e0e10] border border-white/5 rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-900 transition-all text-[10px] font-black uppercase tracking-widest text-zinc-400 active:scale-95"
              >
                <Settings2 size={16} /> CALIBRATE
              </button>
             <button 
                onClick={callCoach}
                className="flex-[1.5] px-6 py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
              >
                <Sparkles size={16} /> ADVISOR
              </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeView === 'OPERATIONS' && (
            <motion.div
              key="ops"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 sm:space-y-16"
            >
              <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { 
                    label: 'EFFICIENCY', 
                    val: `${accuracyRate}%`, 
                    icon: <Activity size={12} />, 
                    color: 'text-blue-500',
                    ring: <ProgressRing percentage={accuracyRate} color="stroke-blue-500" />
                  },
                  { 
                    label: 'DAILY QUOTA', 
                    val: `${dailyProgress}/${goals.daily}`, 
                    icon: <Target size={12} />, 
                    color: 'text-emerald-500',
                    ring: <ProgressRing percentage={(dailyProgress / Math.max(1, goals.daily)) * 100} color="stroke-emerald-500" />
                  },
                  { 
                    label: 'WEEKLY TARGET', 
                    val: `${weeklyProgress}/${goals.weekly}`, 
                    icon: <Zap size={12} />, 
                    color: 'text-orange-500',
                    ring: <ProgressRing percentage={(weeklyProgress / Math.max(1, goals.weekly)) * 100} color="stroke-orange-500" />
                  },
                  { 
                    label: 'MONTHLY DELTA', 
                    val: `${accuracyDelta >= 0 ? '+' : ''}${accuracyDelta}%`, 
                    icon: <TrendingUp size={12} />, 
                    color: 'text-zinc-500',
                    ring: <div className={`text-xs font-black italic ${accuracyDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{accuracyDelta >= 0 ? 'UP' : 'DN'}</div>
                  },
                ].map((stat, i) => (
                  <div key={i} className="bg-[#0e0e10]/60 backdrop-blur-md border border-white/5 p-4 rounded-2xl group active:bg-zinc-900 transition-all flex flex-col justify-between h-32 sm:h-36">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className={stat.color}>{stat.icon}</span>
                          <p className="text-[7px] sm:text-[9px] font-black text-zinc-600 uppercase tracking-widest truncate">{stat.label}</p>
                        </div>
                        <h4 className="text-lg sm:text-2xl font-black text-white italic leading-none">{stat.val}</h4>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                       {stat.ring}
                    </div>
                  </div>
                ))}
              </section>

              <div className="bg-[#0e0e10]/80 backdrop-blur-3xl border border-white/5 p-4 sm:p-10 rounded-[2rem] h-[400px] sm:h-[500px] flex flex-col group relative overflow-hidden">
                <div className="flex items-center justify-between mb-8 sm:mb-12 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-600 rounded-full" />
                    <h4 className="text-[9px] sm:text-[11px] font-black tracking-[0.2em] text-white uppercase">Execution Density Profile</h4>
                  </div>
                </div>

                <div className="flex-1 w-full relative z-10 touch-pan-x">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart 
                      data={analyticsPayload} 
                      margin={{ top: 0, right: 0, left: -45, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke="#ffffff03" strokeDasharray="3 3" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#27272a', fontSize: 8, fontWeight: 800}} dy={10} />
                      <YAxis hide domain={[0, habits.length + 1]} />
                      <Tooltip content={<TacticalTooltip habitsCount={habits.length} dailyGoal={goals.daily} />} cursor={{ fill: '#ffffff05' }} trigger="click" />
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

              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                    <h2 className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase text-white">Grid Monitoring</h2>
                  </div>
                  <button onClick={() => setIsAdding(true)} className="w-12 h-12 bg-white text-black rounded-xl flex items-center justify-center active:scale-90 transition-all shadow-lg">
                    <Plus size={24} strokeWidth={3} />
                  </button>
                </div>

                <div className="space-y-4">
                  {habits.map((habit) => (
                    <motion.div layout key={habit.id} className="bg-[#0e0e10]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4 sm:p-6 transition-all group">
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-xl sm:text-2xl border border-white/5 transition-all duration-500 ${habit.entries[`day-${todayIdx}`] ? 'bg-blue-600 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.2)]' : 'bg-[#16161a]'}`}>
                            {habit.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm sm:text-lg font-black text-white italic tracking-wider uppercase truncate mb-1">{habit.text}</h4>
                            <div className="flex items-center gap-2">
                              <div className="h-1 flex-1 max-w-[120px] bg-zinc-900 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${getEfficacy(habit)}%` }} />
                              </div>
                              <span className="text-[7px] font-black text-zinc-600 uppercase">{getEfficacy(habit)}% COMPLIANCE</span>
                            </div>
                          </div>
                          <button onClick={() => deleteHabit(habit.id)} className="p-2 text-zinc-800 hover:text-rose-500 opacity-40 active:scale-90">
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="overflow-x-auto scrollbar-hide snap-x touch-pan-x">
                          <div className="flex gap-4 pb-1 min-w-max">
                            {[0, 1, 2, 3].map(weekIdx => (
                              <div key={weekIdx} className="space-y-2 snap-start">
                                <div className="flex items-center gap-1.5">
                                  {Array.from({ length: 7 }).map((_, dIdx) => {
                                    const dayNum = weekIdx * 7 + dIdx + 1;
                                    if (dayNum > 30) return null;
                                    
                                    const isDone = habit.entries[`day-${dayNum}`];
                                    const isToday = dayNum === todayIdx;
                                    const isPast = dayNum < todayIdx;
                                    const isFuture = dayNum > todayIdx;

                                    return (
                                      <button 
                                        key={dayNum} 
                                        disabled={!isToday}
                                        onClick={() => toggleHabitDate(habit.id, dayNum)}
                                        className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-[8px] font-black border transition-all touch-manipulation
                                          ${isToday ? 'active:scale-90 bg-zinc-900 border-blue-500/50 text-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.1)]' : ''}
                                          ${isDone && isToday ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : ''}
                                          ${isDone && isPast ? 'bg-zinc-800 border-zinc-700 text-zinc-400 opacity-60' : ''}
                                          ${!isDone && isPast ? 'bg-black border-white/5 text-zinc-900 opacity-30 cursor-not-allowed' : ''}
                                          ${isFuture ? 'bg-black border-white/5 text-zinc-900 opacity-10 cursor-not-allowed' : ''}
                                        `}
                                      >
                                        <span className="text-[5px] opacity-40 mb-0.5">{dayNum}</span>
                                        {isDone ? <Zap size={10} fill="currentColor" /> : (isToday ? 'ACT' : '•')}
                                      </button>
                                    );
                                  })}
                                </div>
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
                    <div key={i} className="bg-black/40 border border-white/5 p-6 rounded-2xl flex items-center gap-4 group">
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

      {/* Directives Modal */}
      <AnimatePresence>
        {aiResponse && (
          <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAiResponse(null)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="bg-[#0e0e10] border-t sm:border border-white/10 p-8 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-lg relative sheet-shadow z-10">
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-8 sm:hidden" />
              <button onClick={() => setAiResponse(null)} className="absolute top-6 right-6 text-zinc-600 p-2 hidden sm:block"><X size={24} /></button>
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-500"><Sparkles size={20} className="animate-pulse" /></div>
                  <h2 className="text-lg font-black italic uppercase text-white tracking-widest">Directive</h2>
                </div>
                {aiResponse.loading ? (
                  <div className="py-12 flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                    <span className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-600">Processing...</span>
                  </div>
                ) : (
                  <p className="text-xl sm:text-2xl font-black italic text-zinc-200 leading-tight">"{aiResponse.content}"</p>
                )}
                <button onClick={() => setAiResponse(null)} className="w-full py-5 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-95 transition-all">ACKNOWLEDGE</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Goal Calibration Sheet */}
      <AnimatePresence>
        {isSettingGoals && (
          <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSettingGoals(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="bg-[#0e0e10] border-t sm:border border-white/10 p-8 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-sm relative sheet-shadow z-10">
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6 sm:hidden" />
              <h3 className="text-lg font-black italic uppercase text-white mb-8 text-center">Protocol Calibration</h3>
              <div className="space-y-8">
                <div className="space-y-4">
                   <div className="flex justify-between items-center px-1">
                      <p className="text-[10px] font-black text-zinc-500 uppercase">Daily Task Quota</p>
                      <span className="text-lg font-black text-blue-500">{goals.daily}</span>
                   </div>
                   <input type="range" min="1" max={Math.max(1, habits.length)} step="1" value={goals.daily} onChange={(e) => updateGoals({ daily: parseInt(e.target.value) })} className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                </div>
                <div className="space-y-4">
                   <div className="flex justify-between items-center px-1">
                      <p className="text-[10px] font-black text-zinc-500 uppercase">Weekly Target</p>
                      <span className="text-lg font-black text-indigo-500">{goals.weekly}</span>
                   </div>
                   <input type="range" min="1" max={habits.length * 7} step="1" value={goals.weekly} onChange={(e) => updateGoals({ weekly: parseInt(e.target.value) })} className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                </div>
                <button onClick={() => setIsSettingGoals(false)} className="w-full py-5 bg-zinc-900 border border-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-95 transition-all">CLOSE</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Protocol Sheet */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdding(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="bg-[#0e0e10] p-8 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-sm border-t sm:border border-white/10 sheet-shadow z-10">
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6 sm:hidden" />
              <h3 className="text-lg font-black italic uppercase text-white mb-8">New Protocol</h3>
              <form onSubmit={addHabit} className="space-y-6">
                <input autoFocus value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="PROTOCOL NAME..." className="w-full bg-black border border-white/10 rounded-xl px-5 py-4 text-sm font-black uppercase tracking-widest focus:border-blue-600 outline-none text-white transition-all" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-4 text-[9px] font-black uppercase text-zinc-600">CANCEL</button>
                  <button type="submit" className="flex-[2] py-4 bg-white text-black rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all">COMMISSION</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Nav - Optimized for Native Thumb Reach */}
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

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DailyAchiever />);
}
