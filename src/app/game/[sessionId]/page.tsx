"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

interface PageProps {
    params: Promise<{ sessionId: string }>;
}

// --- Stat Bar Component ---
function StatBar({
    label, value, max = 100, colorFrom, colorTo, icon, danger = false
}: {
    label: string; value: number; max?: number;
    colorFrom: string; colorTo: string; icon: string; danger?: boolean;
}) {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    return (
        <div className="flex items-center gap-3">
            <span className="text-base w-5 flex-shrink-0">{icon}</span>
            <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                    <span className={danger && pct > 70 ? "text-red-400" : "text-gray-400"}>{label}</span>
                    <span className={`font-bold tabular-nums ${danger && pct > 70 ? "text-red-400" : "text-white"}`}>
                        {Math.round(value)}
                    </span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                            width: `${pct}%`,
                            background: danger && pct > 70
                                ? "linear-gradient(90deg, #ef4444, #dc2626)"
                                : `linear-gradient(90deg, ${colorFrom}, ${colorTo})`,
                            boxShadow: pct > 60 ? `0 0 8px ${colorFrom}88` : "none",
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

// --- Chat Bubble ---
function ChatBubble({
    sender, text, statChanges, isNew = false
}: {
    sender: "player" | "idol";
    text: string;
    statChanges?: { stress: number; ego: number; vocal: number; dance: number; motivation: number } | null;
    isNew?: boolean;
}) {
    const [displayed, setDisplayed] = useState(sender === "player" ? text : "");

    useEffect(() => {
        if (sender === "idol" && isNew) {
            setDisplayed("");
            let i = 0;
            const t = setInterval(() => {
                setDisplayed(text.slice(0, i + 1));
                i++;
                if (i >= text.length) clearInterval(t);
            }, 28);
            return () => clearInterval(t);
        }
        if (sender === "idol") setDisplayed(text);
    }, [text, isNew, sender]);

    const isIdol = sender === "idol";

    return (
        <div className={`flex ${isIdol ? "justify-start" : "justify-end"} mb-4`}>
            <div className={`max-w-[78%] ${isIdol ? "order-2" : ""}`}>
                <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isIdol
                        ? "glass border border-purple-500/20 text-gray-100 rounded-tl-sm"
                        : "text-white rounded-tr-sm"
                        }`}
                    style={!isIdol ? { background: "linear-gradient(135deg, #7c3aed, #4f46e5)" } : {}}
                >
                    {displayed}
                    {isIdol && isNew && displayed.length < text.length && (
                        <span className="inline-block w-0.5 h-4 bg-purple-400 ml-1 animate-pulse align-middle" />
                    )}
                </div>
                {/* Stat changes badge */}
                {isIdol && statChanges && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {Object.entries(statChanges).map(([k, v]) => {
                            if (v === 0) return null;
                            const isPos = v > 0;
                            const labels: Record<string, string> = {
                                vocal: "보컬", dance: "댄스", stress: "스트레스", ego: "자아", motivation: "동기"
                            };
                            const isBad = k === "stress" && isPos;
                            return (
                                <span
                                    key={k}
                                    className="text-xs px-2 py-0.5 rounded-full font-bold"
                                    style={{
                                        background: isBad ? "rgba(239,68,68,0.15)" : isPos ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                                        color: isBad ? "#f87171" : isPos ? "#34d399" : "#f87171",
                                        border: `1px solid ${isBad ? "#ef444430" : isPos ? "#10b98130" : "#ef444430"}`,
                                    }}
                                >
                                    {labels[k] || k} {isPos ? "+" : ""}{v}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ===================== MAIN PAGE =====================
export default function GamePage({ params }: PageProps) {
    const resolvedParams = React.use(params);
    const sessionId = resolvedParams.sessionId as Id<"gameSessions">;

    const { user } = useUser();
    const session = useQuery(api.game.getSession, { sessionId });
    const messages = useQuery(api.game.getMessages, { sessionId });
    const playerData = useQuery(api.game.getPlayerProfile);
    const sendMessage = useMutation(api.game.sendProducerMessage);

    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const tickets = playerData?.tickets ?? 0;

    // Auto-scroll on new messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages?.length]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || sending) return;
        setError(null);
        setInput("");
        setSending(true);
        try {
            await sendMessage({ sessionId, text });
        } catch (e: any) {
            setError(e.message || "전송 실패");
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const msgList = messages ?? [];
    const isWaiting = sending || (msgList.at(-1)?.sender === "player");
    const hasTickets = tickets > 0;

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "var(--bg-primary)" }}>

            {/* ── Layer 0: SVG Background ── */}
            {session.currentSvg && (
                <div
                    className="fixed inset-0 z-0 pointer-events-none transition-all duration-1000"
                    style={{ opacity: 0.45 }}
                    dangerouslySetInnerHTML={{ __html: session.currentSvg }}
                />
            )}
            {!session.currentSvg && (
                <div className="fixed inset-0 z-0 pointer-events-none bg-grid"
                    style={{ background: "radial-gradient(ellipse at 50% 0%, #1a0533 0%, #050510 60%)" }} />
            )}

            {/* ── Layer 1: UI ── */}
            <div className="relative z-10 flex flex-col min-h-screen items-center w-full">

                {/* Nav */}
                <nav className="glass border-b border-white/5 px-4 py-3 flex items-center justify-between flex-shrink-0 w-full">
                    <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1">
                        ← 멤버 선택
                    </Link>
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-black gradient-text">{session.memberName}</span>
                        <span className="text-xs text-gray-600">프로듀서: {user?.firstName ?? "익명"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="glass rounded-full px-3 py-1 text-xs border border-yellow-500/20 flex items-center gap-1">
                            <span>🎫</span>
                            <span className="text-yellow-400 font-bold">{tickets}</span>
                        </div>
                        <div className="glass rounded-full px-3 py-1 text-xs border border-green-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block mr-1 animate-pulse" />
                            <span className="text-green-400">실시간</span>
                        </div>
                    </div>
                </nav>

                {/* ── Stat Panel ── */}
                <div className="glass border-b border-white/5 px-4 py-4 flex-shrink-0 w-full flex justify-center">
                    <div className="max-w-2xl w-full grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                        <StatBar label="보컬" value={session.vocal} colorFrom="#a78bfa" colorTo="#7c3aed" icon="🎤" />
                        <StatBar label="댄스" value={session.dance} colorFrom="#06b6d4" colorTo="#0891b2" icon="💃" />
                        <StatBar label="자아" value={session.ego} colorFrom="#f59e0b" colorTo="#d97706" icon="✨" />
                        <StatBar label="동기부여" value={session.motivation} colorFrom="#10b981" colorTo="#059669" icon="🔥" />
                        <StatBar label="스트레스" value={session.stress} colorFrom="#ef4444" colorTo="#dc2626" icon="💢" danger />
                        <div className="flex items-center gap-3 col-span-2 md:col-span-1 glass rounded-xl px-3 py-2 border border-white/5">
                            <span className="text-xl">💰</span>
                            <div className="flex-1 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">수익</p>
                                    <p className="text-white font-bold text-sm">₩{session.revenue.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">코어팬</p>
                                    <p className="text-purple-400 font-bold text-sm">{session.fandomCore}%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Chat Area ── */}
                <div className="flex-1 overflow-y-auto px-4 py-6 w-full flex flex-col items-center">
                    <div className="max-w-2xl w-full flex flex-col mx-auto">
                        {msgList.length === 0 && (
                            <div className="text-center py-16 text-gray-600 my-auto">
                                <p className="text-4xl mb-3">{session.memberName.match(/[^\s]+/)?.[0] ?? "👋"}</p>
                                <p className="text-sm text-gray-400">스케줄을 제안해보세요.</p>
                                <p className="text-xs mt-2 text-gray-500">예: "이번 주에 TV 예능 촬영 어때요?"<br />"신곡 미니앨범 준비 시작하자"</p>
                            </div>
                        )}

                        {msgList.map((msg, i) => (
                            <ChatBubble
                                key={msg._id}
                                sender={msg.sender}
                                text={msg.text}
                                statChanges={msg.statChanges ?? null}
                                isNew={i === msgList.length - 1 && msg.sender === "idol"}
                            />
                        ))}

                        {/* AI Typing indicator */}
                        {isWaiting && !sending && (
                            <div className="flex justify-start mb-4">
                                <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 border border-purple-500/20 flex gap-1.5 items-center">
                                    {[0, 1, 2].map((i) => (
                                        <div key={i} className="w-2 h-2 rounded-full bg-purple-400"
                                            style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>
                </div>

                {/* ── Input Area ── */}
                <div className="glass border-t border-white/5 px-4 py-4 flex-shrink-0 w-full flex justify-center">
                    <div className="max-w-2xl w-full">
                        {hasTickets ? (
                            <>
                                {error && (
                                    <div className="mb-2 text-xs text-red-400 glass rounded-lg px-3 py-2 border border-red-500/20">
                                        ⚠️ {error}
                                    </div>
                                )}
                                <div className="flex gap-3 items-end">
                                    <div className="flex-1 glass rounded-2xl border border-white/10 focus-within:border-purple-500/50 transition-colors">
                                        <textarea
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder={`${session.memberName.split(" ")[0]}에게 스케줄을 제안하세요... (Enter로 전송)`}
                                            rows={2}
                                            maxLength={500}
                                            className="w-full bg-transparent text-white text-sm px-4 py-3 resize-none outline-none placeholder-gray-600"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSend}
                                        disabled={!input.trim() || sending}
                                        className="btn-shimmer text-white font-bold px-5 py-3 rounded-2xl flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-transform"
                                    >
                                        {sending ? (
                                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin block" />
                                        ) : "전송"}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-700 mt-2 text-center">
                                    🎫 대화 1회 = 티켓 1장 소모 · 남은 티켓: <span className="text-yellow-400 font-bold">{tickets}장</span>
                                </p>
                            </>
                        ) : (
                            <div className="text-center py-4 flex flex-col items-center gap-3">
                                <p className="text-gray-400 text-sm">🎫 대화 티켓이 부족합니다</p>
                                <Link
                                    href="/minigame"
                                    className="btn-shimmer text-white font-bold text-sm px-8 py-3 rounded-full inline-block hover:scale-105 transition-transform"
                                >
                                    미니게임에서 티켓 획득하기 →
                                </Link>
                                <Link href="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                                    또는 홈으로 돌아가기
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
