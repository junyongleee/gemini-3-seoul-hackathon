/**
 * 공통 인증 유틸리티 — resolveUserId
 * game.ts, minigame.ts 등에서 중복 정의되지 않도록 단일 소스로 관리.
 */

type AuthContext = {
    auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
};

/**
 * 인증된 사용자 ID를 가져오는 헬퍼.
 * JWT가 유효하면 subject를 사용하고,
 * 로컬 개발 환경에서 JWT 검증이 안 될 때는 fallbackUserId를 사용.
 *
 * ⚠️ 프로덕션 배포 전 반드시 fallbackUserId 제거 필요.
 */
export async function resolveUserId(
    ctx: AuthContext,
    fallbackUserId?: string
): Promise<string | null> {
    const identity = await ctx.auth.getUserIdentity();
    if (identity) return identity.subject;
    // TODO: 프로덕션에서는 아래 줄을 제거하고 throw new Error("Authentication required")
    return fallbackUserId ?? null;
}
