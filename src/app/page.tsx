"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser, SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Id } from "../../convex/_generated/dataModel";
import Link from "next/link";

export default function HomePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const members = useQuery(api.seed.listMembers);
  const seedMembers = useMutation(api.seed.seedMembers);
  const playerData = useQuery(api.minigame.getPlayerData);
  const ensurePlayer = useMutation(api.minigame.ensurePlayer);
  const getOrCreate = useAction(api.game.getOrCreateSession);
  const [loading, setLoading] = useState<string | null>(null);

  // members가 로드됐고 비어있을 때만 seed 실행 (중복 호출 방지)
  useEffect(() => {
    if (members !== undefined && members.length === 0) {
      seedMembers();
    }
  }, [members]);

  // 첫 접속 시 플레이어 프로필 보장
  useEffect(() => {
    if (user) {
      ensurePlayer().catch(() => { });
    }
  }, [user]);

  const handleSelectMember = async (memberId: Id<"members">, memberName: string) => {
    if (!user) return;

    // 티켓 체크
    if (!playerData || playerData.tickets <= 0) {
      alert("대화 티켓이 부족합니다! 미니게임을 클리어하여 티켓을 획득하세요.");
      router.push("/minigame");
      return;
    }

    setLoading(memberId);
    try {
      const sessionId = await getOrCreate({ memberId, memberName });
      router.push(`/game/${sessionId}`);
    } catch (e) {
      setLoading(null);
    }
  };

  const tickets = playerData?.tickets ?? 0;

  return (
    <div className="min-h-screen w-full bg-grid flex flex-col items-center" style={{ background: "var(--bg-primary)" }}>
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }} />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #ec4899, transparent)" }} />
      </div>

      {/* Nav */}
      <nav className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 pulse-glow" />
          <div>
            <span className="text-lg font-black gradient-text">VELO</span>
            <span className="text-xs text-gray-500 ml-2">아이돌 육성 시뮬레이션</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SignedIn>
            {/* Ticket Count */}
            <div className="glass rounded-full px-3 py-1.5 text-xs border border-yellow-500/20 flex items-center gap-1.5">
              <span>🎫</span>
              <span className="text-yellow-400 font-bold">{tickets}</span>
            </div>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="btn-shimmer text-white text-sm font-bold px-5 py-2 rounded-full">
                프로듀서로 시작하기
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex flex-col items-center w-full max-w-7xl mx-auto px-6 pt-16 pb-10">
        <div className="relative text-center w-full flex flex-col items-center">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-purple-300 mb-5 border border-purple-500/20">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            에이전틱 AI 아이돌 육성 시뮬레이션
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-3 leading-tight">
            <span className="gradient-text">여러분만의 아이돌을 육성해주세요</span>
          </h1>
          <p className="text-center text-gray-400 max-w-xl mt-4 leading-relaxed">
            미니게임으로 <strong className="text-yellow-400">대화 티켓</strong>을 획득하고,
            벨로(Velo) 멤버와 <strong className="text-white">전략적 대화</strong>로 성장시키세요.
          </p>
        </div>
      </main>

      {/* Mini-game CTA */}
      <SignedIn>
        <div className="w-full max-w-5xl mx-auto px-6 mb-8 flex justify-center">
          <Link
            href="/minigame"
            className="glass rounded-2xl px-8 py-5 border border-cyan-500/20 hover:border-cyan-500/50 transition-all hover:scale-[1.02] flex items-center gap-5 max-w-lg w-full"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl flex-shrink-0 float">
              🎯
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-base">안무 순발력 훈련</h3>
              <p className="text-gray-400 text-xs mt-0.5">1~25 숫자를 빠르게 클릭! 클리어하면 대화 티켓 획득</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-yellow-400 font-bold text-lg">{tickets}장</div>
              <div className="text-[10px] text-gray-500">보유 티켓</div>
            </div>
          </Link>
        </div>
      </SignedIn>

      {/* Member Select */}
      <div className="w-full max-w-7xl mx-auto px-6 pb-20 flex flex-col items-center">
        <h2 className="text-center text-sm font-medium text-gray-500 mb-6 tracking-widest uppercase w-full">
          멤버를 선택하세요
        </h2>

        {!members ? (
          <div className="flex justify-center py-16 w-full">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-5 max-w-5xl">
            {members.map((m) => (
              <button
                key={m._id}
                onClick={() => isLoaded && user ? handleSelectMember(m._id, m.name) : undefined}
                disabled={loading === m._id}
                className="w-full sm:w-72 md:w-80 concept-card glass rounded-2xl p-6 text-left border border-white/5 hover:border-white/20 group disabled:opacity-60 flex flex-col justify-between"
              >
                {/* Gradient avatar */}
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 float"
                  style={{ background: `linear-gradient(135deg, ${m.colorFrom}, ${m.colorTo})` }}
                >
                  {m.emoji}
                </div>

                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h3 className="text-lg font-bold text-white">{m.name}</h3>
                    <p className="text-xs font-medium" style={{ color: m.colorFrom }}>{m.position}</p>
                  </div>
                  {loading === m._id && (
                    <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                <p className="text-gray-400 text-xs leading-relaxed mt-2">{m.trait}</p>

                <div className="mt-4 flex items-center justify-between">
                  <SignedIn>
                    <span className="text-xs text-purple-400 group-hover:text-purple-300 transition-colors">
                      {loading === m._id ? "세션 생성 중..." : tickets > 0 ? "선택하기 →" : "🎫 티켓 필요"}
                    </span>
                  </SignedIn>
                  <SignedOut>
                    <span className="text-xs text-gray-600">로그인 필요</span>
                  </SignedOut>
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: m.colorFrom, boxShadow: `0 0 8px ${m.colorFrom}` }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}

        {!isLoaded || (!user && isLoaded) ? (
          <div className="text-center mt-10">
            <SignInButton mode="modal">
              <button className="btn-shimmer text-white font-bold text-base px-10 py-4 rounded-full glow-purple hover:scale-105 transition-transform">
                구글 로그인 후 시작 →
              </button>
            </SignInButton>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-gray-700 text-xs border-t border-white/5 w-full">
        Project Phoenix · Powered by Gemini 2.5 Flash & Convex Real-time DB
      </footer>
    </div>
  );
}
