'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Zap, ShieldCheck, RefreshCw, ArrowDown, Sparkles, Trophy, User, LogOut, ChevronRight, Activity, Crosshair, ZapOff, AlertTriangle } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { cn } from '@/lib/utils';

interface Ring {
    id: string;
    label: string;
    color: string;
    speed: number;
    offset: number;
    locked: boolean;
    width: number;
}

interface PerspectivePrismProps {
    username: string;
    onExit: () => void;
}

// Memoized Ring Component to prevent re-renders during animation
const RingComponent = memo(({ ring, idx, ringRefs, isActive }: { ring: Ring; idx: number; ringRefs: React.MutableRefObject<(HTMLDivElement | null)[]>; isActive: boolean }) => {
    return (
        <div
            className={cn(
                "absolute flex items-center justify-center pointer-events-none transition-all duration-300",
                isActive && "scale-[1.01]"
            )}
            style={{
                width: `${ring.width}px`,
                height: `${ring.width}px`,
                opacity: ring.locked ? 0.2 : (isActive ? 1 : 0.4),
                willChange: 'transform, opacity'
            }}
        >
            <div
                ref={(el) => { ringRefs.current[idx] = el; }}
                className={cn(
                    "absolute inset-0 rounded-full border-2 transition-colors duration-300",
                    ring.locked
                        ? 'border-white border-solid opacity-20'
                        : isActive
                            ? 'border-white border-solid shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                            : 'border-solid border-white/5'
                )}
                style={{ transform: `rotate(${ring.offset}deg)` }}
            >
                {/* Active Pulse Ring */}
                {isActive && (
                    <div className="absolute inset-[-4px] rounded-full border border-white/20 animate-pulse" />
                )}

                <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-6 rounded-full blur-lg"
                    style={{
                        backgroundColor: ring.color,
                        opacity: ring.locked ? 1 : (isActive ? 1 : 0.4),
                        filter: isActive ? 'brightness(1.5)' : 'none'
                    }}
                />
                <div
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-3 bg-white rounded-full z-[130]"
                    style={{
                        boxShadow: isActive ? `0 0 30px 5px ${ring.color}` : `0 0 15px ${ring.color}`,
                        transform: isActive ? 'scale(1.2)' : 'none'
                    }}
                />
            </div>
        </div>
    );
});

RingComponent.displayName = 'RingComponent';

