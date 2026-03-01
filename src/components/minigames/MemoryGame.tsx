"use client";

import React, { useState, useEffect, useRef } from "react";

// Pattern Memory Game (패턴 기억력 게임)
export default function MemoryGame({ onComplete, onFail }: { onComplete: (timeMs: number) => void, onFail: () => void }) {
    const [sequence, setSequence] = useState<number[]>([]);
    const [playerSequence, setPlayerSequence] = useState<number[]>([]);
    const [level, setLevel] = useState(1);
    const [isPlayingSequence, setIsPlayingSequence] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [statusText, setStatusText] = useState("준비...");

    const TARGET_LEVEL = 5; // Pass 5 rounds to win
    const MEMBERS = [
        { id: 0, name: "미나", emoji: "🐰", color: "border-pink-400 bg-pink-500/20 text-pink-300" },
        { id: 1, name: "지우", emoji: "🐼", color: "border-blue-400 bg-blue-500/20 text-blue-300" },
        { id: 2, name: "서윤", emoji: "🦊", color: "border-purple-400 bg-purple-500/20 text-purple-300" },
        { id: 3, name: "하나", emoji: "🐹", color: "border-yellow-400 bg-yellow-500/20 text-yellow-300" },
    ];

    // Start next level
    useEffect(() => {
        if (level > TARGET_LEVEL) {
            setStatusText("SUCCESS!");
            setTimeout(() => onComplete(20000), 1000); // 20000ms dummy time for S/A rank
            return;
        }

        const nextMember = Math.floor(Math.random() * MEMBERS.length);
        const newSeq = [...sequence, nextMember];
        setSequence(newSeq);
        setPlayerSequence([]);
        playSequence(newSeq);
    }, [level]);

    const playSequence = async (seq: number[]) => {
        setIsPlayingSequence(true);
        setStatusText("패턴을 기억하세요!");

        await new Promise(r => setTimeout(r, 1000)); // Delay before start

        for (let i = 0; i < seq.length; i++) {
            setActiveIndex(seq[i]);
            await new Promise(r => setTimeout(r, 600)); // Flash duration
            setActiveIndex(null);
            await new Promise(r => setTimeout(r, 200)); // Gap
        }

        setIsPlayingSequence(false);
        setStatusText("순서대로 누르세요!");
    };

    const handleMemberClick = (id: number) => {
        if (isPlayingSequence || level > TARGET_LEVEL) return;

        // Visual flash feedback
        setActiveIndex(id);
        setTimeout(() => setActiveIndex(null), 200);

        const newPlayerSeq = [...playerSequence, id];
        setPlayerSequence(newPlayerSeq);

        // Check verification
        const currentIndex = newPlayerSeq.length - 1;
        if (sequence[currentIndex] !== id) {
            // Failed
            setStatusText("실패!");
            setTimeout(() => onFail(), 1000);
            return;
        }

        // Passed current tap, check if sequence is complete
        if (newPlayerSeq.length === sequence.length) {
            setStatusText("PERFECT!");
            setIsPlayingSequence(true); // Disable input temporarily
            setTimeout(() => setLevel(l => l + 1), 1000);
        }
    };

    return (
        <div className="flex flex-col items-center gap-8 w-full py-4">
            <div className="glass px-6 py-2 rounded-full border border-white/10 flex gap-4 text-sm font-bold">
                <span className="text-gray-400">LEVEL</span>
                <span className="text-cyan-400">{Math.min(level, TARGET_LEVEL)} / {TARGET_LEVEL}</span>
            </div>

            <h3 className={`text-xl font-black h-8 ${statusText === "실패!" ? "text-red-500" : statusText === "SUCCESS!" || statusText === "PERFECT!" ? "text-green-400" : "text-white"}`}>
                {statusText}
            </h3>

            <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                {MEMBERS.map((m) => {
                    const isActive = activeIndex === m.id;
                    return (
                        <button
                            key={m.id}
                            onClick={() => handleMemberClick(m.id)}
                            disabled={isPlayingSequence}
                            className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition-all duration-150
                                ${isActive
                                    ? `${m.color} scale-105 shadow-[0_0_20px_currentColor] brightness-125`
                                    : "border-white/5 bg-black/40 text-gray-500 opacity-50"}
                                ${!isPlayingSequence && !isActive ? "hover:border-white/20 hover:opacity-100" : ""}
                            `}
                        >
                            <span className="text-4xl">{m.emoji}</span>
                            <span className="text-xs font-bold">{m.name}</span>
                        </button>
                    )
                })}
            </div>

            <p className="text-xs text-gray-400 mt-4 text-center">
                멤버의 이모지가 반짝이는 순서를<br />기억해서 똑같이 탭하세요!
            </p>
        </div >
    );
}
