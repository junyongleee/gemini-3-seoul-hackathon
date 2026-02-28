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
  }),

  // Per-user player profile (tickets, stats)
  players: defineTable({
    clerkUserId: v.string(),
    tickets: v.number(),
    totalGamesPlayed: v.number(),
    bestTime: v.optional(v.number()),
  }).index("by_clerk_user", ["clerkUserId"]),

  // Mini-game results log
  miniGameResults: defineTable({
    clerkUserId: v.string(),
    completionTimeMs: v.number(),
    rank: v.string(),
    ticketsAwarded: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["clerkUserId"]),

  // One game session per user per member
  gameSessions: defineTable({
    userId: v.string(),
    memberId: v.id("members"),
    memberName: v.string(),

    // Core stats (0-100)
    vocal: v.number(),
    dance: v.number(),
    stress: v.number(),
    ego: v.number(),
    motivation: v.number(),

    // Fandom ecosystem
    fandomCore: v.number(),    // 0-100
    fandomCasual: v.number(),  // 0-100
    revenue: v.number(),       // in-game currency

    // Unlocked ego nodes
    unlockedNodes: v.array(v.string()),

    // Current SVG background (latest from AI)
    currentSvg: v.string(),
  })
    .index("by_user_member", ["userId", "memberId"])
    .index("by_user", ["userId"]),

  // Chat history
  chatMessages: defineTable({
    sessionId: v.id("gameSessions"),
    sender: v.union(v.literal("player"), v.literal("idol")),
    text: v.string(),
    svgAnimation: v.optional(v.string()),
    statChanges: v.optional(v.object({
      vocal: v.number(),
      dance: v.number(),
      stress: v.number(),
      ego: v.number(),
      motivation: v.number(),
    })),
  }).index("by_session", ["sessionId"]),
});