export default function PerspectivePrismFull({ username, onExit }: PerspectivePrismProps) {
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [rings, setRings] = useState<Ring[]>([]);
    const [gameMode, setGameMode] = useState<'normal' | 'hard' | 'practice'>('normal');
    const [gameStatus, setGameStatus] = useState<'menu' | 'playing' | 'level_transition' | 'complete' | 'game_over'>('menu');
    const [bonusText, setBonusText] = useState<string | null>(null);
    const [combo, setCombo] = useState(0);
    const [syncAngle, setSyncAngle] = useState(0); // The current alignment target
    const [isShaking, setIsShaking] = useState(false);

    const { addScore } = useLeaderboard('perspective-prism-v3');

    const requestRef = useRef<number>(null);
    const ringRefs = useRef<(HTMLDivElement | null)[]>([]);
    const offsetsRef = useRef<number[]>([]);
    const ringsConfigRef = useRef<Ring[]>([]);
    const lastLockTime = useRef(Date.now());
    const statusRef = useRef(gameStatus);
    const syncAngleRef = useRef(0);

    const [timeScale, setTimeScale] = useState(1);
    const [difficultyWarning, setDifficultyWarning] = useState(false);
    const [chronosUsed, setChronosUsed] = useState(false);

    useEffect(() => {
        statusRef.current = gameStatus;
    }, [gameStatus]);

    useEffect(() => {
        syncAngleRef.current = syncAngle;
    }, [syncAngle]);

    // Chronos Field: Slow down time when struggling (lives === 1) for a fixed duration
    useEffect(() => {
        if (lives === 1 && gameStatus === 'playing' && !chronosUsed) {
            setTimeScale(0.4);
            setChronosUsed(true);
            setBonusText("CHRONOS FIELD ACTIVE - 5s DILATION");

            const timer = setTimeout(() => {
                setTimeScale(1);
                setBonusText("CHRONOS FIELD DEPLETED");
                setTimeout(() => setBonusText(null), 1500);
            }, 5000);

            return () => clearTimeout(timer);
        } else if (lives > 1 && chronosUsed) {
            // Reset the ability when health is restored (level completion or powerup)
            setChronosUsed(false);
            setTimeScale(1);
        }
    }, [lives, gameStatus, chronosUsed]);

    const RING_DEFINITIONS = [
        { id: 'generation', label: 'Generation', color: '#E30613' },
        { id: 'identity', label: 'Identity', color: '#009E4D' },
        { id: 'origin', label: 'Origin', color: '#F9CC48' },
        { id: 'context', label: 'Context', color: '#00C2FF' },
        { id: 'vision', label: 'Vision', color: '#9D00FF' },
        { id: 'purpose', label: 'Purpose', color: '#FF00AA' },
        { id: 'essence', label: 'Essence', color: '#00FFCC' },
        { id: 'core', label: 'Core', color: '#FFCC00' },
    ];

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const restartGame = useCallback(() => {
        setScore(0);
        setLevel(1);
        setLives(3);
        setCombo(0);
        setChronosUsed(false);
        setDifficultyWarning(false);
        setTimeScale(1);
        setGameStatus('menu'); // Return to menu for mode selection
    }, []);

    const startGame = (mode: 'normal' | 'hard' | 'practice') => {
        setGameMode(mode);
        setScore(0);
        setLevel(1);
        setLives(3);
        generateLevel(1);
        setGameStatus('playing');
    };

    const generateLevel = useCallback((lvl: number) => {
        const count = Math.min(3 + Math.floor((lvl - 1) / 2), 8);
        const mobileScale = window.innerWidth < 768 ? (window.innerWidth / 1000) * 1.8 : 1;

        const newRings: Ring[] = Array.from({ length: count }).map((_, i) => {
            const def = RING_DEFINITIONS[i] || { id: `layer-${i}`, label: `Layer ${i}`, color: '#FFFFFF' };
            const baseSpeed = (1.5 + lvl * 0.4) * 1.1;
            const direction = i % 2 === 0 ? 1 : -1;
            const speed = (baseSpeed + i * 0.4) * direction;

            return {
                ...def,
                speed: speed,
                offset: Math.random() * 360,
                locked: false,
                width: (300 + i * 65) * mobileScale, // Scaled for mobile responsiveness
            };
        });

        setRings(newRings);
        ringsConfigRef.current = newRings;
        offsetsRef.current = newRings.map((r) => r.offset);
        setSyncAngle(0);
        setGameStatus('playing');
        lastLockTime.current = Date.now();
    }, []);

    useEffect(() => {
        // Game starts only when user selects mode from menu
    }, []);

    const timeScaleRef = useRef(1);
    useEffect(() => {
        timeScaleRef.current = timeScale;
    }, [timeScale]);

    useEffect(() => {
        const animate = () => {
            if (statusRef.current === 'playing') {
                const config = ringsConfigRef.current;
                const ts = timeScaleRef.current;
                for (let i = 0; i < config.length; i++) {
                    const ring = config[i];
                    if (!ring.locked) {
                        offsetsRef.current[i] += (ring.speed || 0) * ts;
                        const element = ringRefs.current[i];
                        if (element) {
                            element.style.transform = `rotate(${offsetsRef.current[i]}deg)`;
                        }
                    }
                }
            }
            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    const triggerShake = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 300);
    };

    const handleLock = useCallback(() => {
        if (statusRef.current !== 'playing') return;

        const nextIndex = ringsConfigRef.current.findIndex((r) => !r.locked);
        if (nextIndex === -1) return;

        const currentAngle = offsetsRef.current[nextIndex];
        const normalized = ((currentAngle % 360) + 360) % 360;
        const target = syncAngleRef.current;

        const tolerance = Math.max(16 - level * 1.2, 5);

        // Circular distance calculation
        let diff = Math.abs(normalized - target);
        if (diff > 180) diff = 360 - diff;

        const isAligned = diff < tolerance;

        if (isAligned) {
            const now = Date.now();
            const timeDiff = now - lastLockTime.current;
            lastLockTime.current = now;

            const updated = [...ringsConfigRef.current];
            updated[nextIndex] = { ...updated[nextIndex], locked: true, offset: target };

            let bonus = 0;
            let bonusMsg = "";

            setCombo(prev => {
                const nextCombo = prev + 1;
                if (timeDiff < 1200) {
                    bonus = 500;
                    bonusMsg = "QUICK-SYNC! +500";
                } else if (timeDiff < 2500) {
                    bonus = 200;
                    bonusMsg = "PERFECT! +200";
                }
                const comboBonus = nextCombo * 100;
                if (nextCombo > 1) {
                    bonusMsg += ` | x${nextCombo}`;
                }
                setScore(s => s + (200 * level) + bonus + comboBonus);
                return nextCombo;
            });

            setBonusText(bonusMsg || "LOCKED");
            setTimeout(() => setBonusText(null), 800);

            setRings(updated);
            ringsConfigRef.current = updated;
            offsetsRef.current[nextIndex] = target;

            const element = ringRefs.current[nextIndex];
            if (element) {
                element.style.transform = `rotate(${target}deg)`;
            }

            // Shuffle sync location for next ring ONLY if level > 5
            if (level > 5) {
                const nextSync = Math.floor(Math.random() * 8) * 45; // 45 deg intervals for clarity
                setSyncAngle(nextSync);
            }

            if (nextIndex === updated.length - 1) {
                setCombo(0);
                setTimeout(() => setBonusText("PHASE SYNC COMPLETE! CORE RESTORED"), 500);
                if (gameMode === 'normal') {
                    setLives(3); // Reset health only in Normal Mode
                    setChronosUsed(false); // Re-arm Chronos for next level
                }
                if (level < 25) {
                    setGameStatus('level_transition');
                    setTimeout(() => {
                        setLevel(prev => {
                            const nl = prev + 1;
                            if (nl === 6) {
                                setDifficultyWarning(true);
                            } else {
                                generateLevel(nl);
                            }
                            return nl;
                        });
                    }, 1200);
                } else {
                    setGameStatus('complete');
                    setScore(s => {
                        addScore(username, s);
                        return s;
                    });
                }
            }
        } else {
            setCombo(0);
            triggerShake();
            setLives(prev => {
                if (gameMode === 'practice') {
                    setBonusText("DESYNC NEUTRALIZED (PRACTICE)");
                    setTimeout(() => setBonusText(null), 1000);
                    return prev; // In practice mode, lives are not lost
                }
                if (prev > 1) {
                    setBonusText("DESYNC DETECTED");
                    setTimeout(() => setBonusText(null), 1000);
                    return prev - 1;
                } else {
                    setGameStatus('game_over');
                    setScore(s => {
                        addScore(username, s);
                        return s;
                    });
                    return 0;
                }
            });
        }
    }, [level, username, generateLevel, addScore]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (statusRef.current === 'playing') handleLock();
                else if (statusRef.current === 'game_over') restartGame();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleLock, restartGame]);

    const lockedCount = rings.filter((r) => r.locked).length;
    const allLocked = rings.length > 0 && lockedCount === rings.length;

    return (
        <div
            className={cn(
                "fixed inset-0 z-[100] bg-[#010103] flex flex-col items-center justify-center select-none overflow-hidden transition-all duration-75",
                isShaking && "scale-105 brightness-150 saturate-200"
            )}
            onClick={handleLock}
        >
            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(0,194,255,0.05),transparent)]" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary-custom/10 rounded-full blur-[120px]" />
            </div>

            {/* Scanning Line */}
            <motion.div
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                className="absolute left-0 w-full h-[1px] bg-white/5 z-[105]"
            />

            {/* TOP HUD */}
            <div className="absolute top-0 left-0 w-full p-6 md:p-10 flex justify-between items-start z-[110] pointer-events-none">
                <div className="flex flex-col gap-2 pointer-events-auto">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-10 h-10 md:w-14 md:h-14 glass-card rounded-xl md:rounded-2xl flex items-center justify-center border-white/5 text-primary-custom">
                            <Crosshair size={isMobile ? 20 : 28} className="animate-spin-slow" />
                        </div>
                        <div>
                            <p className="text-[8px] md:text-[10px] text-white/20 uppercase tracking-[0.4em] font-black">Neural Interface</p>
                            <h2 className="text-lg md:text-2xl font-black tracking-tighter transition-all">{username}</h2>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-6 pointer-events-auto">
                    <div className="flex gap-2 md:gap-4">
                        <div className="glass-panel px-4 md:px-8 py-2 md:py-4 rounded-2xl md:rounded-3xl border-white/5 flex flex-col items-center min-w-[120px] md:min-w-[200px] bg-black/40">
                            <span className="text-[7px] md:text-[9px] text-white/20 uppercase tracking-[0.3em] font-bold mb-0.5 md:mb-1">Total Integrity</span>
                            <span className="text-xl md:text-4xl font-black italic tracking-tighter text-gradient leading-tight pr-2">
                                {score.toLocaleString()}
                            </span>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); onExit(); }}
                            className="glass-card w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 transition-all border-white/5"
                        >
                            <LogOut size={isMobile ? 18 : 20} className="text-red-500" />
                        </button>
                    </div>
                </div>
            </div>

            {/* STATUS HUD */}
            <div className={cn(
                "absolute z-[110] pointer-events-none transition-all",
                isMobile ? "bottom-10 left-6 right-6 flex justify-between items-end" : "left-10 top-1/2 -translate-y-1/2 space-y-12"
            )}>
                <div className="space-y-2 md:space-y-4">
                    <div className="flex justify-between items-end gap-4 min-w-[120px]">
                        <p className="text-[8px] md:text-[10px] text-white/30 uppercase tracking-[0.5em] font-black">Core Health</p>
                        <span className="text-[10px] font-mono text-red-500 font-bold">{lives}/3</span>
                    </div>
                    <div className="flex gap-2 md:gap-3">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className={cn(
                                    "w-8 md:w-12 h-1 md:h-1.5 rounded-full transition-all duration-500",
                                    i < lives ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]" : "bg-white/5"
                                )}
                            />
                        ))}
                    </div>
                </div>

                <div className="space-y-2 md:space-y-4">
                    <p className="text-[8px] md:text-[10px] text-white/30 uppercase tracking-[0.5em] font-black">Prism Combo</p>
                    <motion.div
                        key={combo}
                        initial={{ scale: 1.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-3xl md:text-6xl font-black text-gradient italic tracking-tighter"
                    >
                        x{combo}
                    </motion.div>
                </div>

                {!isMobile && (
                    <div className="pt-20 space-y-4">
                        <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-black mb-2 flex items-center gap-2">
                            <Activity size={12} className="text-emerald-500" /> System Metrics
                        </p>
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between text-[10px] font-bold tracking-widest uppercase">
                                <span className="text-white/40">Sync Rate</span>
                                <span className="text-emerald-500">{(100 - level * 2)}%</span>
                            </div>
                            <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${100 - level * 3}%` }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* TARGET INDICATOR (Sync Location) */}
            <div className="absolute inset-0 flex items-center justify-center z-[130] pointer-events-none">
                <motion.div
                    animate={{ rotate: syncAngle }}
                    transition={{ type: 'spring', stiffness: 100 }}
                    className="relative"
                    style={{
                        width: isMobile ? '80vw' : '550px',
                        height: isMobile ? '80vw' : '550px'
                    }}
                >
                    {/* The Visual Target Hook - Pushed further out */}
                    <div className={cn(
                        "absolute left-1/2 -translate-x-1/2 flex flex-col items-center",
                        isMobile ? "-top-16" : "-top-28"
                    )}>
                        <ArrowDown size={isMobile ? 24 : 32} className="text-white animate-bounce" />
                        <div className={cn("w-1 bg-gradient-to-t from-white/30 to-transparent", isMobile ? "h-16" : "h-32")} />
                    </div>
                </motion.div>
            </div>

            {/* Bonus Popup - Centered as requested */}
            <AnimatePresence>
                {bonusText && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.5, filter: 'blur(10px)' }}
                        className="absolute inset-0 flex items-center justify-center z-[150] pointer-events-none p-6"
                    >
                        <div className={cn(
                            "px-6 md:px-12 py-3 md:py-4 rounded-2xl md:rounded-3xl border backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center gap-3 md:gap-4",
                            bonusText.includes('DESYNC')
                                ? "bg-red-500/20 border-red-500/40 text-red-500"
                                : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                        )}>
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-current/10 flex items-center justify-center">
                                <Zap size={isMobile ? 18 : 24} className="fill-current" />
                            </div>
                            <span className="text-sm md:text-xl font-black uppercase tracking-[0.4em] italic text-center">
                                {bonusText}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Neural Uplink Beam - Triggers on Level Completion */}
            <AnimatePresence>
                {allLocked && (
                    <motion.div
                        initial={{ scaleX: 0, opacity: 0, filter: 'brightness(2)' }}
                        animate={{ scaleX: 1, opacity: 1, filter: 'brightness(1)' }}
                        exit={{ scaleX: 0, opacity: 0 }}
                        className="absolute inset-0 z-[135] pointer-events-none flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: '100%' }}
                            className="w-1 md:w-1.5 bg-white shadow-[0_0_50px_#fff,0_0_100px_#fff] blur-[1px]"
                        />
                        <div className="absolute w-24 md:w-40 h-full bg-white/5 blur-3xl" />
                        <div className="absolute w-8 md:w-12 h-full bg-white/10 blur-2xl" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Game Core - Now a decorative hub without the bullseye */}
            <div className="relative z-[140] flex flex-col items-center transform-gpu">
                <motion.div
                    animate={{
                        scale: allLocked ? [1, 1.3, 1.1] : [1, 1.05, 1],
                        rotate: syncAngle
                    }}
                    transition={{
                        scale: { duration: 0.3, times: [0, 0.5, 1] },
                        rotate: { type: 'spring', damping: 12, stiffness: 100 }
                    }}
                    className={cn(
                        "w-12 h-12 md:w-20 md:h-20 rounded-xl md:rounded-[1.8rem] border-2 flex items-center justify-center backdrop-blur-3xl transition-all duration-300",
                        allLocked ? "bg-white border-white shadow-[0_0_60px_#fff]" : "bg-black/80 border-white/20"
                    )}
                >
                    {/* Bullseye Icon Removed as requested */}
                    <div className={cn(
                        "w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-300",
                        allLocked ? "bg-black" : "bg-white/20"
                    )} />
                </motion.div>
            </div>

            {/* RINGS RENDER */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none transform-gpu">
                {rings.map((ring, idx) => {
                    const firstUnlockedIdx = rings.findIndex(r => !r.locked);
                    return (
                        <RingComponent
                            key={ring.id}
                            ring={ring}
                            idx={idx}
                            ringRefs={ringRefs}
                            isActive={idx === firstUnlockedIdx}
                        />
                    );
                })}
            </div>

            {/* Difficulty Warning Modal */}
            <AnimatePresence>
                {difficultyWarning && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-[400] bg-red-950/90 backdrop-blur-2xl flex flex-col items-center justify-center p-12 text-center"
                    >
                        <AlertTriangle size={80} className="text-red-500 mb-8 animate-pulse" />
                        <h3 className="text-6xl font-black text-white mb-6 uppercase tracking-tighter italic">SYSTEM ESCALATION</h3>
                        <p className="text-red-400 font-bold uppercase tracking-[0.3em] text-lg max-w-2xl mb-12 leading-relaxed">
                            Neural stability threshold breached. Synchronization targets will now shift dynamically for each neural layer.
                        </p>
                        <button
                            onClick={() => {
                                setDifficultyWarning(false);
                                generateLevel(6);
                            }}
                            className="px-16 py-6 bg-red-600 text-white rounded-full font-black uppercase tracking-[0.5em] text-sm shadow-[0_0_50px_rgba(220,38,38,0.5)] hover:bg-red-500 transition-all scale-110"
                        >
                            Accept Challenge
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODE SELECTION MENU */}
            <AnimatePresence>
                {gameStatus === 'menu' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[500] bg-[#020205] flex flex-col items-center justify-center p-6 text-center"
                    >
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="mb-12"
                        >
                            <div className="w-20 h-20 bg-primary-custom/10 rounded-3xl border border-primary-custom/20 flex items-center justify-center mb-6 mx-auto">
                                <RefreshCw className="text-primary-custom w-10 h-10 animate-spin-slow" />
                            </div>
                            <h2 className="text-4xl md:text-7xl font-black text-white italic uppercase tracking-tighter mb-4">Neural <span className="text-primary-custom">Prism</span></h2>
                            <p className="text-white/40 font-bold uppercase tracking-[0.4em] text-[10px] md:text-xs">Synchronize global neural structures // Calibration Required</p>
                        </motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                            <button
                                onClick={() => startGame('normal')}
                                className="group relative p-8 bg-white/5 border border-white/10 rounded-3xl text-left hover:bg-white/10 transition-all overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-40" />
                                <div className="flex justify-between items-start mb-4">
                                    <div className="px-3 py-1 bg-emerald-500/20 text-emerald-500 rounded-full text-[8px] font-black uppercase tracking-widest">Neural Standard</div>
                                    <ShieldCheck className="text-white/20 group-hover:text-emerald-500 transition-colors" />
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase italic mb-2 tracking-tight">Normal Mode</h3>
                                <p className="text-xs text-white/40 leading-relaxed">Neural integrity is restored after each successful phase. Recommended for training.</p>
                            </button>

                            <button
                                onClick={() => startGame('hard')}
                                className="group relative p-8 bg-white/5 border border-white/10 rounded-3xl text-left hover:bg-white/10 transition-all overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-red-600 opacity-40" />
                                <div className="flex justify-between items-start mb-4">
                                    <div className="px-3 py-1 bg-red-600/20 text-red-500 rounded-full text-[8px] font-black uppercase tracking-widest">S-Tier Persistence</div>
                                    <Zap className="text-white/20 group-hover:text-red-500 transition-colors" />
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase italic mb-2 tracking-tight">Hard Mode</h3>
                                <p className="text-xs text-white/40 leading-relaxed">No neural restoration between phases. All damage is permanent. Chronos Field triggers once per life.</p>
                            </button>

                            <button
                                onClick={() => startGame('practice')}
                                className="group relative p-8 bg-white/5 border border-white/10 rounded-3xl text-left hover:bg-white/10 transition-all overflow-hidden md:col-span-2"
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-40" />
                                <div className="flex justify-between items-start mb-4">
                                    <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[8px] font-black uppercase tracking-widest">Neural Practice</div>
                                    <Activity className="text-white/20 group-hover:text-blue-400 transition-colors" />
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase italic mb-2 tracking-tight">Practice Mode</h3>
                                <p className="text-xs text-white/40 leading-relaxed">Infinite neural integrity. Mastery without risk. Perfect for calibrating your timing across all 25 phases.</p>
                            </button>
                        </div>

                        <button
                            onClick={onExit}
                            className="mt-12 text-[10px] font-black text-white/20 uppercase tracking-[0.4em] hover:text-white transition-colors"
                        >
                            Abstain from Calibration
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* INTERFACE OVERLAYS */}
            <AnimatePresence>
                {gameStatus === 'level_transition' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center"
                    >
                        <div className="relative">
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], rotate: [0, 360] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-32 h-32 border-2 border-primary-custom/30 rounded-full border-t-primary-custom"
                            />
                            <Sparkles className="absolute inset-0 m-auto text-primary-custom w-12 h-12 animate-pulse" />
                        </div>
                        <h2 className="text-7xl font-black text-white italic tracking-tighter uppercase mt-12 mb-2">
                            PHASE SYNC
                        </h2>
                        <p className="text-primary-custom text-[12px] uppercase tracking-[0.8em] font-black animate-pulse">
                            CALIBRATING NEXT LAYER
                        </p>
                    </motion.div>
                )}

                {gameStatus === 'game_over' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 z-[300] bg-[#050000]/98 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center"
                    >
                        <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-8 border border-red-500/20">
                            <ZapOff size={48} className="text-red-500" />
                        </div>
                        <h3 className="text-8xl font-black text-white mb-4 uppercase tracking-tighter italic">NEURAL COLLAPSE</h3>
                        <p className="text-red-500/60 font-black uppercase tracking-[0.5em] text-xs mb-16">Sync Buffer Overflow</p>

                        <div className="flex gap-16 mb-20 items-center">
                            <div className="text-center min-w-[240px]">
                                <p className="text-[10px] text-white/30 uppercase tracking-widest font-black mb-1">Acquired Data</p>
                                <p className="text-6xl font-black italic tracking-tighter text-gradient pb-2 pr-4">{score.toLocaleString()}</p>
                            </div>
                            <div className="text-center min-w-[140px]">
                                <p className="text-[10px] text-white/30 uppercase tracking-widest font-black mb-1">Phase Depth</p>
                                <p className="text-6xl font-black italic tracking-tighter text-white pb-2 pr-2">{level}</p>
                            </div>
                        </div>

                        <div className="flex gap-6">
                            <button
                                onClick={(e) => { e.stopPropagation(); restartGame(); }}
                                className="px-20 py-6 bg-white text-black rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-sm shadow-[0_20px_50px_rgba(255,255,255,0.2)] transition-all hover:scale-105 active:scale-95"
                            >
                                Re-Link Neural
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onExit(); }}
                                className="px-12 py-6 glass-card text-white rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-xs transition-all hover:bg-white/10"
                            >
                                Return to Nexus
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6 z-[110]">
                <div className="text-center bg-white/5 backdrop-blur-md px-8 py-3 rounded-full border border-white/10">
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.6em] font-black">Sequence Phase</p>
                    <p className="text-3xl font-black italic tracking-tighter text-white">PHASE {level.toString().padStart(2, '0')}</p>
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.5em] italic opacity-20">Press SPACE or CLICK to calibrate prism</p>
            </div>
        </div>
    );
}
