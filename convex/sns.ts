// "use node";
import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const callGeminiDeepThink = async (apiKey: string, prompt: string): Promise<string> => {
    // 딥띵크(사고)를 유도하기 위한 프롬프트 기법 사용
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.2, // 논리적인 평가를 위해 낮춤
                maxOutputTokens: 1024,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        score: { type: "INTEGER" },
                        reasoning: { type: "STRING" },
                    },
                    required: ["score", "reasoning"],
                }
            },
        }),
    });

    if (!res.ok) throw new Error("Gemini API error");
    const json = await res.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text;
};

export const handleSNSEvent = action({
    args: {
        clerkUserId: v.string(),
        crisisDescription: v.string(),
        userResponseText: v.string(),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY not set");

        const prompt = `You are an expert PR crisis manager parsing a K-Pop agency's response.
Crisis Summary: "${args.crisisDescription}"
Agency/Producer Response: "${args.userResponseText}"

Evaluate the agency's response logically on a scale from 1 to 100 based on transparency, sincerity, and mitigation strategy.
Provide reasoning and the final score (1-100).
JSON Format: { "score": 85, "reasoning": "Clear explanation..." }`;

        let score = 50;
        let reasoning = "분석이 불가능하여 중립적으로 처리됩니다.";

        try {
            const rawScore = await callGeminiDeepThink(apiKey, prompt);
            if (rawScore) {
                const parsed = JSON.parse(rawScore.trim());
                score = parsed.score || 50;
                reasoning = parsed.reasoning || reasoning;
            }
        } catch (e: any) {
            console.error("Deep Think Parse Failed", e.message);
        }

        // Apply stat changes via internal mutation
        await ctx.runMutation(internal.sns.applySnsResult, {
            clerkUserId: args.clerkUserId,
            score,
        });

        return { score, reasoning };
    }
});

export const applySnsResult = internalMutation({
    args: {
        clerkUserId: v.string(),
        score: v.number(),
    },
    handler: async (ctx, args) => {
        const player = await ctx.db
            .query("players")
            .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", args.clerkUserId))
            .unique();

        if (!player) return;

        let casual = player.casualFandom || 0;
        let core = player.coreFandom || 0;

        if (args.score >= 80) { // 대처 매우 우수
            const converted = Math.floor(casual * 0.1); // 캐주얼 10% 코어로 전환
            casual -= converted;
            core += converted + 50;
        } else if (args.score >= 50) { // 평범
            casual = Math.max(0, casual - 50);
        } else { // 대처 미흡
            casual = Math.max(0, casual - 200);
            core = Math.max(0, core - 100);
        }

        await ctx.db.patch(player._id, {
            casualFandom: casual,
            coreFandom: core,
        });
    }
});
