"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Id } from "../../../convex/_generated/dataModel";
import BreakthroughEffect from "../../components/BreakthroughEffect";

export default function PersonaPage() {
    const { user, isLoaded } = useUser();
    const playerData = useQuery(api.game.getPlayerProfile, user ? { fallbackUserId: user.id } : "skip");
    const cards = useQuery(api.game.getUserCards, user ? { fallbackUserId: user.id } : "skip");
    const unlockNode = useMutation(api.persona.unlockPersonaNode);

    const [selectedCardId, setSelectedCardId] = useState<Id<"cards"> | null>(null);
    const [loadingNode, setLoadingNode] = useState<string | null>(null);
    const [showBreakthrough, setShowBreakthrough] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-select first card if none selected
    if (cards && cards.length > 0 && !selectedCardId) {
        setSelectedCardId(cards[0]._id);
    }

    const selectedCard = useMemo(() => {
        return cards?.find(c => c._id === selectedCardId);
    }, [cards, selectedCardId]);

    const handleUnlock = async (nodeId: string, costEgo: number, costData: number, isValued: boolean, bonusHr: number, bonusRh: number, bonusCa: number) => {
        if (!selectedCard || !playerData || loadingNode) return;
        const currentEgo = playerData.egoShards ?? 0;
        const currentData = playerData.dataCores ?? 0;

        if (currentEgo < costEgo || currentData < costData) {
            setError("재화가 부족합니다.");
            setTimeout(() => setError(null), 3000);
            return;
        }

        setLoadingNode(nodeId);
        setError(null);

        try {
            const res = await unlockNode({
                cardId: selectedCard._id,
                nodeId,
                costEgoShards: costEgo,
                costDataCores: costData,
                bonusHr,
                bonusRh,
                bonusCa,
                isValuedNode: isValued,
                fallbackUserId: user?.id,
            });

            if (res.isBreakthrough) {
                setShowBreakthrough(true);
            }
        } catch (e: any) {
            setError(e.message || "해금 실패");
        } finally {
            setLoadingNode(null);
        }
    };

    if (!isLoaded || !playerData || !cards) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Static Tree Definition for MVP (3 Nodes)
    const treeNodes = [
        { id: "node_1", type: "stat", label: "발성 기초", costEgo: 5, costData: 0, bonus: { hr: 5, rh: 0, ca: 0 }, isValued: false },
        { id: "node_2", type: "stat", label: "리듬 훈련", costEgo: 0, costData: 5, bonus: { hr: 0, rh: 5, ca: 0 }, isValued: false },
        { id: "node_3", type: "value", label: "에이전트적 돌파: 자아 실현", costEgo: 20, costData: 20, bonus: { hr: 15, rh: 15, ca: 15 }, isValued: true },
    ];

    const egoShards = playerData.egoShards ?? 0;
    const dataCores = playerData.dataCores ?? 0;

    return (
        <div className="min-h-screen flex flex-col relative bg-black text-white">

            {showBreakthrough && (
                <BreakthroughEffect onComplete={() => setShowBreakthrough(false)} />
            )}

            {/* Background Grid */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-grid" style={{ opacity: 0.3 }} />

            {/* HUD */}
            <nav className="relative z-20 flex items-center justify-between px-5 py-4 border-b border-white/10 glass">
                <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1.5 font-medium">
                    <span className="text-lg">←</span> 로비
                </Link>
                <div className="font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                    PERSONA MATRIX
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="text-lg drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">💎</span>
                        <span className="font-bold text-purple-300">{egoShards}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-lg drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">💿</span>
                        <span className="font-bold text-blue-300">{dataCores}</span>
                    </div>
                </div>
            </nav>

            <div className="flex-1 flex flex-col md:flex-row relative z-10 w-full max-w-6xl mx-auto p-4 gap-6">

                {/* Left: Card Selection List */}
                <div className="w-full md:w-1/3 flex flex-col gap-3">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 pl-1">보유 카드 목록</h2>
                    <div className="flex overflow-x-auto md:flex-col gap-3 pb-2 custom-scrollbar">
                        {cards.map(card => {
                            const isSelected = selectedCardId === card._id;
                            const rarityStars = "★".repeat(card.rarity) + "☆".repeat(5 - card.rarity);

                            return (
                                <button
                                    key={card._id}
                                    onClick={() => setSelectedCardId(card._id)}
                                    className={`flex-shrink-0 w-[200px] md:w-full text-left p-4 rounded-xl border transition-all duration-300 ${isSelected
                                        ? "bg-purple-900/30 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)] scale-[1.02]"
                                        : "bg-white/5 border-white/10 hover:bg-white/10"
                                        }`}
                                >
                                    <div className="text-[10px] text-yellow-400 mb-1">{rarityStars}</div>
                                    <div className="font-bold text-sm text-white mb-2">{card.cardName}</div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="text-center bg-black/40 rounded p-1">
                                            <div className="text-[9px] text-purple-300">HR</div>
                                            <div className="text-xs font-black">{card.hr_vocal}</div>
                                        </div>
                                        <div className="text-center bg-black/40 rounded p-1">
                                            <div className="text-[9px] text-blue-300">RH</div>
                                            <div className="text-xs font-black">{card.rh_dance}</div>
                                        </div>
                                        <div className="text-center bg-black/40 rounded p-1">
                                            <div className="text-[9px] text-yellow-300">CA</div>
                                            <div className="text-xs font-black">{card.ca_charisma}</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 text-[10px] text-gray-500 text-right">
                                        노드 {card.unlockedNodes?.length || 0}개 개방됨
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Matrix Tree */}
                <div className="w-full md:w-2/3 glass rounded-2xl border border-white/10 p-6 flex flex-col">
                    {error && (
                        <div className="mb-4 text-xs text-red-400 bg-red-500/10 rounded-lg px-4 py-3 border border-red-500/20 text-center animate-fade-in">
                            {error}
                        </div>
                    )}

                    {!selectedCard ? (
                        <div className="m-auto text-gray-500 text-sm">카드를 선택해주세요</div>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            <div className="mb-8 text-center">
                                <h3 className="text-xl font-bold text-white tracking-wide">{selectedCard.cardName} 매트릭스</h3>
                                <p className="text-xs text-gray-400 mt-2">자아 파편과 데이터 코어를 주입하여 새로운 가능성을 해방하십시오.</p>
                            </div>

                            {/* Node Tree UI (Simplified Column Layout for MVP) */}
                            <div className="flex flex-col items-center gap-6 m-auto">
                                {treeNodes.map((node, i) => {
                                    const isUnlocked = selectedCard.unlockedNodes?.some(n => n.nodeId === node.id);
                                    const isLoading = loadingNode === node.id;
                                    const isValued = node.isValued;

                                    // Visual constraints
                                    const canAfford = egoShards >= node.costEgo && dataCores >= node.costData;

                                    return (
                                        <div key={node.id} className="relative flex flex-col items-center">
                                            {/* Connecting Line to previous node */}
                                            {i > 0 && <div className={`h-8 w-1 mb-2 ${isUnlocked ? "bg-purple-500 shadow-[0_0_10px_#a855f7]" : "bg-white/10"}`} />}

                                            <div className={`w-80 p-4 rounded-xl border flex items-center justify-between transition-all ${isUnlocked
                                                ? "bg-purple-900/20 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                                                : isValued
                                                    ? "bg-gradient-to-r from-yellow-900/30 to-red-900/30 border-yellow-500/50"
                                                    : "bg-white/5 border-white/10 hover:border-white/30"
                                                }`}>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {isValued && <span className="text-xs">🔥</span>}
                                                        <span className={`font-bold text-sm ${isUnlocked ? "text-purple-300" : "text-gray-200"}`}>{node.label}</span>
                                                    </div>
                                                    <div className="text-[10px] flex gap-2 font-black">
                                                        {node.bonus.hr > 0 && <span className="text-purple-400">HR +{node.bonus.hr}</span>}
                                                        {node.bonus.rh > 0 && <span className="text-blue-400">RH +{node.bonus.rh}</span>}
                                                        {node.bonus.ca > 0 && <span className="text-yellow-400">CA +{node.bonus.ca}</span>}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-2 ml-4">
                                                    {!isUnlocked && (
                                                        <div className="text-[10px] flex gap-2 font-bold bg-black/50 px-2 py-1 rounded">
                                                            {node.costEgo > 0 && <span className={egoShards >= node.costEgo ? "text-purple-300" : "text-red-400"}>💎 {node.costEgo}</span>}
                                                            {node.costData > 0 && <span className={dataCores >= node.costData ? "text-blue-300" : "text-red-400"}>💿 {node.costData}</span>}
                                                        </div>
                                                    )}

                                                    {isUnlocked ? (
                                                        <span className="text-xs font-bold text-purple-400 border border-purple-400/50 px-3 py-1 rounded-full bg-purple-400/10">해방됨</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleUnlock(node.id, node.costEgo, node.costData, node.isValued, node.bonus.hr, node.bonus.rh, node.bonus.ca)}
                                                            disabled={isLoading || !canAfford}
                                                            className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all ${canAfford
                                                                ? isValued
                                                                    ? "bg-gradient-to-r from-yellow-500 to-red-500 text-white shadow-lg hover:scale-105"
                                                                    : "bg-white text-black hover:bg-gray-200"
                                                                : "bg-white/10 text-gray-500 cursor-not-allowed"
                                                                }`}
                                                        >
                                                            {isLoading ? "진행 중..." : "주입"}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
