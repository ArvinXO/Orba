'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, LogOut, Zap, Music2, Activity, Sparkles, Volume2, ShieldCheck } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { cn } from '@/lib/utils';

interface EchoRealmProps {
    username: string;
    onExit: () => void;
}

interface Note {
    id: string;
    lane: number;
    progress: number;
    speed: number;
    hit: boolean;
    missed: boolean;
}

export default function EchoRealm({ username, onExit }: EchoRealmProps) {
    const [gameState, setGameState] = useState<'playing' | 'game_over'>('playing');
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [multiplier, setMultiplier] = useState(1);
    const [health, setHealth] = useState(100);
    const [overdrive, setOverdrive] = useState(0);
    const [isOverdrive, setIsOverdrive] = useState(false);
    const [feedback, setFeedback] = useState<{ t: string, c: string } | null>(null);
    const { addScore } = useLeaderboard('echo-realm-v2');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const notes = useRef<Note[]>([]);
    const requestRef = useRef<number>(null);
    const frameCount = useRef(0);
    const activeLanes = useRef<boolean[]>([false, false, false, false]);
    const gameStateRef = useRef(gameState);

    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

    const spawnNote = useCallback(() => {
        const lane = Math.floor(Math.random() * 4);
        notes.current.push({
            id: Math.random().toString(36),
            lane,
            progress: 0,
            speed: (0.008 + (score / 100000)) * (isOverdrive ? 1.5 : 1),
            hit: false,
            missed: false
        });
    }, [score, isOverdrive]);

    const handleHit = useCallback((lane: number) => {
        if (gameStateRef.current !== 'playing') return;

        const target = notes.current.find(n => n.lane === lane && !n.hit && !n.missed && n.progress > 0.75 && n.progress < 1.05);

        if (target) {
            const acc = 1 - Math.abs(target.progress - 0.9);
            target.hit = true;

            let points = 100;
            let text = "PERFECT";
            let color = "#ffffff";

            if (acc < 0.94) { points = 50; text = "GOOD"; color = "#6366f1"; }
            if (acc < 0.85) { points = 20; text = "OK"; color = "#4f46e5"; }

            const totalPoints = points * multiplier * (isOverdrive ? 2 : 1);
            setScore(s => s + totalPoints);
            setCombo(c => c + 1);
            setMultiplier(c => Math.min(8, 1 + Math.floor((combo + 1) / 10)));
            setFeedback({ t: text, c: color });
            setOverdrive(ov => Math.min(100, ov + (text === 'PERFECT' ? 5 : 2)));
            setTimeout(() => setFeedback(null), 400);
        } else {
            setCombo(0);
            setMultiplier(1);
            setHealth(h => Math.max(0, h - 5));
        }
    }, [combo, multiplier, isOverdrive]);

    const update = useCallback((ts: number) => {
        if (gameStateRef.current !== 'playing') return;
        frameCount.current++;

        // Spawn Logic
        const rate = Math.max(15, 45 - Math.floor(score / 8000));
        if (frameCount.current % rate === 0) spawnNote();

        // Overdrive logic
        if (overdrive >= 100 && !isOverdrive) {
            setIsOverdrive(true);
            setTimeout(() => { setIsOverdrive(false); setOverdrive(0); }, 8000);
        }

        // Update Notes
        notes.current.forEach(n => {
            n.progress += n.speed;
            if (n.progress > 1.1 && !n.hit && !n.missed) {
                n.missed = true;
                setCombo(0); setMultiplier(1);
                setHealth(h => Math.max(0, h - 8));
            }
        });
        notes.current = notes.current.filter(n => n.progress < 1.2 && !n.hit);

        if (health <= 0 && gameStateRef.current === 'playing') {
            setGameState('game_over');
            addScore(username, score);
        }

        draw();
        requestRef.current = requestAnimationFrame(update);
    }, [spawnNote, health, score, overdrive, isOverdrive, username, addScore]);

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = window.innerWidth, h = window.innerHeight;
        canvas.width = w; canvas.height = h;
        const cx = w / 2, cy = h / 2;

        // Background
        ctx.fillStyle = isOverdrive ? '#0a0a1f' : '#020205';
        ctx.fillRect(0, 0, w, h);

        // Grid Distortion
        ctx.strokeStyle = isOverdrive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.05)';
        for (let i = 0; i < w; i += 60) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
        }

        // Perspective Rails
        const railLength = 400;
        const lanes = [0, 1, 2, 3];
        lanes.forEach(l => {
            const angle = (l * Math.PI) / 2 - Math.PI / 2;
            ctx.beginPath();
            ctx.strokeStyle = activeLanes.current[l] ? '#fff' : 'rgba(99, 102, 241, 0.2)';
            ctx.lineWidth = activeLanes.current[l] ? 4 : 2;
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * railLength, cy + Math.sin(angle) * railLength);
            ctx.stroke();

            // Hit Target Ring
            ctx.beginPath();
            ctx.strokeStyle = activeLanes.current[l] ? '#fff' : 'rgba(99, 102, 241, 0.5)';
            const hx = cx + Math.cos(angle) * (railLength * 0.9);
            const hy = cy + Math.sin(angle) * (railLength * 0.9);
            ctx.arc(hx, hy, 20, 0, Math.PI * 2);
            ctx.stroke();
        });

        // Notes
        notes.current.forEach(n => {
            const angle = (n.lane * Math.PI) / 2 - Math.PI / 2;
            const dist = n.progress * railLength;
            const x = cx + Math.cos(angle) * dist;
            const y = cy + Math.sin(angle) * dist;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle + Math.PI / 4);
            ctx.fillStyle = isOverdrive ? '#fff' : '#6366f1';
            ctx.shadowBlur = 15; ctx.shadowColor = '#6366f1';
            const size = 12 + n.progress * 15;
            ctx.fillRect(-size / 2, -size / 2, size, size);

            // Trail
            ctx.globalAlpha = 0.3;
            ctx.fillRect(-size / 2 - 10, -size / 2 - 10, size, size);
            ctx.restore();
        });

        // Neural Core
        const coreSize = 60 + Math.sin(frameCount.current * 0.2) * 10;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize * 2);
        grad.addColorStop(0, isOverdrive ? 'rgba(255,255,255,0.4)' : 'rgba(99, 102, 241, 0.4)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, coreSize * 2, 0, Math.PI * 2); ctx.fill();
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(update);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [update]);

    useEffect(() => {
        const handleDown = (e: KeyboardEvent) => {
            let lane = -1;
            if (e.code === 'KeyW' || e.code === 'ArrowUp') lane = 0;
            if (e.code === 'KeyD' || e.code === 'ArrowRight') lane = 1;
            if (e.code === 'KeyS' || e.code === 'ArrowDown') lane = 2;
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') lane = 3;
            if (lane !== -1) { activeLanes.current[lane] = true; handleHit(lane); }
        };
        const handleUp = (e: KeyboardEvent) => {
            let lane = -1;
            if (e.code === 'KeyW' || e.code === 'ArrowUp') lane = 0;
            if (e.code === 'KeyD' || e.code === 'ArrowRight') lane = 1;
            if (e.code === 'KeyS' || e.code === 'ArrowDown') lane = 2;
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') lane = 3;
            if (lane !== -1) activeLanes.current[lane] = false;
        };
        window.addEventListener('keydown', handleDown);
        window.addEventListener('keyup', handleUp);
        return () => { window.removeEventListener('keydown', handleDown); window.removeEventListener('keyup', handleUp); };
    }, [handleHit]);

    const restart = () => {
        setScore(0); setCombo(0); setMultiplier(1); setHealth(100); setOverdrive(0); setIsOverdrive(false);
        notes.current = []; setGameState('playing');
    };

    return (
        <div className={cn(
            "fixed inset-0 z-[100] bg-black overflow-hidden select-none transition-all duration-300",
            isOverdrive && "brightness-125 saturate-200"
        )}>
            <canvas ref={canvasRef} className="absolute inset-0 block" />

            {/* SYNC HUD */}
            <div className="absolute top-0 left-0 w-full p-10 flex justify-between items-start pointer-events-none z-[110]">
                <div className="flex flex-col gap-6 pointer-events-auto">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 glass-panel border-indigo-400/30 rounded-2xl flex items-center justify-center text-indigo-400 neon-glow-sm">
                            <Radio className={cn(isOverdrive && "animate-ping")} />
                        </div>
                        <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black">Operator {username}</p>
                            <h2 className="text-3xl font-black tracking-tighter italic text-indigo-400">ECHO REALM</h2>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-4">
                            <Volume2 size={12} className="text-white/20" />
                            <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <motion.div animate={{ width: `${health}%`, backgroundColor: health < 30 ? '#ef4444' : '#6366f1' }} className="h-full shadow-[0_0_15px_#6366f1]" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-6 pointer-events-auto text-right">
                    <div className="glass-panel px-10 py-6 rounded-[2.5rem] border-indigo-500/20 bg-black/60">
                        <p className="text-[10px] text-white/30 uppercase tracking-[0.6em] font-black mb-1">Signal Resonance</p>
                        <p className="text-5xl font-black italic tracking-tighter text-white leading-none">
                            {score.toLocaleString()}
                        </p>
                        <div className="mt-6 flex flex-col items-end gap-1">
                            <p className="text-[8px] font-black uppercase text-indigo-500/40">Neural Overdrive</p>
                            <div className="w-40 h-8 bg-white/5 rounded-xl border border-white/5 overflow-hidden flex items-center justify-center relative">
                                <motion.div animate={{ width: `${overdrive}%` }} className="absolute inset-y-0 left-0 bg-indigo-500 shadow-[0_0_30px_#6366f1]" />
                                <span className={cn("relative z-10 text-[9px] font-black uppercase", overdrive >= 100 ? "text-white animate-pulse" : "text-white/20")}>
                                    {isOverdrive ? "OVERDRIVE ACTIVE 2X" : "SYNCING RESONANCE..."}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onExit(); }} className="glass-card px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 hover:bg-white/10 transition-all border-white/10 text-white/40">
                        <LogOut size={16} className="text-red-500" /> Disconnect
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {feedback && (
                    <motion.div key={feedback.t + combo} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[220px] z-[150] pointer-events-none">
                        <span className="text-5xl font-black italic tracking-[0.4em] transform skew-x-[-12deg]" style={{ color: feedback.c, textShadow: `0 0 30px ${feedback.c}` }}>{feedback.t}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {gameState === 'game_over' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center">
                        <Music2 size={80} className="text-indigo-500 mb-12 animate-pulse" />
                        <h3 className="text-9xl font-black text-white mb-6 uppercase tracking-tighter italic">RESONANCE LOST</h3>
                        <p className="text-indigo-500/60 font-black uppercase tracking-[0.6em] text-sm mb-20">Link Stability Failed at {score.toLocaleString()}</p>

                        <div className="flex gap-20 mb-24">
                            <div className="text-center">
                                <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mb-2">Resonance Score</p>
                                <p className="text-7xl font-black italic tracking-tighter text-indigo-400">{score.toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mb-2">Max Sync Streak</p>
                                <p className="text-7xl font-black italic tracking-tighter text-white">{combo}</p>
                            </div>
                        </div>

                        <div className="flex gap-8">
                            <button onClick={(e) => { e.stopPropagation(); restart(); }} className="px-24 py-8 bg-indigo-500 text-black rounded-[3rem] font-black uppercase tracking-[0.5em] text-sm shadow-[0_20px_80px_rgba(99,102,241,0.4)] transition-all hover:scale-105 active:scale-95">Re-Sync Protocol</button>
                            <button onClick={(e) => { e.stopPropagation(); onExit(); }} className="px-16 py-8 glass-card text-white rounded-[3rem] font-black uppercase tracking-[0.5em] text-xs transition-all hover:bg-white/10 border-white/10">Return to Nexus</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-[110] text-center opacity-30">
                <p className="text-[11px] font-black uppercase tracking-[0.7em] italic">WASD to Calibrate Sync</p>
                <div className="flex items-center gap-6">
                    <Volume2 size={18} />
                    <Radio size={18} />
                    <ShieldCheck size={18} />
                </div>
            </div>
        </div>
    );
}
