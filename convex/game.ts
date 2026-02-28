import { internalQuery, internalMutation, mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ─── Constants ───
const MAX_MESSAGE_LENGTH = 500;

// ─── Queries ───

/** Live-subscribe to session state */
export const getSession = query({
    args: { sessionId: v.id("gameSessions") },
    handler: async (ctx, args) => ctx.db.get(args.sessionId),
});

/** Live-subscribe to chat messages for a session */
export const getMessages = query({
    args: { sessionId: v.id("gameSessions") },
    handler: async (ctx, args) =>
        ctx.db
            .query("chatMessages")
            .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
            .collect(),
});

/** 플레이어 프로필 조회 (티켓 수 등) */
export const getPlayerProfile = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        return ctx.db
            .query("players")
            .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject))
            .unique();
    },
});

// ─── Internal Functions ───

export const findSession = internalQuery({
    args: {
        userId: v.string(),
        memberId: v.id("members"),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("gameSessions")
            .withIndex("by_user_member", (q) =>
                q.eq("userId", args.userId).eq("memberId", args.memberId)
            )
            .unique();
    },
});

export const createSession = internalMutation({
    args: {
        userId: v.string(),
        memberId: v.id("members"),
        memberName: v.string(),
    },
    handler: async (ctx, args) => {
        const sessionId = await ctx.db.insert("gameSessions", {
            userId: args.userId,
            memberId: args.memberId,
            memberName: args.memberName,
            vocal: 30,
            dance: 30,
            stress: 0,
            ego: 10,
            motivation: 50,
            fandomCore: 0,
            fandomCasual: 0,
            revenue: 0,
            unlockedNodes: [],
            currentSvg: "<svg></svg>",
        });
        return sessionId as string;
    },
});

// ─── Mutations ───

/** Player sends a schedule proposal message — 🔒 인증 + 티켓 차감 */
export const sendProducerMessage = mutation({
    args: {
        sessionId: v.id("gameSessions"),
        text: v.string(),
    },
    handler: async (ctx, args) => {
        // 1. 인증 검증
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("인증이 필요합니다. 로그인 후 다시 시도하세요.");
        }

        // 2. 세션 존재 및 소유권 확인
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("세션을 찾을 수 없습니다.");
        if (session.userId !== identity.subject) {
            throw new Error("접근 권한이 없습니다.");
        }

        // 3. 입력값 검증 (sanitization)
        const text = args.text.trim();
        if (text.length === 0) {
            throw new Error("빈 메시지는 전송할 수 없습니다.");
        }
        if (text.length > MAX_MESSAGE_LENGTH) {
            throw new Error(`메시지는 ${MAX_MESSAGE_LENGTH}자 이내로 작성해주세요.`);
        }

        // 4. 티켓 차감
        const player = await ctx.db
            .query("players")
            .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject))
            .unique();

        if (!player || player.tickets <= 0) {
            throw new Error("대화 티켓이 부족합니다. 미니게임을 플레이하여 티켓을 획득하세요.");
        }

        await ctx.db.patch(player._id, {
            tickets: player.tickets - 1,
        });

        // 5. 멤버 정보 로드
        const member = await ctx.db.get(session.memberId);
        if (!member) throw new Error("멤버를 찾을 수 없습니다.");

        // 6. 플레이어 메시지 저장
        await ctx.db.insert("chatMessages", {
            sessionId: args.sessionId,
            sender: "player",
            text,
        });

        // 7. AI 응답 스케줄링
        await ctx.scheduler.runAfter(0, internal.ai.negotiateSchedule, {
            sessionId: args.sessionId,
            userInput: text,
            memberName: member.name,
            personality: member.personality,
            ego: session.ego,
            stress: session.stress,
            motivation: session.motivation,
            vocal: session.vocal,
            dance: session.dance,
        });
    },
});

/** Internal: update session stats after AI responds */
export const applyStatChanges = internalMutation({
    args: {
        sessionId: v.id("gameSessions"),
        statChanges: v.object({
            vocal: v.number(),
            dance: v.number(),
            stress: v.number(),
            ego: v.number(),
            motivation: v.number(),
        }),
        replyText: v.string(),
        svgAnimation: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) return;

        const clamp = (n: number) => Math.max(0, Math.min(100, n));

        const newStats = {
            vocal: clamp(session.vocal + args.statChanges.vocal),
            dance: clamp(session.dance + args.statChanges.dance),
            stress: clamp(session.stress + args.statChanges.stress),
            ego: clamp(session.ego + args.statChanges.ego),
            motivation: clamp(session.motivation + args.statChanges.motivation),
            currentSvg: args.svgAnimation || session.currentSvg,
        };

        await ctx.db.patch(args.sessionId, newStats);

        await ctx.db.insert("chatMessages", {
            sessionId: args.sessionId,
            sender: "idol",
            text: args.replyText,
            svgAnimation: args.svgAnimation,
            statChanges: args.statChanges,
        });
    },
});

/** SVG 비동기 업데이트 (텍스트 응답과 분리) */
export const updateSvg = internalMutation({
    args: { sessionId: v.id("gameSessions"), svg: v.string() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.sessionId, { currentSvg: args.svg });
    },
});

/** 세션 생성/조회 — 🔒 서버에서 인증 ID 추출 */
export const getOrCreateSession = action({
    args: {
        memberId: v.id("members"),
        memberName: v.string(),
    },
    handler: async (ctx, args): Promise<string> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("인증이 필요합니다.");
        }
        const userId = identity.subject;

        const existing = await ctx.runQuery(internal.game.findSession, {
            userId,
            memberId: args.memberId,
        });
        if (existing) return existing._id as string;

        return ctx.runMutation(internal.game.createSession, {
            userId,
            memberId: args.memberId,
            memberName: args.memberName,
        });
    },
});
