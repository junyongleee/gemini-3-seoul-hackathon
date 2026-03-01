// "use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const STAT_CHANGE_LIMIT = 15;
const VALID_MOODS = ["accept", "reject", "passive", "counter_offer", "angry"] as const;

function seededRandom(seed: string, index: number): number {
    let hash = 0;
    const s = seed + String(index);
    for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
    }
    return Math.abs(hash % 100) / 100;
}

function clampDelta(d: number): number {
    return Math.max(-STAT_CHANGE_LIMIT, Math.min(STAT_CHANGE_LIMIT, d));
}

function normalizeMood(raw: string): string {
    if ((VALID_MOODS as readonly string[]).includes(raw)) return raw;
    function dist(a: string, b: string): number {
        const m = a.length, n = b.length;
        const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
            Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
        );
        for (let i = 1; i <= m; i++)
            for (let j = 1; j <= n; j++)
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)
                );
        return dp[m][n];
    }
    let best = "passive";
    let bestDist = Infinity;
    for (const m of VALID_MOODS) {
        const d = dist(raw.toLowerCase(), m);
        if (d < bestDist) { best = m; bestDist = d; }
    }
    return best;
}

function sanitizeSvg(svg: string): string {
    return svg
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
        .replace(/\bon\w+\s*=\s*"[^"]*"/gi, "")
        .replace(/\bon\w+\s*=\s*'[^']*'/gi, "")
        .replace(/javascript\s*:/gi, "");
}

async function callGemini(apiKey: string, prompt: string, responseMimeType?: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const expectedSchema = responseMimeType === "application/json" ? {
        type: "OBJECT",
        properties: {
            reply_text: { type: "STRING" },
            stat_changes: {
                type: "OBJECT",
                properties: {
                    stress: { type: "INTEGER" },
                    ego: { type: "INTEGER" },
                    motivation: { type: "INTEGER" }
                }
            },
            rewards: {
                type: "OBJECT",
                properties: {
                    egoShards: { type: "INTEGER" },
                    dataCores: { type: "INTEGER" }
                }
            },
            mood: { type: "STRING" }
        },
        required: ["reply_text", "stat_changes", "rewards", "mood"]
    } : undefined;

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" }
            ],
            generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 1024,
                ...(responseMimeType ? { responseMimeType } : {}),
                ...(expectedSchema ? { responseSchema: expectedSchema } : {}),
            },
        }),
    });

    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
    const json = await res.json();
    const candidate = json.candidates?.[0];
    if (candidate?.finishReason === "SAFETY") throw new Error("SAFETY_BLOCKED");
    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) throw new Error("EMPTY_RESPONSE");
    return text;
}

export const negotiateSchedule = internalAction({
    args: {
        sessionId: v.id("negotiations"),
        userInput: v.string(),
        memberName: v.string(),
        personality: v.string(),
        ego: v.number(),
        stress: v.number(),
        motivation: v.number(),
        vocal: v.number(),
        dance: v.number(),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY not set");

        const textPrompt = `You are ${args.memberName}, an independent K-Pop idol. The user is your producer proposing a schedule or activity.
이 대화는 지시가 아니라 '협상'입니다.

성격: ${args.personality}

현재 당신의 상태 (0~100):
- 자아(Ego): ${args.ego}/100 (높을수록 자신의 주관 뚜렷, 낮을수록 순응)
- 스트레스(Stress): ${args.stress}/100 
- 동기부여(Motivation): ${args.motivation}/100

프로듀서의 제안: "${args.userInput}"

행동 지침:
- 자아가 높고 스트레스가 높다면 무리한 제안은 "reject" 하거나 "counter_offer"(역제안)를 하세요.
- 제안이 합리적이고 동기부여가 된다면 "accept" 하세요.
- 평가에 따라 추가 보상(rewards: egoShards, dataCores) 재화를 0~10 사이로 산정하여 지급해 주세요. (거절할 경우 0으로 세팅)

JSON 응답 형식: { "reply_text": "결과 대사", "stat_changes": {"stress": 0, "ego": 0, "motivation": 0}, "rewards": {"egoShards": 5, "dataCores": 3}, "mood": "accept|reject|counter_offer|passive|angry" }

JSON:`;

        const seed = args.sessionId + args.userInput;
        let replyText = "...잠시 생각 중이에요.";
        let statChanges = { stress: 0, ego: 0, motivation: 0 };
        let rewards = { egoShards: 0, dataCores: 0, isBreakthrough: false };
        let mood = "passive";

        try {
            const raw = await callGemini(apiKey, textPrompt, "application/json");
            const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
            const parsed = JSON.parse(cleaned);

            replyText = parsed.reply_text || replyText;
            mood = normalizeMood(parsed.mood || "passive");

            const rc = parsed.stat_changes || {};
            statChanges = {
                stress: clampDelta(Number(rc.stress) || 0),
                ego: clampDelta(Number(rc.ego) || 0),
                motivation: clampDelta(Number(rc.motivation) || 0),
            };

            const isSuccess = (mood === "accept" || mood === "counter_offer");
            if (isSuccess) {
                const baseShards = 10 + Math.floor(seededRandom(seed, 1) * 11); // 10~20
                const aiBonus = (parsed.rewards && typeof parsed.rewards.egoShards === 'number') ? Math.min(10, Math.max(0, parsed.rewards.egoShards)) : 0;
                rewards.egoShards = baseShards + aiBonus;
                rewards.dataCores = 5 + Math.floor(seededRandom(seed, 2) * 6);
            } else {
                rewards.egoShards = 1 + Math.floor(seededRandom(seed, 3) * 2); // 1~2 위로금
                rewards.dataCores = 0;
            }

            rewards.isBreakthrough = (isSuccess && ((statChanges.ego >= 5) || (statChanges.motivation >= 8)));
        } catch (e: any) {
            console.error("AI 파싱 에러 (Fallback 적용):", e.message);
            const fallbacks = ["...지금은 할 말이 없어요.", "정리하고 나중에 답변할게요."];
            replyText = fallbacks[Math.floor(seededRandom(seed, 4) * fallbacks.length)];
        }

        await ctx.runMutation(internal.game.applyStatChanges, {
            sessionId: args.sessionId,
            statChanges,
            rewards,
            replyText,
            svgAnimation: "",
        });

        await ctx.scheduler.runAfter(0, internal.ai.generateSvg, {
            sessionId: args.sessionId,
            mood,
            memberName: args.memberName,
        });
    },
});

export const generateSvg = internalAction({
    args: {
        sessionId: v.id("negotiations"),
        mood: v.string(),
        memberName: v.string(),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return;
        const svgPrompt = `Create a stunning background effect SVG for a K-Pop idol game. Mood: ${args.mood}. Name: ${args.memberName}. Must be full-screen 100% width and height, beautiful glows, single SVG element.`;
        try {
            const svgRaw = await callGemini(apiKey, svgPrompt);
            const svgMatch = svgRaw.match(/<svg[\s\S]*<\/svg>/i);
            if (!svgMatch) return;
            await ctx.runMutation(internal.game.updateSvg, {
                sessionId: args.sessionId,
                svg: sanitizeSvg(svgMatch[0]),
            });
        } catch { /* Ignored */ }
    },
});
