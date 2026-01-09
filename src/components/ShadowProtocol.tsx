'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Shield, Fingerprint, Eye, Zap, Database, AlertTriangle, CheckCircle2, Terminal, Info, Map as MapIcon, Target } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { cn } from '@/lib/utils';

interface ShadowProtocolProps {
    username: string;
    onExit: () => void;
}

interface EvidenceNode {
    id: number;
    x: number;
    y: number;
    value: number;
    isCulprit: boolean;
    heat: number; // 0 to 1 distance representation
    status: 'hidden' | 'scanned' | 'identified';
    pulse: number;
}

export default function ShadowProtocol({ username, onExit }: ShadowProtocolProps) {
    const [gameState, setGameState] = useState<'briefing' | 'playing' | 'solved' | 'failed'>('briefing');
    const [score, setScore] = useState(0);
    const [scansLeft, setScansLeft] = useState(5);
    const [level, setLevel] = useState(1);
    const [nodes, setNodes] = useState<EvidenceNode[]>([]);
    const [message, setMessage] = useState<string>("INITIALIZING NEURAL LINK...");
    const [shake, setShake] = useState(0);
    const { addScore } = useLeaderboard('shadow-protocol-v1');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameCount = useRef(0);

    const initLevel = useCallback((lvl: number) => {
        const nodeCount = 8 + lvl * 2;
        const newNodes: EvidenceNode[] = [];
        const culpritIndex = Math.floor(Math.random() * nodeCount);

        const w = window.innerWidth;
        const h = window.innerHeight;

        for (let i = 0; i < nodeCount; i++) {
            newNodes.push({
                id: i,
                x: 200 + Math.random() * (w - 400),
                y: 200 + Math.random() * (h - 400),
                value: Math.floor(Math.random() * 100),
                isCulprit: i === culpritIndex,
                heat: 0,
                status: 'hidden',
                pulse: Math.random() * Math.PI * 2
            });
        }

        // Calculate heat for each node based on distance to culprit
        const culprit = newNodes[culpritIndex];
        newNodes.forEach(node => {
            const dist = Math.sqrt(Math.pow(node.x - culprit.x, 2) + Math.pow(node.y - culprit.y, 2));
            const maxDist = Math.sqrt(w * w + h * h);
            node.heat = 1 - (dist / (maxDist * 0.4)); // Heat is higher when closer
        });

        setNodes(newNodes);
        setScansLeft(Math.max(3, 7 - Math.floor(lvl / 2)));
        setGameState('playing');
        setMessage(`CASE #${lvl}: TRACE THE HIDDEN SIGNAL`);
    }, []);

    const handleNodeClick = (id: number) => {
        if (gameState !== 'playing') return;

        const updatedNodes = [...nodes];
        const node = updatedNodes.find(n => n.id === id);
        if (!node || node.status !== 'hidden') return;

        if (scansLeft > 0) {
            node.status = 'scanned';
            setScansLeft(prev => prev - 1);
            setShake(5);
            setMessage(node.isCulprit ? "TARGET SIGNAL DETECTED!" : "SIGNAL HEAT ANALYZED.");
        }
    };

    const identifyCulprit = (id: number) => {
        if (gameState !== 'playing') return;

        const node = nodes.find(n => n.id === id);
        if (!node) return;

        if (node.isCulprit) {
            setGameState('solved');
            const levelBonus = level * 1000;
            const scanBonus = scansLeft * 500;
            setScore(prev => prev + levelBonus + scanBonus);
            setShake(15);
            setMessage("SUBJECT IDENTIFIED. ACCESS GRANTED.");
            setTimeout(() => {
                setLevel(l => l + 1);
                initLevel(level + 1);
            }, 2000);
        } else {
            setGameState('failed');
            setShake(30);
            setMessage("FALSE IDENTIFICATION. SYSTEM LOCKDOWN.");
            addScore(username, score);
        }
    };

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = window.innerWidth, h = window.innerHeight;
        canvas.width = w; canvas.height = h;

        // Background: Deep Noir
        const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w);
        bgGrad.addColorStop(0, '#020617');
        bgGrad.addColorStop(1, '#000000');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Scanlines / Noise
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.03)';
        ctx.lineWidth = 1;
        for (let i = 0; i < h; i += 4) {
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
        }

        // Apply Shake
        if (shake > 0) {
            ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        }

        // Draw Links between scanned nodes
        ctx.setLineDash([5, 15]);
        ctx.lineWidth = 1;
        nodes.filter(n => n.status === 'scanned').forEach((n1, i) => {
            nodes.filter(n => n.status === 'scanned').slice(i + 1).forEach(n2 => {
                const dist = Math.sqrt(Math.pow(n1.x - n2.x, 2) + Math.pow(n1.y - n2.y, 2));
                if (dist < 400) {
                    ctx.strokeStyle = `rgba(6, 182, 212, ${0.2 * n1.heat * n2.heat})`;
                    ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y); ctx.stroke();
                }
            });
        });
        ctx.setLineDash([]);

        // Draw Nodes
        nodes.forEach(node => {
            const p = Math.sin(frameCount.current * 0.05 + node.pulse);

            // Outer Aura
            if (node.status === 'scanned') {
                const auraSize = 40 + p * 10;
                const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, auraSize);
                const heatColor = node.heat > 0.8 ? '236, 72, 153' : (node.heat > 0.5 ? '168, 85, 247' : '6, 182, 212');
                grad.addColorStop(0, `rgba(${heatColor}, 0.3)`);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.arc(node.x, node.y, auraSize, 0, Math.PI * 2); ctx.fill();
            }

            // Core Node
            ctx.shadowBlur = node.status === 'scanned' ? 20 : 5;
            ctx.shadowColor = node.status === 'scanned' ? '#06b6d4' : 'rgba(255,255,255,0.1)';

            if (node.status === 'scanned') {
                ctx.fillStyle = node.heat > 0.8 ? '#ec4899' : (node.heat > 0.5 ? '#a855f7' : '#06b6d4');
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            }

            ctx.beginPath();
            ctx.arc(node.x, node.y, 10 + p * 2, 0, Math.PI * 2);
            ctx.fill();

            // Label if scanned
            if (node.status === 'scanned') {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`HEAT: ${(node.heat * 100).toFixed(0)}%`, node.x, node.y + 30);
            }
        });

        if (shake > 0) setShake(s => Math.max(0, s - 1));
        frameCount.current++;
        requestAnimationFrame(draw);
    }, [nodes, shake]);

    useEffect(() => {
        if (gameState === 'playing') {
            const handleResize = () => {
                if (canvasRef.current) {
                    canvasRef.current.width = window.innerWidth;
                    canvasRef.current.height = window.innerHeight;
                }
            };
            window.addEventListener('resize', handleResize);
            const anim = requestAnimationFrame(draw);
            return () => {
                window.removeEventListener('resize', handleResize);
                cancelAnimationFrame(anim);
            };
        }
    }, [gameState, draw]);

    const startGame = () => {
        setGameState('playing');
        initLevel(1);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black overflow-hidden select-none font-mono">
            <canvas ref={canvasRef} className="absolute inset-0 block" />

            {/* NEON NOIR HUD */}
            <div className="absolute top-0 left-0 w-full p-10 flex justify-between items-start pointer-events-none z-[110]">
                <div className="flex flex-col gap-6 pointer-events-auto">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 glass-panel border-cyan-500/30 rounded-2xl flex items-center justify-center text-cyan-500 neon-glow-sm">
                            <Fingerprint className="animate-pulse" />
                        </div>
                        <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black italic">Operative {username}</p>
                            <h2 className="text-3xl font-black tracking-tighter text-white">SHADOW PROTOCOL</h2>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="glass-panel px-6 py-3 rounded-xl border-cyan-500/20 flex items-center gap-3">
                            <Database size={14} className="text-cyan-400" />
                            <span className="text-xs font-bold text-white/60 uppercase">LEVEL {level}</span>
                        </div>
                        <div className="glass-panel px-6 py-3 rounded-xl border-pink-500/20 flex items-center gap-3">
                            <Eye size={14} className="text-pink-400" />
                            <span className="text-xs font-bold text-white/60 uppercase">SCANS: {scansLeft}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-6 pointer-events-auto">
                    <div className="glass-panel px-10 py-6 rounded-[2.5rem] border-cyan-500/20 bg-black/60 text-right">
                        <p className="text-[10px] text-white/30 uppercase tracking-[0.6em] font-black mb-1">Neural Credibility</p>
                        <p className="text-5xl font-black italic tracking-tighter text-cyan-400 leading-none">{score.toLocaleString()}</p>
                    </div>
                    <button onClick={onExit} className="glass-card px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-red-400 transition-colors">
                        Terminate Link
                    </button>
                </div>
            </div>

            {/* ANALYTICS OVERLAY */}
            <div className="absolute bottom-10 left-10 w-80 glass-panel border-cyan-500/10 p-6 rounded-3xl z-[110] pointer-events-none opacity-50">
                <div className="flex items-center gap-3 mb-4">
                    <Terminal size={14} className="text-cyan-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Digital Forensics</span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed italic">
                    {message}
                </p>
                <div className="mt-6 flex flex-col gap-2">
                    <div className="h-1 bg-white/5 w-full rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 2, repeat: Infinity }} className="h-full bg-cyan-500/40" />
                    </div>
                    <p className="text-[8px] text-white/20 uppercase tracking-tighter">Scanning Neural Pathways...</p>
                </div>
            </div>

            {/* INTERACTION LAYER */}
            {gameState === 'playing' && (
                <div className="absolute inset-0 z-[105]">
                    {nodes.map(node => (
                        <div
                            key={node.id}
                            style={{ left: node.x - 25, top: node.y - 25 }}
                            className="absolute w-[50px] h-[50px] cursor-crosshair group"
                        >
                            <div
                                onClick={() => handleNodeClick(node.id)}
                                onContextMenu={(e) => { e.preventDefault(); identifyCulprit(node.id); }}
                                className="w-full h-full rounded-full flex items-center justify-center"
                            >
                                <div className="hidden group-hover:flex absolute -inset-2 border border-cyan-500/20 rounded-full animate-spin-slow" />
                                <div className="hidden group-hover:flex flex-col gap-1 absolute top-full mt-2 bg-black/80 backdrop-blur px-2 py-1 rounded border border-white/5 pointer-events-none">
                                    <span className="text-[7px] font-black text-cyan-400 uppercase">Left Click: Scan</span>
                                    <span className="text-[7px] font-black text-pink-500 uppercase">Right Click: Identify</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {gameState === 'briefing' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center">
                        <Fingerprint size={80} className="text-cyan-500 mb-12 animate-pulse" />
                        <h3 className="text-7xl font-black text-white mb-6 uppercase tracking-tighter italic">SHADOW PROTOCOL</h3>
                        <p className="text-cyan-500/60 font-black uppercase tracking-[0.6em] text-sm mb-12 max-w-xl leading-relaxed">
                            A neural suspect is hiding in this data cluster. Scrutinize the heat signatures of data nodes to triangulate their position.
                        </p>

                        <div className="grid grid-cols-2 gap-8 mb-16 text-left">
                            <div className="glass-panel p-6 rounded-3xl border-white/5 max-w-[300px]">
                                <h4 className="flex items-center gap-2 text-cyan-400 text-xs font-black mb-3">
                                    <Search size={14} /> SCAN NODES
                                </h4>
                                <p className="text-[10px] text-white/40 leading-relaxed uppercase tracking-widest">Analyze a node to reveal its proximity to the target. Higher heat means closer distance.</p>
                            </div>
                            <div className="glass-panel p-6 rounded-3xl border-white/5 max-w-[300px]">
                                <h4 className="flex items-center gap-2 text-pink-500 text-xs font-black mb-3">
                                    <Target size={14} /> IDENTIFY TARGET
                                </h4>
                                <p className="text-[10px] text-white/40 leading-relaxed uppercase tracking-widest">Right-click the node you believe is the culprit. One wrong move and the system locks down.</p>
                            </div>
                        </div>

                        <button onClick={startGame} className="px-24 py-8 bg-cyan-500 text-black rounded-[3rem] font-black uppercase tracking-[0.5em] text-sm shadow-[0_20px_80px_rgba(6,182,212,0.4)] transition-all hover:scale-105 active:scale-95">Initiate Trace</button>
                    </motion.div>
                )}

                {gameState === 'failed' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[250] bg-black/98 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center">
                        <AlertTriangle size={80} className="text-red-500 mb-12 animate-bounce" />
                        <h3 className="text-8xl font-black text-white mb-6 uppercase tracking-tighter italic">LINK TERMINATED</h3>
                        <p className="text-red-500/60 font-black uppercase tracking-[0.6em] text-sm mb-20">False Identification Detected. Neural Signature Purged.</p>

                        <div className="text-center mb-24">
                            <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mb-2">Final Neural Score</p>
                            <p className="text-8xl font-black italic tracking-tighter text-white">{score.toLocaleString()}</p>
                        </div>

                        <div className="flex gap-8">
                            <button onClick={startGame} className="px-24 py-8 bg-white text-black rounded-[3rem] font-black uppercase tracking-[0.5em] text-sm shadow-[0_20px_80px_rgba(255,255,255,0.2)] transition-all hover:scale-105 active:scale-95">Re-establish Link</button>
                            <button onClick={onExit} className="px-16 py-8 glass-card text-white rounded-[3rem] font-black uppercase tracking-[0.5em] text-xs transition-all hover:bg-white/10 border-white/10">Abort to Nexus</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* DECORATIVE CORNERS */}
            <div className="absolute bottom-10 right-10 flex gap-6 text-white/10 italic text-[10px] font-black tracking-widest pointer-events-none">
                <span className="flex items-center gap-2"><CheckCircle2 size={12} /> ENCRYPTION VERIFIED</span>
                <span className="flex items-center gap-2"><MapIcon size={12} /> NEURAL TOPOGRAPHY ACTIVE</span>
            </div>
        </div>
    );
}
