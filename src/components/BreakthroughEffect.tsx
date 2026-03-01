"use client";

import React, { useEffect, useState } from "react";

export default function BreakthroughEffect({
    onComplete
}: {
    onComplete: () => void;
}) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        // Animation takes 1.2s. Buffer makes it 1.5s total.
        const timer = setTimeout(() => {
            setVisible(false);
            onComplete();
        }, 1500);

        return () => clearTimeout(timer);
    }, [onComplete]);

    if (!visible) return null;

    return (
        <React.Fragment>
            <style>
                {`
                    #breakthrough-glow {
                        animation: shine 1.5s ease-out forwards;
                    }
                    .particle {
                        filter: url(#glow);
                        opacity: 0;
                        animation: explode 1.2s ease-out forwards;
                    }
                    @keyframes explode {
                        0% { transform: translate(0, 0) scale(1); opacity: 1; }
                        80% { opacity: 1; }
                        100% {
                            transform: translate(calc(var(--dx) * 1px), calc(var(--dy) * 1px)) scale(0);
                            opacity: 0;
                        }
                    }
                    @keyframes shine {
                        0% { opacity: 0; }
                        20% { opacity: 1; }
                        100% { opacity: 0; }
                    }
                `}
            </style>
            <div id="breakthrough-glow" className="fixed inset-0 z-[9998] pointer-events-none mix-blend-screen bg-gradient-to-tr from-yellow-500/20 to-purple-500/20" />
            <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", pointerEvents: "none", zIndex: 9999 }}>
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <g transform="translate(50, 50)">
                    <circle className="particle" r="1.5" fill="#FFFFFF" style={{ "--dx": -40, "--dy": -30, animationDelay: "0s" } as React.CSSProperties} />
                    <circle className="particle" r="1.2" fill="#FFFFFF" style={{ "--dx": 30, "--dy": -50, animationDelay: "0.1s" } as React.CSSProperties} />
                    <circle className="particle" r="1.8" fill="#FFFFFF" style={{ "--dx": 10, "--dy": 40, animationDelay: "0.05s" } as React.CSSProperties} />
                    <circle className="particle" r="1.0" fill="#FFFFFF" style={{ "--dx": -20, "--dy": 60, animationDelay: "0.15s" } as React.CSSProperties} />

                    <circle className="particle" r="2.0" fill="#FFD700" style={{ "--dx": -60, "--dy": 10, animationDelay: "0s" } as React.CSSProperties} />
                    <circle className="particle" r="1.5" fill="#FFD700" style={{ "--dx": 50, "--dy": 20, animationDelay: "0.1s" } as React.CSSProperties} />
                    <circle className="particle" r="2.5" fill="#FFD700" style={{ "--dx": -30, "--dy": -60, animationDelay: "0.2s" } as React.CSSProperties} />
                    <circle className="particle" r="1.2" fill="#FFD700" style={{ "--dx": 40, "--dy": -40, animationDelay: "0.05s" } as React.CSSProperties} />
                    <circle className="particle" r="1.8" fill="#FFD700" style={{ "--dx": 20, "--dy": 50, animationDelay: "0.1s" } as React.CSSProperties} />
                    <circle className="particle" r="2.2" fill="#FFD700" style={{ "--dx": -50, "--dy": 30, animationDelay: "0.25s" } as React.CSSProperties} />

                    <circle className="particle" r="1.0" fill="#FFD700" style={{ "--dx": 70, "--dy": -20, animationDelay: "0.1s" } as React.CSSProperties} />
                    <circle className="particle" r="1.0" fill="#FFFFFF" style={{ "--dx": -80, "--dy": -50, animationDelay: "0.2s" } as React.CSSProperties} />
                    <circle className="particle" r="1.3" fill="#FFD700" style={{ "--dx": 10, "--dy": -80, animationDelay: "0.15s" } as React.CSSProperties} />
                    <circle className="particle" r="1.0" fill="#FFFFFF" style={{ "--dx": -10, "--dy": 90, animationDelay: "0.05s" } as React.CSSProperties} />
                </g>
            </svg>
        </React.Fragment>
    );
}
