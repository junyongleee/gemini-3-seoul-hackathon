import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Static member definitions (seeded once)
  members: defineTable({
    name: v.string(),          // "리아 (Lia)"
    nameEn: v.string(),        // "Lia"
    position: v.string(),      // "리더/메인보컬"
    personality: v.string(),   // 프롬프트에 주입할 성격 설명
    trait: v.string(),         // 표시용 한 줄 특성
    colorFrom: v.string(),
    colorTo: v.string(),
    emoji: v.string(),
    avatarUrl: v.optional(v.string()),     // 카드 프로필(아바타) 이미지 URL
  }),

  // Per-user player profile (tickets, stats, resources)
  players: defineTable({
    clerkUserId: v.string(),
    tickets: v.number(),
    totalGamesPlayed: v.number(),
    bestTime: v.optional(v.number()),
    producerTier: v.optional(v.string()),

    // New Progression & Fandom Stats
    influenceLevel: v.optional(v.number()),
    egoShards: v.optional(v.number()),
    dataCores: v.optional(v.number()),
    coreFandom: v.optional(v.number()),
    casualFandom: v.optional(v.number()),
    revenue: v.optional(v.number()),

    // Active Buffs from Negotiations
    activeBuffs: v.optional(v.array(v.object({
      stat: v.union(v.literal("hr"), v.literal("rh"), v.literal("ca")),
      amount: v.number(),
      expiresAt: v.number(),
    }))),
  }).index("by_clerk_user", ["clerkUserId"]),

  // Mini-game results log
  miniGameResults: defineTable({
    clerkUserId: v.string(),
    completionTimeMs: v.number(),
    rank: v.string(),
    ticketsAwarded: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["clerkUserId"]),

  // Cards (Idol Cards for Persona Matrix)
  cards: defineTable({
    playerId: v.string(), // clerkUserId
    memberId: v.id("members"),
    cardName: v.string(), // 카드 고유 이름 (예: 기본 리아, 여름 한정 리아)
    rarity: v.number(),   // 희귀도 (1~5)
    level: v.number(),
    hr_vocal: v.number(),
    rh_dance: v.number(),
    ca_charisma: v.number(),
    avatarUrl: v.optional(v.string()), // 카드 이미지
    unlockedNodes: v.array(v.object({
      nodeId: v.string(),
      unlockedAt: v.number(),
    })),
  }).index("by_player", ["playerId"])
    .index("by_player_member", ["playerId", "memberId"]),

  // Units (5-member formation)
  units: defineTable({
    playerId: v.string(), // clerkUserId
    unitName: v.string(),
    cardIds: v.array(v.id("cards")), // 5장의 카드 아이디
    total_hr: v.number(),
    total_rh: v.number(),
    total_ca: v.number(),
  }).index("by_player", ["playerId"]),

  // One-time Negotiation Sessions
  negotiations: defineTable({
    playerId: v.string(), // clerkUserId
    memberId: v.id("members"),
    memberName: v.string(),
    isClosed: v.boolean(),

    // Core psychological stats at the time of negotiation
    stress: v.number(),
    ego: v.number(),
    motivation: v.number(),

    // Current SVG background (latest from AI)
    currentSvg: v.optional(v.string()),
  })
    .index("by_player_member", ["playerId", "memberId"])
    .index("by_player", ["playerId"]),

  // Chat/Negotiation messages
  negotiationMessages: defineTable({
    negotiationId: v.id("negotiations"),
    sender: v.union(v.literal("player"), v.literal("idol")),
    text: v.string(),
    statChanges: v.optional(v.object({
      stress: v.number(),
      ego: v.number(),
      motivation: v.number(),
    })),
    rewards: v.optional(v.object({
      egoShards: v.number(),
      dataCores: v.number(),
      isBreakthrough: v.boolean(),
    })),
  }).index("by_negotiation", ["negotiationId"]),
});
