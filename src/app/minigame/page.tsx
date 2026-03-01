"use client";

import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUser, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import BottomNav from "../../components/BottomNav";

import ReflexGame from "../../components/minigames/ReflexGame";
import TimingGame from "../../components/minigames/TimingGame";
import MemoryGame from "../../components/minigames/MemoryGame";

// ─── Helpers ───
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
        case "S": return "⭐ S Rank — 완벽해! ";
        case "A": return "🔥 A Rank — 훌륭한데요!";
        case "B": return "👍 B Rank — 잘 했어요!";
        default: return "💪 C Rank — 도전 완료!";
    }
}

const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${s}.${cs.toString().padStart(2, "0")}`;
};

type GameType = "reflex" | "timing" | "memory";
type GameState = "hub" | "playing" | "success" | "failed";

export default function MiniGamePage() {
    const { user } = useUser();
    const playerData = useQuery(api.minigame.getPlayerData, user ? { fallbackUserId: user.id } : "skip");
    const submitResult = useMutation(api.minigame.submitMiniGameResult);

    const [gameState, setGameState] = useState<GameState>("hub");
    const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
    const [result, setResult] = useState<{ rank: string; ticketsAwarded: number; completionTimeMs: number } | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleStartGame = (game: GameType) => {
        setSelectedGame(game);
        setGameState("playing");
        setResult(null);
    };

    const handleComplete = async (timeMs: number) => {
        setGameState("success");
        setSubmitting(true);
        try {
            const res = await submitResult({ completionTimeMs: timeMs, fallbackUserId: user?.id });
            setResult(res);
        } catch (e: any) {
            console.error("결과 제출 실패:", e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleFail = () => {
        setGameState("failed");
    };

    const resetToHub = () => {
        setGameState("hub");
        setSelectedGame(null);
        setResult(null);
    };

    return (
        <div className="min-h-screen flex flex-col items-center">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-10 blur-3xl"
                    style={{ background: "radial-gradient(circle, #06b6d4, transparent)" }} />
                <div className="absolute bottom-1/4 right-1/3 w-64 h-64 rounded-full opacity-10 blur-3xl"
                    style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }} />
            </div>

            {/* Header */}
            {gameState === "hub" && (
                <div className="mt-8 z-10 text-center">
                    <h1 className="text-3xl font-black gradient-text tracking-wider uppercase mb-2 text-shadow-glow">TRAINING</h1>
                    <p className="text-gray-400 text-sm">원하는 훈련을 선택하여 티켓과 스탯을 획득하세요.</p>
                </div>
            )}

            {/* Main Content Area */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 w-full">

                {/* ─── HUB State (Selection Menu) ─── */}
                {gameState === "hub" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-6xl px-4 py-8 pb-32">

                        {/* Game 1: Reflex */}
                        <div className="glass rounded-[2rem] p-8 min-h-[500px] border border-white/10 flex flex-col items-center justify-between text-center shadow-2xl bg-black/40 hover:bg-black/50 transition-all duration-300 hover:-translate-y-2 group">
                            <div className="flex flex-col items-center mt-4">
                                <div className="text-[6rem] leading-none mb-6 group-hover:scale-110 transition-transform drop-shadow-md">🎯</div>
                                <h2 className="text-2xl font-black text-white mb-4">안무 순발력 훈련</h2>
                                <div className="w-12 h-1 bg-white/20 rounded-full"></div>
                            </div>

                            <div className="flex-1 flex flex-col items-center justify-center w-full my-6">
                                <p className="text-base text-gray-300 leading-relaxed px-2">
                                    5×5 격자에 랜덤 배치된 숫자를 1부터 빠르게 클릭하여 안무 동선을 숙지하세요!<br />
                                    <strong className="text-cyan-400 mt-4 block text-lg tracking-wide">제한 시간: 60초</strong>
                                </p>
                            </div>

                            <div className="w-full">
                                <SignedIn>
                                    <button onClick={() => handleStartGame("reflex")} className="w-full h-[88px] flex items-center justify-center rounded-2xl font-black text-2xl text-black bg-[#84E150] shadow-[0_0_20px_rgba(132,225,80,0.3)] hover:brightness-110 hover:shadow-[0_0_30px_rgba(132,225,80,0.5)] active:scale-95 transition-all tracking-wide">
                                        게임 시작
                                    </button>
                                </SignedIn>
                                <SignedOut>
                                    <SignInButton mode="modal">
                                        <button className="w-full h-[88px] flex items-center justify-center rounded-2xl font-black text-2xl text-gray-400 bg-white/10 hover:bg-white/20 transition-all tracking-wide">
                                            로그인 필요
                                        </button>
                                    </SignInButton>
                                </SignedOut>
                            </div>
                        </div>

                        {/* Game 2: Timing */}
                        <div className="glass rounded-[2rem] p-8 min-h-[500px] border border-white/10 flex flex-col items-center justify-between text-center shadow-2xl bg-black/40 hover:bg-black/50 transition-all duration-300 hover:-translate-y-2 group">
                            <div className="flex flex-col items-center mt-4">
                                <div className="text-[6rem] leading-none mb-6 group-hover:scale-110 transition-transform drop-shadow-md">⚡</div>
                                <h2 className="text-2xl font-black text-white mb-4">음정 맞추기</h2>
                                <div className="w-12 h-1 bg-white/20 rounded-full"></div>
                            </div>

                            <div className="flex-1 flex flex-col items-center justify-center w-full my-6">
                                <p className="text-base text-gray-300 leading-relaxed px-2">
                                    빠르게 왕복하는 게이지를 녹색 구간에 맞춰 멈춰 완벽한 호흡을 연습하세요!<br />
                                    <strong className="text-green-400 mt-4 block text-lg tracking-wide">총 3번의 기회!</strong>
                                </p>
                            </div>

                            <div className="w-full">
                                <SignedIn>
                                    <button onClick={() => handleStartGame("timing")} className="w-full h-[88px] flex items-center justify-center rounded-2xl font-black text-2xl text-black bg-[#84E150] shadow-[0_0_20px_rgba(132,225,80,0.3)] hover:brightness-110 hover:shadow-[0_0_30px_rgba(132,225,80,0.5)] active:scale-95 transition-all tracking-wide">
                                        게임 시작
                                    </button>
                                </SignedIn>
                                <SignedOut>
                                    <SignInButton mode="modal">
                                        <button className="w-full h-[88px] flex items-center justify-center rounded-2xl font-black text-2xl text-gray-400 bg-white/10 hover:bg-white/20 transition-all tracking-wide">
                                            로그인 필요
                                        </button>
                                    </SignInButton>
                                </SignedOut>
                            </div>
                        </div>

                        {/* Game 3: Memory */}
                        <div className="glass rounded-[2rem] p-8 min-h-[500px] border border-white/10 flex flex-col items-center justify-between text-center shadow-2xl bg-black/40 hover:bg-black/50 transition-all duration-300 hover:-translate-y-2 group">
                            <div className="flex flex-col items-center mt-4">
                                <div className="text-[6rem] leading-none mb-6 group-hover:scale-110 transition-transform drop-shadow-md">🧠</div>
                                <h2 className="text-2xl font-black text-white mb-4">안무 동선 숙지</h2>
                                <div className="w-12 h-1 bg-white/20 rounded-full"></div>
                            </div>

                            <div className="flex-1 flex flex-col items-center justify-center w-full my-6">
                                <p className="text-base text-gray-300 leading-relaxed px-2">
                                    멤버들의 이모지가 깜빡이는 순서를 똑같이 따라하고 암기력을 키우세요!<br />
                                    <strong className="text-pink-400 mt-4 block text-lg tracking-wide">총 5레벨 도달 시 해제</strong>
                                </p>
                            </div>

                            <div className="w-full">
                                <SignedIn>
                                    <button onClick={() => handleStartGame("memory")} className="w-full h-[88px] flex items-center justify-center rounded-2xl font-black text-2xl text-black bg-[#84E150] shadow-[0_0_20px_rgba(132,225,80,0.3)] hover:brightness-110 hover:shadow-[0_0_30px_rgba(132,225,80,0.5)] active:scale-95 transition-all tracking-wide">
                                        게임 시작
                                    </button>
                                </SignedIn>
                                <SignedOut>
                                    <SignInButton mode="modal">
                                        <button className="w-full h-[88px] flex items-center justify-center rounded-2xl font-black text-2xl text-gray-400 bg-white/10 hover:bg-white/20 transition-all tracking-wide">
                                            로그인 필요
                                        </button>
                                    </SignInButton>
                                </SignedOut>
                            </div>
                        </div>

                    </div>
                )}

                {/* ─── PLAYING State ─── */}
                {gameState === "playing" && selectedGame && (
                    <div className="w-full max-w-lg glass rounded-3xl p-6 border border-white/10 shadow-2xl relative mb-24">
                        <button onClick={resetToHub} className="absolute top-4 right-4 w-8 h-8 flex flex-col items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-gray-400 transition-colors">
                            ✕
                        </button>

                        <div className="mb-6 text-center">
                            <h2 className="text-2xl font-black text-white">
                                {selectedGame === "reflex" ? "안무 순발력 훈련" : selectedGame === "timing" ? "타이밍 맞추기" : "패턴 기억력"}
                            </h2>
                        </div>

                        {selectedGame === "reflex" && <ReflexGame onComplete={handleComplete} onFail={handleFail} />}
                        {selectedGame === "timing" && <TimingGame onComplete={handleComplete} onFail={handleFail} />}
                        {selectedGame === "memory" && <MemoryGame onComplete={handleComplete} onFail={handleFail} />}
                    </div>
                )}

                {/* ─── SUCCESS State ─── */}
                {gameState === "success" && (
                    <div className="text-center flex flex-col items-center gap-5 glass p-8 rounded-3xl border border-white/10 max-w-sm w-full shadow-2xl mb-24">
                        <div className="text-6xl mb-2 animate-bounce">🎉</div>
                        <h2 className="text-2xl font-black text-white">훈련 완료!</h2>

                        {submitting ? (
                            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin my-4" />
                        ) : result ? (
                            <>
                                <div className={`text-6xl font-black bg-gradient-to-b ${getRankColor(result?.rank || "C")} bg-clip-text text-transparent drop-shadow-md`}>
                                    {result?.rank || "C"}
                                </div>
                                <p className="text-gray-300 font-bold text-sm bg-black/40 px-4 py-2 rounded-full border border-white/5">
                                    {getRankLabel(result?.rank || "C")}
                                </p>

                                <div className="w-full space-y-3 mt-2">
                                    <div className="flex justify-between text-sm px-2">
                                        <span className="text-gray-400">클리어 평가 시간</span>
                                        <span className="font-bold text-cyan-400">{formatTime(result?.completionTimeMs || 0)}초</span>
                                    </div>
                                    <div className="flex justify-between text-sm px-2">
                                        <span className="text-gray-400">획득 티켓</span>
                                        <span className="font-bold text-yellow-400">+{result?.ticketsAwarded || 0}장 🎫</span>
                                    </div>
                                    <div className="h-px bg-white/10 w-full my-2" />
                                    <div className="flex justify-between text-sm px-2">
                                        <span className="text-gray-400">보유 티켓</span>
                                        <span className="font-bold text-white">{playerData?.tickets ?? "..."}장</span>
                                    </div>
                                </div>

                                <div className="flex flex-row gap-4 w-full mt-6">
                                    <button
                                        onClick={() => handleStartGame(selectedGame!)}
                                        className="flex-1 min-h-[100px] flex items-center justify-center btn-shimmer text-white font-bold text-lg rounded-2xl shadow-[0_4px_20px_rgba(124,58,237,0.3)] hover:brightness-110 active:scale-95 transition-all w-full"
                                    >
                                        한 번 더 훈련하기
                                    </button>
                                    <button
                                        onClick={resetToHub}
                                        className="flex-1 min-h-[100px] flex items-center justify-center bg-white/5 text-gray-300 font-bold text-lg rounded-2xl hover:bg-white/10 hover:text-white transition-all border border-transparent hover:border-white/20 w-full"
                                    >
                                        다른 훈련 선택
                                    </button>
                                </div>
                                <Link href="/" className="text-purple-400 text-sm hover:text-purple-300 underline underline-offset-4 mt-6">
                                    로비로 돌아가기
                                </Link>
                            </>
                        ) : (
                            <p className="text-red-400 text-sm">결과 제출 중 오류가 발생했습니다.</p>
                        )}
                    </div>
                )}

                {/* ─── FAILED State ─── */}
                {gameState === "failed" && (
                    <div className="text-center flex flex-col items-center gap-5 glass p-8 rounded-3xl border border-red-500/30 max-w-md w-full shadow-2xl mb-24">
                        <div className="text-6xl mb-2 grayscale">⏰</div>
                        <h2 className="text-2xl font-black text-red-400">훈련 실패...</h2>
                        <p className="text-gray-400 text-sm">아쉽게도 목표 달성에 실패했습니다.</p>

                        <div className="flex flex-row gap-4 w-full mt-6">
                            <button
                                onClick={() => handleStartGame(selectedGame!)}
                                className="flex-1 min-h-[100px] flex items-center justify-center btn-shimmer text-white font-bold text-xl rounded-2xl shadow-[0_4px_20px_rgba(239,68,68,0.3)] hover:brightness-110 active:scale-95 transition-all w-full"
                            >
                                한 번 더 훈련하기
                            </button>
                            <button
                                onClick={resetToHub}
                                className="flex-1 min-h-[100px] flex items-center justify-center bg-white/5 text-gray-300 font-bold text-lg rounded-2xl hover:bg-white/10 hover:text-white transition-all border border-transparent hover:border-white/20 w-full"
                            >
                                다른 훈련 선택
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Nav */}
            <BottomNav />
        </div>
    );
}
