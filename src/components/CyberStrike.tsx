'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, LogOut, Cpu, Zap, Activity, ShieldX, Database, Code, Lock, Unlock, Eye } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { cn } from '@/lib/utils';

interface CyberStrikeProps {
    username: string;
    onExit: () => void;
}

interface Sentinel {
    x: number;
    y: number;
    dir: 'h' | 'v';
    vel: number;
}

interface Node {
    x: number;
    y: number;
    type: 'empty' | 'data' | 'wall' | 'exit';
    id: string;
}

export default function CyberStrike({ username, onExit }: CyberStrikeProps) {
    const [gameState, setGameState] = useState<'playing' | 'game_over' | 'complete'>('playing');
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [detection, setDetection] = useState(0);
    const [shake, setShake] = useState(0);
    const [isGlitching, setIsGlitching] = useState(false);
    const { addScore } = useLeaderboard('cyber-strike-v2');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const player = useRef({ x: 2, y: 2, targetX: 2, targetY: 2 });
    const grid = useRef<Node[][]>([]);
    const sentinels = useRef<Sentinel[]>([]);
    const requestRef = useRef<number>(null);
    const frameCount = useRef(0);
    const gameStateRef = useRef(gameState);

    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

    const initLevel = useCallback((lvl: number) => {
        const size = 12;
        const newGrid: Node[][] = [];
        for (let y = 0; y < size; y++) {
            const row: Node[] = [];
            for (let x = 0; x < size; x++) {
                let type: Node['type'] = 'empty';
                if (Math.random() < 0.15 && x > 2 && y > 2) type = 'wall';
                else if (Math.random() < 0.08) type = 'data';
                row.push({ x, y, type, id: `${x}-${y}` });
            }
            newGrid.push(row);
        }
        newGrid[11][11].type = 'exit';
        newGrid[2][2].type = 'empty';
        grid.current = newGrid;

        // Spawn Sentinels
        sentinels.current = [];
        for (let i = 0; i < Math.min(6, 2 + lvl); i++) {
            sentinels.current.push({
                x: 4 + Math.random() * 6,
                y: 4 + Math.random() * 6,
                dir: Math.random() > 0.5 ? 'h' : 'v',
                vel: (0.02 + Math.random() * 0.03) * (1 + lvl * 0.1)
            });
        }

        player.current = { x: 2, y: 2, targetX: 2, targetY: 2 };
        setDetection(0);
        setGameState('playing');
    }, []);

    useEffect(() => { initLevel(1); }, [initLevel]);

    const handleMove = useCallback((dx: number, dy: number) => {
        if (gameStateRef.current !== 'playing') return;
        const p = player.current;
        const nx = Math.round(p.targetX + dx);
        const ny = Math.round(p.targetY + dy);

        if (nx >= 0 && nx < 12 && ny >= 0 && ny < 12) {
            if (grid.current[ny][nx].type !== 'wall') {
                p.targetX = nx;
                p.targetY = ny;
            }
        }
    }, []);

    const update = useCallback((ts: number) => {
        if (gameStateRef.current !== 'playing') return;
        frameCount.current++;

        const p = player.current;
        p.x += (p.targetX - p.x) * 0.3;
        p.y += (p.targetY - p.y) * 0.3;

        // Sentinel Movement & Collision
        sentinels.current.forEach(s => {
            if (s.dir === 'h') {
                s.x += s.vel;
                if (s.x > 11 || s.x < 0) s.vel *= -1;
            } else {
                s.y += s.vel;
                if (s.y > 11 || s.y < 0) s.vel *= -1;
            }

            // Detection Check
            const dist = Math.sqrt((s.x - p.x) ** 2 + (s.y - p.y) ** 2);
            if (dist < 1.5) {
                setShake(s => Math.min(15, s + 2));
                setDetection(d => {
                    const next = d + (1.5 - dist) * 2;
                    if (next >= 100) {
                        setGameState('game_over');
                        addScore(username, score);
                        setIsGlitching(true);
                        setShake(40);
                    }
                    return next;
                });
            }
        });

        if (shake > 0) setShake(s => Math.max(0, s - 0.8));

        // Slow detection decay
        setDetection(d => Math.max(0, d - 0.2));

        // Node Interaction
        const ix = Math.round(p.x);
        const iy = Math.round(p.y);
        const node = grid.current[iy]?.[ix];
        if (node) {
            if (node.type === 'data') {
                node.type = 'empty';
                setScore(s => s + 500);
            } else if (node.type === 'exit' && distTo(p.x, p.y, 11, 11) < 0.2) {
                setGameState('complete');
                setScore(s => s + 2000);
                setTimeout(() => {
                    setLevel(l => {
                        const nl = l + 1;
                        initLevel(nl);
                        return nl;
                    });
                }, 1500);
            }
        }

        draw();
        requestRef.current = requestAnimationFrame(update);
    }, [score, username, addScore, initLevel]);

    const distTo = (x1: number, y1: number, x2: number, y2: number) => Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = window.innerWidth, h = window.innerHeight;
        canvas.width = w; canvas.height = h;
        const cx = w / 2, cy = h / 2;
        const cellSize = Math.min(w, h) / 16;
        const offsetX = cx - (6 * cellSize);
        const offsetY = cy - (6 * cellSize);

        ctx.fillStyle = '#020205';
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        if (shake > 0) {
            ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        }

        // Cyber Grid Floor
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)';
        for (let i = 0; i < 13; i++) {
            ctx.beginPath(); ctx.moveTo(offsetX + i * cellSize, offsetY); ctx.lineTo(offsetX + i * cellSize, offsetY + 12 * cellSize); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(offsetX, offsetY + i * cellSize); ctx.lineTo(offsetX + 12 * cellSize, offsetY + i * cellSize); ctx.stroke();
        }

        // Draw Nodes
        grid.current.forEach((row, y) => {
            row.forEach((node, x) => {
                const nx = offsetX + x * cellSize + cellSize / 2;
                const ny = offsetY + y * cellSize + cellSize / 2;

                if (node.type === 'wall') {
                    ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
                    ctx.fillRect(nx - cellSize / 2 + 2, ny - cellSize / 2 + 2, cellSize - 4, cellSize - 4);
                    ctx.strokeStyle = '#06b6d4';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(nx - cellSize / 2 + 5, ny - cellSize / 2 + 5, cellSize - 10, cellSize - 10);
                } else if (node.type === 'data') {
                    ctx.shadowBlur = 10; ctx.shadowColor = '#10b981';
                    ctx.fillStyle = '#10b981';
                    ctx.beginPath(); ctx.arc(nx, ny, 5 + Math.sin(frameCount.current * 0.1) * 2, 0, Math.PI * 2); ctx.fill();
                } else if (node.type === 'exit') {
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(nx - 15, ny - 15, 30, 30);
                    ctx.beginPath(); ctx.arc(nx, ny, 20 + Math.sin(frameCount.current * 0.2) * 5, 0, Math.PI * 2); ctx.stroke();
                }
            });
        });

        // Sentinels (Scan Cones)
        sentinels.current.forEach(s => {
            const sx = offsetX + s.x * cellSize + cellSize / 2;
            const sy = offsetY + s.y * cellSize + cellSize / 2;

            ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
            ctx.beginPath(); ctx.arc(sx, sy, cellSize * 1.5, 0, Math.PI * 2); ctx.fill();

            ctx.shadowBlur = 15; ctx.shadowColor = '#ef4444';
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI * 2); ctx.fill();
        });

        // Player
        const px = offsetX + player.current.x * cellSize + cellSize / 2;
        const py = offsetY + player.current.y * cellSize + cellSize / 2;
        ctx.shadowBlur = 20; ctx.shadowColor = '#06b6d4';
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.moveTo(px, py - 12); ctx.lineTo(px + 10, py + 8); ctx.lineTo(px - 10, py + 8);
        ctx.fill();

        ctx.restore();
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(update);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [update]);

    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') handleMove(-1, 0);
            if (e.code === 'ArrowRight' || e.code === 'KeyD') handleMove(1, 0);
            if (e.code === 'ArrowUp' || e.code === 'KeyW') handleMove(0, -1);
            if (e.code === 'ArrowDown' || e.code === 'KeyS') handleMove(0, 1);
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [handleMove]);

    const restart = () => {
        setScore(0); setLevel(1); setDetection(0); setIsGlitching(false);
        initLevel(1);
    };

    return (
        <div className={cn(
            "fixed inset-0 z-[100] bg-black overflow-hidden select-none",
            isGlitching && "animate-glitch"
        )}>
            <canvas ref={canvasRef} className="absolute inset-0 block" />

            {/* CYBER HUD */}
            <div className="absolute top-0 left-0 w-full p-10 flex justify-between items-start pointer-events-none z-[110]">
                <div className="flex flex-col gap-6 pointer-events-auto">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 glass-panel border-cyan-400/30 rounded-2xl flex items-center justify-center text-cyan-400 neon-glow-sm">
                            <Terminal />
                        </div>
                        <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black">Operator {username}</p>
                            <h2 className="text-3xl font-black tracking-tighter italic text-cyan-400">CYBER STRIKE</h2>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-white/30 px-1">
                            <span>Signal Exposure</span>
                            <span className={cn(detection > 70 && "text-red-500 animate-pulse")}>{Math.floor(detection)}%</span>
                        </div>
                        <div className="w-56 h-2 bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
                            <motion.div
                                animate={{ width: `${detection}%`, backgroundColor: detection > 60 ? '#ef4444' : '#06b6d4' }}
                                className="h-full rounded-full shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-6 pointer-events-auto">
                    <div className="glass-panel px-10 py-6 rounded-[2.5rem] border-cyan-500/20 bg-black/60 text-right">
                        <p className="text-[10px] text-white/30 uppercase tracking-[0.6em] font-black mb-1">Extracted Data</p>
                        <p className="text-5xl font-black italic tracking-tighter text-white leading-none">
                            {score.toLocaleString()}
                        </p>
                        <div className="mt-4 flex justify-end gap-4 text-[9px] font-black uppercase tracking-widest text-white/20">
                            <div className="flex items-center gap-1"><Cpu size={10} /> LAYER 0{level}</div>
                            <div className="flex items-center gap-1"><Activity size={10} /> STABLE</div>
                        </div>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onExit(); }}
                        className="glass-card px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 hover:bg-white/10 transition-all border-white/10 text-white/40"
                    >
                        <LogOut size={16} className="text-red-500" /> Abort Mission
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {gameState === 'complete' && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-[200] bg-cyan-900/20 backdrop-blur-xl flex flex-col items-center justify-center pointer-events-none">
                        <Unlock size={80} className="text-white mb-8 animate-bounce" />
                        <h3 className="text-8xl font-black text-white italic">GATEWAY BYPASSED</h3>
                        <p className="text-cyan-400 font-black uppercase tracking-[0.8em]">Advancing to next Node Layer...</p>
                    </motion.div>
                )}

                {gameState === 'game_over' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[300] bg-red-950/98 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center">
                        <Eye size={80} className="text-red-500 mb-12" />
                        <h3 className="text-9xl font-black text-white mb-6 uppercase tracking-tighter italic">TRACED & TERMINATED</h3>
                        <p className="text-red-500/60 font-black uppercase tracking-[0.6em] text-sm mb-20">Ghost Protocol Nullified</p>

                        <div className="flex gap-20 mb-24">
                            <div className="text-center">
                                <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mb-2">Data Salvaged</p>
                                <p className="text-7xl font-black italic tracking-tighter text-cyan-400">{score.toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mb-2">Max Depth</p>
                                <p className="text-7xl font-black italic tracking-tighter text-white">0{level}</p>
                            </div>
                        </div>

                        <div className="flex gap-8">
                            <button onClick={(e) => { e.stopPropagation(); restart(); }} className="px-24 py-8 bg-white text-black rounded-[3rem] font-black uppercase tracking-[0.5em] text-sm shadow-[0_20px_80px_rgba(255,255,255,0.2)] transition-all hover:scale-105 active:scale-95">Re-Inject Ghost Code</button>
                            <button onClick={(e) => { e.stopPropagation(); onExit(); }} className="px-16 py-8 glass-card text-white rounded-[3rem] font-black uppercase tracking-[0.5em] text-xs transition-all hover:bg-white/10 border-white/10">Return to Nexus</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-[110] text-center opacity-30">
                <p className="text-[11px] font-black uppercase tracking-[0.7em] italic">Avoid Sentinel Scan Cones</p>
                <div className="flex items-center gap-6">
                    <Code size={18} />
                    <Lock size={18} />
                    <Database size={18} />
                </div>
            </div>
        </div>
    );
}
