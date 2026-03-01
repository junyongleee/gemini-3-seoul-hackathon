"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser, SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Id } from "../../convex/_generated/dataModel";
import Link from "next/link";
import Image from "next/image";
import BottomNav from "../components/BottomNav";

export default function HomePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const members = useQuery(api.seed.listMembers);
  const seedMembers = useMutation(api.seed.seedMembers);
  const playerData = useQuery(api.game.getPlayerProfile, user ? { fallbackUserId: user.id } : "skip");
  const getOrCreate = useMutation(api.game.getOrCreateSession);
  const cards = useQuery(api.game.getUserCards, user ? { fallbackUserId: user.id } : "skip");

  const [loading, setLoading] = useState<string | null>(null);

  const cardMap = new Map(cards?.map((c) => [c.memberId, c]));

  useEffect(() => {
    if (members !== undefined && members.length === 0) {
      seedMembers();
    }
  }, [members, seedMembers]);

  const handleSelectMember = async (memberId: Id<"members">, memberName: string) => {
    if (!user) return;

    if (!playerData || playerData.tickets <= 0) {
      alert("대화 티켓이 부족합니다! 획득처를 확인해주세요.");
      return;
    }

    setLoading(memberId);
    try {
      const sessionId = await getOrCreate({ memberId, memberName, fallbackUserId: user.id });
      router.push(`/game/${sessionId}`);
    } catch (e) {
      setLoading(null);
    }
  };

  const tickets = playerData?.tickets ?? 0;
  const influenceLevel = playerData?.influenceLevel ?? 1;
  const egoShards = playerData?.egoShards ?? 0;
  const dataCores = playerData?.dataCores ?? 0;

  return (
    <div className="h-screen w-full flex flex-col relative overflow-hidden">

      {/* ── Background: Group Image ── */}
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        <Image
          src="/velo_members_new.png"
          alt="VELO Members"
          fill
          priority
          className="object-cover object-[center_15%] sm:object-[center_30%]"
        />
        {/* Gradient overlay from bottom */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to top, rgba(5,5,16,0.95) 0%, rgba(5,5,16,0.5) 20%, transparent 40%)"
        }} />
        {/* Side neon accents */}
        <div className="absolute top-10 left-6 z-10 text-shadow-glow">
          <div className="text-5xl font-black tracking-wider text-purple-300">VELO</div>
          <div className="text-[10px] text-purple-300/60 tracking-[0.3em] mt-0.5">VIRTUAL IDOL MANAGEMENT</div>
        </div>
      </div>

      {/* ── Top HUD Bar ── */}
      <nav className="relative z-20 flex items-center justify-between px-5 py-3" style={{
        background: "linear-gradient(180deg, rgba(5,5,16,0.9) 0%, rgba(5,5,16,0.3) 100%)"
      }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg" style={{
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
          }}>👑</div>
          <div className="flex flex-col justify-center">
            <div className="text-[10px] text-purple-300 font-bold tracking-widest uppercase mb-0.5">Influence Level</div>
            <div className="flex items-center gap-3">
              <div className="text-xl font-black text-white leading-none">Lv.{influenceLevel}</div>
              <div className="w-24 h-2 bg-black/60 rounded-full overflow-hidden border border-white/10 shadow-inner relative">
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" style={{ width: '65%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Fandom Currencies */}
          <div className="hidden sm:flex items-center gap-3 mr-2 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
            <div className="flex items-center gap-1.5 text-xs">
              <span>💎</span>
              <span className="text-purple-300 font-bold">{egoShards}</span>
            </div>
            <div className="w-px h-3 bg-white/20" />
            <div className="flex items-center gap-1.5 text-xs">
              <span>💿</span>
              <span className="text-blue-300 font-bold">{dataCores}</span>
            </div>
          </div>

          {/* Tickets */}
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs shadow-inner" style={{
            background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.3)"
          }}>
            <span>🎟️</span>
            <span className="text-yellow-400 font-bold">{tickets}</span>
            <Link href="/minigame" className="text-yellow-500 hover:text-yellow-300 text-[10px] ml-0.5 font-black">+</Link>
          </div>

          <SignedIn>
            <div className="ml-2 border-2 border-purple-500/30 rounded-full p-0.5">
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="ml-2 text-xs font-bold text-black bg-white hover:bg-gray-200 px-4 py-1.5 rounded-full transition-colors">LOGIN</button>
            </SignInButton>
          </SignedOut>
        </div>
      </nav>

      <div className="flex-1 relative z-10" />

      {/* ── Mobile Currency Bar (shown only on small screens) ── */}
      <div className="absolute top-20 left-0 right-0 z-20 sm:hidden flex justify-center gap-6 px-4 py-2 bg-black/40 backdrop-blur-md">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-400">Ego Shards</span>
          <span className="text-purple-300 font-bold text-sm">💎 {egoShards}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-400">Data Cores</span>
          <span className="text-blue-300 font-bold text-sm">💿 {dataCores}</span>
        </div>
      </div>

      {/* ── Member Cards Row ── */}
      <div className="absolute bottom-28 left-0 right-0 z-20 w-full px-4">
        <div className="flex gap-8 sm:gap-12 md:gap-16 justify-center overflow-x-auto pb-4 min-w-max mx-auto px-4" style={{ scrollbarWidth: "none" }}>
          {members?.map((m, idx) => {
            const isLoading = loading === m._id;
            const borderColors = [
              "rgba(124,58,237,0.7)",
              "rgba(6,182,212,0.7)",
              "rgba(236,72,153,0.7)",
              "rgba(245,158,11,0.7)",
              "rgba(16,185,129,0.7)",
            ];

            const card = cardMap.get(m._id);
            const hr = card?.hr_vocal ?? 30;
            const rh = card?.rh_dance ?? 30;
            const ca = card?.ca_charisma ?? 30;
            const cardLevel = card?.level ?? 1;

            return (
              <div
                key={m._id}
                className="snap-center flex-shrink-0 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(124,58,237,0.2)] flex flex-col justify-between"
                style={{
                  width: "170px",
                  background: "rgba(10,10,25,0.6)",
                  border: `1px solid ${borderColors[idx]}`,
                  backdropFilter: "blur(16px)",
                  boxShadow: `inset 0 0 20px ${borderColors[idx].replace("0.7", "0.1")}`
                }}
              >
                <div className="pt-3 flex flex-col h-full justify-between">
                  <div className="flex flex-col gap-2 px-3 mb-3">
                    <div className="text-center mt-1">
                      <div className="font-black text-white text-[22px] leading-tight tracking-wide">{m.nameEn}</div>
                      <div className="text-[11px] mt-0.5 font-bold tracking-wider" style={{ color: m.colorFrom }}>{m.position}</div>
                    </div>

                    <div className="flex items-baseline justify-center gap-1.5 pt-2 border-t border-white/10">
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">LV.</span>
                      <span className="text-2xl font-black text-white leading-none">{cardLevel}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 px-1">
                      <div className="bg-white/5 rounded p-1.5 text-center">
                        <div className="text-[9px] text-purple-300 font-bold">HR</div>
                        <div className="text-sm text-white font-black mt-0.5">{hr}</div>
                      </div>
                      <div className="bg-white/5 rounded p-1.5 text-center">
                        <div className="text-[9px] text-blue-300 font-bold">RH</div>
                        <div className="text-sm text-white font-black mt-0.5">{rh}</div>
                      </div>
                      <div className="bg-white/5 rounded p-1.5 text-center">
                        <div className="text-[9px] text-yellow-300 font-bold">CA</div>
                        <div className="text-sm text-white font-black mt-0.5">{ca}</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center mt-auto w-full">
                    <SignedIn>
                      <button
                        onClick={() => handleSelectMember(m._id, m.name)}
                        disabled={isLoading}
                        className="w-full py-2.5 text-[15px] font-bold uppercase tracking-widest transition-all duration-300 hover:brightness-110 active:scale-95 shadow-lg group relative overflow-hidden rounded-t-none rounded-b-xl"
                        style={{ background: `linear-gradient(135deg, ${m.colorFrom}, ${m.colorTo})` }}
                      >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto relative z-10" />
                        ) : (
                          <span className="relative z-10 text-white drop-shadow-md">대화하기</span>
                        )}
                      </button>
                    </SignedIn>
                    <SignedOut>
                      <SignInButton mode="modal">
                        <button className="w-full py-2.5 text-[15px] font-bold uppercase tracking-widest bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white transition-colors rounded-t-none rounded-b-xl">
                          로그인
                        </button>
                      </SignInButton>
                    </SignedOut>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
