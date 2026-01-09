'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, LogOut, Sparkles, Zap, Trophy, Activity, ArrowDown } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { cn } from '@/lib/utils';

interface ZenVoidProps {
    username: string;
    onExit: () => void;
}

interface Monolith {
    x: number;
    width: number;
    y: number;
    color: string;
    isPerfect: boolean;
}

export default function ZenVoid({ username, onExit }: ZenVoidProps) {
    const [gameState, setGameState] = useState<'playing' | 'game_over'>('playing');
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [multiplier, setMultiplier] = useState(1);
    const [isShaking, setIsShaking] = useState(false);
    const { addScore } = useLeaderboard('zen-void-v2');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const monoliths = useRef<Monolith[]>([]);
    const currentBlock = useRef({ x: 0, width: 200, speed: 6, direction: 1 });
    const requestRef = useRef<number>(null);
    const frameCount = useRef(0);
    const cameraY = useRef(0);
    const gameStateRef = useRef(gameState);

    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

    const triggerShake = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 200);
    };

    const handleDrop = useCallback(() => {
        if (gameStateRef.current !== 'playing') return;

        const block = currentBlock.current;
        const last = monoliths.current[monoliths.current.length - 1];

        if (!last) {
            // First block
            monoliths.current.push({
                x: block.x,
                width: block.width,
                y: window.innerHeight - 100,
                color: '#10b981',
                isPerfect: true
            });
            setScore(100);
            return;
        }

        const diff = block.x - last.x;
        const absDiff = Math.abs(diff);

        if (absDiff >= block.width) {
            // GAME OVER
            setGameState('game_over');
            addScore(username, score);
            triggerShake();
        } else {
            const isPerfect = absDiff < 6;
            const newWidth = block.width - (isPerfect ? 0 : absDiff);
            const newX = diff > 0 ? block.x : last.x;

            if (isPerfect) {
                setCombo(c => c + 1);
                setMultiplier(m => Math.min(10, m + 0.5));
                setScore(s => s + Math.floor(500 * multiplier));
            } else {
                setCombo(0);
                setMultiplier(1);
                setScore(s => s + Math.floor(100 * multiplier));
                currentBlock.current.width = newWidth;
            }

            monoliths.current.push({
                x: isPerfect ? last.x : newX,
                width: newWidth,
                y: last.y - 40,
                color: isPerfect ? '#ffffff' : `hsl(${150 + monoliths.current.length * 2}, 70%, 50%)`,
                isPerfect
            });

            // Accelerate
            currentBlock.current.speed = Math.min(15, 6 + (monoliths.current.length * 0.2));
            triggerShake();
        }
    }, [score, multiplier, username, addScore]);

    const update = useCallback((ts: number) => {
        if (gameStateRef.current !== 'playing') return;
        frameCount.current++;

        const block = currentBlock.current;
        block.x += block.speed * block.direction;
        if (block.x + block.width > window.innerWidth || block.x < 0) {
            block.direction *= -1;
        }

        // Smooth Camera
        const targetCamera = Math.max(0, monoliths.current.length * 40 - (window.innerHeight / 2 - 100));
        cameraY.current += (targetCamera - cameraY.current) * 0.1;

        draw();
        requestRef.current = requestAnimationFrame(update);
    }, []);

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = w;
        canvas.height = h;

        // Cinematic Background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#050a0f');
        bgGrad.addColorStop(1, '#020205');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Zen Fog
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(w / 2, h + 200, 600, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        ctx.save();
        ctx.translate(0, cameraY.current);

        // Render Stack
        monoliths.current.forEach((m, i) => {
            const isLatest = i === monoliths.current.length - 1;

            ctx.shadowBlur = m.isPerfect ? 30 : 10;
            ctx.shadowColor = m.color;
            ctx.fillStyle = m.color;

            // Glass Morphism Style
            ctx.beginPath();
            const radius = 8;
            ctx.roundRect(m.x, m.y, m.width, 38, radius);
            ctx.fill();

            // Inner Gloss
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(m.x, m.y, m.width, 4);

            if (m.isPerfect && isLatest) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2 + Math.sin(frameCount.current * 0.2) * 2;
                ctx.stroke();
            }
        });

        // Moving Block
        if (gameStateRef.current === 'playing') {
            const block = currentBlock.current;
            const y = monoliths.current.length > 0 ? monoliths.current[monoliths.current.length - 1].y - 40 : h - 100;

            ctx.shadowBlur = 40;
            ctx.shadowColor = 'rgba(255,255,255,0.5)';
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.beginPath();
            ctx.roundRect(block.x, y, block.width, 38, 8);
            ctx.fill();
        }

        ctx.restore();
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(update);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [update]);

    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); handleDrop(); } };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [handleDrop]);

    const restart = () => {
        setScore(0); setCombo(0); setMultiplier(1);
        monoliths.current = [];
        currentBlock.current = { x: 0, width: 250, speed: 6, direction: 1 };
        setGameState('playing');
    };

    return (
        <div className={cn(
            "fixed inset-0 z-[100] bg-black overflow-hidden select-none transition-transform duration-75",
            isShaking && "scale-[1.02] brightness-125"
        )} onClick={handleDrop}>
            <canvas ref={canvasRef} className="absolute inset-0 block" />

            <div className="absolute top-0 left-0 w-full p-10 flex justify-between items-start pointer-events-none z-[110]">
                <div className="flex flex-col gap-6 pointer-events-auto">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 glass-panel border-emerald-400/30 rounded-2xl flex items-center justify-center text-emerald-400 neon-glow-sm">
                            <Box className={cn(combo > 5 && "animate-bounce")} />
                        </div>
                        <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black">Zen Architect</p>
                            <h2 className="text-3xl font-black tracking-tighter italic">{username}</h2>
                        </div>
                    </div>

                    {combo > 0 && (
                        <motion.div
                            initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                            className="flex items-center gap-3 px-6 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full backdrop-blur-xl"
                        >
                            <Sparkles size={14} className="text-emerald-400" />
                            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">{combo} PERFECT STREAK</span>
                        </motion.div>
                    )}
                </div>

                <div className="flex flex-col items-end gap-6 pointer-events-auto">
                    <div className="glass-panel px-10 py-6 rounded-[2.5rem] border-emerald-500/20 bg-black/60 text-right">
                        <p className="text-[10px] text-white/30 uppercase tracking-[0.6em] font-black mb-1">Architecture Worth</p>
                        <p className="text-5xl font-black italic tracking-tighter text-emerald-400 leading-none">
                            {score.toLocaleString()}
                        </p>
                        <div className="mt-4 flex justify-end gap-1">
                            <span className="text-[9px] font-black text-emerald-500/40 uppercase tracking-widest">Multiplier</span>
                            <span className="text-xs font-black text-emerald-400">x{multiplier.toFixed(1)}</span>
                        </div>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onExit(); }}
                        className="glass-card px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 hover:bg-white/10 transition-all border-white/10 text-white/40"
                    >
                        <LogOut size={16} className="text-red-500" /> Terminate Session
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {gameState === 'game_over' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center">
                        <Activity size={80} className="text-emerald-500 mb-12 animate-pulse" />
                        <h3 className="text-9xl font-black text-white mb-6 uppercase tracking-tighter italic">STRUCTURE COLLAPSE</h3>
                        <p className="text-emerald-500/60 font-black uppercase tracking-[0.6em] text-sm mb-20">Zen State Terminated by Misalignment</p>

                        <div className="flex gap-20 mb-24">
                            <div className="text-center">
                                <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mb-2">Final Value</p>
                                <p className="text-7xl font-black italic tracking-tighter text-emerald-400">{score.toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mb-2">Peak Alignment</p>
                                <p className="text-7xl font-black italic tracking-tighter text-white">{monoliths.current.length}</p>
                            </div>
                        </div>

                        <div className="flex gap-8">
                            <button onClick={(e) => { e.stopPropagation(); restart(); }} className="px-24 py-8 bg-emerald-500 text-black rounded-[3rem] font-black uppercase tracking-[0.5em] text-sm shadow-[0_20px_80px_rgba(16,185,129,0.4)] transition-all hover:scale-105 active:scale-95">Re-Initialize Foundation</button>
                            <button onClick={(e) => { e.stopPropagation(); onExit(); }} className="px-16 py-8 glass-card text-white rounded-[3rem] font-black uppercase tracking-[0.5em] text-xs transition-all hover:bg-white/10 border-white/10">Return to Nexus</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-[110] opacity-30 animate-pulse">
                <ArrowDown size={32} />
                <p className="text-[11px] font-black uppercase tracking-[0.8em] italic">Synchronize Layers in Silence</p>
            </div>
        </div>
    );
}
