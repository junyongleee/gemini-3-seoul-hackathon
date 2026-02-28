import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
    return (
        <div
            className="min-h-screen flex items-center justify-center"
            style={{ background: "var(--bg-primary)" }}
        >
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full opacity-20 blur-3xl"
                    style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }}
                />
                <div
                    className="absolute bottom-1/3 right-1/3 w-48 h-48 rounded-full opacity-15 blur-3xl"
                    style={{ background: "radial-gradient(circle, #06b6d4, transparent)" }}
                />
            </div>
            <SignUp />
        </div>
    );
}
