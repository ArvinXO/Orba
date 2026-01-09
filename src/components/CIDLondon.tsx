'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Clock, Camera, Fingerprint, FileText, Scale, AlertCircle, CheckCircle2, Search, Car, Map as MapIcon, LogOut, ChevronRight, HardDrive, Users, Terminal, Database } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { cn } from '@/lib/utils';

interface CIDLondonProps {
    username: string;
    onExit: () => void;
}

interface CaseEvidence {
    id: string;
    type: 'CCTV' | 'DNA' | 'ANPR' | 'STATEMENT';
    status: 'pending' | 'analyzing' | 'verified' | 'conflicting';
    content: string;
    description: string;
}

interface Suspect {
    id: string;
    name: string;
    traits: string[];
    evidenceIds: string[];
    isCulprit: boolean;
}

interface QuizQuestion {
    id: number;
    question: string;
    options: string[];
    answer: number;
    law: string;
}

const LEGAL_QUESTIONS: QuizQuestion[] = [
    {
        id: 1,
        question: "Under which PACE 1984 section can you conduct a Stop & Search for weapons?",
        options: ["Section 1", "Section 18", "Section 32", "Section 60"],
        answer: 0,
        law: "PACE Section 1 provides powers to search persons/vehicles in public."
    },
    {
        id: 2,
        question: "What is the maximum initial period of detention without charge for a summary offense?",
        options: ["12 Hours", "24 Hours", "36 Hours", "48 Hours"],
        answer: 1,
        law: "PACE Section 41 states initial detention is limited to 24 hours."
    },
    {
        id: 3,
        question: "Identify Article 6 of the Human Rights Act 1998.",
        options: ["Right to Life", "Freedom of Speech", "Right to a Fair Trial", "No Punishment without Law"],
        answer: 2,
        law: "Article 6 guarantees the right to a fair and public hearing."
    }
];

