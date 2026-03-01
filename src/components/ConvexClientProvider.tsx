"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function AuthInitializer() {
    const { user } = useUser();
    const ensurePlayer = useMutation(api.minigame.ensurePlayer);
    const initialized = useRef(false);

    useEffect(() => {
        if (user && !initialized.current) {
            initialized.current = true;
            ensurePlayer({ fallbackUserId: user.id }).catch(() => { });
        }
    }, [user, ensurePlayer]);

    return null;
}

export function ConvexClientProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            <AuthInitializer />
            {children}
        </ConvexProviderWithClerk>
    );
}
