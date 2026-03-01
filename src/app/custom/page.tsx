"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useUser, SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import BottomNav from "../../components/BottomNav";

// 카테고리 탭
const CATEGORIES = [
    { id: "hair", icon: "💇", label: "Hair" },
    { id: "top", icon: "👚", label: "Top" },
    { id: "bottom", icon: "👖", label: "Bottom" },
    { id: "shoes", icon: "👟", label: "Shoes" },
    { id: "acc", icon: "💎", label: "Acc" },
    { id: "glasses", icon: "👓", label: "Glasses" },
    { id: "hat", icon: "🎩", label: "Hat" },
    { id: "bag", icon: "👜", label: "Bag" },
];

// 더미 아이템 데이터 (MVP 데모용)
const ITEMS: Record<string, { name: string; emoji: string; rarity: string }[]> = {
    hair: [
        { name: "퍼플 롱", emoji: "💜", rarity: "S" },
        { name: "블론드 번", emoji: "💛", rarity: "A" },
        { name: "핑크 웨이브", emoji: "🩷", rarity: "S" },
        { name: "다크 숏", emoji: "🖤", rarity: "B" },
        { name: "레드 포니", emoji: "❤️", rarity: "A" },
        { name: "실버 밥", emoji: "🤍", rarity: "S" },
    ],
    top: [
        { name: "골드 재킷", emoji: "🧥", rarity: "S" },
        { name: "화이트 블라우스", emoji: "👔", rarity: "A" },
        { name: "크롭 후디", emoji: "🧶", rarity: "B" },
        { name: "레더 자켓", emoji: "🖤", rarity: "A" },
        { name: "시퀸 톱", emoji: "✨", rarity: "S" },
        { name: "오버사이즈 티", emoji: "👕", rarity: "C" },
        { name: "퍼프 슬리브", emoji: "🎀", rarity: "A" },
        { name: "데님 셔츠", emoji: "👖", rarity: "B" },
    ],
    bottom: [
        { name: "플리츠 스커트", emoji: "💃", rarity: "A" },
        { name: "와이드 팬츠", emoji: "👖", rarity: "B" },
        { name: "미니 스커트", emoji: "⚡", rarity: "A" },
        { name: "카고 팬츠", emoji: "🪖", rarity: "B" },
        { name: "골드 스커트", emoji: "✨", rarity: "S" },
        { name: "레깅스", emoji: "🦵", rarity: "C" },
    ],
    shoes: [
        { name: "플랫폼 부츠", emoji: "👢", rarity: "S" },
        { name: "스니커즈", emoji: "👟", rarity: "B" },
        { name: "하이힐", emoji: "👠", rarity: "A" },
        { name: "컴뱃 부츠", emoji: "🥾", rarity: "A" },
        { name: "골드 슈즈", emoji: "✨", rarity: "S" },
    ],
    acc: [
        { name: "초커 목걸이", emoji: "📿", rarity: "A" },
        { name: "크리스탈 이어링", emoji: "💎", rarity: "S" },
        { name: "체인 브레이슬릿", emoji: "⛓️", rarity: "B" },
        { name: "스타 핀", emoji: "⭐", rarity: "A" },
    ],
    glasses: [
        { name: "라운드 프레임", emoji: "👓", rarity: "B" },
        { name: "캣아이", emoji: "😎", rarity: "A" },
        { name: "LED 바이저", emoji: "🕶️", rarity: "S" },
    ],
    hat: [
        { name: "베레모", emoji: "🎨", rarity: "A" },
        { name: "캡", emoji: "🧢", rarity: "B" },
        { name: "크라운", emoji: "👑", rarity: "S" },
    ],
    bag: [
        { name: "미니백", emoji: "👛", rarity: "A" },
        { name: "체인백", emoji: "👜", rarity: "S" },
        { name: "토트", emoji: "🛍️", rarity: "B" },
    ],
};

function getRarityStyle(rarity: string) {
    switch (rarity) {
        case "S": return { border: "border-yellow-500/50", bg: "bg-yellow-500/10", text: "text-yellow-400" };
        case "A": return { border: "border-purple-500/40", bg: "bg-purple-500/10", text: "text-purple-400" };
        case "B": return { border: "border-cyan-500/30", bg: "bg-cyan-500/10", text: "text-cyan-400" };
        default: return { border: "border-gray-600/30", bg: "bg-gray-600/10", text: "text-gray-400" };
    }
}

