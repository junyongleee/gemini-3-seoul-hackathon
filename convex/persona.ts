import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { resolveUserId } from "./lib/auth";

export const unlockPersonaNode = mutation({
    args: {
        cardId: v.id("cards"),
        nodeId: v.string(),
        costEgoShards: v.number(),
        costDataCores: v.number(),
        bonusHr: v.number(),
        bonusRh: v.number(),
        bonusCa: v.number(),
        isValuedNode: v.boolean(),
        fallbackUserId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await resolveUserId(ctx, args.fallbackUserId);
        if (!userId) throw new Error("인증이 필요합니다.");

        // 1. 유저 재화 확인 및 차감
        const player = await ctx.db
            .query("players")
            .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", userId))
            .unique();

        if (!player) throw new Error("플레이어 정보를 찾을 수 없습니다.");

        const currentEgoShards = player.egoShards || 0;
        const currentDataCores = player.dataCores || 0;

        if (currentEgoShards < args.costEgoShards || currentDataCores < args.costDataCores) {
            throw new Error("재화가 부족합니다.");
        }

        await ctx.db.patch(player._id, {
            egoShards: currentEgoShards - args.costEgoShards,
            dataCores: currentDataCores - args.costDataCores,
        });

        // 2. 보유 카드 정보 확인
        let card = await ctx.db.get(args.cardId);

        if (!card || card.playerId !== userId) {
            throw new Error("유효하지 않은 카드이거나 소유권이 없습니다.");
        }

        // 중복 해금 방지
        const alreadyUnlocked = card.unlockedNodes.some(n => n.nodeId === args.nodeId);
        if (alreadyUnlocked) {
            throw new Error("이미 해금된 노드입니다.");
        }

        // 3. 스탯 증가 및 노드 해금 기록 추가
        const updatedNodes = [...card.unlockedNodes, { nodeId: args.nodeId, unlockedAt: Date.now() }];

        await ctx.db.patch(card._id, {
            hr_vocal: card.hr_vocal + args.bonusHr,
            rh_dance: card.rh_dance + args.bonusRh,
            ca_charisma: card.ca_charisma + args.bonusCa,
            unlockedNodes: updatedNodes,
        });

        // 4. 에이전트적 돌파 여부 반환 (프론트엔드 애니메이션 트리거용)
        let isBreakthrough = false;
        if (args.isValuedNode) {
            isBreakthrough = true;

            // 가치관 노드 돌파 시 코어 팬덤 특수 획득 로직
            await ctx.db.patch(player._id, {
                coreFandom: (player.coreFandom || 0) + 50,
            });
            return {
                success: true, isBreakthrough, newStats: {
                    hr: card.hr_vocal + args.bonusHr,
                    rh: card.rh_dance + args.bonusRh,
                    ca: card.ca_charisma + args.bonusCa,
                }
            };
        } else {
            return {
                success: true, isBreakthrough: false, newStats: {
                    hr: card.hr_vocal + args.bonusHr,
                    rh: card.rh_dance + args.bonusRh,
                    ca: card.ca_charisma + args.bonusCa,
                }
            };
        }
    },
});

export const levelUpCard = mutation({
    args: { cardId: v.id("cards") },
    handler: async (ctx, args) => {
        const userId = await resolveUserId(ctx, undefined);
        if (!userId) throw new Error("Unauthorized");

        const card = await ctx.db.get(args.cardId);
        if (!card || card.playerId !== userId) {
            throw new Error("Invalid card");
        }

        if (card.level >= 5) {
            throw new Error("Card is already at max level.");
        }

        const requiredShards = card.level * 10;

        const player = await ctx.db
            .query("players")
            .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", userId))
            .first();

        if (!player) throw new Error("Player not found");

        let shards = player.egoShards || 0;
        if (shards < requiredShards) {
            throw new Error(`자아 파편이 부족합니다. (필요: ${requiredShards})`);
        }

        shards -= requiredShards;

        await ctx.db.patch(player._id, { egoShards: shards });

        const statIncrease = 10;
        await ctx.db.patch(card._id, {
            level: card.level + 1,
            hr_vocal: card.hr_vocal + statIncrease,
            rh_dance: card.rh_dance + statIncrease,
            ca_charisma: card.ca_charisma + statIncrease,
        });

        return { success: true, newLevel: card.level + 1 };
    }
});
