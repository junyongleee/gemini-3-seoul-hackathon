import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { resolveUserId } from "./lib/auth";

// ─── Constants ───
const INITIAL_TICKETS = 10;
const GAME_TIME_LIMIT_MS = 60_000;
const MIN_POSSIBLE_TIME_MS = 3_000; // 3초 미만은 물리적으로 불가능 → 치트
const DUPLICATE_WINDOW_MS = 5_000;  // 5초 내 중복 제출 방지

function calculateRank(timeMs: number): string {
    if (timeMs <= 15_000) return "S";
    if (timeMs <= 30_000) return "A";
    if (timeMs <= 45_000) return "B";
    return "C";
}

function calculateInfluenceLevel(totalGames: number): number {
    if (totalGames >= 20) return 4;
    if (totalGames >= 10) return 3;
    if (totalGames >= 5) return 2;
    return 1;
}

// ─── Queries ───

/** 현재 유저의 플레이어 프로필 조회 (티켓 수, 최고 기록 등) */
export const getPlayerData = query({
    args: { fallbackUserId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const userId = await resolveUserId(ctx, args.fallbackUserId);
        if (!userId) return null;

        return ctx.db
            .query("players")
            .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", userId))
            .unique();
    },
});

/** 최근 미니게임 기록 조회 (최대 10건) */
export const getRecentResults = query({
    args: { fallbackUserId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const userId = await resolveUserId(ctx, args.fallbackUserId);
        if (!userId) return [];

        return ctx.db
            .query("miniGameResults")
            .withIndex("by_user", (q) => q.eq("clerkUserId", userId))
            .order("desc")
            .take(10);
    },
});

// ─── Mutations ───

/** 미니게임 결과 제출 — 서버 사이드 검증 후 티켓 지급 */
export const submitMiniGameResult = mutation({
    args: {
        completionTimeMs: v.number(),
        fallbackUserId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // 1. 인증 검증
        const clerkUserId = await resolveUserId(ctx, args.fallbackUserId);
        if (!clerkUserId) {
            throw new Error("인증이 필요합니다. 로그인 후 다시 시도하세요.");
        }

        // 2. 입력값 서버 검증 — 치트 방지
        const { completionTimeMs } = args;

        if (!Number.isFinite(completionTimeMs) || completionTimeMs <= 0) {
            throw new Error("유효하지 않은 게임 결과입니다.");
        }

        if (completionTimeMs < MIN_POSSIBLE_TIME_MS) {
            console.error(`치트 의심: ${clerkUserId}, completionTimeMs=${completionTimeMs}`);
            throw new Error("비정상적인 게임 결과가 감지되었습니다.");
        }

        if (completionTimeMs > GAME_TIME_LIMIT_MS) {
            throw new Error("제한 시간을 초과했습니다.");
        }

        // 3. Rate limiting — 5초 내 중복 제출 방지
        const now = Date.now();
        const recentResults = await ctx.db
            .query("miniGameResults")
            .withIndex("by_user", (q) => q.eq("clerkUserId", clerkUserId))
            .order("desc")
            .take(1);

        if (recentResults.length > 0) {
            const lastResult = recentResults[0];
            if (now - lastResult.createdAt < DUPLICATE_WINDOW_MS) {
                throw new Error("너무 빠른 재요청입니다. 잠시 후 다시 시도하세요.");
            }
        }

        // 4. 랭크 계산 및 티켓 지급
        const rank = calculateRank(completionTimeMs);
        const ticketsAwarded = 1;

        // 5. 플레이어 프로필 업데이트 or 생성
        const existingPlayer = await ctx.db
            .query("players")
            .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
            .unique();

        if (existingPlayer) {
            const newTotal = existingPlayer.totalGamesPlayed + 1;
            await ctx.db.patch(existingPlayer._id, {
                tickets: existingPlayer.tickets + ticketsAwarded,
                totalGamesPlayed: newTotal,
                influenceLevel: calculateInfluenceLevel(newTotal),
                bestTime:
                    existingPlayer.bestTime === undefined || completionTimeMs < existingPlayer.bestTime
                        ? completionTimeMs
                        : existingPlayer.bestTime,
            });
        } else {
            await ctx.db.insert("players", {
                clerkUserId,
                tickets: INITIAL_TICKETS + ticketsAwarded,
                totalGamesPlayed: 1,
                bestTime: completionTimeMs,
            });
        }

        // 6. 결과 기록 저장
        await ctx.db.insert("miniGameResults", {
            clerkUserId,
            completionTimeMs,
            rank,
            ticketsAwarded,
            createdAt: now,
        });

        return { rank, ticketsAwarded, completionTimeMs };
    },
});

/** 플레이어 프로필이 없으면 초기 생성 (첫 접속 시) */
export const ensurePlayer = mutation({
    args: { fallbackUserId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const clerkUserId = await resolveUserId(ctx, args.fallbackUserId);
        if (!clerkUserId) {
            // 아직 인증 토큰이 동기화되지 않음 → 조용히 반환
            return null;
        }

        const existing = await ctx.db
            .query("players")
            .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
            .unique();

        if (existing) return existing._id;

        const newPlayerId = await ctx.db.insert("players", {
            clerkUserId,
            tickets: INITIAL_TICKETS,
            totalGamesPlayed: 0,
            influenceLevel: 1,
            egoShards: 0,
            dataCores: 0,
            coreFandom: 0,
            casualFandom: 0,
        });

        // 🌟 처음 가입 시 기본 1성 카드 5장(전 멤버) 일괄 지급
        const members = await ctx.db.query("members").collect();
        for (const m of members) {
            await ctx.db.insert("cards", {
                playerId: clerkUserId,
                memberId: m._id,
                cardName: `기본 ${m.nameEn}`,
                rarity: 1,
                level: 1,
                hr_vocal: 30,
                rh_dance: 30,
                ca_charisma: 30,
                unlockedNodes: [],
                avatarUrl: m.avatarUrl, // 기본 카드 이미지로 멤버 아바타 풀 사용
            });
        }

        return newPlayerId;
    },
});
