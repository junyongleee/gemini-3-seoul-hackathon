"use client";

import React, { useState, useEffect, useRef } from "react";

// Timing Gauge Game (타이밍 게이지 맞추기)
export default function TimingGame({ onComplete, onFail }: { onComplete: (timeMs: number) => void, onFail: () => void }) {
    const [attempt, setAttempt] = useState(1); // 1, 2, 3
    const [position, setPosition] = useState(0); // 0 to 100
    const [direction, setDirection] = useState(1);
    const [isStopped, setIsStopped] = useState(false);
    const [isWaitingForNext, setIsWaitingForNext] = useState(false);
    const [resultMsg, setResultMsg] = useState("");
    const [totalScoreMs, setTotalScoreMs] = useState(0);
    const requestRef = useRef<number | null>(null);

    const getSpeed = (lvl: number) => {
        if (lvl === 1) return 1.0; // 천천히
        if (lvl === 2) return 2.5; // 어느 정도 빠르게
        return 4.5; // 매우 빠르게
    };
    const SPEED = getSpeed(attempt);

    const PERFECT_ZONE = { min: 45, max: 55 };
    const GOOD_ZONE = { min: 35, max: 65 };

    const animate = () => {
        if (isStopped) return;

        setPosition((prev) => {
            let next = prev + direction * SPEED;
            if (next >= 100) {
                next = 100;
                setDirection(-1);
            } else if (next <= 0) {
                next = 0;
                setDirection(1);
            }
            return next;
        });
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        if (!isStopped) {
            requestRef.current = requestAnimationFrame(animate);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [direction, isStopped, SPEED]); // react to speed as well

    // Spacebar to stop or proceed
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === "Space") {
                e.preventDefault();
                if (isWaitingForNext) {
                    handleNextAttempt();
                } else {
                    handleStop();
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isStopped, isWaitingForNext, position]);

    const handleStop = () => {
        if (isStopped || isWaitingForNext) return;
        setIsStopped(true);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);

        let attemptScoreMs = 0;

        if (position >= PERFECT_ZONE.min && position <= PERFECT_ZONE.max) {
            setResultMsg("PERFECT!");
            attemptScoreMs = 5000;
        } else if (position >= GOOD_ZONE.min && position <= GOOD_ZONE.max) {
            setResultMsg("GOOD!");
            attemptScoreMs = 10000;
        } else {
            setResultMsg("MISS");
            setTimeout(() => onFail(), 1000);
            return;
        }

        const newTotal = totalScoreMs + attemptScoreMs;
        setTotalScoreMs(newTotal);

        if (attempt < 3) {
            setIsWaitingForNext(true);
        } else {
            setTimeout(() => onComplete(newTotal), 1000);
        }
    };

    const handleNextAttempt = () => {
        setAttempt((prev) => prev + 1);
        setPosition(0);
        setDirection(1);
        setResultMsg("");
        setIsWaitingForNext(false);
        setIsStopped(false);
    };

    return (
        <div className="flex flex-col items-center gap-8 w-full py-10" onClick={() => {
            if (isWaitingForNext) handleNextAttempt();
            else handleStop();
        }}>
            {/* Attempt Indicator */}
            <div className="text-xl font-black text-cyan-400 tracking-widest bg-cyan-900/40 px-6 py-2 rounded-full border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                [ {attempt} / 3 ] 시도
            </div>

            <p className="text-gray-300 text-sm mb-4 text-center px-4">
                화면을 탭하거나 스페이스바를 눌러 정확한 타이밍에 멈추세요! <br />
                <span className="text-pink-400 text-xs mt-2 inline-block">※ 단계가 오를수록 속도가 빨라집니다.</span>
            </p>

            <div className="relative w-full h-12 bg-black/40 border border-white/20 rounded-full overflow-hidden shadow-inner">
                {/* Zones */}
                <div className="absolute top-0 bottom-0 left-[35%] right-[35%] bg-yellow-500/30" />
                <div className="absolute top-0 bottom-0 left-[45%] right-[45%] bg-green-500/50 border-x-2 border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.5)]" />

                {/* Moving Cursor */}
                <div
                    className="absolute top-0 bottom-0 w-3 bg-white shadow-[0_0_15px_white] rounded-full transform -translate-x-1/2 transition-none"
                    style={{ left: `${position}%` }}
                />
            </div>

            <div className="h-16 flex items-center justify-center">
                {isStopped && (
                    <div className={`text-4xl font-black animate-in zoom-in-50 ${resultMsg === "PERFECT!" ? "text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]" :
                        resultMsg === "GOOD!" ? "text-yellow-400" : "text-red-500"
                        }`}>
                        {resultMsg}
                    </div>
                )}
            </div>

            {!isStopped && !isWaitingForNext && (
                <button className="glass px-8 py-3 rounded-full text-white font-bold animate-pulse-glow border border-purple-500/50 text-sm">
                    STOP [SPACE]
                </button>
            )}

            {isWaitingForNext && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleNextAttempt();
                    }}
                    className="glass px-8 py-3 rounded-full text-white font-bold bg-cyan-600/50 hover:bg-cyan-500/60 border border-cyan-400/50 text-sm transition-all"
                >
                    다음 단계 도전!
                </button>
            )}
        </div>
    );
}
