import Link from "next/link";
import { FileText } from "lucide-react";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { getCurrentUser } from "@/lib/auth";

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="app-shell relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(164,230,255,0.03),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(0,209,255,0.04),transparent_32%)]" />
      <div className="relative z-10 w-full max-w-[420px]">
        <div className="mb-10 text-center">
          <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-tr from-[#00d1ff] to-[#a4e6ff] shadow-lg shadow-[#00d1ff]/20">
            <FileText className="size-6 text-[#001f28]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Markdown Studio</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Build a workspace for rendering, validation, and PDF delivery.
          </p>
        </div>

        <AuthCard mode="register" />

        <div className="mt-8 flex items-center justify-between px-2 text-[13px] text-muted-foreground">
          <p>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-ring hover:underline">
              Sign in
            </Link>
          </p>
          <div className="flex gap-4">
            <span>Privacy</span>
            <span>Terms</span>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-1 opacity-50">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Renderer Mode: Queue-backed
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">v2.4.0-production</span>
        </div>
      </div>
    </main>
  );
}
