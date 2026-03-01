"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import BreakthroughEffect from "../../../components/BreakthroughEffect";

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
        <div className="flex flex-col gap-1 w-full bg-white/5 rounded-xl p-2.5">
            <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5 text-gray-300">
                    <span className="text-sm">{icon}</span> {label}
                </span>
                <span className={`font-black tabular-nums ${danger && pct > 70 ? "text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" : "text-white"}`}>
                    {Math.round(value)}
                </span>
            </div>
            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden mt-1">
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
    );
}

// --- Chat Bubble ---
function ChatBubble({
    sender, text, authName, statChanges, isNew = false
}: {
    sender: "player" | "idol";
    text: string;
    authName: string;
    statChanges?: { stress: number; ego: number; motivation: number } | null;
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
        <div className={`flex flex-col ${isIdol ? "items-start" : "items-end"} mb-6 w-full`}>
            {/* Sender Name */}
            <span className={`text-[11px] mb-1 font-semibold ${isIdol ? "text-purple-300/80 ml-2" : "text-gray-400/80 mr-2"}`}>
                {isIdol ? "가수 (AI)" : `${authName} (프로듀서)`}
            </span>

            <div className={`max-w-[85%] sm:max-w-[75%]`}>
                <div
                    className={`rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-lg ${isIdol
                        ? "glass border border-purple-500/20 text-gray-50 rounded-tl-sm"
                        : "text-white rounded-tr-sm"
                        }`}
                    style={!isIdol ? { background: "linear-gradient(135deg, #7c3aed, #4f46e5)" } : {}}
                >
                    {displayed}
                    {isIdol && isNew && displayed.length < text.length && (
                        <span className="inline-block w-1.5 h-4 bg-purple-400 ml-1.5 animate-pulse align-middle" />
                    )}
                </div>

                {/* Stat changes badge (Idol Only) */}
                {isIdol && statChanges && (
                    <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                        {Object.entries(statChanges).map(([k, v]) => {
                            if (v === 0) return null;
                            const isPos = v > 0;
                            const labels: Record<string, string> = {
                                stress: "스트레스", ego: "자아", motivation: "동기"
                            };
                            const isBad = k === "stress" && isPos;
                            return (
                                <span
                                    key={k}
                                    className="text-[10px] px-2 py-0.5 rounded flex items-center gap-0.5 shadow-sm"
                                    style={{
                                        background: isBad ? "rgba(239,68,68,0.15)" : isPos ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                                        color: isBad ? "#fca5a5" : isPos ? "#6ee7b7" : "#fca5a5",
                                        border: `1px solid ${isBad ? "#ef444430" : isPos ? "#10b98130" : "#ef444430"}`,
                                    }}
                                >
                                    {labels[k] || k} {isPos ? "▲" : "▼"}{Math.abs(v)}
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
    const sessionId = resolvedParams.sessionId as Id<"negotiations">;

    const { user } = useUser();
    const session = useQuery(api.game.getSession, { sessionId });
    const messages = useQuery(api.game.getMessages, { sessionId });
    const playerData = useQuery(api.game.getPlayerProfile, user ? { fallbackUserId: user.id } : "skip");
    const sendMessage = useMutation(api.game.sendProducerMessage);

    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showBreakthrough, setShowBreakthrough] = useState(false);
    const [showRewards, setShowRewards] = useState(false);
    const [breakthroughTriggered, setBreakthroughTriggered] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);

    const tickets = playerData?.tickets ?? 0;
    const msgList = messages ?? [];
    const isClosed = session?.isClosed ?? false;
    const lastMsg = msgList.at(-1);

    // Auto-scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages?.length]);

    // Track response & rewards
    useEffect(() => {
        if (isClosed && lastMsg?.sender === "idol") {
            setSending(false); // Stop waiting spinner

            // Check if we need to show breakthrough
            const rewards = lastMsg.rewards;
            if (rewards?.isBreakthrough && !breakthroughTriggered) {
                setBreakthroughTriggered(true);
                setShowBreakthrough(true);
            } else if (!showBreakthrough && breakthroughTriggered) {
                // Breakthrough finished, show rewards
                setShowRewards(true);
            } else if (!rewards?.isBreakthrough) {
                // No breakthrough, just show rewards immediately
                setTimeout(() => setShowRewards(true), 1500); // 1.5s delay for reading
            }
        }
    }, [isClosed, lastMsg, breakthroughTriggered, showBreakthrough]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || sending || isClosed) return;

        setError(null);
        setInput("");
        setSending(true);
        try {
            await sendMessage({ sessionId, text, fallbackUserId: user?.id });
            // sending will be set to false when idol replies and isClosed=true
        } catch (e: any) {
            setError(e.message || "제안 실패");
            setSending(false);
        }
    };

    if (!session || !playerData) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-0 sm:p-4 md:p-8 pt-[max(env(safe-area-inset-top),_16px)] pb-[max(env(safe-area-inset-bottom),_16px)]">

            {/* ── Breakthrough Layer ── */}
            {showBreakthrough && (
                <BreakthroughEffect onComplete={() => setShowBreakthrough(false)} />
            )}

            {/* ── Background Layer ── */}
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

            {/* ── Main UI Layer ── */}
            <div className="relative z-10 flex flex-col h-[100dvh] sm:h-full sm:max-h-[85vh] items-center w-full max-w-2xl border-x sm:border border-white/10 sm:rounded-3xl shadow-2xl bg-black/60 backdrop-blur-lg overflow-hidden">

                {/* Nav */}
                <nav className="glass border-b border-white/5 px-5 py-4 flex items-center justify-between w-full">
                    <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1.5 font-medium">
                        <span className="text-lg">←</span> 로비
                    </Link>
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-black gradient-text tracking-wide">{session.memberName}</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">신중한 대화 모드</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="glass rounded-full px-3 py-1 text-xs border border-yellow-500/20 flex items-center gap-1.5">
                            <span>🎟️</span>
                            <span className="text-yellow-400 font-bold">{tickets}</span>
                        </div>
                    </div>
                </nav>

                {/* Stat Panel */}
                <div className="w-full px-4 py-4 border-b border-white/5">
                    <div className="grid grid-cols-3 gap-3">
                        <StatBar label="자아 (Ego)" value={session.ego} colorFrom="#f59e0b" colorTo="#d97706" icon="✨" />
                        <StatBar label="동기부여" value={session.motivation} colorFrom="#10b981" colorTo="#059669" icon="🔥" />
                        <StatBar label="스트레스" value={session.stress} colorFrom="#ef4444" colorTo="#dc2626" icon="💢" danger />
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto px-5 py-8 w-full flex flex-col items-center relative custom-scrollbar">

                    {/* Empty State */}
                    {msgList.length === 0 && (
                        <div className="text-center py-20 my-auto animate-fade-in">
                            <div className="w-20 h-20 mx-auto bg-purple-500/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(168,85,247,0.2)] border border-purple-500/20">
                                <span className="text-4xl text-purple-300">💬</span>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2 tracking-tight">협상 시작</h2>
                            <p className="text-sm text-gray-400 mb-6 leading-relaxed max-w-[280px] mx-auto">
                                티켓 1장을 소모하여 단 한 번의 제안을 할 수 있습니다.<br />
                                <span className="text-purple-400 font-medium">거절 시 재화 획득에 실패합니다.</span>
                            </p>
                        </div>
                    )}

                    {/* Chat Messages */}
                    <div className="w-full flex flex-col">
                        {msgList.map((msg, i) => (
                            <ChatBubble
                                key={msg._id}
                                sender={msg.sender}
                                text={msg.text}
                                authName={user?.firstName || "익명"}
                                statChanges={msg.statChanges ?? null}
                                isNew={i === msgList.length - 1 && msg.sender === "idol"}
                            />
                        ))}

                        {/* AI Typing indicator */}
                        {lastMsg?.sender === "player" && sending && (
                            <div className="flex justify-start mb-6">
                                <div className="glass rounded-2xl rounded-tl-sm px-5 py-4 border border-purple-500/20 shadow-lg">
                                    <div className="flex gap-2 items-center">
                                        {[0, 1, 2].map((i) => (
                                            <div key={i} className="w-2.5 h-2.5 rounded-full bg-purple-400"
                                                style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-2 tracking-widest uppercase">Thinking...</p>
                                </div>
                            </div>
                        )}

                        <div ref={chatEndRef} className="h-4" />
                    </div>
                </div>

                {/* Input / Result Area */}
                <div className="w-full p-4 border-t border-white/5 bg-black/60 backdrop-blur-md">

                    {/* Result Overlay Popup */}
                    {isClosed && showRewards && lastMsg?.rewards && (
                        <div className="mb-4 p-5 rounded-2xl border bg-gradient-to-br from-purple-900/40 to-black border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] animate-fade-in-up flex flex-col items-center">
                            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest text-center">
                                {lastMsg.rewards.egoShards > 5 ? "🎉 협상 성공!" : "❌ 협상 결렬"}
                            </h3>

                            <div className="flex gap-8 justify-center w-full mb-6">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 rounded-full glass border border-purple-500/30 flex items-center justify-center text-xl shadow-lg">
                                        💎
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[10px] text-gray-400 mb-0.5">EGO SHARDS</div>
                                        <div className="text-purple-300 font-black text-lg">+{lastMsg.rewards.egoShards}</div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 rounded-full glass border border-blue-500/30 flex items-center justify-center text-xl shadow-lg">
                                        💿
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[10px] text-gray-400 mb-0.5">DATA CORES</div>
                                        <div className="text-blue-300 font-black text-lg">+{lastMsg.rewards.dataCores}</div>
                                    </div>
                                </div>
                            </div>

                            <Link href="/" className="btn-shimmer text-white font-bold px-8 py-3.5 rounded-full text-sm w-full text-center hover:scale-[1.02] active:scale-[0.98] transition-all">
                                로비로 돌아가기
                            </Link>
                        </div>
                    )}

                    {/* Active Input Form */}
                    {!isClosed && (
                        <>
                            {error && (
                                <div className="mb-3 text-xs text-red-400 bg-red-500/10 rounded-lg px-4 py-3 border border-red-500/20">
                                    {error}
                                </div>
                            )}
                            {tickets > 0 ? (
                                <div className="relative group">
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                        placeholder="어떤 스케줄을 제안하시겠습니까? (단 한 번의 기회)"
                                        rows={3}
                                        disabled={sending}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl text-white text-sm px-5 py-4 resize-none outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all placeholder-gray-500 disabled:opacity-50"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!input.trim() || sending}
                                        className="absolute right-3 bottom-3 bg-purple-600 hover:bg-purple-500 text-white font-bold p-2.5 rounded-xl disabled:opacity-30 disabled:hover:bg-purple-600 transition-colors"
                                    >
                                        {sending ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <svg className="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-6 glass rounded-2xl border border-white/5">
                                    <p className="text-gray-400 text-sm mb-4">티켓이 부족하여 협상을 진행할 수 없습니다.</p>
                                    <Link href="/minigame" className="text-yellow-400 text-sm font-bold hover:underline">
                                        미니게임에서 티켓 획득하기 →
                                    </Link>
                                </div>
                            )}
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}
