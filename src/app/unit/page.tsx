"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Id } from "../../../convex/_generated/dataModel";
import BottomNav from "../../components/BottomNav";

export default function UnitPage() {
    const { user, isLoaded } = useUser();
    const playerData = useQuery(api.game.getPlayerProfile, user ? { fallbackUserId: user.id } : "skip");
    const cards = useQuery(api.game.getUserCards, user ? { fallbackUserId: user.id } : "skip");
    // const units = useQuery(api.game.getUserUnits, user ? { fallbackUserId: user.id } : "skip");
    const units = useQuery(api.game.getUserUnits, user ? { fallbackUserId: user.id } : "skip");
    const saveUnit = useMutation(api.game.saveUserUnit);
    const levelUp = useMutation(api.persona.levelUpCard);

    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [draftUnit, setDraftUnit] = useState<(Id<"cards"> | null)[]>([null, null, null, null, null]);
    const [isSaving, setIsSaving] = useState(false);
    const [messages, setMessages] = useState<{ type: "success" | "error", text: string } | null>(null);

    // Initialize draft unit from DB
    useEffect(() => {
        if (units && units.length > 0 && draftUnit.every(x => x === null)) {
            const savedIds = units[0].cardIds;
            setDraftUnit([...savedIds]);
        }
    }, [units, draftUnit]);

    const handleSlotClick = (index: number) => {
        setSelectedSlot(selectedSlot === index ? null : index);
    };

    const handleCardClick = (cardId: Id<"cards">) => {
        if (selectedSlot === null) return;

        // Prevent duplicate cards in different slots
        if (draftUnit.includes(cardId)) {
            setMessages({ type: "error", text: "이미 배치된 카드는 중복으로 편성할 수 없습니다." });
            setTimeout(() => setMessages(null), 3000);
            return;
        }

        const newDraft = [...draftUnit];
        newDraft[selectedSlot] = cardId;
        setDraftUnit(newDraft);

        // Automatically move to the next empty slot if available
        const nextEmpty = newDraft.findIndex(id => id === null);
        if (nextEmpty !== -1) {
            setSelectedSlot(nextEmpty);
        } else {
            setSelectedSlot(null);
        }
    };

    const handleRemoveCard = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const newDraft = [...draftUnit];
        newDraft[index] = null;
        setDraftUnit(newDraft);
    };

    const handleAutoBest = () => {
        if (!cards) return;
        // Sort by total stats descending
        const sorted = [...cards].sort((a, b) => {
            const sumA = a.hr_vocal + a.rh_dance + a.ca_charisma;
            const sumB = b.hr_vocal + b.rh_dance + b.ca_charisma;
            return sumB - sumA;
        });

        const best5 = sorted.slice(0, 5).map(c => c._id);
        // Fill remaining with null if less than 5
        while (best5.length < 5) best5.push(null as any);
        setDraftUnit(best5);
        setMessages({ type: "success", text: "최적 편성 스쿼드로 설정되었습니다." });
        setTimeout(() => setMessages(null), 3000);
    };

    const handleSave = async () => {
        if (draftUnit.some(x => x === null)) {
            setMessages({ type: "error", text: "5개의 슬롯을 모두 채워야 저장할 수 있습니다." });
            setTimeout(() => setMessages(null), 3000);
            return;
        }

        setIsSaving(true);
        try {
            await saveUnit({
                cardIds: draftUnit as Id<"cards">[],
                unitName: "My Unit",
                fallbackUserId: user?.id,
            });
            setMessages({ type: "success", text: "유닛 편성이 성공적으로 저장되었습니다." });
        } catch (e: any) {
            setMessages({ type: "error", text: e.message || "저장 실패" });
        } finally {
            setIsSaving(false);
            setTimeout(() => setMessages(null), 3000);
        }
    };

    const handleUpgradeCard = async (cardId: Id<"cards">, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await levelUp({ cardId });
            setMessages({ type: "success", text: "카드 레벨업 완료!" });
        } catch (e: any) {
            setMessages({ type: "error", text: e.message || "레벨업 실패" });
        } finally {
            setTimeout(() => setMessages(null), 3000);
        }
    };

    // Calculate Totals
    const { totalHr, totalRh, totalCa, unitSkillBonus } = useMemo(() => {
        let hr = 0, rh = 0, ca = 0;
        let validCardsCount = 0;
        let synergyRarityCount = 0; // Simple synergy logic: count of 3+ star cards

        if (cards) {
            draftUnit.forEach(id => {
                if (id) {
                    const c = cards.find(card => card._id === id);
                    if (c) {
                        hr += c.hr_vocal;
                        rh += c.rh_dance;
                        ca += c.ca_charisma;
                        validCardsCount++;
                        if (c.rarity >= 3) synergyRarityCount++;
                    }
                }
            });
        }

        // Determine Unit Skill Bonus (ex: 5% bonus if all 5 cards are placed)
        let skillBonus = 1.0;
        if (validCardsCount === 5) {
            skillBonus += 0.05; // Base 5% full party bonus
            if (synergyRarityCount >= 3) {
                skillBonus += 0.05; // Additional 5% for high rarity synergy
            }
        }

        return { totalHr: hr, totalRh: rh, totalCa: ca, unitSkillBonus: skillBonus };
    }, [draftUnit, cards]);

    const getBuffMultiplier = (stat: "hr" | "rh" | "ca") => {
        if (!playerData || !playerData.activeBuffs) return 1.0;
        const now = Date.now();
        const buff = playerData.activeBuffs.find(b => b.stat === stat && b.expiresAt > now);
        return buff ? 1.0 + buff.amount : 1.0;
    };

    const buffHr = getBuffMultiplier("hr");
    const buffRh = getBuffMultiplier("rh");
    const buffCa = getBuffMultiplier("ca");

    const predictedScore = Math.floor(
        (totalHr * buffHr + totalRh * buffRh + totalCa * buffCa) * unitSkillBonus
    );

    if (!isLoaded || !playerData || !cards) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col relative bg-black text-white pb-20">
            {/* Background */}
            <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/40 via-black to-black pointer-events-none" />

            {/* HUD */}
            <nav className="relative z-20 flex items-center justify-between px-5 py-4 border-b border-white/10 glass">
                <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1.5 font-medium">
                    <span className="text-lg">←</span> 로비
                </Link>
                <div className="font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
                    UNIT FORMATION
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">🔥 LV.</span>
                        <span className="font-bold text-red-400">{playerData.influenceLevel || 1}</span>
                    </div>
                </div>
            </nav>

            <div className="flex-1 flex flex-col relative z-10 w-full max-w-5xl mx-auto p-4 md:p-6 gap-8">

                {messages && (
                    <div className={`fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 animate-fade-in font-bold text-sm ${messages.type === "success" ? "bg-green-500/20 text-green-300 border border-green-500/50" : "bg-red-500/20 text-red-300 border border-red-500/50"
                        }`}>
                        {messages.text}
                    </div>
                )}

                {/* Top: Score and Buffs */}
                <div className="glass p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1 w-full text-center md:text-left">
                        <div className="text-gray-400 text-sm font-bold tracking-widest mb-1">PREDICTED LIVE SCORE</div>
                        <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-yellow-600 drop-shadow-lg">
                            {predictedScore.toLocaleString()}
                        </div>
                        <div className="text-xs text-blue-300 mt-2 font-medium bg-blue-500/10 inline-block px-3 py-1 rounded-full border border-blue-500/30">
                            유닛 시너지 배율: <span className="font-bold">{(unitSkillBonus * 100).toFixed(0)}%</span>
                        </div>
                    </div>

                    {/* Active Buffs */}
                    {(buffHr > 1 || buffRh > 1 || buffCa > 1) && (
                        <div className="flex-1 flex flex-col gap-2 bg-white/5 p-4 rounded-xl border border-white/5 w-full">
                            <h3 className="text-xs font-bold text-gray-500 tracking-widest">일시적 협상 버프 적용됨 (Active)</h3>
                            <div className="flex gap-3">
                                {buffHr > 1 && <div className="text-[10px] font-black bg-purple-500/20 text-purple-300 px-2 py-1 rounded border border-purple-500/30">HR 가중치 +{(Math.round((buffHr - 1) * 100))}%</div>}
                                {buffRh > 1 && <div className="text-[10px] font-black bg-blue-500/20 text-blue-300 px-2 py-1 rounded border border-blue-500/30">RH 가중치 +{(Math.round((buffRh - 1) * 100))}%</div>}
                                {buffCa > 1 && <div className="text-[10px] font-black bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded border border-yellow-500/30">CA 가중치 +{(Math.round((buffCa - 1) * 100))}%</div>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Middle: Unit Slots */}
                <div>
                    <div className="flex justify-between items-end mb-4 px-2">
                        <h2 className="text-[15px] font-black text-white/90 drop-shadow-md">전투 덱</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={handleAutoBest}
                                className="text-xs font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded shadow border border-white/20 flex items-center gap-1 active:scale-95 transition-transform"
                            >
                                ⚡ 자동 편성
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="text-xs font-bold bg-green-500 hover:bg-green-400 text-black px-6 py-2 rounded shadow-[inset_0_-3px_0_rgba(0,0,0,0.2)] active:shadow-[inset_0_3px_0_rgba(0,0,0,0.2)] disabled:opacity-50 transition-all border border-green-700"
                            >
                                {isSaving ? "저장 중..." : "저장"}
                            </button>
                        </div>
                    </div>

                    <div className="bg-[#594333] p-4 rounded-xl border-[3px] border-[#3e2c1e] shadow-inner flex flex-wrap justify-center gap-3">
                        {draftUnit.map((cardId, index) => {
                            const isSelected = selectedSlot === index;
                            const card = cardId ? cards?.find(c => c._id === cardId) : null;

                            // Clash Royale Rarity Colors
                            const rarityColors: Record<number, { border: string, text: string, bg: string }> = {
                                1: { border: "border-gray-400", text: "text-gray-200", bg: "bg-gray-400" },          // Common
                                2: { border: "border-orange-400", text: "text-orange-200", bg: "bg-orange-500" },      // Rare
                                3: { border: "border-purple-500", text: "text-purple-200", bg: "bg-purple-600" },      // Epic
                                4: { border: "border-pink-500", text: "text-pink-200", bg: "bg-gradient-to-br from-pink-400 to-purple-600" }, // Legendary
                                5: { border: "border-yellow-400", text: "text-yellow-200", bg: "bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600" }, // Champion
                            };

                            const rColor = card ? rarityColors[card.rarity] || rarityColors[1] : null;

                            return (
                                <div
                                    key={`slot-${index}`}
                                    onClick={() => handleSlotClick(index)}
                                    className={`relative w-[85px] h-[115px] sm:w-[100px] sm:h-[135px] rounded-lg transition-transform cursor-pointer flex-shrink-0
                                        ${isSelected ? "ring-4 ring-blue-400 scale-105 z-10" : ""}
                                        ${!card ? "bg-black/20 border-2 border-dashed border-black/30 hover:bg-black/30" : "bg-black"}`}
                                    style={card ? { boxShadow: "0 4px 6px rgba(0,0,0,0.5)" } : {}}
                                >
                                    {!card ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-black/40">
                                            <span className="text-3xl font-black mb-1">+</span>
                                        </div>
                                    ) : (
                                        <div className={`w-full h-full flex flex-col rounded-lg overflow-hidden border-[3px] ${rColor!.border}`}>
                                            {/* Rarity/Elixir Drop (Top Left) */}
                                            <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black font-sans text-white border-2 border-black z-20 shadow-sm ${rColor!.bg}`}>
                                                {card.rarity}
                                            </div>

                                            {/* Remove Button (Top Right) */}
                                            <button
                                                onClick={(e) => handleRemoveCard(index, e)}
                                                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-600 border border-black text-white text-[10px] font-bold flex items-center justify-center hover:bg-red-500 z-20 shadow-sm"
                                            >
                                                ✕
                                            </button>

                                            {/* Image Area */}
                                            <div className="flex-1 relative bg-gradient-to-b from-[#3a405a] to-[#1a1f33] overflow-hidden flex items-end justify-center">
                                                {/* <img src={card.avatarUrl} alt={card.cardName} className="w-[120%] h-[120%] object-cover object-bottom" /> */}
                                                <div
                                                    className="absolute inset-0 bg-cover bg-center"
                                                    style={{ backgroundImage: `url(${card.avatarUrl})`, transform: 'scale(1.3) translateY(10%)' }}
                                                />
                                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent"></div>
                                                <span className="relative z-10 text-[10px] sm:text-xs font-black text-white px-1 leading-tight text-center drop-shadow-[0_1px_2px_rgba(0,0,0,1)] pb-1 w-full truncate">
                                                    {card.cardName}
                                                </span>
                                            </div>

                                            {/* Level / Upgrade Bar */}
                                            <div className="h-6 sm:h-7 bg-black w-full relative flex items-center justify-center border-t-2 border-black overflow-hidden">
                                                {/* If fully upgraded or cannot upgrade */}
                                                <div className="absolute inset-0 bg-gradient-to-b from-[#2d2d2d] to-[#1a1a1a]"></div>
                                                <span className="relative z-10 text-[10px] sm:text-[11px] font-bold text-gray-300 tracking-wider">
                                                    레벨 {card.level}
                                                </span>
                                            </div>

                                            {/* Progress Bar (Below Level) */}
                                            <div className="absolute -bottom-3 inset-x-1 h-5 bg-[#4a90e2] border-2 border-black rounded flex items-center">
                                                <div className="w-1/2 h-full bg-[#5dade2] rounded-l-sm border-r border-black/20"></div>
                                                <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white stroke-black" style={{ WebkitTextStroke: "0.5px black" }}>
                                                    {card.level}/{card.level + 1}
                                                </div>
                                                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-300 rotate-45 border-black border-l-2 border-t-2"></div>
                                            </div>

                                            {/* Upgrade Button Override (example logic for demonstration) */}
                                            {card.level < 5 && (
                                                <div
                                                    className="absolute -bottom-1 -inset-x-1 h-8 sm:h-9 bg-gradient-to-b from-[#8fe45c] to-[#4caf50] border-2 border-black rounded-lg flex flex-col items-center justify-center shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)] cursor-pointer hover:brightness-110 z-30 transform hover:-translate-y-0.5 transition-all"
                                                    onClick={(e) => handleUpgradeCard(card._id, e)}
                                                >
                                                    <span className="text-[9px] font-black text-white" style={{ WebkitTextStroke: "0.5px black" }}>업그레이드</span>
                                                    <span className="text-[10px] font-black text-yellow-300 flex items-center gap-0.5" style={{ WebkitTextStroke: "0.5px black" }}>
                                                        {card.level * 10} <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-black inline-block shadow-sm"></span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom: Roster */}
                <div className="mt-8 bg-[#3e2c1e] p-4 rounded-xl shadow-lg border-2 border-[#594333]">
                    <div className="flex justify-between items-center mb-4 px-2 border-b-2 border-[#594333] pb-2">
                        <h2 className="text-sm font-black text-white/90 drop-shadow-md">카드 컬렉션</h2>
                        <span className="text-xs font-bold text-gray-300">찾음: {cards?.length || 0}/25</span>
                    </div>

                    <div className="flex flex-wrap gap-3 md:gap-4 justify-center">
                        {cards?.map(card => {
                            const isDrafted = draftUnit.includes(card._id);

                            const rarityColors: Record<number, { border: string, text: string, bg: string }> = {
                                1: { border: "border-gray-400", text: "text-gray-200", bg: "bg-gray-400" },
                                2: { border: "border-orange-400", text: "text-orange-200", bg: "bg-orange-500" },
                                3: { border: "border-purple-500", text: "text-purple-200", bg: "bg-purple-600" },
                                4: { border: "border-pink-500", text: "text-pink-200", bg: "bg-gradient-to-br from-pink-400 to-purple-600" },
                                5: { border: "border-yellow-400", text: "text-yellow-200", bg: "bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600" },
                            };
                            const rColor = rarityColors[card.rarity] || rarityColors[1];

                            return (
                                <div
                                    key={card._id}
                                    onClick={() => handleCardClick(card._id)}
                                    className={`relative w-[85px] h-[115px] sm:w-[100px] sm:h-[135px] rounded-lg transition-transform flex-shrink-0
                                        ${isDrafted ? "opacity-40 grayscale cursor-not-allowed" : "cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_15px_rgba(0,0,0,0.5)]"}
                                        ${selectedSlot !== null && !isDrafted ? "animate-pulse ring-2 ring-yellow-400/50" : ""}
                                    `}
                                    style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.5)" }}
                                >
                                    <div className={`w-full h-full flex flex-col rounded-lg overflow-hidden border-[3px] ${rColor.border}`}>
                                        {/* Rarity/Elixir Drop */}
                                        <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black font-sans text-white border-2 border-black z-20 shadow-sm ${rColor.bg}`}>
                                            {card.rarity}
                                        </div>

                                        {/* Image Area */}
                                        <div className="flex-1 relative bg-gradient-to-b from-[#3a405a] to-[#1a1f33] overflow-hidden flex items-end justify-center">
                                            <div
                                                className="absolute inset-0 bg-cover bg-center"
                                                style={{ backgroundImage: `url(${card.avatarUrl})`, transform: 'scale(1.3) translateY(10%)' }}
                                            />
                                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent"></div>
                                            <span className="relative z-10 text-[10px] sm:text-xs font-black text-white px-1 leading-tight text-center drop-shadow-[0_1px_2px_rgba(0,0,0,1)] pb-1 w-full truncate">
                                                {card.cardName}
                                            </span>
                                        </div>

                                        {/* Level / Upgrade Bar */}
                                        <div className="h-6 sm:h-7 bg-black w-full relative flex items-center justify-center border-t-2 border-black overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-b from-[#2d2d2d] to-[#1a1a1a]"></div>
                                            <span className="relative z-10 text-[10px] sm:text-[11px] font-bold text-gray-300 tracking-wider">
                                                레벨 {card.level}
                                            </span>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="absolute -bottom-3 inset-x-1 h-5 bg-[#4a90e2] border-2 border-black rounded flex items-center overflow-hidden">
                                            <div className="w-1/2 h-full bg-[#5dade2] rounded-l-sm border-r border-black/20"></div>
                                            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white stroke-black" style={{ WebkitTextStroke: "0.5px black" }}>
                                                {card.level}/{card.level + 1}
                                            </div>
                                            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-300 rotate-45 border-black border-l-2 border-t-2"></div>
                                        </div>

                                        {/* Drafted Overlay */}
                                        {isDrafted && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
                                                <span className="text-xs font-black tracking-widest text-[#4a90e2] rotate-[-15deg] border-2 border-[#4a90e2] px-2 py-0.5 rounded shadow-[0_0_10px_rgba(74,144,226,0.5)]">
                                                    배치됨
                                                </span>
                                            </div>
                                        )}

                                        {/* Upgrade Button (Mock) */}
                                        {!isDrafted && card.level < 5 && (
                                            <div
                                                className="absolute -bottom-1 -inset-x-1 h-8 sm:h-9 bg-gradient-to-b from-[#8fe45c] to-[#4caf50] border-2 border-black rounded-lg flex flex-col items-center justify-center shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)] cursor-pointer hover:brightness-110 z-20 transform hover:-translate-y-0.5 transition-all"
                                                onClick={(e) => handleUpgradeCard(card._id, e)}
                                            >
                                                <span className="text-[8px] sm:text-[9px] font-black text-white" style={{ WebkitTextStroke: "0.5px black" }}>업그레이드</span>
                                                <span className="text-[9px] sm:text-[10px] font-black text-yellow-300 flex items-center gap-0.5" style={{ WebkitTextStroke: "0.5px black" }}>
                                                    {card.level * 10} <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-black inline-block shadow-sm"></span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
            <BottomNav />
        </div>
    );
}
