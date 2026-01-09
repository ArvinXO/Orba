'use client';

import { useState, useEffect } from 'react';

export interface Score {
    username: string;
    score: number;
    gameId: string;
    timestamp: number;
}

export const useLeaderboard = (gameId: string) => {
    const [scores, setScores] = useState<Score[]>([]);

    useEffect(() => {
        const savedScores = localStorage.getItem(`leaderboard_${gameId}`);
        if (savedScores) {
            setScores(JSON.parse(savedScores));
        }
    }, [gameId]);

    const addScore = (username: string, score: number) => {
        const newScore: Score = {
            username,
            score,
            gameId,
            timestamp: Date.now(),
        };

        const updatedScores = [...scores, newScore]
            .sort((a, b) => b.score - a.score)
            .slice(0, 10); // Keep top 10

        setScores(updatedScores);
        localStorage.setItem(`leaderboard_${gameId}`, JSON.stringify(updatedScores));
    };

    return { scores, addScore };
};
