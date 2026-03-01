"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
    const pathname = usePathname();

    // Helper function to check if a route is active
    const isActive = (path: string) => {
        if (path === "/" && pathname !== "/") return false;
        return pathname.startsWith(path);
    };

    const tabs = [
        { path: "/", label: "LOBBY", icon: "/nav_lobby.png" },
        { path: "/custom", label: "CUSTOM", icon: "/nav_custom.png" },
        { path: "/schedule", label: "SCHEDULE", icon: "/nav_schedule.png" },
        { path: "/minigame", label: "TRAINING", icon: "/nav_training.png" },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around py-3 border-t" style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "rgba(5,5,16,0.95)",
            backdropFilter: "blur(24px)",
            paddingBottom: "max(12px, env(safe-area-inset-bottom))" // Safe area for modern mobile devices
        }}>
            {tabs.map((tab) => {
                const active = isActive(tab.path);

                return (
                    <Link key={tab.path} href={tab.path} className="flex flex-col items-center gap-1 relative group w-16">
                        {active ? (
                            <div className="w-14 h-14 -mt-7 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)] scale-110 transition-all duration-300 z-10 p-1.5 bg-black/50 overflow-visible" style={{
                                background: "linear-gradient(135deg, #7c3aed, #ec4899)",
                            }}>
                                <img src={tab.icon} alt={tab.label} className="w-full h-full object-contain drop-shadow-lg" />
                            </div>
                        ) : (
                            <div className="w-9 h-9 group-hover:scale-110 transition-transform group-hover:brightness-125" style={{ filter: "grayscale(30%) brightness(0.8)" }}>
                                <img src={tab.icon} alt={tab.label} className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                            </div>
                        )}
                        <span className={`text-[9px] font-bold tracking-widest drop-shadow-md text-center ${active ? "text-white mt-1" : "text-gray-500 group-hover:text-purple-300 mt-1"}`}>
                            {tab.label}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