export default function CustomPage() {
    const { user } = useUser();
    const playerData = useQuery(api.minigame.getPlayerData, user ? { fallbackUserId: user.id } : "skip");
    const [activeCategory, setActiveCategory] = useState("top");
    const [selectedItem, setSelectedItem] = useState<string | null>(null);

    const tickets = playerData?.tickets ?? 0;
    const totalGames = playerData?.totalGamesPlayed ?? 0;
    const rank = totalGames >= 20 ? "S" : totalGames >= 10 ? "A" : totalGames >= 5 ? "B" : "C";
    const items = ITEMS[activeCategory] ?? [];

    return (
        <div className="h-screen w-full flex flex-col relative overflow-hidden">

            {/* Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0" style={{
                    background: "radial-gradient(ellipse at 70% 50%, rgba(124,58,237,0.08) 0%, transparent 60%), radial-gradient(ellipse at 30% 30%, rgba(6,182,212,0.05) 0%, transparent 50%)"
                }} />
            </div>

            {/* ── Top HUD ── */}
            <nav className="relative z-20 flex items-center justify-between px-4 py-2.5" style={{
                background: "linear-gradient(180deg, rgba(5,5,16,0.95) 0%, rgba(5,5,16,0.7) 100%)"
            }}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{
                        background: "linear-gradient(135deg, #7c3aed, #ec4899)",
                        boxShadow: "0 0 12px rgba(124,58,237,0.4)"
                    }}>👗</div>
                    <div>
                        <div className="text-xs text-gray-400">Rank <span className="font-black text-yellow-400">{rank}</span></div>
                        <div className="text-sm font-bold text-white">
                            <SignedIn>Producer {user?.firstName ?? "K"}</SignedIn>
                            <SignedOut><SignInButton mode="modal"><button className="text-purple-400">로그인</button></SignInButton></SignedOut>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs" style={{
                        background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)"
                    }}>
                        <span>💜</span>
                        <span className="text-purple-300 font-bold">{tickets}</span>
                    </div>
                    <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
                </div>
            </nav>

            {/* ── Main Content ── */}
            <div className="flex-1 relative z-10 flex overflow-hidden">

                {/* Left: Item Grid */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Category Tabs */}
                    <div className="flex gap-1 px-3 py-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs transition-all duration-200 ${activeCategory === cat.id
                                    ? "text-white"
                                    : "text-gray-500 hover:text-gray-300"
                                    }`}
                                style={activeCategory === cat.id ? {
                                    background: "rgba(124,58,237,0.2)",
                                    border: "1px solid rgba(124,58,237,0.4)",
                                } : {
                                    background: "rgba(255,255,255,0.03)",
                                    border: "1px solid rgba(255,255,255,0.05)",
                                }}
                            >
                                <span className="text-lg">{cat.icon}</span>
                                <span className="text-[9px] font-bold tracking-wider">{cat.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Item Grid */}
                    <div className="flex-1 overflow-y-auto px-3 pb-2">
                        <div className="grid grid-cols-4 gap-2">
                            {items.map((item, i) => {
                                const rs = getRarityStyle(item.rarity);
                                const isSelected = selectedItem === `${activeCategory}-${i}`;
                                return (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedItem(isSelected ? null : `${activeCategory}-${i}`)}
                                        className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 hover:scale-105 active:scale-95 ${rs.bg} ${rs.border} border ${isSelected ? "ring-2 ring-purple-400 scale-105" : ""
                                            }`}
                                    >
                                        <span className="text-2xl">{item.emoji}</span>
                                        <span className="text-[9px] text-gray-400 leading-tight text-center px-1">{item.name}</span>
                                        <span className={`text-[8px] font-black ${rs.text}`}>{item.rarity}</span>
                                        {isSelected && (
                                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[8px]">✓</div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right: Character Preview */}
                <div className="w-[300px] flex-shrink-0 flex flex-col items-center justify-center relative" style={{
                    background: "linear-gradient(180deg, rgba(124,58,237,0.05) 0%, rgba(236,72,153,0.05) 100%)",
                    borderLeft: "1px solid rgba(255,255,255,0.05)"
                }}>
                    {/* Neon text */}
                    <div className="absolute top-4 right-4 text-right">
                        <div className="text-lg font-black" style={{
                            color: "#ec4899",
                            textShadow: "0 0 15px rgba(236,72,153,0.5)"
                        }}>STYLE</div>
                        <div className="text-2xl font-black" style={{
                            color: "#a78bfa",
                            textShadow: "0 0 20px rgba(167,139,250,0.5)"
                        }}>DEBUT!</div>
                    </div>

                    {/* Character silhouette */}
                    <div className="w-48 h-72 rounded-3xl flex items-center justify-center" style={{
                        background: "linear-gradient(180deg, rgba(124,58,237,0.1) 0%, rgba(236,72,153,0.1) 100%)",
                        border: "1px solid rgba(255,255,255,0.08)"
                    }}>
                        <img
                            src="/velo_members.png"
                            alt="Character Preview"
                            className="h-full object-contain object-center"
                            style={{ filter: "drop-shadow(0 0 20px rgba(124,58,237,0.3))" }}
                        />
                    </div>

                    {/* Selected item info */}
                    {selectedItem && (
                        <div className="mt-4 glass rounded-xl px-4 py-2 text-center border border-purple-500/20">
                            <div className="text-xs text-gray-400">선택된 아이템</div>
                            <div className="text-sm font-bold text-white mt-0.5">
                                {items[parseInt(selectedItem.split("-")[1])]?.name}
                            </div>
                            <button className="mt-2 px-6 py-1.5 rounded-lg text-xs font-bold text-white" style={{
                                background: "linear-gradient(135deg, #7c3aed, #ec4899)"
                            }}>
                                착용하기
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Bottom Navigation ── */}
            <BottomNav />
        </div>
    );
}
