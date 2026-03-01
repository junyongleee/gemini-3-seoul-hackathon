import { internalQuery, internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { resolveUserId } from "./lib/auth";

// ─── Constants ───
const MAX_MESSAGE_LENGTH = 500;
const MESSAGE_COOLDOWN_MS = 3_000;

// ─── Queries ───

export const getSession = query({
    args: {
        sessionId: v.id("negotiations"),
        fallbackUserId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) return null;

        const userId = await resolveUserId(ctx, args.fallbackUserId);
        if (userId && session.playerId !== userId) return null;

        return session;
    },
});

export const getMessages = query({
    args: {
        sessionId: v.id("negotiations"),
        fallbackUserId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) return [];
        const userId = await resolveUserId(ctx, args.fallbackUserId);
        if (userId && session.playerId !== userId) return [];

        const messages = await ctx.db
            .query("negotiationMessages")
            .withIndex("by_negotiation", (q) => q.eq("negotiationId", args.sessionId))
            .order("desc")
            .take(100);
        return messages.reverse();
    },
});

export const getPlayerProfile = query({
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

export const getUserCards = query({
    args: { fallbackUserId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const userId = await resolveUserId(ctx, args.fallbackUserId);
        if (!userId) return [];

        return ctx.db
            .query("cards")
            .withIndex("by_player", (q) => q.eq("playerId", userId))
            .collect();
    },
});

export const getUserUnits = query({
    args: { fallbackUserId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const userId = await resolveUserId(ctx, args.fallbackUserId);
        if (!userId) return [];

        return ctx.db
            .query("units")
            .withIndex("by_player", (q) => q.eq("playerId", userId))
            .collect();
    },
});

export const saveUserUnit = mutation({
    args: {
        cardIds: v.array(v.id("cards")),
        unitName: v.string(),
        fallbackUserId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await resolveUserId(ctx, args.fallbackUserId);
        if (!userId) throw new Error("인증이 필요합니다.");

        if (args.cardIds.length !== 5) {
            throw new Error("유닛은 반드시 5장의 카드로 구성되어야 합니다.");
        }

        let total_hr = 0;
        let total_rh = 0;
        let total_ca = 0;

        for (const cardId of args.cardIds) {
            const card = await ctx.db.get(cardId);
            if (!card || card.playerId !== userId) {
                throw new Error("유효하지 않거나 소유하지 않은 카드가 포함되어 있습니다.");
            }
            total_hr += card.hr_vocal;
            total_rh += card.rh_dance;
            total_ca += card.ca_charisma;
        }

        const existingUnit = await ctx.db
            .query("units")
            .withIndex("by_player", (q) => q.eq("playerId", userId))
            .first();

        if (existingUnit) {
            await ctx.db.patch(existingUnit._id, {
                cardIds: args.cardIds,
                unitName: args.unitName,
                total_hr,
                total_rh,
                total_ca,
            });
            return existingUnit._id;
        } else {
            return await ctx.db.insert("units", {
                playerId: userId,
                cardIds: args.cardIds,
                unitName: args.unitName,
                total_hr,
                total_rh,
                total_ca,
            });
        }
    },
});

export const getOrCreateSession = mutation({
    args: {
        memberId: v.id("members"),
        memberName: v.string(),
        fallbackUserId: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<string> => {
        const userId = await resolveUserId(ctx, args.fallbackUserId);
        if (!userId) throw new Error("인증이 필요합니다.");

        // Check if there's an ongoing negotiation
        const existing = await ctx.db
            .query("negotiations")
            .withIndex("by_player_member", (q) =>
                q.eq("playerId", userId).eq("memberId", args.memberId)
            )
            .filter((q) => q.eq(q.field("isClosed"), false))
            .first();

        if (existing) return existing._id as string;

        return ctx.db.insert("negotiations", {
            playerId: userId,
            memberId: args.memberId,
            memberName: args.memberName,
            isClosed: false,
            stress: 0,
            ego: 10,
            motivation: 50,
            currentSvg: "<svg></svg>",
        }) as unknown as string;
    },
});

// ─── Mutations ───

export const sendProducerMessage = mutation({
    args: {
        sessionId: v.id("negotiations"),
        text: v.string(),
        fallbackUserId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("세션을 찾을 수 없습니다.");
        if (session.isClosed) throw new Error("이미 종료된 대화입니다.");

        const userId = await resolveUserId(ctx, args.fallbackUserId);
        if (!userId) throw new Error("인증이 필요합니다.");
        if (session.playerId !== userId) throw new Error("접근 권한이 없습니다.");

        const text = args.text.trim();
        if (text.length === 0) throw new Error("빈 메시지는 전송할 수 없습니다.");
        if (text.length > MAX_MESSAGE_LENGTH) throw new Error("메시지가 너무 깁니다.");

        const recentMessages = await ctx.db
            .query("negotiationMessages")
            .withIndex("by_negotiation", (q) => q.eq("negotiationId", args.sessionId))
            .order("desc")
            .take(1);
        if (recentMessages.length > 0 && recentMessages[0].sender === "player") {
            const lastCreatedAt = recentMessages[0]._creationTime;
            if (Date.now() - lastCreatedAt < MESSAGE_COOLDOWN_MS) {
                throw new Error("이전 메시지에 대한 응답을 기다려주세요.");
            }
        }

        const player = await ctx.db
            .query("players")
            .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", userId))
            .unique();

        if (!player || player.tickets <= 0) {
            throw new Error("대화 기조(티켓)가 부족합니다.");
        }

        // TICKET DEDUCTION (Atomic)
        await ctx.db.patch(player._id, { tickets: player.tickets - 1 });

        // CLOSE SESSION (Atomic)
        await ctx.db.patch(args.sessionId, { isClosed: true });

        // INSERT MESSAGE
        await ctx.db.insert("negotiationMessages", {
            negotiationId: args.sessionId,
            sender: "player",
            text,
        });

        const member = await ctx.db.get(session.memberId);
        if (!member) throw new Error("멤버를 찾을 수 없습니다.");

        await ctx.scheduler.runAfter(0, internal.ai.negotiateSchedule, {
            sessionId: args.sessionId,
            userInput: text,
            memberName: member.name,
            personality: member.personality,
            ego: session.ego,
            stress: session.stress,
            motivation: session.motivation,
            vocal: 30, // Passed for legacy compatibility in AI prompt
            dance: 30, // Passed for legacy compatibility in AI prompt
        });
    },
});

export const applyStatChanges = internalMutation({
    args: {
        sessionId: v.id("negotiations"),
        statChanges: v.object({
            stress: v.number(),
            ego: v.number(),
            motivation: v.number(),
        }),
        rewards: v.object({
            egoShards: v.number(),
            dataCores: v.number(),
            isBreakthrough: v.boolean(),
        }),
        replyText: v.string(),
        svgAnimation: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) return;

        const clamp = (n: number) => Math.max(0, Math.min(100, n));
        const newStats = {
            stress: clamp(session.stress + args.statChanges.stress),
            ego: clamp(session.ego + args.statChanges.ego),
            motivation: clamp(session.motivation + args.statChanges.motivation),
            currentSvg: args.svgAnimation || session.currentSvg,
        };

        await ctx.db.patch(args.sessionId, newStats);

        const player = await ctx.db
            .query("players")
            .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", session.playerId))
            .unique();
        if (player) {
            await ctx.db.patch(player._id, {
                egoShards: (player.egoShards || 0) + args.rewards.egoShards,
                dataCores: (player.dataCores || 0) + args.rewards.dataCores,
            });
        }

        await ctx.db.insert("negotiationMessages", {
            negotiationId: args.sessionId,
            sender: "idol",
            text: args.replyText,
            statChanges: args.statChanges,
            rewards: args.rewards,
        });
    },
});

export const updateSvg = internalMutation({
    args: { sessionId: v.id("negotiations"), svg: v.string() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.sessionId, { currentSvg: args.svg });
    },
});
