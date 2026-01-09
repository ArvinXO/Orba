'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Zap, ShieldCheck, RefreshCw, ArrowDown, Sparkles } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';

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
    onComplete?: () => void;
    username?: string;
}

export default function PerspectivePrism({ onComplete, username = 'Player 1' }: PerspectivePrismProps) {
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [rings, setRings] = useState<Ring[]>([]);
    const [gameStatus, setGameStatus] = useState<'playing' | 'level_transition' | 'complete' | 'game_over'>('playing');
    const [bonusText, setBonusText] = useState<string | null>(null);
    const { addScore } = useLeaderboard('perspective-prism-v2');

    const requestRef = useRef<number>(null);
    const ringRefs = useRef<(HTMLDivElement | null)[]>([]);
    const offsetsRef = useRef<number[]>([]);
    const ringsConfigRef = useRef<Ring[]>([]);
    const lastLockTime = useRef(Date.now());

    const RING_DEFINITIONS = [
        { id: 'generation', label: 'Generation', color: '#E30613' },
        { id: 'identity', label: 'Identity', color: '#009E4D' },
        { id: 'origin', label: 'Origin', color: '#F9CC48' },
        { id: 'context', label: 'Context', color: '#00C2FF' },
        { id: 'vision', label: 'Vision', color: '#9D00FF' },
        { id: 'purpose', label: 'Purpose', color: '#FF00AA' },
    ];

    const generateLevel = (lvl: number) => {
        const count = Math.min(3 + (lvl - 1), 6);
        const newRings: Ring[] = Array.from({ length: count }).map((_, i) => {
            const def = RING_DEFINITIONS[i] || { id: `layer-${i}`, label: `Layer ${i}`, color: '#FFFFFF' };
            const baseSpeed = 1.2 + lvl * 0.3;
            const direction = i % 2 === 0 ? 1 : -1;
            const speed = (baseSpeed + i * 0.4) * direction;

            return {
                ...def,
                speed: speed,
                offset: Math.random() * 360,
                locked: false,
                width: 140 + i * 80,
            };
        });

        setRings(newRings);
        ringsConfigRef.current = newRings;
        offsetsRef.current = newRings.map((r) => r.offset);
        setGameStatus('playing');
        lastLockTime.current = Date.now();
    };

    useEffect(() => {
        generateLevel(1);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }
    }, []);

    const animate = () => {
        if (gameStatus === 'playing') {
            ringsConfigRef.current.forEach((ring, i) => {
                if (!ring.locked) {
                    offsetsRef.current[i] = offsetsRef.current[i] + ring.speed;
                    const element = ringRefs.current[i];
                    if (element) {
                        element.style.transform = `rotate(${offsetsRef.current[i]}deg)`;
                    }
                }
            });
        }
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }
    }, [gameStatus]);

    const handleLock = () => {
        if (gameStatus !== 'playing') return;

        const nextIndex = ringsConfigRef.current.findIndex((r) => !r.locked);
        if (nextIndex === -1) return;

        const currentAngle = offsetsRef.current[nextIndex];
        const normalized = ((currentAngle % 360) + 360) % 360;

        const tolerance = Math.max(20 - level * 2, 10);
        const isAligned = normalized < tolerance || normalized > 360 - tolerance;

        if (isAligned) {
            const now = Date.now();
            const timeDiff = now - lastLockTime.current;
            lastLockTime.current = now;

            const updated = [...ringsConfigRef.current];
            updated[nextIndex] = { ...updated[nextIndex], locked: true, offset: 0 };

            let bonus = 0;
            if (timeDiff < 2000) {
                bonus = 150;
                setBonusText("+150 Speed Bonus!");
                setTimeout(() => setBonusText(null), 1000);
            } else if (timeDiff < 4000) {
                bonus = 50;
                setBonusText("+50 Early Bird!");
                setTimeout(() => setBonusText(null), 1000);
            }

            setRings(updated);
            ringsConfigRef.current = updated;
            offsetsRef.current[nextIndex] = 0;

            const element = ringRefs.current[nextIndex];
            if (element) {
                element.style.transform = `rotate(0deg)`;
            }

            const newScore = score + 100 * level + bonus;
            setScore(newScore);

            if (nextIndex === updated.length - 1) {
                if (level < 5) {
                    setGameStatus('level_transition');
                    setTimeout(() => {
                        const nextLvl = level + 1;
                        setLevel(nextLvl);
                        generateLevel(nextLvl);
                    }, 2000);
                } else {
                    setGameStatus('complete');
                    addScore(username, newScore);
                    if (onComplete) setTimeout(onComplete, 3000);
                }
            }
        } else {
            if (lives > 1) {
                setLives((l) => l - 1);
                setBonusText("Life Lost! Careful!");
                setTimeout(() => setBonusText(null), 1000);
            } else {
                setLives(0);
                setGameStatus('game_over');
                addScore(username, score);
            }
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (gameStatus === 'playing') handleLock();
                else if (gameStatus === 'game_over') restartGame();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameStatus, level, score, lives]);

    const restartGame = () => {
        setLives(3);
        setScore(0);
        setLevel(1);
        generateLevel(1);
    };

    const lockedCount = rings.filter((r) => r.locked).length;
    const allLocked = rings.length > 0 && lockedCount === rings.length;

    return (
        <div
            className="relative w-full h-[650px] bg-[#020205] rounded-[3rem] overflow-hidden border border-white/5 flex flex-col items-center justify-center select-none cursor-pointer group"
            onClick={handleLock}
        >
            <div className="absolute inset-y-0 left-1/2 w-4 -translate-x-1/2 bg-white/5 blur-xl pointer-events-none" />
            <div className="absolute top-0 left-1/2 w-[2px] h-full -translate-x-1/2 bg-gradient-to-b from-white/20 via-white/5 to-white/0 pointer-events-none" />

            {/* The Beam */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 bg-white transition-all duration-300 blur-md shadow-[0_0_30px_white]"
                style={{
                    width: '4px',
                    height: rings.length === 0 ? '0%' : (lockedCount / rings.length) * 100 + '%',
                    opacity: 0.5 + lockedCount * 0.1,
                }}
            />

            {/* HUD */}
            <div className="absolute top-8 left-8 z-20 space-y-2">
                <div className="flex items-center gap-2 text-primary-custom">
                    <Target size={14} className="animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[0.4em]">Align the light</span>
                </div>
                <div className="flex items-center gap-4">
                    <p className="text-white/30 text-[8px] uppercase tracking-widest font-bold">
                        Level {level}/5 &bull; Score {score}
                    </p>
                    <div className="flex gap-1">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i < lives ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-white/10'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Bonus Popup */}
            <AnimatePresence>
                {bonusText && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        className="absolute top-[30%] left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
                    >
                        <span
                            className={`text-[10px] font-black uppercase tracking-[0.3em] px-4 py-2 rounded-full border border-white/10 backdrop-blur-md shadow-2xl ${bonusText.includes('Life') ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                                }`}
                        >
                            {bonusText}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Core */}
            <div className="relative z-30 flex flex-col items-center">
                <motion.div
                    animate={{
                        scale: allLocked ? 1.5 : [1, 1.1, 1],
                        boxShadow: allLocked ? '0 0 50px white' : '0 0 20px rgba(255,255,255,0.1)',
                    }}
                    transition={{ duration: 0.2 }}
                    className={`w-12 h-12 rounded-full border border-white/20 flex items-center justify-center bg-black/40 backdrop-blur-md ${allLocked ? 'bg-white' : ''
                        }`}
                >
                    <Target size={20} className={allLocked ? 'text-black' : 'text-white/40'} />
                </motion.div>
            </div>

            {/* Alignment Zone */}
            <div className="absolute top-[15%] left-1/2 -translate-x-1/2 z-50 flex flex-col items-center pointer-events-none opacity-50">
                <div className="w-8 h-8 rounded-full border-2 border-primary-custom/30 flex items-center justify-center">
                    <ArrowDown size={14} className="text-primary-custom animate-bounce" />
                </div>
            </div>

            {/* OPTIMIZED RINGS RENDER */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {rings.map((ring, idx) => {
                    const isActive = !ring.locked && idx === rings.findIndex((r) => !r.locked);

                    return (
                        <div
                            key={ring.id}
                            className="absolute flex items-center justify-center"
                            style={{ width: `${ring.width}px`, height: `${ring.width}px` }}
                        >
                            <div
                                ref={(el) => { ringRefs.current[idx] = el; }}
                                className={`absolute inset-0 rounded-full border-2 transition-[border-color,box-shadow] duration-300 ${ring.locked
                                        ? 'border-white/40 border-solid shadow-[0_0_10px_rgba(255,255,255,0.1)]'
                                        : isActive
                                            ? 'border-dashed border-white/20'
                                            : 'border-solid border-white/5'
                                    }`}
                                style={{ transform: `rotate(${ring.offset}deg)` }}
                            >
                                <div
                                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-4 rounded-full blur-md"
                                    style={{ backgroundColor: ring.color, opacity: ring.locked ? 1 : 0.4 }}
                                />
                                <div
                                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white rounded-full z-40"
                                    style={{ boxShadow: `0 0 10px ${ring.color}` }}
                                />
                            </div>

                            <div className="absolute -bottom-4 text-[7px] font-black uppercase tracking-[0.4em] text-white/10">
                                {ring.label}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Overlays */}
            <AnimatePresence>
                {gameStatus === 'level_transition' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm"
                    >
                        <Sparkles className="text-primary-custom w-12 h-12 mb-4 animate-spin-slow" />
                        <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">Aligned</h2>
                        <div className="bg-white/10 px-4 py-1 rounded-full text-[9px] font-bold tracking-[0.3em] uppercase text-white">
                            Preparing Level {level + 1}/5
                        </div>
                    </motion.div>
                )}
                {gameStatus === 'game_over' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-[100] bg-red-950/95 backdrop-blur-xl flex flex-col items-center justify-center text-center p-12"
                    >
                        <RefreshCw size={48} className="text-red-500 mb-6 animate-spin-slow" />
                        <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter italic">Focus Lost</h3>
                        <p className="text-red-200/60 max-w-sm mb-12 text-sm font-medium leading-relaxed">
                            Synchronization required. Out of lives.
                        </p>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                restartGame();
                            }}
                            className="px-12 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl transition-transform active:scale-95"
                        >
                            Retry Level 1
                        </button>
                    </motion.div>
                )}
                {gameStatus === 'complete' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-[100] bg-white flex flex-col items-center justify-center text-center p-12"
                    >
                        <motion.div
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            className="w-24 h-24 bg-black rounded-[2rem] flex items-center justify-center mb-10 shadow-2xl"
                        >
                            <ShieldCheck size={48} className="text-emerald-400" />
                        </motion.div>
                        <h3 className="text-4xl md:text-5xl font-black text-black mb-4 uppercase tracking-tighter italic">
                            Total Clarity
                        </h3>
                        <p className="text-black/60 max-w-sm mb-12 text-lg font-medium leading-relaxed">
                            You have aligned your identity markers through 5 levels of focus.
                        </p>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onComplete) onComplete();
                            }}
                            className="px-12 py-5 bg-black text-white rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl transition-transform active:scale-95"
                        >
                            Continue
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {!['game_over', 'complete', 'level_transition'].includes(gameStatus) && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-center space-y-3 pointer-events-none z-50">
                    <p className="text-white/40 text-[8px] uppercase tracking-[0.4em] font-bold">Tap / Space to Lock</p>
                </div>
            )}
        </div>
    );
}
