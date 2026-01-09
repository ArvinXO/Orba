'use client';

import { useLeaderboard } from '@/hooks/useLeaderboard';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, User, Clock } from 'lucide-react';

interface LeaderboardProps {
    gameId: string;
}

export function Leaderboard({ gameId }: LeaderboardProps) {
    const { scores } = useLeaderboard(gameId);

    return (
        <div className="glass-panel rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-6">
                <Trophy className="text-yellow-400 w-6 h-6" />
                <h2 className="text-xl font-bold text-gradient">Leaderboard</h2>
            </div>

            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {scores.length === 0 ? (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-gray-400 text-center py-4"
                        >
                            No high scores yet. Be the first!
                        </motion.p>
                    ) : (
                        scores.map((score, index) => (
                            <motion.div
                                key={`${score.username}-${score.timestamp}`}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className="glass-card flex items-center justify-between p-3 rounded-xl"
                            >
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                                        index === 0 ? "bg-yellow-400 text-black" :
                                            index === 1 ? "bg-gray-300 text-black" :
                                                index === 2 ? "bg-amber-600 text-white" : "bg-white/10"
                                    )}>
                                        {index + 1}
                                    </span>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{score.username}</span>
                                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                            <Clock className="w-2 h-2" />
                                            {new Date(score.timestamp).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-primary-custom font-bold text-lg">
                                    {score.score.toLocaleString()}
                                </span>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// Add cn utility import that I missed in the thought process
import { cn } from '@/lib/utils';
