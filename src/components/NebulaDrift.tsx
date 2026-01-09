'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ship, Zap, Bomb, Shield, Trophy, RefreshCw, LogOut, ChevronRight, Sparkles, Flame, Target, ZapOff, HardDrive, Disc, Crosshair, Triangle } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { cn } from '@/lib/utils';

interface NebulaDriftProps {
    username: string;
    onExit: () => void;
}

interface Particle {
    id: number;
    x: number;
    y: number;
    size: number;
    speed: number;
    color: string;
    opacity: number;
}

interface Hazard {
    id: number;
    x: number;
    y: number;
    size: number;
    type: 'asteroid' | 'nova' | 'scrap' | 'blackhole' | 'wall';
    speed: number;
    angle: number;
    health: number;
}

interface Projectile {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    type: 'plasma' | 'burst' | 'beam';
    color: string;
}

interface PowerUp {
    id: number;
    x: number;
    y: number;
    type: 'shield' | 'repair' | 'multiplier' | 'weapon_plasma' | 'weapon_burst';
    speed: number;
    pulse: number;
}

export default function NebulaDrift({ username, onExit }: NebulaDriftProps) {
    const [gameState, setGameState] = useState<'playing' | 'game_over'>('playing');
    const [score, setScore] = useState(0);
    const [distance, setDistance] = useState(0);
    const [speed, setSpeed] = useState(8);
    const [multiplier, setMultiplier] = useState(1);
    const [hull, setHull] = useState(100);
    const [shield, setShield] = useState(0);
    const [overdrive, setOverdrive] = useState(0);
    const [weaponMode, setWeaponMode] = useState<'none' | 'plasma' | 'burst'>('none');

    const { addScore } = useLeaderboard('nebula-drift-v3');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const shipPos = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, rotation: 0, vx: 0, vy: 0 });
    const hazards = useRef<Hazard[]>([]);
    const projectiles = useRef<Projectile[]>([]);
    const particles = useRef<Particle[]>([]);
    const powerUps = useRef<PowerUp[]>([]);
    const requestRef = useRef<number>(null);

    const scoreRef = useRef(0);
    const distanceRef = useRef(0);
    const gameStateRef = useRef<'playing' | 'game_over'>('playing');

    const frameCount = useRef(0);
    const lastTime = useRef(performance.now());
    const shake = useRef(0);

    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    useEffect(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;

        particles.current = Array.from({ length: 150 }).map((_, i) => ({
            id: i,
            x: Math.random() * w,
            y: Math.random() * h,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 15 + 5,
            color: i % 3 === 0 ? '#8b5cf6' : (i % 3 === 1 ? '#ec4899' : '#ffffff'),
            opacity: Math.random() * 0.5 + 0.2
        }));

        shipPos.current = {
            x: w / 2, y: h * 0.8, targetX: w / 2, targetY: h * 0.8, rotation: 0, vx: 0, vy: 0
        };
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            shipPos.current.targetX = e.clientX;
            shipPos.current.targetY = e.clientY;
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const createExplosion = (x: number, y: number, color: string, count = 10) => {
        for (let i = 0; i < count; i++) {
            particles.current.push({
                id: Math.random(),
                x, y,
                size: Math.random() * 4 + 2,
                speed: Math.random() * 10 - 5,
                color,
                opacity: 1
            });
        }
    };

    const update = useCallback((ts: number) => {
        if (gameStateRef.current !== 'playing') return;

        const dt = Math.min((ts - lastTime.current) / 16.67, 2);
        lastTime.current = ts;
        frameCount.current++;

        const p = shipPos.current;
        const lerp = 0.15 * dt;
        p.vx = (p.targetX - p.x) * lerp;
        p.vy = (p.targetY - p.y) * lerp;
        p.x += p.vx;
        p.y += p.vy;

        const margin = 50;
        if (p.x < margin) p.x = margin;
        if (p.x > window.innerWidth - margin) p.x = window.innerWidth - margin;
        if (p.y < margin) p.y = margin;
        if (p.y > window.innerHeight - margin) p.y = window.innerHeight - margin;

        const targetRot = Math.max(-40, Math.min(40, p.vx * 1.5));
        p.rotation += (targetRot - p.rotation) * 0.1;

        setOverdrive(o => Math.min(100, o + 0.05 * dt));
        if (shake.current > 0) shake.current -= 0.5 * dt;

        // Shooting
        if (frameCount.current % 12 === 0 && weaponMode !== 'none') {
            const vy = -25 * dt;
            if (weaponMode === 'plasma') {
                projectiles.current.push({ id: Date.now(), x: p.x, y: p.y - 20, vx: 0, vy, type: 'plasma', color: '#06b6d4' });
                shake.current = 5;
            } else if (weaponMode === 'burst') {
                for (let i = -1; i <= 1; i++) {
                    projectiles.current.push({ id: Date.now() + i, x: p.x, y: p.y - 20, vx: i * 5, vy, type: 'burst', color: '#f43f5e' });
                }
                shake.current = 10;
            }
        }

        projectiles.current = projectiles.current.filter(pr => {
            pr.x += pr.vx * dt;
            pr.y += pr.vy * dt;
            return pr.y > -50 && pr.x > -50 && pr.x < window.innerWidth + 50;
        });

        const currentGrowth = overdrive === 100 ? 0.008 * dt : 0.002 * dt;
        setSpeed(s => Math.min(s + currentGrowth, 45));

        const speedBoost = overdrive >= 100 ? 1.5 : 1;
        distanceRef.current += (speed / 10) * speedBoost * dt;
        setDistance(Math.floor(distanceRef.current));

        const newMultiplier = 1 + Math.floor(distanceRef.current / 500);
        setMultiplier(newMultiplier);

        // Hazards
        if (frameCount.current % Math.max(10, Math.floor(40 - speed / 2)) === 0) {
            const typeRoll = Math.random();
            let type: Hazard['type'] = 'asteroid';
            let size = Math.random() * 60 + 30;
            if (typeRoll > 0.96) type = 'blackhole';
            else if (typeRoll > 0.85) type = 'nova';
            else if (typeRoll > 0.75) type = 'wall';

            hazards.current.push({
                id: Date.now() + Math.random(),
                x: type === 'wall' ? (Math.random() > 0.5 ? 0 : window.innerWidth) : Math.random() * window.innerWidth,
                y: -150,
                size: type === 'wall' ? 200 : size,
                type,
                speed: (Math.random() * 3 + 6) * (speed / 10),
                angle: Math.random() * Math.PI * 2,
                health: type === 'blackhole' ? 999 : (type === 'nova' ? 3 : 1)
            });
        }

        hazards.current = hazards.current.filter(h => {
            h.y += h.speed * dt;
            h.angle += (overdrive === 100 ? 0.06 : 0.03) * dt;

            if (h.type === 'blackhole') {
                const gdx = h.x - p.x;
                const gdy = h.y - p.y;
                const gdist = Math.sqrt(gdx * gdx + gdy * gdy);
                if (gdist < 400) {
                    p.x += (gdx / gdist) * (overdrive === 100 ? 6 : 4) * dt;
                    p.y += (gdy / gdist) * (overdrive === 100 ? 6 : 4) * dt;
                }
            }

            projectiles.current.forEach(pr => {
                const pdx = pr.x - h.x;
                const pdy = pr.y - h.y;
                const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
                if (pdist < h.size / 2) {
                    h.health -= 1;
                    pr.y = -100;
                    if (h.health <= 0) createExplosion(h.x, h.y, '#f59e0b', 10);
                }
            });

            const cdx = h.x - p.x;
            const cdy = h.y - p.y;
            const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
            const hitSize = h.type === 'wall' ? h.size : h.size * 0.45;
            if (cdist < (hitSize + 40) / 2) {
                shake.current = 20;
                if (shield > 0) {
                    setShield(s => Math.max(0, s - 30));
                    createExplosion(h.x, h.y, '#60a5fa', 15);
                } else {
                    setHull(prev => {
                        const next = Math.max(0, prev - 25);
                        if (next <= 0) {
                            gameStateRef.current = 'game_over';
                            setGameState('game_over');
                            addScore(username, Math.floor(scoreRef.current));
                        }
                        return next;
                    });
                    createExplosion(h.x, h.y, '#f87171', 25);
                }
                return false;
            }
            return h.y < window.innerHeight + 250 && h.health > 0;
        });

        // PowerUps
        if (frameCount.current % 500 === 0) {
            const pRoll = Math.random();
            let pType: PowerUp['type'] = 'weapon_plasma';
            if (pRoll > 0.8) pType = 'weapon_burst';
            else if (pRoll > 0.6) pType = 'shield';
            else if (pRoll > 0.4) pType = 'multiplier';
            else if (pRoll > 0.2) pType = 'repair';

            powerUps.current.push({
                id: Date.now(),
                x: 100 + Math.random() * (window.innerWidth - 200),
                y: -50,
                type: pType,
                speed: speed * 0.85,
                pulse: 0
            });
        }

        powerUps.current = powerUps.current.filter(pw => {
            pw.y += pw.speed * dt;
            pw.pulse += 0.1 * dt;
            const pdx = pw.x - p.x;
            const pdy = pw.y - p.y;
            const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
            if (pdist < 45) {
                if (pw.type === 'shield') setShield(100);
                if (pw.type === 'repair') setHull(h => Math.min(100, h + 25));
                if (pw.type === 'multiplier') scoreRef.current += 1000 * newMultiplier;
                if (pw.type === 'weapon_plasma') setWeaponMode('plasma');
                if (pw.type === 'weapon_burst') setWeaponMode('burst');
                return false;
            }
            return pw.y < window.innerHeight + 100;
        });

        scoreRef.current += (speed / 5) * newMultiplier * dt;
        setScore(Math.floor(scoreRef.current));
    }, [speed, username, addScore, shield, weaponMode, overdrive]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = '#010103';
        ctx.fillRect(0, 0, w, h);

        const sx = (Math.random() - 0.5) * shake.current;
        const sy = (Math.random() - 0.5) * shake.current;
        ctx.save();
        ctx.translate(sx, sy);

        particles.current.forEach(p => {
            if (p.opacity < 1) { // Explosion
                p.x += p.speed * 0.5;
                p.y += p.speed * 0.5;
                p.opacity -= 0.02;
            } else {
                const parallax = overdrive >= 100 ? 5 : 1;
                p.y += p.speed * parallax * (speed / 20);
                if (p.y > h) { p.y = 0; p.x = Math.random() * w; }
            }
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.opacity);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
        particles.current = particles.current.filter(p => p.opacity > 0);

        projectiles.current.forEach(p => {
            ctx.save(); ctx.translate(p.x, p.y);
            ctx.shadowBlur = 10; ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            if (p.type === 'plasma') ctx.arc(0, 0, 4, 0, Math.PI * 2);
            else ctx.rect(-2, -6, 4, 12);
            ctx.fill(); ctx.restore();
        });

        hazards.current.forEach(ha => {
            ctx.save(); ctx.translate(ha.x, ha.y); ctx.rotate(ha.angle);
            if (ha.type === 'blackhole') {
                const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ha.size / 2);
                g.addColorStop(0, '#000'); g.addColorStop(0.6, '#000');
                g.addColorStop(0.8, overdrive === 100 ? '#ec4899' : '#8b5cf6');
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, ha.size / 2, 0, Math.PI * 2); ctx.fill();
            } else if (ha.type === 'wall') {
                ctx.fillStyle = 'rgba(139, 92, 246, 0.1)'; ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 2;
                ctx.beginPath(); const side = ha.x === 0 ? 0 : -ha.size;
                ctx.rect(side, -ha.size / 2, ha.size, ha.size); ctx.fill(); ctx.stroke();
            } else if (ha.type === 'nova') {
                ctx.shadowBlur = 15; ctx.shadowColor = '#ec4899'; ctx.fillStyle = '#fff';
                ctx.beginPath(); for (let i = 0; i < 12; i++) { const r = i % 2 === 0 ? ha.size / 2 : ha.size / 4; ctx.rotate(Math.PI / 6); ctx.lineTo(r, 0); }
                ctx.closePath(); ctx.fill();
            } else {
                ctx.fillStyle = '#111'; ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
                ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const r = ha.size / 2 * (0.8 + Math.random() * 0.2); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
                ctx.closePath(); ctx.fill(); ctx.stroke();
            }
            ctx.restore();
        });

        powerUps.current.forEach(pw => {
            ctx.save(); ctx.translate(pw.x, pw.y);
            const s = 25 + Math.sin(pw.pulse) * 5;
            const color = pw.type === 'shield' ? '#3b82f6' : (pw.type === 'repair' ? '#10b981' : (pw.type === 'multiplier' ? '#ec4899' : '#0ea5e9'));
            ctx.shadowBlur = 20; ctx.shadowColor = color; ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });

        const sp = shipPos.current;
        ctx.save(); ctx.translate(sp.x, sp.y); ctx.rotate(sp.rotation * (Math.PI / 180));
        if (shield > 0) {
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)'; ctx.lineWidth = 2; ctx.shadowBlur = 15;
            ctx.shadowColor = '#3b82f6'; ctx.beginPath(); ctx.arc(0, 0, 55, 0, Math.PI * 2); ctx.stroke();
        }
        const tw = 14 + Math.sin(frameCount.current * 0.4) * 6;
        const eGrad = ctx.createLinearGradient(0, 20, 0, 80);
        eGrad.addColorStop(0, overdrive === 100 ? '#f59e0b' : '#f43f5e'); eGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = eGrad; ctx.shadowBlur = 20; ctx.shadowColor = overdrive === 100 ? '#f59e0b' : '#f43f5e';
        ctx.beginPath(); ctx.moveTo(-tw, 20); ctx.lineTo(0, 75); ctx.lineTo(tw, 20); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff'; ctx.beginPath();
        ctx.moveTo(0, -35); ctx.lineTo(25, 25); ctx.lineTo(0, 15); ctx.lineTo(-25, 25); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#0ea5e9'; ctx.beginPath(); ctx.ellipse(0, -5, 7, 13, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        ctx.restore();
        requestRef.current = requestAnimationFrame(updateAndDraw);
    }, [shield, overdrive, speed]);

    const updateAndDraw = useCallback((ts: number) => {
        update(ts);
        draw();
    }, [update, draw]);

    useEffect(() => {
        const c = canvasRef.current;
        if (c) { c.width = window.innerWidth; c.height = window.innerHeight; }
        requestRef.current = requestAnimationFrame(updateAndDraw);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [updateAndDraw]);

    return (
        <div className={cn("fixed inset-0 z-[100] bg-[#020205] overflow-hidden select-none", gameState === 'playing' ? "cursor-none" : "cursor-default")}>
            <canvas ref={canvasRef} className="absolute inset-0" />
            <div className="absolute top-0 left-0 w-full p-10 flex justify-between items-start z-[110] pointer-events-none">
                <div className="flex gap-10 pointer-events-auto">
                    <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black mb-2">Vector Speed</p>
                        <p className="text-4xl font-black italic tracking-tighter text-primary-custom">{(speed * 12).toFixed(0)}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-6 pointer-events-auto">
                    <div className="text-right">
                        <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black mb-2">Neural Score</p>
                        <p className="text-6xl font-black italic tracking-tighter text-gradient leading-none">{score.toLocaleString()}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onExit(); }} className="glass-card px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-white/10 transition-all border-white/5 active:scale-95">
                        <LogOut size={14} className="text-red-500" /> Disengage
                    </button>
                </div>
            </div>

            <div className="absolute left-10 top-1/2 -translate-y-1/2 space-y-10 z-[110] pointer-events-none">
                <div className="space-y-4">
                    <p className="text-[10px] text-white/40 uppercase tracking-[0.5em] font-black flex items-center gap-2"><HardDrive size={14} className="text-emerald-500" /> Hull Integrity</p>
                    <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
                        <div className={cn("h-full transition-all duration-300", hull < 30 ? "bg-red-500" : "bg-emerald-500")} style={{ width: `${hull}%` }} />
                    </div>
                </div>
                <div className="space-y-4">
                    <p className="text-[10px] text-white/40 uppercase tracking-[0.5em] font-black flex items-center gap-2"><Shield size={14} className="text-blue-400" /> Shield Buffer</p>
                    <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/10">
                        <div className="h-full bg-blue-500 shadow-[0_0_15px_#3b82f6] transition-all duration-300" style={{ width: `${shield}%` }} />
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {gameState === 'game_over' && (
                    <motion.div initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center pointer-events-auto">
                        <Bomb size={100} className="text-red-500 mb-8 opacity-20" />
                        <h3 className="text-8xl font-black text-white italic capitalize">Link Failed</h3>
                        <div className="grid grid-cols-2 gap-20 my-16">
                            <div><p className="text-[10px] text-white/30 uppercase tracking-widest font-black mb-1">Final Score</p><p className="text-6xl font-black italic text-white">{score.toLocaleString()}</p></div>
                        </div>
                        <div className="flex gap-6">
                            <button onClick={(e) => { e.stopPropagation(); setGameState('playing'); setHull(100); setScore(0); scoreRef.current = 0; hazards.current = []; powerUps.current = []; lastTime.current = performance.now(); }} className="px-16 py-6 bg-white text-black rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-sm shadow-xl hover:scale-105 transition-all">Re-link</button>
                            <button onClick={(e) => { e.stopPropagation(); onExit(); }} className="px-12 py-6 glass-card text-white rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-xs transition-all hover:bg-white/10">Nexus</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
