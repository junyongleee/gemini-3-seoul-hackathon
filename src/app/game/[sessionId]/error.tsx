"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GameError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Game Room Error:", error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="glass p-8 rounded-2xl flex flex-col items-center gap-4 text-center border border-red-500/20 max-w-sm w-full relative overflow-hidden">
                {/* Ambient Red Glow */}
                <div className="absolute inset-0 bg-red-500/5 blur-3xl pointer-events-none" />

                <div className="text-5xl mb-2 relative z-10 animate-bounce">💥</div>
                <h2 className="text-xl font-black text-red-400 relative z-10 w-full break-keep">게임 세션 오류</h2>

                <div className="bg-black/30 w-full p-3 rounded-lg text-left mt-2 relative z-10 border border-red-900/40">
                    <p className="text-xs text-red-300 break-words font-mono">
                        {error.message || "알 수 없는 시스템 오류가 발생했습니다."}
                    </p>
                </div>

                <div className="flex flex-col gap-3 w-full mt-4 relative z-10">
                    <button
                        onClick={() => reset()}
                        className="w-full py-3.5 font-bold rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        다시 시도
                    </button>
                    <Link
                        href="/"
                        className="w-full py-3.5 font-bold rounded-xl flex items-center justify-center bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        로비로 돌아가기
                    </Link>
                </div>
            </div>
        </div>
    );
}
