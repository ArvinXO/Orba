'use client';

import { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Background } from '@/components/Background';
import PerspectivePrismFull from '@/components/PerspectivePrismFull';
import NebulaDrift from '@/components/NebulaDrift';
import EchoRealm from '@/components/EchoRealm';
import ZenVoid from '@/components/ZenVoid';
import SolarFlare from '@/components/SolarFlare';
import CyberStrike from '@/components/CyberStrike';
import GravityWell from '@/components/GravityWell';
import PolicePowers from '@/components/PolicePowers';
import { Leaderboard } from '@/components/Leaderboard';
import { Sparkles, Orbit, Zap, Trophy, Gamepad2, Play, Users, Cpu, Shield, ArrowRight, Ship } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameCardProps {
  id: string;
  title: string;
  description: string;
  image: string;
  players: string;
  color: string;
  locked?: boolean;
  onClick: () => void;
}

const GameCard = ({ title, description, image, players, color, locked, onClick }: GameCardProps) => {
  const x = typeof window !== 'undefined' ? useMotionValue(0) : 0;
  const y = typeof window !== 'undefined' ? useMotionValue(0) : 0;

  const rotateX = useTransform(y as any, [-100, 100], [15, -15]);
  const rotateY = useTransform(x as any, [-100, 100], [-15, 15]);

  const handleMouseMove = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    (x as any).set(event.clientX - centerX);
    (y as any).set(event.clientY - centerY);
  };

  const handleMouseLeave = () => {
    (x as any).set(0);
    (y as any).set(0);
  };

  return (
    <motion.div
      style={{
        perspective: 1000,
        rotateX,
        rotateY,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ y: -10, scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      onClick={!locked ? onClick : undefined}
      className={cn(
        "group relative aspect-[4/5] rounded-[2.5rem] overflow-hidden cursor-pointer bg-black/40 border border-white/5 transition-shadow duration-300",
        locked && "cursor-not-allowed grayscale",
        !locked && "hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      )}
    >
      {/* 3D Depth Elements */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
      </div>

      {/* Gradient Overlay */}
      <div
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent z-10"
      />

      {/* Game Image Background */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
        style={{ backgroundImage: `url(${image})` }}
      />

      {/* Hover Accent */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500"
        style={{ background: color }}
      />

      {/* Content */}
      <div className="absolute inset-0 z-20 p-8 flex flex-col justify-end">
        <div className="space-y-3 translate-y-4 group-hover:translate-y-0 transition-transform duration-500" style={{ transformStyle: 'preserve-3d' }}>
          <div className="flex items-center justify-between" style={{ transform: 'translateZ(30px)' }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">
                {players} Active
              </span>
            </div>
            {locked && <Shield size={14} className="text-white/20" />}
          </div>

          <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none" style={{ transform: 'translateZ(50px)' }}>
            {title}
          </h3>

          <p className="text-sm text-white/40 font-medium leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100" style={{ transform: 'translateZ(20px)' }}>
            {description}
          </p>

          <div className="pt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary-custom" style={{ transform: 'translateZ(40px)' }}>
            {locked ? "Locked" : "Initialize System"}
            <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function Home() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [username, setUsername] = useState('Player 1');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('orba_username');
    if (saved) setUsername(saved);
  }, []);

  const handleStartGame = (id: string) => {
    localStorage.setItem('orba_username', username);
    setActiveGame(id);
  };

  if (!mounted) return null;

  return (
    <main className="relative min-h-screen bg-[#020205] text-white selection:bg-primary-custom selection:text-white">
      <AnimatePresence mode="wait">
        {!activeGame ? (
          <motion.div
            key="gallery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
            className="relative min-h-screen flex flex-col pt-12 pb-24"
          >
            {/* 3D Background Layer */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
              <Canvas camera={{ position: [0, 0, 5], fov: 75 }} gl={{ antialias: false, powerPreference: 'high-performance' }}>
                <Suspense fallback={null}>
                  <Background />
                </Suspense>
              </Canvas>
            </div>

            {/* Content Layer */}
            <div className="relative z-10 max-w-7xl mx-auto w-full px-6">
              {/* Header */}
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-20">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary-custom rounded-2xl flex items-center justify-center neon-glow-sm">
                    <Orbit className="text-white w-8 h-8" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black tracking-tighter italic leading-none">ORBA</h1>
                    <span className="text-[9px] uppercase tracking-[0.5em] text-white/30 font-bold">Neural Arcade v2.5</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <div className="group flex flex-col gap-2 min-w-[240px]">
                    <label className="text-[9px] uppercase tracking-[0.4em] font-black text-white/20 ml-1">Identity Tag</label>
                    <div className="relative">
                      <Zap size={14} className="absolute inset-y-0 left-4 flex items-center text-white/10 h-full" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 outline-none focus:border-primary-custom transition-all text-sm font-bold uppercase tracking-widest"
                      />
                    </div>
                  </div>
                  <nav className="flex gap-2">
                    <button className="glass-card px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 border-white/5 hover:text-primary-custom transition-all">Nexus</button>
                    <button className="glass-card px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 border-white/5 hover:text-primary-custom transition-all">Global Stats</button>
                  </nav>
                </div>
              </header>

              {/* Game Gallery Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-24">
                <GameCard
                  id="perspective-prism"
                  title="Perspective Prism"
                  description="Synchronize identity layers through high-speed neural alignment."
                  image="https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&q=80&w=800"
                  players="1.2k"
                  color="#8b5cf6"
                  onClick={() => handleStartGame('perspective-prism')}
                />

                <GameCard
                  id="nebula-drift"
                  title="Nebula Drift"
                  description="Navigate through cosmic radiation fields using kinetic momentum."
                  image="https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&q=80&w=800"
                  players="842"
                  color="#ec4899"
                  onClick={() => handleStartGame('nebula-drift')}
                />

                <GameCard
                  id="zen-void"
                  title="Zen Void"
                  description="Master the art of architectural silence in zero-gravity space."
                  image="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=800"
                  players="2.4k"
                  color="#10b981"
                  onClick={() => handleStartGame('zen-void')}
                />

                <GameCard
                  id="solar-flare"
                  title="Solar Flare"
                  description="Survive the intense heat of a dying star in a high-speed reaction test."
                  image="https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?auto=format&fit=crop&q=80&w=800"
                  players="512"
                  color="#f59e0b"
                  onClick={() => handleStartGame('solar-flare')}
                />

                <GameCard
                  id="cyber-strike"
                  title="Cyber Strike"
                  description="Infiltrate secure data nodes in a tactical hacking arcade simulator."
                  image="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800"
                  players="1.1k"
                  color="#06b6d4"
                  onClick={() => handleStartGame('cyber-strike')}
                />

                <GameCard
                  id="gravity-well"
                  title="Gravity Well"
                  description="Manipulate local gravitational fields to navigate infinite tunnels."
                  image="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800"
                  players="3.2k"
                  color="#fef08a"
                  onClick={() => handleStartGame('gravity-well')}
                />

                <GameCard
                  id="echo-realm"
                  title="Echo Realm"
                  description="A rhythmic journey through a neon-drenched digital underworld."
                  image="https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=800"
                  players="890"
                  color="#6366f1"
                  onClick={() => handleStartGame('echo-realm')}
                />

                <GameCard
                  id="police-powers"
                  title="Police Powers UK"
                  description="Master the PACE Act 1984. Navigate high-stakes scenarios and earn your rank."
                  image="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=800"
                  players="3.4k"
                  color="#3b82f6"
                  onClick={() => handleStartGame('police-powers')}
                />
              </div>

              {/* Sillitoe Tartan Footer */}
              <div className="mt-40 w-full overflow-hidden">
                <div className="flex w-full h-1">
                  {Array.from({ length: 120 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 h-full opacity-40",
                        i % 2 === 0 ? "bg-white" : "bg-primary-custom"
                      )}
                    />
                  ))}
                </div>
                <div className="flex w-full h-1 mt-0.5 opacity-20">
                  {Array.from({ length: 120 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 h-full",
                        i % 2 === 1 ? "bg-white" : "bg-primary-custom"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Footer Links */}
              <footer className="mt-8 pt-8 pb-12 flex flex-col md:flex-row justify-between items-center gap-6 text-white/20 text-[9px] font-black uppercase tracking-[0.5em]">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border border-white/10 flex items-center justify-center">
                    <span className="text-[6px]">©</span>
                  </div>
                  <p>2026 ORBA Neural Network // Terminal 7</p>
                </div>
                <div className="flex gap-8">
                  <a href="#" className="hover:text-white transition-all duration-300 hover:tracking-[0.7em]">Neural Policy</a>
                  <a href="#" className="hover:text-white transition-all duration-300 hover:tracking-[0.7em]">Access Logs</a>
                  <a href="#" className="hover:text-white transition-all duration-300 hover:tracking-[0.7em]">Hardware V.95</a>
                </div>
              </footer>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {activeGame === 'perspective-prism' ? (
              <PerspectivePrismFull
                username={username}
                onExit={() => setActiveGame(null)}
              />
            ) : activeGame === 'echo-realm' ? (
              <EchoRealm
                username={username}
                onExit={() => setActiveGame(null)}
              />
            ) : activeGame === 'zen-void' ? (
              <ZenVoid
                username={username}
                onExit={() => setActiveGame(null)}
              />
            ) : activeGame === 'solar-flare' ? (
              <SolarFlare
                username={username}
                onExit={() => setActiveGame(null)}
              />
            ) : activeGame === 'cyber-strike' ? (
              <CyberStrike
                username={username}
                onExit={() => setActiveGame(null)}
              />
            ) : activeGame === 'gravity-well' ? (
              <GravityWell
                username={username}
                onExit={() => setActiveGame(null)}
              />
            ) : activeGame === 'police-powers' ? (
              <PolicePowers
                username={username}
                onExit={() => setActiveGame(null)}
              />
            ) : (
              <NebulaDrift
                username={username}
                onExit={() => setActiveGame(null)}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
