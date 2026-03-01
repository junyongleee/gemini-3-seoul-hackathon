"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Global Error:", error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-900 text-white leading-relaxed">
            <div className="text-6xl mb-4">🚨</div>
            <h2 className="text-2xl font-black mb-2 text-red-400">시스템 통신 오류</h2>
            <p className="text-gray-400 text-sm mb-6 text-center max-w-sm">
                예기치 않은 오류가 발생하여 화면을 표시할 수 없습니다.<br />
                잠시 후 다시 시도해주시거나, 로비로 돌아가주세요.
            </p>
            <div className="flex gap-4">
                <button
                    onClick={() => reset()}
                    className="px-6 py-3 text-sm font-bold rounded-full bg-red-600 hover:bg-red-700 transition"
                >
                    다시 시도
                </button>
                <Link
                    href="/"
                    className="px-6 py-3 text-sm font-bold rounded-full bg-gray-800 border border-gray-700 hover:bg-gray-700 transition"
                >
                    로비로 이동
                </Link>
            </div>
        </div>
    );
}
