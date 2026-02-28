// "use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Gemini REST API 직접 호출 (SDK 제거 → Windows ESM 오류 해결)
async function callGemini(apiKey: string, prompt: string, responseMimeType?: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // JSON 스키마를 명시적으로 주입하여 중간에 잘리는 현상 방지
    const expectedSchema = responseMimeType === "application/json" ? {
        type: "OBJECT",
        properties: {
            reply_text: { type: "STRING" },
            stat_changes: {
                type: "OBJECT",
                properties: {
                    vocal: { type: "INTEGER" },
                    dance: { type: "INTEGER" },
                    stress: { type: "INTEGER" },
                    ego: { type: "INTEGER" },
                    motivation: { type: "INTEGER" }
                }
            },
            mood: { type: "STRING" }
        },
        required: ["reply_text", "stat_changes", "mood"]
    } : undefined;

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            // 캐릭터의 까칠한 답변이 안전 필터에 걸려 강제 종료되는 것을 방지
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ],
            generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 2048, // 토큰 제한도 더 여유롭게 상향
                ...(responseMimeType ? { responseMimeType } : {}),
                ...(expectedSchema ? { responseSchema: expectedSchema } : {}),
            },
        }),
    });

    if (!res.ok) {
        // 404 에러가 나면 여기서 상세 내용을 출력하도록 로그를 추가했습니다.
        const errorDetail = await res.text();
        console.error("Gemini 상세 에러 내용:", errorDetail);
        throw new Error(`Gemini API error: ${res.status} - ${errorDetail}`);
    }

    const json = await res.json();

    // 응답 구조가 가끔 다를 수 있으므로 안전하게 접근합니다.
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        console.error("Gemini 응답 구조 이상:", JSON.stringify(json));
        return "";
    }
    return text;
}

// Step 1: AI 텍스트 응답 생성 + 스탯 변화 계산 (빠른 응답 우선)
export const negotiateSchedule = internalAction({
    args: {
        sessionId: v.id("gameSessions"),
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

        // 텍스트 전용 프롬프트 (SVG 제외 → 토큰 절감)
        const textPrompt = `You are ${args.memberName}, an independent K-Pop idol with a strong 'Ego'. The user is your producer.

성격: ${args.personality}

현재 스탯:
- 자아(Ego): ${args.ego}/100
- 스트레스(Stress): ${args.stress}/100
- 동기부여(Motivation): ${args.motivation}/100
- 보컬(Vocal): ${args.vocal}/100
- 댄스(Dance): ${args.dance}/100

프로듀서의 제안: "${args.userInput}"

행동 지침:
- 자아가 70 이상이고 제안이 자신의 가치관과 안 맞으면 → 강하게 거절 또는 역제안
- 스트레스가 80 이상이면 → 날카롭거나 감정적으로 반응
- 동기부여가 30 이하면 → 무기력하고 냉담하게 반응
- 좋은 제안이면 → 진심으로 수락하며 에너지 있게 반응

반드시 아래 JSON 형식으로만 응답하세요. JSON 외 어떤 텍스트도 출력하지 마세요:
{
  "reply_text": "한국어로 캐릭터답게 자연스러운 반응 (3문장 이내)",
  "stat_changes": {"vocal": 0, "dance": 0, "stress": 0, "ego": 0, "motivation": 0},
  "mood": "reject|accept|passive|angry"
}`;

        let replyText = "...잠시 생각 중이에요.";
        let statChanges = { vocal: 0, dance: 0, stress: 5, ego: 0, motivation: -2 };
        let mood = "passive";

        try {
            const raw = await callGemini(apiKey, textPrompt, "application/json");
            const cleaned = raw
                .replace(/^```json\s*/i, "")
                .replace(/^```\s*/i, "")
                .replace(/```\s*$/i, "")
                .trim();

            let parsed;
            try {
                parsed = JSON.parse(cleaned);
            } catch (parseError) {
                console.error("JSON 파싱 에러 발생! AI 응답 원본:", raw);
                throw parseError;
            }

            replyText = parsed.reply_text || replyText;
            mood = parsed.mood || "passive";
            const rc = parsed.stat_changes || {};
            statChanges = {
                vocal: Number(rc.vocal) || 0,
                dance: Number(rc.dance) || 0,
                stress: Number(rc.stress) || 0,
                ego: Number(rc.ego) || 0,
                motivation: Number(rc.motivation) || 0,
            };
        } catch (e: any) {
            replyText = `(시스템 오류: ${e.message?.slice(0, 60)})`;
        }

        // 텍스트 응답 먼저 저장 (빠른 UX)
        await ctx.runMutation(internal.game.applyStatChanges, {
            sessionId: args.sessionId,
            statChanges,
            replyText,
            svgAnimation: "", // 먼저 빈 값으로 저장
        });

        // SVG 생성은 비동기로 별도 처리 (UX 블로킹 없음)
        await ctx.scheduler.runAfter(0, internal.ai.generateSvg, {
            sessionId: args.sessionId,
            mood,
            memberName: args.memberName,
        });
    },
});

// Step 2: SVG 배경 생성 (별도 액션, 텍스트 응답과 독립 실행)
export const generateSvg = internalAction({
    args: {
        sessionId: v.id("gameSessions"),
        mood: v.string(),
        memberName: v.string(),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return;

        const svgPrompt = `Create a stunning SVG animation background for a K-Pop idol game.
Mood: ${args.mood} (reject=angry red/orange, accept=purple/gold glow, passive=gray/blue drift, angry=red noise shake)
Character: ${args.memberName}

Requirements:
- Full-screen SVG with width="100%" height="100%"
- Include <style> with CSS @keyframes animations
- Beautiful particle system with at least 8 animated elements
- Mood-appropriate colors and movement
- Only output the SVG element, no other text

SVG:`;

        try {
            const svgRaw = await callGemini(apiKey, svgPrompt);
            const svgMatch = svgRaw.match(/<svg[\s\S]*<\/svg>/i);
            if (!svgMatch) return;
            const svg = svgMatch[0];

            await ctx.runMutation(internal.game.updateSvg, {
                sessionId: args.sessionId,
                svg,
            });
        } catch {
            // SVG는 실패해도 게임 진행에 영향 없음
        }
    },
});
