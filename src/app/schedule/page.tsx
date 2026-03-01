"use client";

import React, { useState } from "react";
import BottomNav from "../../components/BottomNav";
import { useUser, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

export default function SchedulePage() {
    // Current month: March 2026
    const daysInMonth = 31;
    const firstDayOfWeek = 0; // Sunday

    const [selectedDate, setSelectedDate] = useState<number | null>(null);
    const [practices, setPractices] = useState<Record<number, string>>({});

    const handleDateClick = (day: number) => {
        // Tuesday check (0=Sun, 1=Mon, 2=Tue)
        const dayOfWeek = (firstDayOfWeek + day - 1) % 7;
        // Wait, if first day is 0 (Sunday), day 1 is index 0. So dayOfWeek for day is `(firstDayOfWeek + day - 1) % 7`.
        if (dayOfWeek === 2) {
            alert("매주 화요일은 음악 방송 일정이 고정되어 있습니다!");
            return;
        }
        setSelectedDate(day);
    };

    const handleSetPractice = (type: string) => {
        if (selectedDate === null) return;
        setPractices(prev => ({ ...prev, [selectedDate]: type }));
        setSelectedDate(null);
    };

    return (
        <div className="min-h-screen flex flex-col relative">
            {/* Header */}
            <header className="px-5 py-6 text-center z-10">
                <h1 className="text-2xl font-black text-white tracking-widest uppercase text-shadow-glow">SCHEDULE</h1>
                <p className="text-purple-300 text-xs mt-1">2026 MARCH</p>
            </header>

            {/* Layout Container */}
            <div className="flex-1 w-full max-w-6xl mx-auto px-6 lg:px-12 z-10 pb-32 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-12 lg:gap-20">

                {/* Left: Calendar & Actions */}
                <div className="w-full max-w-lg flex flex-col pt-4">
                    <div className="glass rounded-3xl p-5 border border-white/10 shadow-2xl">
                        <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-gray-400 mb-3">
                            <div className="text-red-400">SUN</div>
                            <div>MON</div>
                            <div className="text-purple-400">TUE</div>
                            <div>WED</div>
                            <div>THU</div>
                            <div>FRI</div>
                            <div className="text-blue-400">SAT</div>
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-square" />
                            ))}

                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const dayOfWeek = (firstDayOfWeek + i) % 7;
                                const isTuesday = dayOfWeek === 2;
                                const practice = practices[day];

                                return (
                                    <button
                                        key={day}
                                        onClick={() => handleDateClick(day)}
                                        className={`relative aspect-square rounded-xl border flex flex-col items-center justify-start pt-1.5 transition-all
                                            ${isTuesday ? "border-purple-500/50 bg-purple-500/10 shadow-[inset_0_0_10px_rgba(168,85,247,0.2)]" : "border-white/5 bg-white/5 hover:bg-white/10"}
                                            ${selectedDate === day ? "ring-2 ring-cyan-400 border-transparent bg-cyan-900/40 scale-105 z-10" : ""}
                                        `}
                                    >
                                        <span className={`text-xs font-bold ${isTuesday ? "text-purple-300" : "text-gray-300"} ${dayOfWeek === 0 && !isTuesday ? "text-red-300" : ""} ${dayOfWeek === 6 && !isTuesday ? "text-blue-300" : ""}`}>
                                            {day}
                                        </span>

                                        <div className="mt-auto mb-1 w-full flex justify-center h-4 items-center">
                                            {isTuesday && <span className="text-sm drop-shadow-md">📺</span>}
                                            {practice === 'vocal' && <span className="text-sm drop-shadow-md">🎤</span>}
                                            {practice === 'dance' && <span className="text-sm drop-shadow-md">💃</span>}
                                            {practice === 'rest' && <span className="text-sm drop-shadow-md">💤</span>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Selected Date Action Panel */}
                    {selectedDate !== null && (
                        <div className="mt-6 glass rounded-2xl p-5 border border-cyan-500/30 animate-in fade-in slide-in-from-bottom-4 shadow-[0_10px_30px_rgba(6,182,212,0.2)]">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white font-bold text-sm">3월 {selectedDate}일 스케줄 설정</h3>
                                <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-white p-1">✕</button>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <button onClick={() => handleSetPractice('vocal')} className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-purple-500/20 border border-purple-500/50 text-[10px] font-bold text-purple-200 hover:bg-purple-500/40 transition-colors">
                                    <span className="text-2xl">🎤</span>
                                    보컬 트레이닝
                                </button>
                                <button onClick={() => handleSetPractice('dance')} className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-blue-500/20 border border-blue-500/50 text-[10px] font-bold text-blue-200 hover:bg-blue-500/40 transition-colors">
                                    <span className="text-2xl">💃</span>
                                    댄스 트레이닝
                                </button>
                                <button onClick={() => handleSetPractice('rest')} className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-green-500/20 border border-green-500/50 text-[10px] font-bold text-green-200 hover:bg-green-500/40 transition-colors">
                                    <span className="text-2xl">💤</span>
                                    휴식
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Character Image Area */}
                <div className="hidden lg:flex flex-1 w-full max-w-lg items-center justify-center mt-4 pt-12">
                    <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.15)] group">
                        {/* Image */}
                        <img
                            src="/schedule_bg.jpg"
                            alt="Idol Group Schedule"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent z-10" />

                        <div className="absolute bottom-0 left-0 right-0 p-8 z-20">
                            <h2 className="text-xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-lg">NEXT STAGE</h2>
                            <p className="text-gray-300 text-xs font-medium">데뷔를 향한 그녀들의 찬란한 비상, 프로듀서님의 스케줄에 모든 것이 달려있습니다.</p>

                            <div className="flex gap-4 mt-4">
                                <span className="glass border border-purple-500/50 text-purple-300 text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm">
                                    D-24
                                </span>
                                <span className="glass border border-blue-500/50 text-blue-300 text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm">
                                    1st Mini Album
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-1/4 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl opacity-50" />
            </div>

            <BottomNav />
        </div>
    );
}

