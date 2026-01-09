'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Orbit, LogOut, Zap, FastForward, Activity, MoveUp, Sparkles, Wind } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { cn } from '@/lib/utils';

interface GravityWellProps {
    username: string;
    onExit: () => void;
}

interface Well {
    id: string;
    x: number;
    y: number;
    radius: number;
    type: 'pull' | 'push' | 'vortex';
}

export default function GravityWell({ username, onExit }: GravityWellProps) {
    const [gameState, setGameState] = useState<'playing' | 'game_over'>('playing');
    const [score, setScore] = useState(0);
    const [speed, setSpeed] = useState(0);
    const [fov, setFov] = useState(1);
    const { addScore } = useLeaderboard('gravity-well-v2');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const player = useRef({ x: 0, y: 0, vx: 8, vy: 0, radius: 10, trail: [] as { x: number, y: number }[] });
    const wells = useRef<Well[]>([]);
    const hookedWell = useRef<Well | null>(null);
    const frameCount = useRef(0);
    const requestRef = useRef<number>(null);
    const gameStateRef = useRef(gameState);

    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

    const spawnWell = useCallback(() => {
        const last = wells.current[wells.current.length - 1];
        const newX = (last ? last.x : 0) + 500 + Math.random() * 300;
        const newY = Math.random() * (window.innerHeight - 300) + 150;

        wells.current.push({
            id: Math.random().toString(36),
            x: newX,
            y: newY,
            radius: 50 + Math.random() * 70,
            type: Math.random() > 0.8 ? 'vortex' : 'pull'
        });
    }, []);

    const update = useCallback((ts: number) => {
        if (gameStateRef.current !== 'playing') return;
        frameCount.current++;

        const p = player.current;

        // Orbital Physics
        if (hookedWell.current) {
            const w = hookedWell.current;
            const dx = w.x - p.x;
            const dy = w.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Swing Force
            const force = 0.8;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
        }

        // Apply Velocity
        p.x += p.vx;
        p.y += p.vy;

        // Visual FOV shift based on speed
        const currentSpeed = Math.sqrt(p.vx ** 2 + p.vy ** 2);
        setSpeed(Math.floor(currentSpeed * 100));
        setFov(1 + (currentSpeed - 8) * 0.02);

        // Trail
        if (frameCount.current % 2 === 0) {
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 20) p.trail.shift();
        }

        // Generate Wells
        if (wells.current.length < 8) spawnWell();
        wells.current = wells.current.filter(w => w.x > p.x - 1000);

        // Boundaries
        if (p.y < -100 || p.y > window.innerHeight + 100) {
            setGameState('game_over');
            addScore(username, Math.floor(p.x / 10));
        }

        setScore(Math.floor(p.x / 10));

        draw();
        requestRef.current = requestAnimationFrame(update);
    }, [spawnWell, username, addScore]);

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = window.innerWidth, h = window.innerHeight;
        canvas.width = w; canvas.height = h;

        const cx = w / 4;
        const p = player.current;

        ctx.fillStyle = '#050400';
        ctx.fillRect(0, 0, w, h);

        // Parallax Stars
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 50; i++) {
            const x = (i * 243 + p.x * 0.1) % w;
            const y = (i * 532) % h;
            ctx.globalAlpha = 0.2;
            ctx.fillRect(x, y, 2, 2);
        }

        ctx.save();
        ctx.translate(-p.x + cx, 0);

        // Kinetic Motion Stretch
        const stretch = 1 + (Math.sqrt(p.vx ** 2 + p.vy ** 2) * 0.02);

        // Wells
        wells.current.forEach(well => {
            const grad = ctx.createRadialGradient(well.x, well.y, 0, well.x, well.y, well.radius * 2);
            grad.addColorStop(0, well.type === 'vortex' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(254, 240, 138, 0.2)');
            grad.addColorStop(1, 'transparent');

            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(well.x, well.y, well.radius * 2, 0, Math.PI * 2); ctx.fill();

            ctx.strokeStyle = well.type === 'vortex' ? '#a855f7' : '#fef08a';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(well.x, well.y, well.radius, 0, Math.PI * 2); ctx.stroke();

            // Core
            ctx.fillStyle = well.type === 'vortex' ? '#a855f7' : '#fef08a';
            ctx.beginPath(); ctx.arc(well.x, well.y, 8, 0, Math.PI * 2); ctx.fill();
        });

        // Player Trail
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.3)';
        ctx.lineWidth = 4;
        p.trail.forEach((t, i) => {
            if (i === 0) ctx.moveTo(t.x, t.y);
            else ctx.lineTo(t.x, t.y);
        });
        ctx.stroke();

        // Hook Line
        if (hookedWell.current) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.setLineDash([10, 5]);
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(hookedWell.current.x, hookedWell.current.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Player
        ctx.shadowBlur = 20; ctx.shadowColor = '#fff';
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(update);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [update]);

    useEffect(() => {
        const handleDown = () => {
            const p = player.current;
            let nearest: Well | null = null;
            let minDist = Infinity;
            wells.current.forEach(w => {
                const d = Math.sqrt((w.x - p.x) ** 2 + (w.y - p.y) ** 2);
                if (d < 450 && d < minDist) { minDist = d; nearest = w; }
            });
            if (nearest) hookedWell.current = nearest;
        };
        const handleUp = () => hookedWell.current = null;
        window.addEventListener('mousedown', handleDown);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('keydown', (e) => { if (e.code === 'Space') handleDown(); });
        window.addEventListener('keyup', (e) => { if (e.code === 'Space') handleUp(); });
        return () => {
            window.removeEventListener('mousedown', handleDown); window.removeEventListener('mouseup', handleUp);
        };
    }, []);

    const restartGame = () => {
        setScore(0);
        setSpeed(0);
        player.current = { x: 0, y: window.innerHeight / 2, vx: 8, vy: 0, radius: 10, trail: [] };
        wells.current = [];
        setGameState('playing');
        setFov(1);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black overflow-hidden select-none" style={{ transform: `scale(${fov})` }}>
            <canvas ref={canvasRef} className="absolute inset-0 block" />

            {/* KINETIC HUD */}
            <div className="absolute top-0 left-0 w-full p-10 flex justify-between items-start pointer-events-none z-[110]">
                <div className="flex flex-col gap-6 pointer-events-auto">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 glass-panel border-yellow-400/30 rounded-2xl flex items-center justify-center text-yellow-400 neon-glow-sm">
                            <Orbit className="animate-spin-slow" />
                        </div>
                        <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black">Pilot {username}</p>
                            <h2 className="text-3xl font-black tracking-tighter italic text-yellow-400 tracking-widest">GRAVITY WELL</h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 px-6 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                        <Activity size={12} className="text-yellow-400 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500/60">Orbital Velocity: {speed} KPH</span>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-6 pointer-events-auto">
                    <div className="glass-panel px-10 py-6 rounded-[2.5rem] border-yellow-500/20 bg-black/60 text-right">
                        <p className="text-[10px] text-white/30 uppercase tracking-[0.6em] font-black mb-1">Tunnel Depth traversed</p>
                        <p className="text-5xl font-black italic tracking-tighter text-white leading-none">
                            {score.toLocaleString()}<span className="text-2xl text-yellow-500 ml-2">LY</span>
                        </p>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onExit(); }}
                        className="glass-card px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 hover:bg-white/10 transition-all border-white/10 text-white/40"
                    >
                        <LogOut size={16} className="text-red-500" /> Disconnect
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {gameState === 'game_over' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center">
                        <Wind size={80} className="text-yellow-500 mb-12 animate-bounce" />
                        <h3 className="text-9xl font-black text-white mb-6 uppercase tracking-tighter italic">BOUNDARY IMPACT</h3>
                        <p className="text-yellow-500/60 font-black uppercase tracking-[0.6em] text-sm mb-20">Kinetic Navigation Link Terminated</p>

                        <div className="text-center mb-24">
                            <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mb-2">Total Lightyears Traversed</p>
                            <p className="text-8xl font-black italic tracking-tighter text-yellow-400">{score.toLocaleString()} LY</p>
                        </div>

                        <div className="flex gap-8">
                            <button onClick={(e) => { e.stopPropagation(); restartGame(); }} className="px-24 py-8 bg-white text-black rounded-[3rem] font-black uppercase tracking-[0.5em] text-sm shadow-[0_20px_80px_rgba(254,240,138,0.4)] transition-all hover:scale-105 active:scale-95">Restart Link</button>
                            <button onClick={(e) => { e.stopPropagation(); onExit(); }} className="px-16 py-8 glass-card text-white rounded-[3rem] font-black uppercase tracking-[0.5em] text-xs transition-all hover:bg-white/10 border-white/10">Return to Nexus</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-[110] text-center opacity-30">
                <p className="text-[11px] font-black uppercase tracking-[0.7em] italic">Hold Space to Hook Wells</p>
                <div className="flex items-center gap-6">
                    <FastForward size={20} />
                    <Orbit size={20} />
                    <Zap size={20} />
                </div>
            </div>
        </div>
    );
}
