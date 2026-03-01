"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

const GRID_SIZE = 5;
const TOTAL_NUMBERS = GRID_SIZE * GRID_SIZE;
const TIME_LIMIT_MS = 60_000;

function shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export default function ReflexGame({ onComplete, onFail }: { onComplete: (timeMs: number) => void, onFail: () => void }) {
    const [grid, setGrid] = useState<number[]>([]);
    const [nextNumber, setNextNumber] = useState(1);
    const [clickedNumbers, setClickedNumbers] = useState<Set<number>>(new Set());
    const [startTime, setStartTime] = useState(0);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [remainingMs, setRemainingMs] = useState(TIME_LIMIT_MS);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const numbers = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1);
        setGrid(shuffleArray(numbers));
        setStartTime(Date.now());

        timerRef.current = setInterval(() => {
            const now = Date.now();
            const elapsed = now - startTime;
            setElapsedMs(elapsed);
            setRemainingMs(Math.max(0, TIME_LIMIT_MS - elapsed));

            if (elapsed >= TIME_LIMIT_MS) {
                if (timerRef.current) clearInterval(timerRef.current);
                onFail();
            }
        }, 50);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []); // Run once on mount

    const handleNumberClick = useCallback((num: number) => {
        if (num !== nextNumber) return;

        const newClicked = new Set(clickedNumbers);
        newClicked.add(num);
        setClickedNumbers(newClicked);

        if (num === TOTAL_NUMBERS) {
            if (timerRef.current) clearInterval(timerRef.current);
            const finalTime = Date.now() - startTime;
            onComplete(finalTime);
        } else {
            setNextNumber(num + 1);
        }
    }, [nextNumber, clickedNumbers, startTime, onComplete]);

    const formatTime = (ms: number) => {
        const s = Math.floor(ms / 1000);
        const cs = Math.floor((ms % 1000) / 10);
        return `${s}.${cs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="flex flex-col items-center gap-4 w-full">
            <div className="flex items-center justify-between w-full glass rounded-2xl px-4 py-3 border border-white/10">
                <div className="text-sm">
                    <span className="text-gray-400">다음: </span>
                    <span className="text-2xl font-black text-cyan-400">{nextNumber}</span>
                </div>
                <div className="text-right">
                    <div className={`text-2xl font-black tabular-nums ${remainingMs < 10000 ? "text-red-400" : "text-white"}`}>
                        {formatTime(remainingMs)}
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">남은 시간</div>
                </div>
            </div>

            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-200 ease-out"
                    style={{
                        width: `${((nextNumber - 1) / TOTAL_NUMBERS) * 100}%`,
                        background: "linear-gradient(90deg, #06b6d4, #7c3aed)",
                    }}
                />
            </div>

            <div className="grid grid-cols-5 gap-2 w-full max-w-sm">
                {grid.map((num) => {
                    const isClicked = clickedNumbers.has(num);
                    const isNext = num === nextNumber;
                    return (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num)}
                            disabled={isClicked}
                            className={`aspect-square rounded-xl text-lg font-bold transition-all duration-200 
                                ${isClicked
                                    ? "opacity-0 scale-75 pointer-events-none"
                                    : isNext
                                        ? "glass border-2 border-cyan-400 text-cyan-400 hover:scale-110 active:scale-95 shadow-lg shadow-cyan-500/20"
                                        : "glass border border-white/10 text-gray-300 hover:border-white/30 hover:scale-105 active:scale-95"
                                }`}
                        >
                            {!isClicked && num}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