export default function CIDLondon({ username, onExit }: CIDLondonProps) {
    const [gameState, setGameState] = useState<'briefing' | 'active' | 'court' | 'result'>('briefing');
    const [score, setScore] = useState(0);
    const [paceClock, setPaceClock] = useState(120); // 120 seconds for the "PACE Clock"
    const [currentCase, setCurrentCase] = useState(1);
    const [evidence, setEvidence] = useState<CaseEvidence[]>([]);
    const [suspects, setSuspects] = useState<Suspect[]>([]);
    const [activeSuspectId, setActiveSuspectId] = useState<string | null>(null);
    const [message, setMessage] = useState("SECURE THE CRIME SCENE...");
    const [isThinking, setIsThinking] = useState(false);

    // Legislative States
    const [quizActive, setQuizActive] = useState(false);
    const [currentQ, setCurrentQ] = useState(0);
    const [legalPass, setLegalPass] = useState(false);
    const [pendingSuspectId, setPendingSuspectId] = useState<string | null>(null);

    const { addScore } = useLeaderboard('cid-london-v1');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const timerRef = useRef<NodeJS.Timeout>(null);

    const initCase = useCallback(() => {
        const suspectNames = ["James Ratcliffe", "Sarah Miller", "Marcus Thorne", "Leo Vane"];
        const caseTypes: CaseEvidence[] = [
            { id: '1', type: 'CCTV', content: "BLUE_HATCHBACK_ANPR", description: "Vehicle spotted near the scene at 23:15.", status: 'pending' },
            { id: '2', type: 'DNA', content: "PARTIAL_MATCH_L3", description: "Forensic residue found on the window latch.", status: 'pending' },
            { id: '3', type: 'STATEMENT', content: "ALIBI_INCONSISTENCY", description: "Suspect claimed to be at home, but phone pinged Cell Tower 94.", status: 'pending' },
            { id: '4', type: 'CCTV', content: "GRAINY_CAM_4", description: "Individual in a grey hoodie seen exiting the premises.", status: 'pending' }
        ];

        const culpritIndex = Math.floor(Math.random() * 4);
        const newSuspects: Suspect[] = suspectNames.map((name, i) => ({
            id: `s-${i}`,
            name,
            traits: i === culpritIndex ? ['Grey Hoodie', 'Blue Hatchback Owner'] : ['No Alibi', 'Business Partner'],
            evidenceIds: [],
            isCulprit: i === culpritIndex
        }));

        setEvidence(caseTypes);
        setSuspects(newSuspects);
        setPaceClock(120);
        setGameState('active');
        setMessage("COLLECTING INITIAL FORENSICS...");
    }, []);

    useEffect(() => {
        if (gameState === 'active' && paceClock > 0) {
            timerRef.current = setInterval(() => {
                setPaceClock(prev => {
                    if (prev <= 1) {
                        setGameState('result');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [gameState, paceClock]);

    const analyzeEvidence = (evId: string) => {
        setIsThinking(true);
        setTimeout(() => {
            setEvidence(prev => prev.map(ev =>
                ev.id === evId ? { ...ev, status: 'verified' } : ev
            ));
            setIsThinking(false);
            setMessage("DATA CROSS-REFERENCED WITH NATIONAL DATABASE.");
        }, 1500);
    };

    const linkEvidence = (evId: string, suspectId: string) => {
        setSuspects(prev => prev.map(s => {
            if (s.id === suspectId) {
                // Prevent duplicate links
                if (s.evidenceIds.includes(evId)) return s;
                return { ...s, evidenceIds: [...s.evidenceIds, evId] };
            }
            return s;
        }));
        setScore(prev => prev + 50);
        setMessage("LINK ESTABLISHED. BUILDING CASE FILE.");
    };

    const requestRefBodycam = useRef<number>(null);

    const drawBodycam = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = window.innerWidth, h = window.innerHeight;
        canvas.width = w; canvas.height = h;

        ctx.clearRect(0, 0, w, h);

        // Overlay vignette and curvature simulation
        ctx.save();
        const grad = ctx.createRadialGradient(w / 2, h / 2, w / 4, w / 2, h / 2, w / 1.2);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Digital Noise/Grain
        for (let i = 0; i < 2000; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const alpha = Math.random() * 0.03;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(x, y, 1, 1);
        }

        // Horizontal Scanline
        const scanY = (Date.now() / 15) % h;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.01)';
        ctx.fillRect(0, scanY, w, 1);

        ctx.restore();
        requestRefBodycam.current = requestAnimationFrame(drawBodycam);
    }, []);

    useEffect(() => {
        if (gameState === 'active') {
            requestRefBodycam.current = requestAnimationFrame(drawBodycam);
            return () => {
                if (requestRefBodycam.current) cancelAnimationFrame(requestRefBodycam.current);
            };
        }
    }, [gameState, drawBodycam]);

    const submitCharge = (suspectId: string) => {
        setPendingSuspectId(suspectId);
        setQuizActive(true);
        setCurrentQ(0);
        setMessage("CPS LEGAL REVIEW INITIATED. CITE RELEVANT LAW.");
    };

    const handleQuizAnswer = (idx: number) => {
        if (idx === LEGAL_QUESTIONS[currentQ].answer) {
            setScore(s => s + 200);
            if (currentQ < LEGAL_QUESTIONS.length - 1) {
                setCurrentQ(prev => prev + 1);
            } else {
                setQuizActive(false);
                executeCourtPhase();
            }
        } else {
            setScore(s => Math.max(0, s - 500));
            setGameState('result');
            setQuizActive(false);
            setMessage("LEGAL BREACH DETECTED. CASE DISMISSED DUE TO PROCEDURAL ERROR.");
        }
    };

    const executeCourtPhase = () => {
        if (!pendingSuspectId) return;
        const suspect = suspects.find(s => s.id === pendingSuspectId);
        if (!suspect) return;

        setGameState('court');
        setTimeout(() => {
            if (suspect.isCulprit && suspect.evidenceIds.length >= 2) {
                setGameState('result');
                const bonus = paceClock * 10;
                setScore(prev => prev + 5000 + bonus);
                addScore(username, score + 5000 + bonus);
                setMessage("GUILTY VERDICT RENDERED. CASE CLOSED.");
            } else {
                setGameState('result');
                setMessage("INSUFFICIENT EVIDENCE. DISMISSED BY CROWN PROSECUTOR.");
                setScore(prev => Math.max(0, prev - 2000));
            }
        }, 3000);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#020205] overflow-hidden select-none font-sans text-white">
            <canvas ref={canvasRef} className="absolute inset-0 z-[101] pointer-events-none opacity-40 mix-blend-screen" />

            {/* REC INDICATOR */}
            <div className="absolute top-10 right-10 flex items-center gap-2 z-[150] opacity-60">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_#dc2626]" />
                <span className="text-[10px] font-mono font-black text-white/50 uppercase tracking-[0.3em]">AXON BODY 4 // CID-REC</span>
            </div>
            {/* AMBIENT RAINY LONDON BACKDROP */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.1),transparent)]" />
            </div>

            {/* MET POLICE HUD */}
            <div className="absolute top-0 left-0 w-full p-10 flex justify-between items-start z-[110]">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/5 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 neon-glow-sm shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                            <Shield className="animate-pulse" size={28} />
                        </div>
                        <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black">Inspector {username}</p>
                            <h2 className="text-3xl font-black tracking-tighter text-white">CID: LONDON <span className="text-blue-500/40 font-normal">UNIT-1</span></h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="glass-panel px-6 py-3 rounded-xl border-blue-500/20 bg-blue-500/5 flex items-center gap-3">
                            <Clock size={16} className={cn("text-blue-400", paceClock < 30 && "text-red-500 animate-ping")} />
                            <div>
                                <p className="text-[8px] text-white/40 uppercase tracking-widest font-bold">PACE Clock (Holding Time)</p>
                                <p className="text-xl font-mono font-black">{Math.floor(paceClock / 60)}:{(paceClock % 60).toString().padStart(2, '0')}</p>
                            </div>
                        </div>
                        <div className="glass-panel px-6 py-3 rounded-xl border-white/10 flex items-center gap-3">
                            <FileText size={16} className="text-white/40" />
                            <div>
                                <p className="text-[8px] text-white/40 uppercase tracking-widest font-bold">Current Case</p>
                                <p className="text-xl font-mono font-black">#{currentCase.toString().padStart(3, '0')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-6 text-right">
                    <div className="glass-panel px-10 py-6 rounded-[2.5rem] border-white/10 bg-black/60">
                        <p className="text-[10px] text-white/30 uppercase tracking-[0.6em] font-black mb-1">Reputation Score</p>
                        <p className="text-5xl font-black italic tracking-tighter text-white leading-none">{score.toLocaleString()}</p>
                    </div>
                    <button onClick={onExit} className="glass-card px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-red-400 transition-colors border-white/5">
                        Exit Investigation
                    </button>
                </div>
            </div>

            {/* CENTRAL INVESTIGATION DESK */}
            <main className="relative z-[105] h-screen pt-48 pb-12 px-10 grid grid-cols-12 gap-8">
                {/* EVIDENCE DRAWER */}
                <div className="col-span-3 flex flex-col gap-4">
                    <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.4em] text-white/30 mb-2">
                        <HardDrive size={14} /> CRIME SCENE DATA
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {evidence.map(ev => (
                            <motion.div
                                key={ev.id}
                                whileHover={{ x: 4 }}
                                onClick={() => analyzeEvidence(ev.id)}
                                className={cn(
                                    "glass-panel p-4 rounded-2xl border-white/5 cursor-pointer transition-all",
                                    ev.status === 'verified' ? "border-blue-500/30 bg-blue-500/5" : "hover:bg-white/5"
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {ev.type === 'CCTV' && <Camera size={14} className="text-cyan-400" />}
                                        {ev.type === 'ANPR' && <Car size={14} className="text-purple-400" />}
                                        {ev.type === 'DNA' && <Fingerprint size={14} className="text-rose-400" />}
                                        {ev.type === 'STATEMENT' && <FileText size={14} className="text-amber-400" />}
                                        <span className="text-[10px] font-black uppercase tracking-widest">{ev.type} EXHIBIT</span>
                                    </div>
                                    {ev.status === 'verified' && <CheckCircle2 size={12} className="text-blue-400" />}
                                </div>
                                <p className="text-[11px] font-bold text-white/80 mb-1">{ev.content}</p>
                                <p className="text-[9px] text-white/40 leading-relaxed uppercase tracking-widest">{ev.description}</p>

                                {ev.status === 'verified' && activeSuspectId && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); linkEvidence(ev.id, activeSuspectId); }}
                                        className="mt-3 w-full py-2 rounded-lg bg-blue-500/20 text-[8px] font-black uppercase tracking-widest text-blue-400 border border-blue-500/30 hover:bg-blue-500/40 transition-colors"
                                    >
                                        Link to Suspect
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* SUSPECT ARRAY */}
                <div className="col-span-6 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.4em] text-white/30">
                            <Users size={14} /> IDENTIFIED SUBJECTS
                        </h3>
                        <div className="text-[9px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            CCTV FEEDS ACTIVE
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {suspects.map(suspect => (
                            <motion.div
                                key={suspect.id}
                                onClick={() => setActiveSuspectId(suspect.id)}
                                className={cn(
                                    "glass-panel p-6 rounded-[2rem] border-white/5 transition-all cursor-pointer relative overflow-hidden",
                                    activeSuspectId === suspect.id ? "border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.15)] bg-blue-500/5" : "hover:border-white/20"
                                )}
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <Fingerprint size={80} />
                                </div>
                                <p className="text-[9px] text-white/20 uppercase tracking-[0.4em] font-black mb-1">Subject Profile</p>
                                <h4 className="text-xl font-black text-white italic tracking-tighter mb-4">{suspect.name}</h4>

                                <div className="space-y-4">
                                    <div className="flex flex-wrap gap-2">
                                        {suspect.traits.map((t, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-white/5 rounded text-[8px] font-bold text-white/40 uppercase tracking-widest border border-white/5">{t}</span>
                                        ))}
                                    </div>

                                    <div className="pt-4 border-t border-white/5">
                                        <p className="text-[8px] text-white/30 uppercase tracking-widest font-black mb-2">Linked Exhibits: {suspect.evidenceIds.length}</p>
                                        <div className="flex gap-2">
                                            {suspect.evidenceIds.map(id => (
                                                <div key={id} className="w-6 h-6 rounded bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-[10px] font-black text-blue-400">
                                                    {evidence.find(e => e.id === id)?.type[0]}
                                                </div>
                                            ))}
                                            {suspect.evidenceIds.length === 0 && <div className="text-[9px] italic text-white/10 uppercase font-black">No evidence linked</div>}
                                        </div>
                                    </div>
                                </div>

                                {activeSuspectId === suspect.id && suspect.evidenceIds.length >= 2 && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={(e) => { e.stopPropagation(); submitCharge(suspect.id); }}
                                        className="mt-6 w-full py-4 bg-white text-black rounded-xl font-black uppercase text-[10px] tracking-[0.4em] shadow-xl hover:bg-blue-400 transition-colors"
                                    >
                                        Initiate Arrest
                                    </motion.button>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* LOGS & ANALYTICS */}
                <div className="col-span-3 flex flex-col gap-4">
                    <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.4em] text-white/30 mb-2">
                        <Terminal size={14} /> CID ANALYTICS
                    </h3>
                    <div className="flex-1 glass-panel border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/20">
                            <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 3, repeat: Infinity }} className="h-full bg-blue-500" />
                        </div>

                        <div className="flex-1 space-y-6">
                            <div>
                                <p className="text-[9px] text-white/20 uppercase tracking-widest font-black mb-3">Operational Status</p>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                        <Scale size={16} />
                                    </div>
                                    <p className="text-[11px] font-medium leading-relaxed italic text-blue-400/80 uppercase">
                                        {message}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5 space-y-4">
                                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                    <span className="text-white/20">Forensic Pipeline</span>
                                    <span className="text-blue-500">{isThinking ? "RUNNING..." : "ACTIVE"}</span>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className={cn("h-8 rounded border border-white/5 transition-colors", isThinking && i === 2 ? "bg-blue-500/40 border-blue-500" : "bg-white/5")} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 text-[9px] text-blue-400/60 leading-tight space-y-1 mt-auto">
                            <p>PACE Act 1984 - Detention Summary</p>
                            <p className="font-mono opacity-40">SR-CODE: {Math.random().toString(36).substring(7).toUpperCase()}</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* OVERLAYS */}
            <AnimatePresence>
                {gameState === 'briefing' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[200] bg-black/98 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-1.5 h-32 bg-blue-500 absolute top-0 left-1/2 -translate-x-1/2 opacity-20" />
                        <Shield size={100} className="text-blue-500 mb-12 animate-pulse" />
                        <h3 className="text-8xl font-black text-white mb-6 uppercase tracking-tighter italic">CID: LONDON</h3>
                        <p className="text-blue-500/60 font-black uppercase tracking-[0.6em] text-sm mb-12 max-w-2xl leading-relaxed">
                            A major offense has been reported in the West End. You have 2 minutes to analyze forensics and secure an arrest before the suspect evaporates.
                        </p>

                        <div className="grid grid-cols-3 gap-8 mb-20">
                            {[
                                { icon: Database, t: "COLLECT", d: "Click exhibits to sequence them." },
                                { icon: Fingerprint, t: "LINK", d: "Attach exhibits to suspect files." },
                                { icon: Clock, t: "CHARGE", d: "Mind the 2 minute PACE clock." }
                            ].map((item, i) => (
                                <div key={i} className="glass-panel p-8 rounded-3xl border-white/5 text-left max-w-[240px]">
                                    <item.icon size={20} className="text-blue-400 mb-4" />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white mb-2">{item.t}</h4>
                                    <p className="text-[9px] text-white/30 uppercase font-black leading-relaxed">{item.d}</p>
                                </div>
                            ))}
                        </div>

                        <button onClick={initCase} className="px-24 py-8 bg-blue-600 text-white rounded-[3rem] font-black uppercase tracking-[0.5em] text-sm shadow-[0_20px_80px_rgba(59,130,246,0.4)] transition-all hover:scale-105 active:scale-95 border border-blue-400/50">Establish Link</button>
                    </motion.div>
                )}

                {gameState === 'court' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[250] bg-blue-900/40 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center pointer-events-none">
                        <Scale size={120} className="text-white mb-12 animate-bounce" />
                        <h3 className="text-9xl font-black text-white mb-6 uppercase tracking-tighter italic">CROWN COURT</h3>
                        <p className="text-white/60 font-black uppercase tracking-[0.6em] text-sm mb-12">The Jury is Deliberating your evidence...</p>
                        <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 3 }} className="h-full bg-white shadow-[0_0_30px_#fff]" />
                        </div>
                    </motion.div>
                )}

                {gameState === 'result' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[300] bg-black/98 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
                            <Scale size={400} />
                        </div>

                        <h3 className="text-8xl font-black text-white mb-6 uppercase tracking-tighter italic">{score > 3000 ? "SUCCESSFUL PROSECUTION" : "INVESTIGATION TERMINATED"}</h3>
                        <p className="text-blue-500/60 font-black uppercase tracking-[0.6em] text-sm mb-20">{message}</p>

                        <div className="grid grid-cols-2 gap-20 mb-24">
                            <div>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mb-2">Performance Merit</p>
                                <p className="text-8xl font-black italic tracking-tighter text-white">{score.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mb-2">Cases Solved</p>
                                <p className="text-8xl font-black italic tracking-tighter text-blue-500">{score > 3000 ? 1 : 0}</p>
                            </div>
                        </div>

                        <div className="flex gap-8">
                            <button onClick={initCase} className="px-24 py-8 bg-blue-600 text-white rounded-[3rem] font-black uppercase tracking-[0.5em] text-sm shadow-[0_20px_80px_rgba(59,130,246,0.3)] transition-all hover:scale-105 active:scale-95">Next Assignment</button>
                            <button onClick={onExit} className="px-16 py-8 glass-card text-white rounded-[3rem] font-black uppercase tracking-[0.5em] text-xs transition-all hover:bg-white/10 border-white/10">Return to Nexus</button>
                        </div>
                    </motion.div>
                )}

                {quizActive && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[400] bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center p-12">
                        <div className="w-full max-w-2xl glass-panel p-12 rounded-[3rem] border-blue-500/30 text-center">
                            <Shield size={60} className="text-blue-400 mx-auto mb-8" />
                            <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black mb-2">CPS Legislative Review // Q{currentQ + 1} of 3</p>
                            <h4 className="text-3xl font-black text-white italic tracking-tighter mb-12">
                                {LEGAL_QUESTIONS[currentQ].question}
                            </h4>

                            <div className="grid grid-cols-1 gap-4 text-left">
                                {LEGAL_QUESTIONS[currentQ].options.map((opt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleQuizAnswer(idx)}
                                        className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex items-center justify-between"
                                    >
                                        <span className="text-xs font-black uppercase tracking-widest text-white/60 group-hover:text-white transition-colors">
                                            {opt}
                                        </span>
                                        <ChevronRight size={16} className="text-white/20 group-hover:text-blue-400 transition-all group-hover:translate-x-1" />
                                    </button>
                                ))}
                            </div>

                            <div className="mt-12 p-6 bg-red-500/5 rounded-2xl border border-red-500/10 flex items-start gap-4 text-left">
                                <AlertCircle size={16} className="text-red-500" />
                                <p className="text-[9px] text-red-500/60 uppercase font-black leading-relaxed">
                                    Failure to cite correct legislation will result in automatic case dismissal for procedural non-compliance.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 text-white/10 text-[9px] font-black tracking-widest pointer-events-none uppercase">
                <span className="flex items-center gap-2 italic"><MapIcon size={12} /> Scotland Yard Network</span>
                <span className="flex items-center gap-2 italic"><Shield size={12} /> SO15 Counter-Terrorism Verified</span>
            </div>
        </div>
    );
}

// Custom CSS for scrollbar needed in globals.css or component
const style = `
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.2);
  border-radius: 10px;
}
`;
