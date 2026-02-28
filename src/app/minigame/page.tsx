"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUser, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import Link from "next/link";

// ─── Constants ───
const GRID_SIZE = 5;
const TOTAL_NUMBERS = GRID_SIZE * GRID_SIZE;
const TIME_LIMIT_MS = 60_000;

type GameState = "idle" | "playing" | "success" | "failed";

function shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getRankColor(rank: string) {
    switch (rank) {
        case "S": return "from-yellow-400 to-orange-500";
        case "A": return "from-purple-400 to-purple-600";
        case "B": return "from-cyan-400 to-blue-500";
        default: return "from-gray-400 to-gray-500";
    }
}

function getRankLabel(rank: string) {
    switch (rank) {
        case "S": return "⭐ S Rank — 완벽한 퍼포먼스!";
        case "A": return "🔥 A Rank — 훌륭한 실력!";
        case "B": return "👍 B Rank — 잘 했어요!";
        default: return "💪 C Rank — 도전 완료!";
    }
}

export default function MiniGamePage() {
    const { user } = useUser();
    const playerData = useQuery(api.minigame.getPlayerData);
    const submitResult = useMutation(api.minigame.submitMiniGameResult);
    const ensurePlayer = useMutation(api.minigame.ensurePlayer);

    const [gameState, setGameState] = useState<GameState>("idle");
    const [grid, setGrid] = useState<number[]>([]);
    const [nextNumber, setNextNumber] = useState(1);
    const [clickedNumbers, setClickedNumbers] = useState<Set<number>>(new Set());
    const [startTime, setStartTime] = useState(0);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [remainingMs, setRemainingMs] = useState(TIME_LIMIT_MS);
    const [result, setResult] = useState<{ rank: string; ticketsAwarded: number; completionTimeMs: number } | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // 첫 접속 시 플레이어 프로필 보장
    useEffect(() => {
        if (user) {
            ensurePlayer().catch(() => { });
        }
    }, [user]);

    // Timer
    useEffect(() => {
        if (gameState === "playing") {
            timerRef.current = setInterval(() => {
                const now = Date.now();
                const elapsed = now - startTime;
                setElapsedMs(elapsed);
                setRemainingMs(Math.max(0, TIME_LIMIT_MS - elapsed));

                if (elapsed >= TIME_LIMIT_MS) {
                    setGameState("failed");
                    if (timerRef.current) clearInterval(timerRef.current);
                }
            }, 50);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gameState, startTime]);

    const startGame = useCallback(() => {
        const numbers = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1);
        setGrid(shuffleArray(numbers));
        setNextNumber(1);
        setClickedNumbers(new Set());
        setStartTime(Date.now());
        setElapsedMs(0);
        setRemainingMs(TIME_LIMIT_MS);
        setResult(null);
        setGameState("playing");
    }, []);

    const handleNumberClick = useCallback(async (num: number) => {
        if (gameState !== "playing" || num !== nextNumber) return;

        const newClicked = new Set(clickedNumbers);
        newClicked.add(num);
        setClickedNumbers(newClicked);

        if (num === TOTAL_NUMBERS) {
            // 게임 완료!
            if (timerRef.current) clearInterval(timerRef.current);
            const finalTime = Date.now() - startTime;
            setElapsedMs(finalTime);
            setGameState("success");
            setSubmitting(true);

            try {
                const res = await submitResult({ completionTimeMs: finalTime });
                setResult(res);
            } catch (e: any) {
                console.error("결과 제출 실패:", e.message);
            } finally {
                setSubmitting(false);
            }
        } else {
            setNextNumber(num + 1);
        }
    }, [gameState, nextNumber, clickedNumbers, startTime, submitResult]);

    const formatTime = (ms: number) => {
        const s = Math.floor(ms / 1000);
        const cs = Math.floor((ms % 1000) / 10);
        return `${s}.${cs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="min-h-screen flex flex-col items-center" style={{ background: "var(--bg-primary)" }}>
            {/* Ambient */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-10 blur-3xl"
                    style={{ background: "radial-gradient(circle, #06b6d4, transparent)" }} />
                <div className="absolute bottom-1/4 right-1/3 w-64 h-64 rounded-full opacity-10 blur-3xl"
                    style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }} />
            </div>

            {/* Nav */}
            <nav className="glass border-b border-white/5 px-4 py-3 flex items-center justify-between flex-shrink-0 w-full sticky top-0 z-50">
                <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1">
                    ← 홈으로
                </Link>
                <span className="text-sm font-black gradient-text">안무 훈련</span>
                <div className="glass rounded-full px-3 py-1 text-xs border border-yellow-500/20 flex items-center gap-1.5">
                    <span>🎫</span>
                    <span className="text-yellow-400 font-bold">{playerData?.tickets ?? 0}</span>
                </div>
            </nav>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 w-full max-w-lg">

                {/* ─── IDLE State ─── */}
                {gameState === "idle" && (
                    <div className="text-center flex flex-col items-center gap-6">
                        <div className="text-6xl mb-2">🎯</div>
                        <h1 className="text-3xl font-black gradient-text">안무 순발력 훈련</h1>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                            5×5 격자에 랜덤 배치된 <strong className="text-white">1~25</strong>를 순서대로 빠르게 클릭하세요!<br />
                            제한 시간: <strong className="text-cyan-400">60초</strong>
                        </p>

                        <div className="glass rounded-2xl p-4 border border-white/10 text-sm text-gray-300 w-full max-w-xs">
                            <div className="flex justify-between mb-2">
                                <span>🎫 보유 티켓</span>
                                <span className="font-bold text-yellow-400">{playerData?.tickets ?? 0}장</span>
                            </div>
                            {playerData?.bestTime && (
                                <div className="flex justify-between">
                                    <span>⚡ 최고 기록</span>
                                    <span className="font-bold text-cyan-400">{formatTime(playerData.bestTime)}초</span>
                                </div>
                            )}
                        </div>

                        <SignedIn>
                            <button
                                onClick={startGame}
                                className="btn-shimmer text-white font-bold text-lg px-10 py-4 rounded-full glow-purple hover:scale-105 active:scale-95 transition-transform"
                            >
                                게임 시작 →
                            </button>
                        </SignedIn>
                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className="btn-shimmer text-white font-bold text-base px-10 py-4 rounded-full">
                                    로그인 후 시작 →
                                </button>
                            </SignInButton>
                        </SignedOut>
                    </div>
                )}

                {/* ─── PLAYING State ─── */}
                {gameState === "playing" && (
                    <div className="flex flex-col items-center gap-4 w-full">
                        {/* Timer & Progress */}
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

                        {/* Progress bar */}
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-200 ease-out"
                                style={{
                                    width: `${((nextNumber - 1) / TOTAL_NUMBERS) * 100}%`,
                                    background: "linear-gradient(90deg, #06b6d4, #7c3aed)",
                                }}
                            />
                        </div>

                        {/* 5x5 Grid */}
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
                )}

                {/* ─── SUCCESS State ─── */}
                {gameState === "success" && (
                    <div className="text-center flex flex-col items-center gap-5">
                        <div className="text-6xl mb-2">🎉</div>
                        <h2 className="text-2xl font-black text-white">훈련 완료!</h2>

                        {submitting ? (
                            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                        ) : result ? (
                            <>
                                <div className={`text-5xl font-black bg-gradient-to-r ${getRankColor(result.rank)} bg-clip-text text-transparent`}>
                                    {result.rank}
                                </div>
                                <p className="text-gray-400 text-sm">{getRankLabel(result.rank)}</p>

                                <div className="glass rounded-2xl p-5 border border-white/10 w-full max-w-xs space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">클리어 시간</span>
                                        <span className="font-bold text-cyan-400">{formatTime(result.completionTimeMs)}초</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">획득 티켓</span>
                                        <span className="font-bold text-yellow-400">+{result.ticketsAwarded}장 🎫</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">보유 티켓</span>
                                        <span className="font-bold text-white">{playerData?.tickets ?? "..."}장</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 w-full max-w-xs">
                                    <Link
                                        href="/"
                                        className="btn-shimmer text-white font-bold text-base px-8 py-3 rounded-full text-center glow-purple hover:scale-105 transition-transform"
                                    >
                                        멤버 선택하러 가기 →
                                    </Link>
                                    <button
                                        onClick={startGame}
                                        className="glass text-gray-300 font-medium text-sm px-6 py-3 rounded-full border border-white/10 hover:border-white/30 hover:scale-105 transition-all"
                                    >
                                        한 번 더 도전
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p className="text-red-400 text-sm">결과 제출 중 오류가 발생했습니다.</p>
                        )}
                    </div>
                )}

                {/* ─── FAILED State ─── */}
                {gameState === "failed" && (
                    <div className="text-center flex flex-col items-center gap-5">
                        <div className="text-6xl mb-2">⏰</div>
                        <h2 className="text-2xl font-black text-red-400">시간 초과!</h2>
                        <p className="text-gray-400 text-sm">60초 안에 모든 숫자를 클릭하지 못했어요.</p>

                        <div className="glass rounded-2xl p-4 border border-red-500/20 w-full max-w-xs">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">진행률</span>
                                <span className="font-bold text-white">{nextNumber - 1} / {TOTAL_NUMBERS}</span>
                            </div>
                        </div>

                        <button
                            onClick={startGame}
                            className="btn-shimmer text-white font-bold text-base px-10 py-4 rounded-full glow-purple hover:scale-105 transition-transform"
                        >
                            다시 도전 →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
