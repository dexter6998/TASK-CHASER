
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
  AreaChart as AreaChartIcon,
  Mic,
  MicOff,
  Headphones,
  Search,
  ChevronDown,
  ExternalLink,
  History,
  Volume1,
  Tag,
  Flag,
  ArrowRight,
  Fingerprint,
  Lightbulb,
  AlertCircle,
  Info,
  CalendarDays,
  MoreVertical,
  Trash,
  Share2,
  FileText,
  Rocket
} from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage, Blob as GenAIBlob, Type } from "@google/genai";
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
  BarChart,
  Pie,
  PieChart as RechartsPieChart
} from 'recharts';

// --- Utility Functions ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
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

function createBlob(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- Types ---
type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
type AppMode = 'NORMAL' | 'FOUNDER';
type AppTheme = 'DARK' | 'LIGHT';

interface Habit {
  id: string;
  text: string;
  icon: string;
  entries: Record<string, boolean>;
  reminders: string[];
  priority: Priority;
  category: string;
  createdAt: number;
  calendarSynced?: boolean;
}

interface Suggestion {
  text: string;
  icon: string;
  category: string;
  priority: Priority;
  reason: string;
}

interface UserProfile {
  name: string;
  avatar: string;
  onboarded: boolean;
  theme: AppTheme;
  mode: AppMode;
  archetype?: string;
}

interface JarvisMessage {
  role: 'assistant' | 'user';
  content: string;
  timestamp: number;
}

interface DailyDebrief {
  efficiency: number;
  completedCount: number;
  totalCount: number;
  aiMessage: string;
  topSector: string;
}

const NORMAL_CATEGORIES = ['HEALTH', 'WORK', 'GROWTH', 'SOCIAL', 'ROUTINE'];
const FOUNDER_VERTICALS = ['STRATEGY', 'OPERATIONS', 'NETWORKING', 'PRODUCT', 'WELLNESS', 'CAPITAL'];
const AVATARS = ["🤴", "👔", "🚀", "📈", "🦾", "💎", "🦁", "🦅", "🥷", "⚡"];

// --- Theme Engine ---

/**
 * Returns a CSS background color class based on the given priority.
 * Used for visual categorization of habits.
 */
const getPriorityColor = (priority: Priority) => {
  switch (priority) {
    case 'HIGH': return 'bg-rose-500';
    case 'MEDIUM': return 'bg-amber-500';
    case 'LOW': return 'bg-blue-500';
    default: return 'bg-zinc-500';
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
    chart: '#3b82f6',
    jarvis: 'bg-blue-600'
  };
};

// --- Visualization Components ---

const TacticalHeatmap = ({ habits, colors }: { habits: Habit[], colors: any }) => {
  const weeks = Array.from({ length: 52 }, (_, i) => i);
  const days = [0, 1, 2, 3, 4, 5, 6];

  return (
    <div className="flex flex-col gap-2 p-6 bg-black/40 rounded-[2rem] border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Consistency Matrix / 365 Days</h4>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map(v => (
            <div key={v} className={`w-2 h-2 rounded-[1px] ${v === 0 ? 'bg-white/5' : colors.accentBg}`} style={{ opacity: v * 0.25 || 0.1 }} />
          ))}
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-2">
        {weeks.map(w => (
          <div key={w} className="flex flex-col gap-1">
            {days.map(d => {
              const dayOfYear = w * 7 + d;
              const hasActivity = habits.some(h => h.entries[`day-${dayOfYear % 30 + 1}`]); 
              const level = hasActivity ? Math.floor(Math.random() * 4) + 1 : 0;
              return (
                <div 
                  key={d} 
                  className={`w-2.5 h-2.5 rounded-[1px] transition-all duration-700
                    ${level === 0 ? 'bg-white/5' : colors.accentBg}`}
                  style={{ opacity: level * 0.25 || 0.1 }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Main Application ---
const DailyAchiever = () => {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('achiever_nexus_profile_v6');
    return saved ? JSON.parse(saved) : null;
  });

  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('achiever_nexus_habits_v6');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeView, setActiveView] = useState<'OPS' | 'INTEL' | 'MERIT'>('OPS');
  const [jarvisActive, setJarvisActive] = useState(false);
  const [jarvisHistory, setJarvisHistory] = useState<JarvisMessage[]>([]);
  const [jarvisInput, setJarvisInput] = useState('');
  const [jarvisThinking, setJarvisThinking] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [debrief, setDebrief] = useState<DailyDebrief | null>(null);
  const [isGeneratingDebrief, setIsGeneratingDebrief] = useState(false);

  // Onboarding States
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [tempProfile, setTempProfile] = useState<Partial<UserProfile>>({
    name: '',
    mode: 'NORMAL',
    archetype: '',
    avatar: '🥷',
    onboarded: false,
    theme: 'DARK'
  });
  const [tempHabits, setTempHabits] = useState<Habit[]>([]);

  // Recommendations State
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  const colors = useMemo(() => getThemeColors(profile?.mode || (tempProfile.mode as AppMode) || 'NORMAL', profile?.theme || 'DARK'), [profile?.mode, profile?.theme, tempProfile.mode]);
  const isFounder = profile?.mode === 'FOUNDER' || tempProfile.mode === 'FOUNDER';
  const categories = isFounder ? FOUNDER_VERTICALS : NORMAL_CATEGORIES;
  const todayIdx = new Date().getDate();

  const outputCtxRef = useRef<AudioContext | null>(null);

  // Sorting Logic: HIGH > MEDIUM > LOW
  const sortedHabits = useMemo(() => {
    const priorityWeights = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return [...habits].sort((a, b) => priorityWeights[b.priority] - priorityWeights[a.priority]);
  }, [habits]);

  const selectedHabit = useMemo(() => habits.find(h => h.id === selectedHabitId), [habits, selectedHabitId]);

  const todayCompletedCount = useMemo(() => habits.filter(h => h.entries[`day-${todayIdx}`]).length, [habits, todayIdx]);
  const todayEfficiency = useMemo(() => habits.length > 0 ? Math.round((todayCompletedCount / habits.length) * 100) : 0, [todayCompletedCount, habits.length]);

  // Metrics Logic
  const analyticsPayload = useMemo(() => {
    const DAYS_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return Array.from({ length: 14 }, (_, i) => {
      const targetDay = todayIdx - (13 - i);
      if (targetDay < 1) return { name: 'N/A', completed: 0, efficiency: 0 };
      const count = habits.filter(h => h.entries[`day-${targetDay}`]).length;
      return { 
        name: DAYS_NAMES[(new Date(2025, 0, targetDay)).getDay()], 
        completed: count, 
        efficiency: Math.round((count / Math.max(1, habits.length)) * 100) 
      };
    });
  }, [habits, todayIdx]);

  const habitSpecificAnalytics = useMemo(() => {
    if (!selectedHabit) return [];
    return Array.from({ length: 14 }, (_, i) => {
      const targetDay = todayIdx - (13 - i);
      if (targetDay < 1) return { name: '', done: 0 };
      return {
        name: `Day ${targetDay}`,
        done: selectedHabit.entries[`day-${targetDay}`] ? 1 : 0
      };
    });
  }, [selectedHabit, todayIdx]);

  const sectorData = useMemo(() => {
    return categories.map(cat => {
      const catHabits = habits.filter(h => h.category === cat);
      const completion = catHabits.reduce((acc, h) => acc + (h.entries[`day-${todayIdx}`] ? 1 : 0), 0);
      return {
        name: cat,
        value: catHabits.length > 0 ? Math.round((completion / catHabits.length) * 100) : 0,
        count: catHabits.length
      };
    });
  }, [habits, categories, todayIdx]);

  const priorityData = useMemo(() => {
    const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    habits.forEach(h => counts[h.priority]++);
    return [
      { name: 'HIGH', value: counts.HIGH, color: '#f43f5e' },
      { name: 'MEDIUM', value: counts.MEDIUM, color: '#f59e0b' },
      { name: 'LOW', value: counts.LOW, color: '#3b82f6' },
    ];
  }, [habits]);

  const overallAccuracy = useMemo(() => {
    const done = habits.reduce((acc, h) => acc + Object.values(h.entries).filter(Boolean).length, 0);
    const totalPossible = habits.length * todayIdx;
    return habits.length > 0 ? Math.round((done / Math.max(1, totalPossible)) * 100) : 0;
  }, [habits, todayIdx]);

  // Save Persistence
  useEffect(() => {
    if (profile) localStorage.setItem('achiever_nexus_profile_v6', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    if (habits.length > 0) localStorage.setItem('achiever_nexus_habits_v6', JSON.stringify(habits));
  }, [habits]);

  // Actions
  const toggleHabit = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const key = `day-${todayIdx}`;
    setHabits(habits.map(h => h.id === id ? { ...h, entries: { ...h.entries, [key]: !h.entries[key] } } : h));
    if (window.navigator?.vibrate) window.navigator.vibrate(10);
  };

  const generateDebrief = async () => {
    if (!profile || isGeneratingDebrief) return;
    setIsGeneratingDebrief(true);
    try {
      const completedList = habits.filter(h => h.entries[`day-${todayIdx}`]).map(h => h.text).join(', ');
      const missedList = habits.filter(h => !h.entries[`day-${todayIdx}`]).map(h => h.text).join(', ');
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a Daily Mission Debrief as JARVIS.
          User: ${profile.name} (Archetype: ${profile.archetype})
          Efficiency Today: ${todayEfficiency}%
          Completed Habits: ${completedList || 'None'}
          Missed Habits: ${missedList || 'None'}
          
          Be extremely tactical, witty, and supportive. Use military/tech terminology. Focus on how this day's performance aligns with their ${profile.mode} operational protocol. 
          Maximum 3 sentences.`,
      });

      const message = response.text || "Operational data analyzed. Efficiency within acceptable parameters, sir.";
      
      setDebrief({
        efficiency: todayEfficiency,
        completedCount: todayCompletedCount,
        totalCount: habits.length,
        aiMessage: message,
        topSector: sectorData.sort((a,b) => b.value - a.value)[0]?.name || "N/A"
      });
      speakText(message);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingDebrief(false);
    }
  };

  const toggleCalendarSync = (id: string) => {
    setHabits(habits.map(h => {
      if (h.id === id) {
        const newState = !h.calendarSynced;
        speakText(newState ? `Temporal Uplink established for ${h.text}. Synced with device schedule.` : `Temporal Uplink severed for ${h.text}.`);
        return { ...h, calendarSynced: newState };
      }
      return h;
    }));
  };

  const deleteHabit = (id: string) => {
    setHabits(habits.filter(h => h.id !== id));
    setSelectedHabitId(null);
    speakText("Unit decommissioned. Data purged from performance matrix.");
  };

  const speakText = async (text: string) => {
    if (isMuted) return;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text.substring(0, 1000) }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Puck' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!outputCtxRef.current) {
          outputCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const audioBuffer = await decodeAudioData(
          decode(base64Audio),
          outputCtxRef.current,
          24000,
          1,
        );
        const source = outputCtxRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputCtxRef.current.destination);
        source.start();
      }
    } catch (e) {
      console.error("TTS Protocol failure:", e);
    }
  };

  const calibrateArchetype = async (name: string, mode: string) => {
    setJarvisThinking(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `User name is ${name}. They have selected ${mode} operational protocol. Suggest a high-performance "Neural Archetype" name (2 words, tactical). For example "Strategy Architect" or "Operational Vanguard". Return only the name.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      const arch = response.text?.trim().replace(/[^a-zA-Z\s]/g, '') || (mode === 'FOUNDER' ? "Venture Architect" : "Growth Catalyst");
      setTempProfile(prev => ({ ...prev, archetype: arch }));
      speakText(`Calibration complete. Identification confirmed as ${arch}.`);
    } catch (e) {
      console.error(e);
      setTempProfile(prev => ({ ...prev, archetype: mode === 'FOUNDER' ? "Strategy Titan" : "Performance Operative" }));
    } finally {
      setJarvisThinking(false);
    }
  };

  const generateRecommendations = useCallback(async () => {
    if (!profile?.onboarded || isGeneratingSuggestions) return;
    setIsGeneratingSuggestions(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `As JARVIS AI, analyze this user's profile and suggest 3 tactical habits.
          Archetype: ${profile.archetype}
          Operational Mode: ${profile.mode}
          Current Performance Accuracy: ${overallAccuracy}%
          Current Units: ${habits.map(h => h.text).join(', ')}
          Categories Available: ${categories.join(', ')}
          
          Return exactly 3 recommendations in JSON format.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: 'Short habit name, max 20 chars' },
                icon: { type: Type.STRING, description: 'One emoji' },
                category: { type: Type.STRING, description: 'Must be from available categories' },
                priority: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
                reason: { type: Type.STRING, description: 'Short tactical reason why this fits the archetype' }
              },
              required: ['text', 'icon', 'category', 'priority', 'reason']
            }
          }
        }
      });
      const data = JSON.parse(response.text || '[]');
      setSuggestions(data);
    } catch (e) {
      console.error("Neural Uplink failure:", e);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }, [profile, habits, overallAccuracy, categories, isGeneratingSuggestions]);

  /**
   * Deploys a recommended habit (suggestion) to the user's active habit matrix.
   */
  const deploySuggestion = (s: Suggestion) => {
    const newH: Habit = {
      id: crypto.randomUUID(),
      text: s.text.toUpperCase(),
      icon: s.icon,
      category: s.category,
      priority: s.priority,
      entries: {},
      reminders: [],
      createdAt: Date.now(),
      calendarSynced: false
    };
    setHabits(prev => [...prev, newH]);
    setSuggestions(prev => prev.filter(item => item.text !== s.text));
    speakText(`Tactical unit ${s.text} deployed to active matrix.`);
  };

  useEffect(() => {
    if (profile?.onboarded && suggestions.length === 0) {
      generateRecommendations();
    }
  }, [profile?.onboarded, suggestions.length, generateRecommendations]);

  const talkToJarvis = async () => {
    if (!jarvisInput.trim() || jarvisThinking) return;
    const msg = jarvisInput;
    setJarvisInput('');
    setJarvisHistory(prev => [...prev, { role: 'user', content: msg, timestamp: Date.now() }]);
    setJarvisThinking(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          ...jarvisHistory.slice(-5).map(h => ({ 
            role: (h.role === 'assistant' ? 'model' : 'user') as "model" | "user", 
            parts: [{ text: h.content }] 
          })),
          { role: 'user', parts: [{ text: msg }] }
        ],
        config: {
          systemInstruction: `You are JARVIS. Archetype: AI Strategic Mentor. Efficiency: ${overallAccuracy}%. User: ${profile?.name}. Current Mode: ${profile?.mode}. Be witty, extremely tactical, and precise. Respond in a few short sentences.`,
        }
      });
      const assistantResponse = response.text || 'Acknowledged, sir.';
      setJarvisHistory(prev => [...prev, { role: 'assistant', content: assistantResponse, timestamp: Date.now() }]);
      speakText(assistantResponse);
    } catch (e) {
      console.error(e);
      setJarvisHistory(prev => [...prev, { role: 'assistant', content: 'Signal interference detected. Command rejected.', timestamp: Date.now() }]);
    } finally {
      setJarvisThinking(false);
    }
  };

  const startVoiceMode = async () => {
    if (isLiveActive) return;
    setIsLiveActive(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    if (!outputCtxRef.current) outputCtxRef.current = new AudioContext({ sampleRate: 24000 });
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => {
          const inCtx = new AudioContext({ sampleRate: 16000 });
          const source = inCtx.createMediaStreamSource(stream);
          const processor = inCtx.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (e) => {
            sessionPromise.then(s => s.sendRealtimeInput({ media: createBlob(e.inputBuffer.getChannelData(0)) }));
          };
          source.connect(processor); processor.connect(inCtx.destination);
        },
        onmessage: async (msg) => {
          const audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audio && outputCtxRef.current) {
            const buf = await decodeAudioData(decode(audio), outputCtxRef.current, 24000, 1);
            const s = outputCtxRef.current.createBufferSource();
            s.buffer = buf; s.connect(outputCtxRef.current.destination);
            s.start();
          }
        },
        onclose: () => setIsLiveActive(false),
        onerror: () => setIsLiveActive(false)
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: `You are JARVIS. Archetype: AI Mentor. Personality: Witty, Loyal, Elite. Efficiency: ${overallAccuracy}%. Speaking to ${profile?.name}.`,
      }
    });
  };

  const finalizeOnboarding = () => {
    const finalProfile = { ...tempProfile, onboarded: true } as UserProfile;
    setProfile(finalProfile);
    setHabits(tempHabits);
    speakText("Welcome to the Nexus Performance Matrix, sir. Operational readiness at 100 percent.");
  };

  if (!profile) {
    return (
      <div className={`min-h-screen bg-[#050505] text-[#f4f4f5] font-sans flex items-center justify-center p-6 relative overflow-hidden transition-all duration-700`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.05),transparent)] pointer-events-none" />
        <div className={`fixed top-0 left-0 w-full h-[2px] ${colors.jarvis} opacity-20 z-[200] animate-scan pointer-events-none`} />
        
        <AnimatePresence mode="wait">
          {onboardingStep === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} className="max-w-md w-full space-y-12 text-center">
              <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] mx-auto flex items-center justify-center text-white shadow-2xl animate-pulse">
                 <Fingerprint size={48} />
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-black italic uppercase tracking-tighter">Identity Verification</h1>
                <p className="text-zinc-500 text-xs uppercase tracking-[0.4em] font-bold">Transmit Identifier to Console</p>
              </div>
              <input 
                autoFocus 
                value={tempProfile.name} 
                onChange={(e) => setTempProfile(p => ({ ...p, name: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && tempProfile.name && setOnboardingStep(1)}
                placeholder="IDENTIFIER..." 
                className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-6 text-center text-white font-black uppercase outline-none focus:border-blue-500 transition-all text-2xl shadow-inner" 
              />
              <button 
                disabled={!tempProfile.name}
                onClick={() => setOnboardingStep(1)}
                className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-2xl flex items-center justify-center gap-3
                  ${tempProfile.name ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-600 opacity-50'}
                `}
              >
                Sync Data <ArrowRight size={20} />
              </button>
            </motion.div>
          )}

          {onboardingStep === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} className="max-w-xl w-full space-y-12">
               <div className="text-center space-y-4">
                 <h2 className="text-3xl font-black italic uppercase tracking-tighter">Operational Protocol</h2>
                 <p className="text-zinc-500 text-[10px] uppercase tracking-[0.4em]">Select System Optimization Level</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button 
                    onClick={() => {
                      setTempProfile(p => ({ ...p, mode: 'NORMAL' }));
                      setOnboardingStep(2);
                      calibrateArchetype(tempProfile.name!, 'NORMAL');
                    }}
                    className="p-8 bg-zinc-900 border border-white/5 rounded-[2.5rem] text-left space-y-6 hover:bg-white/5 transition-all group shadow-xl"
                  >
                    <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                      <User size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black italic uppercase">Lifestyle Mode</h3>
                      <p className="text-xs text-zinc-500 leading-relaxed mt-2 uppercase tracking-tighter font-bold">Optimized for personal growth, health, and holistic performance.</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => {
                      setTempProfile(p => ({ ...p, mode: 'FOUNDER' }));
                      setOnboardingStep(2);
                      calibrateArchetype(tempProfile.name!, 'FOUNDER');
                    }}
                    className="p-8 bg-amber-500 text-black rounded-[2.5rem] text-left space-y-6 hover:brightness-110 transition-all group shadow-2xl"
                  >
                    <div className="w-14 h-14 bg-black/10 rounded-2xl flex items-center justify-center text-black group-hover:scale-110 transition-transform">
                      <Briefcase size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black italic uppercase">Founder Mode</h3>
                      <p className="text-xs opacity-70 leading-relaxed mt-2 uppercase tracking-tighter font-bold">Aggressive focus on operations, strategy, and capital objectives.</p>
                    </div>
                  </button>
               </div>
            </motion.div>
          )}

          {onboardingStep === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} className="max-w-md w-full space-y-12 text-center">
               <div className="w-24 h-24 border-4 border-dashed border-zinc-800 rounded-full mx-auto flex items-center justify-center relative overflow-hidden">
                  <Bot size={48} className={`text-zinc-600 ${jarvisThinking ? 'animate-pulse' : ''}`} />
                  {jarvisThinking && <div className="absolute inset-0 border-t-4 border-blue-500 animate-spin rounded-full" />}
               </div>
               <div className="space-y-4">
                 <h2 className="text-3xl font-black italic uppercase tracking-tighter">Neural Calibration</h2>
                 <p className="text-zinc-500 text-[10px] uppercase tracking-[0.4em]">JARVIS AI Analyzing Identity Matrix...</p>
               </div>
               
               {jarvisThinking ? (
                 <div className="py-10 space-y-6">
                    <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                       <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 3 }} className="h-full bg-blue-600" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 animate-pulse">Syncing Cognitive Patterns...</p>
                 </div>
               ) : (
                 <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-10">
                    <div className="p-8 bg-zinc-900 border-2 border-blue-500/20 rounded-[2.5rem] shadow-2xl">
                       <p className="text-[8px] font-black uppercase opacity-40 mb-2 tracking-[0.3em]">Archetype Assigned</p>
                       <h3 className="text-3xl font-black italic uppercase tracking-tighter text-blue-400">{tempProfile.archetype}</h3>
                       <div className="mt-6 flex justify-center gap-2">
                          {AVATARS.slice(0, 5).map(a => (
                            <button 
                              key={a} 
                              onClick={() => setTempProfile(p => ({ ...p, avatar: a }))}
                              className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl transition-all
                                ${tempProfile.avatar === a ? 'bg-blue-600 border-blue-400' : 'bg-zinc-800 border-white/5'}
                              `}
                            >{a}</button>
                          ))}
                       </div>
                    </div>
                    <button 
                      onClick={() => setOnboardingStep(3)}
                      className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest shadow-2xl"
                    >Confirm Assignment</button>
                 </motion.div>
               )}
            </motion.div>
          )}

          {onboardingStep === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} className="max-w-2xl w-full space-y-10">
               <div className="text-center space-y-4">
                 <h2 className="text-3xl font-black italic uppercase tracking-tighter">Tactical Loadout</h2>
                 <p className="text-zinc-500 text-[10px] uppercase tracking-[0.4em]">Initialize Primary Missions</p>
               </div>

               <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tempHabits.map((h, i) => (
                      <div key={i} className="p-5 bg-zinc-900 border border-white/5 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="text-sm font-black uppercase">{h.text}</p>
                          <p className="text-[8px] font-bold opacity-30 uppercase">{h.category} • {h.priority}</p>
                        </div>
                        <button onClick={() => setTempHabits(prev => prev.filter((_, idx) => idx !== i))} className="text-rose-500 opacity-40 hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const name = (form.elements.namedItem('mission-name') as HTMLInputElement).value;
                    const cat = (form.elements.namedItem('mission-cat') as HTMLSelectElement).value;
                    if (!name) return;
                    setTempHabits(prev => [...prev, {
                      id: crypto.randomUUID(),
                      text: name.toUpperCase(),
                      icon: '⚡',
                      category: cat,
                      priority: 'MEDIUM',
                      entries: {},
                      reminders: [],
                      createdAt: Date.now(),
                      calendarSynced: false
                    }]);
                    form.reset();
                  }} className="p-8 bg-zinc-900 border border-white/5 rounded-[2.5rem] space-y-6">
                    <div className="space-y-4">
                      <input name="mission-name" placeholder="NEW MISSION DESIGNATION..." className="w-full bg-black/40 border border-white/5 rounded-xl p-5 text-white font-black uppercase text-center focus:border-blue-500 outline-none" />
                      <div className="flex gap-4">
                        <select name="mission-cat" className="flex-1 bg-black/40 border border-white/5 rounded-xl p-4 text-[10px] font-black uppercase text-zinc-400 outline-none">
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button type="submit" className="px-10 py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px]">Deploy</button>
                      </div>
                    </div>
                  </form>
               </div>

               <div className="flex justify-between items-center px-4">
                 <p className="text-[9px] font-black uppercase opacity-30">{tempHabits.length} Units Ready</p>
                 <button 
                  disabled={tempHabits.length === 0}
                  onClick={() => setOnboardingStep(4)}
                  className={`px-12 py-5 rounded-2xl font-black uppercase tracking-widest shadow-2xl transition-all
                    ${tempHabits.length > 0 ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-600 opacity-50'}
                  `}
                 >Finalize Deployment</button>
               </div>
            </motion.div>
          )}

          {onboardingStep === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full space-y-12 text-center">
               <div className="space-y-4">
                  <div className="w-24 h-24 bg-green-500 rounded-[2.5rem] mx-auto flex items-center justify-center text-black shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                    <ShieldCheck size={48} />
                  </div>
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter">Operational Readiness</h2>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-[0.4em] leading-relaxed">System Calibration Successful. Identity matrix locked. Habits deployed to local memory.</p>
               </div>

               <div className="p-8 bg-zinc-900 border border-white/5 rounded-[2.5rem] text-left space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase opacity-30">Neural Profile</p>
                    <span className="text-[8px] font-black bg-green-500/10 text-green-500 px-2 py-1 rounded">ACTIVE</span>
                  </div>
                  <p className="text-2xl font-black italic uppercase">{tempProfile.archetype}</p>
                  <div className="h-[1px] bg-white/5 w-full my-4" />
                  <div className="flex justify-between text-[10px] font-black uppercase">
                     <span className="opacity-30">IDENTIFIER</span>
                     <span>{tempProfile.name}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase">
                     <span className="opacity-30">MISSION COUNT</span>
                     <span>{tempHabits.length}</span>
                  </div>
               </div>

               <button 
                onClick={finalizeOnboarding}
                className="w-full py-6 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl hover:brightness-110 active:scale-95 transition-all text-xl"
               >Enter The Nexus</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Onboarding HUD */}
        <div className="fixed bottom-10 left-0 w-full flex justify-center pointer-events-none">
           <div className="flex gap-2 p-1 bg-zinc-900/50 backdrop-blur border border-white/5 rounded-full px-4 py-2">
              {[0, 1, 2, 3, 4].map(s => (
                <div key={s} className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${onboardingStep >= s ? 'bg-blue-500 scale-125' : 'bg-zinc-800'}`} />
              ))}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} font-sans pb-[120px] transition-all duration-700 antialiased`}>
      <div className={`fixed top-0 left-0 w-full h-[2px] ${colors.jarvis} opacity-20 z-[200] animate-scan pointer-events-none`} />
      
      <div className="max-w-6xl mx-auto px-6 pt-12 space-y-12 relative z-10">
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${colors.card} border ${colors.border} flex items-center justify-center text-2xl shadow-xl transition-transform hover:scale-105 cursor-pointer`} onClick={() => setActiveView('OPS')}>
              {profile.avatar}
            </div>
            <div>
              <p className={`text-[9px] font-black uppercase tracking-[0.3em] ${colors.accentText}`}>{profile.mode} CONSOLE</p>
              <h2 className="text-xl font-black italic uppercase tracking-tighter">{profile.name}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsMuted(!isMuted)} className={`p-3 ${colors.card} border ${colors.border} rounded-xl text-zinc-500 hover:text-white transition-all`}>
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button onClick={() => setJarvisActive(true)} className={`px-5 py-3 ${colors.card} border ${colors.border} rounded-2xl flex items-center gap-3 hover:bg-white/5 transition-all shadow-xl group`}>
              <div className={`w-2 h-2 rounded-full ${colors.accentBg} animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.4)]`} />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100">JARVIS</span>
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeView === 'OPS' && (
            <motion.div key="ops" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-10">
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`lg:col-span-2 ${colors.card} border ${colors.border} rounded-[2.5rem] p-8 space-y-8 shadow-2xl relative overflow-hidden group`}>
                   <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp size={120} /></div>
                   <div className="flex items-center justify-between relative z-10">
                      <div>
                        <h4 className="text-lg font-black italic uppercase tracking-wider">Operational Velocity</h4>
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">14-Day Performance Delta</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-3xl font-black italic ${colors.accentText}`}>{overallAccuracy}%</p>
                        <p className="text-[8px] font-black uppercase opacity-30">Total Accuracy</p>
                      </div>
                   </div>
                   <div className="h-48 w-full relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsPayload}>
                        <defs>
                          <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.chart} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={colors.chart} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                        <XAxis dataKey="name" hide />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px', color: '#fff' }} />
                        <Area type="monotone" dataKey="efficiency" stroke={colors.chart} fillOpacity={1} fill="url(#colorAcc)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                   <div className={`${colors.card} border ${colors.border} p-6 rounded-[2rem] flex flex-col justify-between shadow-xl`}>
                      <div className="flex justify-between items-start">
                        <p className="text-[9px] font-black uppercase opacity-40">Persistence Level</p>
                        <Flame size={16} className={colors.accentText} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black italic uppercase truncate">{profile.archetype || 'Operative'}</h3>
                        <p className="text-[9px] font-bold uppercase opacity-30">Elite Status Classification</p>
                      </div>
                   </div>
                   <div className={`${colors.card} border ${colors.border} p-6 rounded-[2rem] flex flex-col justify-between shadow-xl`}>
                      <div className="flex justify-between items-start">
                        <p className="text-[9px] font-black uppercase opacity-40">Daily Unit Status</p>
                        <Target size={16} className={colors.accentText} />
                      </div>
                      <div className="flex items-end gap-2">
                        <h3 className="text-4xl font-black italic">{habits.filter(h => h.entries[`day-${todayIdx}`]).length}</h3>
                        <p className="text-[10px] font-bold uppercase opacity-30 pb-2">/ {habits.length} Units</p>
                      </div>
                   </div>
                </div>
              </section>

              {/* Action Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <button 
                  onClick={generateDebrief}
                  className={`p-6 bg-white/[0.03] border ${colors.border} rounded-[2rem] flex items-center justify-between hover:bg-white/[0.08] transition-all group shadow-xl`}
                 >
                    <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-2xl ${colors.accentBg} flex items-center justify-center text-black shadow-lg group-hover:scale-110 transition-transform`}>
                          {isGeneratingDebrief ? <Loader2 size={24} className="animate-spin" /> : <FileText size={24} />}
                       </div>
                       <div className="text-left">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 leading-none mb-1">Mission Report</p>
                          <h4 className="text-sm font-black italic uppercase">Generate Daily Debrief</h4>
                       </div>
                    </div>
                    <ChevronRight size={20} className="opacity-20 group-hover:opacity-100" />
                 </button>
                 <button 
                  onClick={() => setIsAdding(true)}
                  className={`p-6 bg-white/[0.03] border ${colors.border} rounded-[2rem] flex items-center justify-between hover:bg-white/[0.08] transition-all group shadow-xl`}
                 >
                    <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                          <Plus size={24} />
                       </div>
                       <div className="text-left">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 leading-none mb-1">New Subroutine</p>
                          <h4 className="text-sm font-black italic uppercase">Initialize Unit</h4>
                       </div>
                    </div>
                    <ChevronRight size={20} className="opacity-20 group-hover:opacity-100" />
                 </button>
              </div>

              {/* Neural Recommendations Section */}
              {suggestions.length > 0 && (
                <section className="space-y-6">
                  <div className="flex items-center gap-2 px-2">
                    <BrainCircuit size={16} className={colors.accentText} />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Neural Recommendations</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {suggestions.map((s, idx) => (
                        <motion.div 
                          key={s.text}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`${colors.card} border-2 border-dashed border-white/5 p-6 rounded-[2.5rem] flex flex-col justify-between group hover:border-blue-500/20 transition-all relative overflow-hidden`}
                        >
                          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Lightbulb size={60} /></div>
                          <div className="space-y-3 relative z-10">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl border border-white/5">{s.icon}</div>
                              <div>
                                <h4 className="text-[11px] font-black uppercase tracking-wider">{s.text}</h4>
                                <div className="flex gap-1.5 mt-1">
                                  <span className="text-[6px] font-black px-1 py-0.5 rounded bg-white/5 text-zinc-400 uppercase tracking-widest">{s.category}</span>
                                  <span className={`text-[6px] font-black px-1 py-0.5 rounded ${getPriorityColor(s.priority)} text-white uppercase tracking-widest`}>{s.priority}</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-[9px] text-zinc-500 leading-relaxed font-medium uppercase tracking-tighter">{s.reason}</p>
                          </div>
                          <button 
                            onClick={() => deploySuggestion(s)}
                            className={`mt-4 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2`}
                          >
                            <Plus size={12} /> Deploy Unit
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </section>
              )}

              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                   <div className="flex items-center gap-2 opacity-30"><Filter size={12} /><span className="text-[9px] font-black uppercase tracking-widest">Tactical Order (Sorted by Priority)</span></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {sortedHabits.map(h => {
                    const isCompleted = h.entries[`day-${todayIdx}`];
                    return (
                      <motion.div 
                        layout 
                        key={h.id} 
                        onClick={() => setSelectedHabitId(h.id)}
                        className={`${colors.card} border ${colors.border} p-6 rounded-[2.5rem] flex items-center justify-between group hover:border-white/10 transition-all shadow-xl relative overflow-hidden cursor-pointer`}
                      >
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${getPriorityColor(h.priority)} 
                          ${h.priority === 'HIGH' && !isCompleted ? 'animate-pulse opacity-100 shadow-[0_0_15px_rgba(244,63,94,0.5)]' : 'opacity-40 group-hover:opacity-100'}`} />
                        
                        <div className="flex items-center gap-6">
                           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border ${colors.border} bg-white/[0.02] group-hover:scale-110 transition-transform relative`}>
                              {h.priority === 'HIGH' && !isCompleted && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                                </span>
                              )}
                              {h.icon}
                           </div>
                           <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`text-sm font-black uppercase tracking-wider ${h.priority === 'HIGH' ? 'text-white' : ''}`}>{h.text}</h4>
                                <span className={`text-[7px] font-black px-1.5 py-0.5 rounded ${getPriorityColor(h.priority)} text-white tracking-widest flex items-center gap-1 shadow-sm`}>
                                  <Flag size={8} fill="currentColor" /> {h.priority}
                                </span>
                                {h.calendarSynced && (
                                  <span className="p-1 bg-white/5 rounded text-zinc-500"><CalendarDays size={10} /></span>
                                )}
                              </div>
                              <p className="text-[8px] font-bold opacity-30 uppercase tracking-[0.2em]">{h.category}</p>
                           </div>
                        </div>
                        <button 
                          onClick={(e) => toggleHabit(h.id, e)}
                          className={`w-12 h-12 rounded-xl border transition-all flex items-center justify-center relative z-20
                            ${isCompleted ? `${colors.accentBg} text-black border-${colors.accent}` : 'bg-black/20 border-white/5 opacity-40 hover:opacity-100'}
                          `}
                        >
                          <CheckCircle2 size={24} />
                        </button>
                      </motion.div>
                    );
                  })}
                  {sortedHabits.length === 0 && (
                    <div className="lg:col-span-2 py-20 text-center opacity-20 flex flex-col items-center gap-4 grayscale">
                       <Radio size={48} className="animate-pulse" />
                       <p className="text-[10px] font-black uppercase tracking-[0.4em]">Awaiting Uplink / No Units Found</p>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {activeView === 'INTEL' && (
            <motion.div key="intel" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-12 pb-20">
               <TacticalHeatmap habits={habits} colors={colors} />
               <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className={`${colors.card} border ${colors.border} p-8 rounded-[3rem] space-y-8 shadow-2xl`}>
                     <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black italic uppercase tracking-tighter">Sector Analysis</h3>
                        <div className="flex gap-2">
                           <PieChart size={16} className="opacity-30" />
                        </div>
                     </div>
                     <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={sectorData} layout="vertical">
                              <XAxis type="number" hide domain={[0, 100]} />
                              <YAxis dataKey="name" type="category" width={80} style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '8px' }} />
                              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                 {sectorData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colors.chart} fillOpacity={0.2 + (entry.value / 100) * 0.8} />
                                 ))}
                              </Bar>
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  <div className={`${colors.card} border ${colors.border} p-8 rounded-[3rem] space-y-8 shadow-2xl relative overflow-hidden`}>
                     <h3 className="text-xl font-black italic uppercase tracking-tighter mb-4">Priority Matrix</h3>
                     <div className="h-64 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                           <RechartsPieChart>
                              <Pie
                                 data={priorityData}
                                 innerRadius={60}
                                 outerRadius={80}
                                 paddingAngle={5}
                                 dataKey="value"
                              >
                                 {priorityData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                 ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '8px', fontSize: '10px' }} />
                           </RechartsPieChart>
                        </ResponsiveContainer>
                        <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                           <Trophy size={24} className="opacity-10 mb-1" />
                           <p className="text-[10px] font-black">UNITS</p>
                        </div>
                     </div>
                     <div className="flex justify-around text-[9px] font-black uppercase opacity-40 pt-4">
                        {priorityData.map(d => (
                           <div key={d.name} className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                              {d.name}: {d.value}
                           </div>
                        ))}
                     </div>
                  </div>
               </section>

               <div className={`${colors.card} border ${colors.border} p-8 rounded-[3rem] space-y-8 shadow-2xl flex flex-col justify-center text-center`}>
                  <Trophy size={64} className="mx-auto text-zinc-800" />
                  <h2 className="text-5xl font-black italic tracking-tighter">RANK S</h2>
                  <p className="text-[11px] font-bold uppercase tracking-[0.4em] opacity-40">System Efficiency Standing</p>
                  <div className="grid grid-cols-2 gap-4 pt-8 border-t border-white/5">
                     <div className="p-4 bg-white/5 rounded-2xl">
                        <p className="text-2xl font-black italic">{overallAccuracy}%</p>
                        <p className="text-[8px] font-bold uppercase opacity-30">Accuracy</p>
                     </div>
                     <div className="p-4 bg-white/5 rounded-2xl">
                        <p className="text-2xl font-black italic">{habits.length}</p>
                        <p className="text-[8px] font-bold uppercase opacity-30">Units Active</p>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className={`fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-sm h-20 ${colors.card}/80 backdrop-blur-3xl border ${colors.border} rounded-[2.5rem] flex items-center justify-between px-2 z-[500] shadow-2xl`}>
        <button onClick={() => setActiveView('OPS')} className={`flex-1 flex flex-col items-center gap-1 transition-all ${activeView === 'OPS' ? colors.accentText : 'text-zinc-600'}`}>
          <LayoutGrid size={22} /><span className="text-[8px] font-black uppercase">Ops</span>
        </button>
        <button onClick={() => setJarvisActive(true)} className={`flex-1 flex flex-col items-center gap-1 ${colors.accentText} relative group`}>
          <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center bg-white/5 -translate-y-4 shadow-2xl transition-all group-active:scale-95">
            <Bot size={28} className={isLiveActive ? 'animate-pulse text-rose-500' : ''} />
          </div>
          <span className="text-[8px] font-black uppercase -mt-2">Jarvis</span>
        </button>
        <button onClick={() => setActiveView('INTEL')} className={`flex-1 flex flex-col items-center gap-1 transition-all ${activeView === 'INTEL' ? colors.accentText : 'text-zinc-600'}`}>
          <History size={22} /><span className="text-[8px] font-black uppercase">Intel</span>
        </button>
      </nav>

      <AnimatePresence>
        {/* Daily Debrief Modal */}
        {debrief && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl" onClick={() => setDebrief(null)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-xl ${colors.card} border-2 border-white/5 rounded-[3rem] p-10 space-y-10 shadow-2xl text-center overflow-hidden relative`}
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500 opacity-20 animate-scan pointer-events-none" />
              
              <div className="space-y-4">
                 <div className={`w-24 h-24 rounded-[2.5rem] ${colors.accentBg} mx-auto flex items-center justify-center text-black shadow-2xl`}>
                    <Rocket size={48} />
                 </div>
                 <h2 className="text-3xl font-black italic uppercase tracking-tighter">Daily Mission Briefing</h2>
                 <p className="text-zinc-500 text-[10px] uppercase tracking-[0.4em]">Status: Mission Terminated • Analyzing Results</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                 <div className="p-6 bg-white/[0.03] rounded-[2rem] border border-white/5">
                    <p className="text-[8px] font-black uppercase opacity-30 mb-2">Efficiency</p>
                    <p className={`text-3xl font-black italic ${colors.accentText}`}>{debrief.efficiency}%</p>
                 </div>
                 <div className="p-6 bg-white/[0.03] rounded-[2rem] border border-white/5">
                    <p className="text-[8px] font-black uppercase opacity-30 mb-2">Units Done</p>
                    <p className="text-3xl font-black italic">{debrief.completedCount}</p>
                 </div>
                 <div className="p-6 bg-white/[0.03] rounded-[2rem] border border-white/5">
                    <p className="text-[8px] font-black uppercase opacity-30 mb-2">Top Sector</p>
                    <p className="text-sm font-black italic uppercase leading-tight truncate">{debrief.topSector}</p>
                 </div>
              </div>

              <div className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5 relative group">
                 <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-all"><Bot size={80} /></div>
                 <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-4 text-left border-b border-white/5 pb-2">Directives from JARVIS</p>
                 <p className="text-sm italic font-medium leading-relaxed text-white text-left">"{debrief.aiMessage}"</p>
              </div>

              <button 
                onClick={() => setDebrief(null)}
                className="w-full py-6 bg-white text-black rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl hover:brightness-110 active:scale-95 transition-all text-lg"
              >Acknowledge Directives</button>
            </motion.div>
          </div>
        )}

        {/* Habit Detail Modal */}
        {selectedHabit && (
          <div className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-xl" onClick={() => setSelectedHabitId(null)}>
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }}
              className={`w-full max-w-2xl ${colors.card} border-t sm:border border-white/10 rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-auto`}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl shadow-xl">
                       {selectedHabit.icon}
                    </div>
                    <div>
                       <h3 className="text-2xl font-black italic uppercase tracking-tighter">{selectedHabit.text}</h3>
                       <div className="flex items-center gap-3 mt-1">
                          <span className={`text-[8px] font-black px-2 py-1 rounded bg-white/5 text-zinc-400 uppercase tracking-widest`}>{selectedHabit.category}</span>
                          <span className={`text-[8px] font-black px-2 py-1 rounded ${getPriorityColor(selectedHabit.priority)} text-white uppercase tracking-widest`}>{selectedHabit.priority} PRIORITY</span>
                       </div>
                    </div>
                 </div>
                 <button onClick={() => setSelectedHabitId(null)} className="p-4 rounded-2xl hover:bg-white/5 transition-all text-zinc-500 hover:text-white">
                   <X size={24} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
                 <section className="grid grid-cols-3 gap-4">
                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 text-center">
                       <p className="text-[10px] font-black uppercase opacity-30 mb-2">Efficiency</p>
                       <p className="text-2xl font-black italic">
                          {Math.round((Object.values(selectedHabit.entries).filter(Boolean).length / Math.max(1, todayIdx)) * 100) || 0}%
                       </p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 text-center">
                       <p className="text-[10px] font-black uppercase opacity-30 mb-2">Completions</p>
                       <p className="text-2xl font-black italic">
                          {Object.values(selectedHabit.entries).filter(Boolean).length}
                       </p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 text-center">
                       <p className="text-[10px] font-black uppercase opacity-30 mb-2">Protocol Age</p>
                       <p className="text-2xl font-black italic">
                          {Math.floor((Date.now() - selectedHabit.createdAt) / (1000 * 60 * 60 * 24))}d
                       </p>
                    </div>
                 </section>

                 <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Tactical Efficiency Trend</h4>
                       <div className="flex items-center gap-2 opacity-30"><LineChart size={12}/> <span className="text-[9px] font-black uppercase">14D Window</span></div>
                    </div>
                    <div className="h-40 w-full bg-black/40 rounded-[2rem] p-6 border border-white/5">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={habitSpecificAnalytics}>
                              <Bar dataKey="done" radius={[4, 4, 4, 4]}>
                                 {habitSpecificAnalytics.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.done ? colors.chart : 'rgba(255,255,255,0.05)'} />
                                 ))}
                              </Bar>
                           </BarChart>
                        </ResponsiveContainer>
                    </div>
                 </section>

                 {/* Temporal Sync & Scheduling */}
                 <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Temporal Uplink</h4>
                       <CalendarDays size={14} className="opacity-30" />
                    </div>
                    <div className={`p-8 rounded-[2.5rem] border ${selectedHabit.calendarSynced ? 'border-blue-500/20 bg-blue-500/[0.02]' : 'border-white/5 bg-white/[0.02]'} transition-all`}>
                        <div className="flex items-center justify-between gap-6">
                           <div className="space-y-1">
                              <p className="text-xs font-black uppercase tracking-wider">Device Schedule Sync</p>
                              <p className="text-[9px] text-zinc-500 uppercase leading-relaxed max-w-[200px]">Map this performance unit to your global system calendar for cross-platform accountability.</p>
                           </div>
                           <button 
                             onClick={() => toggleCalendarSync(selectedHabit.id)}
                             className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                               ${selectedHabit.calendarSynced ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-400 border border-white/5'}
                             `}
                           >
                              {selectedHabit.calendarSynced ? 'Synced' : 'Link Schedule'}
                           </button>
                        </div>
                    </div>
                 </section>

                 <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                    <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 space-y-4">
                       <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40">Subroutines</h4>
                          <Bell size={14} className="opacity-30" />
                       </div>
                       <div className="space-y-2">
                          {selectedHabit.reminders.length > 0 ? (
                            selectedHabit.reminders.map((r, i) => (
                              <div key={i} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                                 <span className="text-xs font-bold">{r}</span>
                                 <Trash size={12} className="text-rose-500 opacity-40" />
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest text-center py-4">No Reminders Configured</p>
                          )}
                          <button className="w-full py-3 border border-dashed border-white/10 rounded-xl text-[8px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all">+ Add Alert</button>
                       </div>
                    </div>

                    <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 space-y-4">
                       <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40">Unit Management</h4>
                          <Settings2 size={14} className="opacity-30" />
                       </div>
                       <div className="space-y-3">
                          <button className="w-full py-4 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
                             <Edit2 size={14} /> Modify designation
                          </button>
                          <button 
                            onClick={() => deleteHabit(selectedHabit.id)}
                            className="w-full py-4 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all group"
                          >
                             <Trash2 size={14} /> Decommission Unit
                          </button>
                       </div>
                    </div>
                 </section>
              </div>

              <div className="p-8 bg-black/40 border-t border-white/5 text-center flex items-center justify-center gap-4">
                 <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-20">Secure Uplink Verified • Node {selectedHabit.id.substring(0,8)}</p>
              </div>
            </motion.div>
          </div>
        )}

        {jarvisActive && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setJarvisActive(false)} className="absolute inset-0 bg-black/90 backdrop-blur-2xl" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30 }} className={`w-full max-w-lg h-full ${colors.bg} border-l border-white/10 relative z-10 flex flex-col shadow-2xl`}>
              <div className="p-8 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className={`w-12 h-12 ${colors.accentBg} rounded-2xl flex items-center justify-center text-black shadow-xl`}>
                      <Bot size={24} className={jarvisThinking || isLiveActive ? 'animate-pulse' : ''} />
                   </div>
                   <div>
                      <h3 className="text-xl font-black italic uppercase tracking-widest leading-none">JARVIS</h3>
                      <p className={`text-[9px] font-bold uppercase ${colors.accentText} tracking-[0.4em]`}>{isLiveActive ? 'LIVE UPLINK' : 'VOICE SYNTH'}</p>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => isLiveActive ? setIsLiveActive(false) : startVoiceMode()} className={`p-4 rounded-xl transition-all ${isLiveActive ? 'bg-rose-500 text-white' : 'bg-white/5 text-zinc-500 hover:text-white'}`}>
                    <Mic size={20} />
                  </button>
                  <button onClick={() => setJarvisActive(false)} className="p-4 text-zinc-500 hover:text-white transition-all"><X size={24}/></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                 <div className="space-y-6">
                    {jarvisHistory.map((m, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-5 rounded-[1.5rem] ${m.role === 'user' ? colors.accentBg + ' text-black' : 'bg-white/5 text-zinc-200 border border-white/5'}`}>
                           <p className="text-sm font-medium leading-relaxed">{m.content}</p>
                        </div>
                        {m.role === 'assistant' && (
                          <button onClick={() => speakText(m.content)} className="mt-2 text-[8px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 flex items-center gap-1 px-2">
                             <Volume1 size={10} /> RE-BROADCAST
                          </button>
                        )}
                      </motion.div>
                    ))}
                    {jarvisThinking && <div className={`${colors.accentText} animate-pulse text-[9px] font-black uppercase tracking-widest`}>Synthesizing...</div>}
                 </div>
              </div>
              {!isLiveActive && (
                <div className="p-8 border-t border-white/10 bg-black/40">
                   <div className="relative group">
                      <input 
                        value={jarvisInput}
                        onChange={(e) => setJarvisInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && talkToJarvis()}
                        placeholder="TRANSMIT COMMAND..." 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-6 text-white font-black uppercase outline-none focus:border-white transition-all pr-20 shadow-inner group-focus-within:bg-white/[0.08]" 
                      />
                      <button onClick={talkToJarvis} className={`absolute right-3 top-3 bottom-3 px-6 ${colors.accentBg} text-black rounded-xl transition-all shadow-xl active:scale-95`}><Zap size={18} fill="currentColor" /></button>
                   </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[4000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-3xl" onClick={() => setIsAdding(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className={`w-full max-w-lg ${colors.card} border ${colors.border} p-10 rounded-[3rem] space-y-8 shadow-2xl relative overflow-hidden`} onClick={e => e.stopPropagation()}>
               <div className="text-center space-y-2">
                  <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${colors.accentText}`}>Protocol Entry</p>
                  <h2 className="text-3xl font-black italic uppercase">Initialize Unit</h2>
               </div>
               <form onSubmit={(e) => {
                 e.preventDefault();
                 const formData = new FormData(e.currentTarget);
                 const text = formData.get('vName') as string;
                 const cat = formData.get('vCat') as string;
                 const priority = formData.get('vPriority') as Priority;
                 const sync = formData.get('vSync') === 'on';
                 if (!text) return;
                 const newH: Habit = { 
                   id: crypto.randomUUID(), 
                   text: text.toUpperCase(), 
                   icon: '⚡', 
                   category: cat, 
                   priority: priority || 'MEDIUM',
                   entries: {}, 
                   reminders: [], 
                   createdAt: Date.now(),
                   calendarSynced: sync
                 };
                 setHabits([...habits, newH]); 
                 setIsAdding(false);
                 if (sync) speakText(`Uplink confirmed for ${text}. Temporal matrix updated.`);
               }} className="space-y-6">
                 <div className="space-y-2">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40 ml-2">Mission Designation</p>
                    <input name="vName" autoFocus placeholder="DESIGNATION..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white font-black uppercase outline-none focus:border-blue-500 shadow-inner text-center text-xl transition-all" />
                 </div>
                 <div className="space-y-2">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40 ml-2">Operational Sector</p>
                    <div className="grid grid-cols-3 gap-2">
                        {categories.map(v => (
                          <label key={v} className="relative cursor-pointer">
                            <input type="radio" name="vCat" value={v} defaultChecked={v === categories[0]} className="peer sr-only" />
                            <div className={`py-4 px-2 text-center border ${colors.border} rounded-xl text-[7px] font-black uppercase peer-checked:${colors.accentBg} peer-checked:text-black transition-all hover:bg-white/5 truncate`}>
                              {v}
                            </div>
                          </label>
                        ))}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40 ml-2">Priority Classification</p>
                    <div className="grid grid-cols-3 gap-3">
                       {['LOW', 'MEDIUM', 'HIGH'].map((p) => (
                         <label key={p} className="relative cursor-pointer">
                           <input type="radio" name="vPriority" value={p} defaultChecked={p === 'MEDIUM'} className="peer sr-only" />
                           <div className={`py-4 text-center border ${colors.border} rounded-xl text-[8px] font-black uppercase transition-all flex flex-col items-center gap-1
                              peer-checked:bg-opacity-100 peer-checked:text-black
                              ${p === 'HIGH' ? 'peer-checked:bg-rose-500 border-rose-500/20' : p === 'MEDIUM' ? 'peer-checked:bg-amber-500 border-amber-500/20' : 'peer-checked:bg-blue-500 border-blue-500/20'}
                           `}>
                             <Flag size={12} fill={p === 'HIGH' ? 'currentColor' : 'none'} className={p === 'HIGH' ? 'text-black' : ''} />
                             {p}
                           </div>
                         </label>
                       ))}
                    </div>
                 </div>
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <CalendarDays size={18} className="text-zinc-500" />
                       <span className="text-[10px] font-black uppercase opacity-60">Temporal Uplink</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                       <input type="checkbox" name="vSync" className="sr-only peer" />
                       <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                 </div>
                 <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-5 bg-zinc-900 border border-white/10 rounded-2xl text-white font-black uppercase active:scale-95 hover:bg-zinc-800 transition-all">Abort</button>
                   <button type="submit" className={`flex-1 py-5 ${colors.accentBg} text-black rounded-2xl font-black uppercase shadow-2xl active:scale-95 hover:brightness-110 transition-all`}>Deploy</button>
                 </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<DailyAchiever />);
