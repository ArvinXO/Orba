'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, LogOut, Zap, Flame, ShieldAlert, Sparkles, AlertCircle, Shield, Clock, Heart } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { cn } from '@/lib/utils';

interface SolarFlareProps {
    username: string;
    onExit: () => void;
}

interface Flare {
    id: string;
    angle: number;
    dist: number;
    speed: number;
    size: number;
    color: string;
    type: 'normal' | 'super' | 'void';
}

interface Booster {
    id: string;
    x: number;
    y: number;
    type: 'shield_expander' | 'chronos' | 'coolant';
    dist: number;
    angle: number;
    speed: number;
}

export default function SolarFlare({ username, onExit }: SolarFlareProps) {
    const [gameState, setGameState] = useState<'playing' | 'game_over'>('playing');
    const [score, setScore] = useState(0);
    const [energy, setEnergy] = useState(0);
    const [health, setHealth] = useState(100);
    const [isBursting, setIsBursting] = useState(false);
    const [shake, setShake] = useState(0);

    // Booster states
    const [activeBoosters, setActiveBoosters] = useState<{ type: string, time: number }[]>([]);

    const { addScore } = useLeaderboard('solar-flare-v2');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const flares = useRef<Flare[]>([]);
    const boosters = useRef<Booster[]>([]);
    const shieldAngle = useRef(0);
    const targetShieldAngle = useRef(0);
    const requestRef = useRef<number>(null);
    const frameCount = useRef(0);
    const gameStateRef = useRef(gameState);

    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

    const spawnFlare = useCallback(() => {
        // Drastically reduced initial difficulty ramp
        const difficulty = 1 + score / 60000;
        const angle = Math.random() * Math.PI * 2;
        const id = Math.random().toString(36).substring(7);
        const rand = Math.random();

        let type: Flare['type'] = 'normal';
        let color = '#f59e0b';
        let size = 8;
        // Super slow initial speed: 1.5 to 3.0
        let speed = (1.5 + Math.random() * 1.5) * difficulty;

        const isChronosActive = activeBoosters.some(b => b.type === 'chronos');
        if (isChronosActive) speed *= 0.5;

        if (rand > 0.95) { // More rare super flares
            type = 'super';
            color = '#ffffff';
            size = 14;
            speed *= 1.25;
        } else if (rand > 0.88 && score > 15000) { // Delayed void flares even more
            type = 'void';
            color = '#ec4899';
            size = 6;
            speed *= 1.8;
        }

        flares.current.push({ id, angle, dist: 900, speed, size, color, type });
    }, [score, activeBoosters]);

    const spawnBooster = useCallback(() => {
        const id = Math.random().toString(36).substring(7);
        const angle = Math.random() * Math.PI * 2;
        const types: Booster['type'][] = ['shield_expander', 'chronos', 'coolant'];
        const type = types[Math.floor(Math.random() * types.length)];

        boosters.current.push({
            id,
            angle,
            dist: 900,
            x: 0, y: 0,
            type,
            speed: 2
        });
    }, []);

    const triggerBurst = () => {
        if (energy < 100) return;
        setIsBursting(true);
        setEnergy(0);
        setScore(s => s + flares.current.length * 200);
        flares.current = [];
        setShake(30);
        setTimeout(() => setIsBursting(false), 800);
    };

    const update = useCallback((ts: number) => {
        if (gameStateRef.current !== 'playing') return;
        frameCount.current++;

        // Slower Shield Follow for more intentional movement
        let diff = targetShieldAngle.current - shieldAngle.current;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        shieldAngle.current += diff * 0.15;

        // Spawn Scaling - Much slower rate early game (90 frames to 15 frames)
        const rate = Math.max(15, 90 - Math.floor(score / 8000));
        if (frameCount.current % rate === 0) spawnFlare();

        // Spawn Boosters more frequently
        if (frameCount.current % 450 === 0) spawnBooster();

        // Booster decay logic
        setActiveBoosters(prev => prev.map(b => ({ ...b, time: b.time - 16.67 })).filter(b => b.time > 0));

        const isShieldExpanded = activeBoosters.some(b => b.type === 'shield_expander');
        const shieldWidth = isShieldExpanded ? 1.0 : 0.5;

        // Update Flares
        flares.current.forEach(f => {
            f.dist -= f.speed;

            // Shield Collision - Slightly wider window (140 to 100)
            if (f.dist < 140 && f.dist > 100) {
                let angDiff = Math.abs(f.angle - shieldAngle.current);
                while (angDiff > Math.PI) angDiff = Math.abs(angDiff - Math.PI * 2);

                if (angDiff < shieldWidth) {
                    f.dist = -100; // Blocked
                    setScore(s => s + (f.type === 'super' ? 500 : 100));
                    setEnergy(e => Math.min(100, e + (f.type === 'super' ? 15 : 5)));
                    setShake(5);
                }
            }

            // Core Collision - Less damage
            if (f.dist < 60 && f.dist > 0) {
                f.dist = -100;
                setHealth(h => Math.max(0, h - (f.type === 'void' ? 15 : 8)));
                setEnergy(e => Math.max(0, e - 10));
                setShake(20);
            }
        });

        // Update Boosters
        boosters.current.forEach(b => {
            b.dist -= b.speed;
            // Shield Collision for Booster collection
            if (b.dist < 135 && b.dist > 105) {
                let angDiff = Math.abs(b.angle - shieldAngle.current);
                while (angDiff > Math.PI) angDiff = Math.abs(angDiff - Math.PI * 2);

                if (angDiff < shieldWidth) {
                    b.dist = -100;
                    if (b.type === 'coolant') {
                        setHealth(h => Math.min(100, h + 35));
                    } else {
                        const duration = b.type === 'shield_expander' ? 15000 : 12000;
                        setActiveBoosters(prev => [...prev.filter(x => x.type !== b.type), { type: b.type, time: duration }]);
                    }
                    setShake(10);
                }
            }
        });

        flares.current = flares.current.filter(f => f.dist > -50);
        boosters.current = boosters.current.filter(b => b.dist > -50);

        if (shake > 0) setShake(s => Math.max(0, s - 1));

        if (health <= 0 && gameStateRef.current === 'playing') {
            setGameState('game_over');
            addScore(username, score);
        }

        draw();
        requestRef.current = requestAnimationFrame(update);
    }, [spawnFlare, spawnBooster, health, score, username, addScore, activeBoosters, shake, energy]);

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = window.innerWidth, h = window.innerHeight;
        canvas.width = w; canvas.height = h;
        const cx = w / 2, cy = h / 2;

        ctx.fillStyle = '#0a0500';
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

        // Star Core Glow
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 180);
        grad.addColorStop(0, '#fffbeb');
        grad.addColorStop(0.5, '#f59e0b');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, cy, 180, 0, Math.PI * 2); ctx.fill();

        // The Shield
        const isShieldExpanded = activeBoosters.some(b => b.type === 'shield_expander');
        const shieldWidth = isShieldExpanded ? 1.0 : 0.5;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(shieldAngle.current);
        ctx.beginPath();
        ctx.strokeStyle = energy >= 100 ? '#fff' : (isShieldExpanded ? '#10b981' : '#ffffff');
        ctx.lineWidth = isShieldExpanded ? 12 : 8;
        ctx.shadowBlur = isShieldExpanded ? 40 : 15;
        ctx.shadowColor = isShieldExpanded ? '#10b981' : '#fff';
        ctx.arc(0, 0, 120, -shieldWidth, shieldWidth);
        ctx.stroke();
        ctx.restore();

        // Boosters
        boosters.current.forEach(b => {
            const x = cx + Math.cos(b.angle) * b.dist;
            const y = cy + Math.sin(b.angle) * b.dist;
            const color = b.type === 'shield_expander' ? '#10b981' : (b.type === 'chronos' ? '#3b82f6' : '#ef4444');

            ctx.shadowBlur = 20; ctx.shadowColor = color;
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();

            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Flares
        flares.current.forEach(f => {
            const x = cx + Math.cos(f.angle) * f.dist;
            const y = cy + Math.sin(f.angle) * f.dist;
            ctx.shadowBlur = 20; ctx.shadowColor = f.color;
            ctx.fillStyle = f.color;
            ctx.beginPath(); ctx.arc(x, y, f.size, 0, Math.PI * 2); ctx.fill();
        });

        ctx.restore();
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(update);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [update]);

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            const dx = e.clientX - window.innerWidth / 2;
            const dy = e.clientY - window.innerHeight / 2;
            targetShieldAngle.current = Math.atan2(dy, dx);
        };
        const handleClick = () => triggerBurst();
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mousedown', handleClick);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mousedown', handleClick);
        };
    }, [energy]);

    const restart = () => {
        setScore(0); setHealth(100); setEnergy(0);
        flares.current = []; boosters.current = [];
        setActiveBoosters([]);
        setGameState('playing');
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black overflow-hidden select-none">
            <canvas ref={canvasRef} className="absolute inset-0 block" />

            <div className="absolute top-0 left-0 w-full p-10 flex justify-between items-start pointer-events-none z-[110]">
                <div className="flex flex-col gap-6 pointer-events-auto">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 glass-panel border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-500 neon-glow-sm">
                            <Sun className="animate-spin-slow" />
                        </div>
                        <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black">Star Sentinel</p>
                            <h2 className="text-3xl font-black tracking-tighter italic">{username}</h2>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="w-56 h-2 bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
                            <motion.div
                                animate={{ width: `${health}%`, backgroundColor: health < 30 ? '#ef4444' : '#f59e0b' }}
                                className="h-full rounded-full"
                            />
                        </div>

                        {/* Booster Bar */}
                        <div className="flex gap-2">
                            {activeBoosters.map((b, i) => (
                                <motion.div
                                    key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg border border-white/20"
                                >
                                    {b.type === 'shield_expander' && <Shield size={12} className="text-emerald-400" />}
                                    {b.type === 'chronos' && <Clock size={12} className="text-blue-400" />}
                                    <span className="text-[8px] font-black uppercase text-white/60">{(b.time / 1000).toFixed(1)}s</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-6 pointer-events-auto">
                    <div className="glass-panel px-10 py-6 rounded-[2.5rem] border-amber-500/20 bg-black/60 text-right">
                        <p className="text-[10px] text-white/30 uppercase tracking-[0.6em] font-black mb-1">Radiation Captured</p>
                        <p className="text-5xl font-black italic tracking-tighter text-amber-500 leading-none">{score.toLocaleString()}</p>

                        <div className="mt-8 space-y-2">
                            <div className="w-48 h-10 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-center relative overflow-hidden">
                                <motion.div animate={{ width: `${energy}%` }} className="absolute inset-y-0 left-0 bg-blue-500 shadow-[0_0_20px_#3b82f6]" />
                                <span className="relative z-10 text-[8px] font-black uppercase text-white/40">
                                    {energy >= 100 ? "BURST READY" : "Charging Burst"}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onExit} className="glass-card px-8 py-3 rounded-2xl text-[10px] font-black text-white/40">Abort Mission</button>
                </div>
            </div>

            <AnimatePresence>
                {gameState === 'game_over' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[200] bg-black/98 flex flex-col items-center justify-center p-12 text-center pointer-events-auto">
                        <Flame size={80} className="text-amber-500 mb-8" />
                        <h3 className="text-9xl font-black text-white italic">SUPERNOVA</h3>
                        <p className="text-7xl font-black italic text-amber-500 my-10">{score.toLocaleString()}</p>
                        <div className="flex gap-6">
                            <button onClick={restart} className="px-20 py-6 bg-white text-black rounded-full font-black uppercase text-sm">Restart</button>
                            <button onClick={onExit} className="px-12 py-6 glass-card text-white rounded-full font-black uppercase text-xs">Nexus</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
