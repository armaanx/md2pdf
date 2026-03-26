import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] bg-[#102431] p-10 text-white shadow-[0_28px_64px_rgba(16,36,49,0.28)]">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a6dbe6]">
            Render contract preserved
          </p>
          <h1 className="mt-4 max-w-lg text-4xl font-extrabold tracking-tight">
            Production-safe Markdown to PDF with the same look you already trust.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-[#d5e5ea]">
            The app keeps your original sheet styling, Mermaid rendering, and single-page print
            strategy, while moving the renderer into a queue-backed Chromium service.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 text-sm text-[#d5e5ea]">
            <span className="rounded-full border border-white/20 px-4 py-2">Mermaid preserved</span>
            <span className="rounded-full border border-white/20 px-4 py-2">Worker-backed exports</span>
            <span className="rounded-full border border-white/20 px-4 py-2">Preview + upload flow</span>
          </div>
        </section>
        <div className="flex flex-col items-center justify-center gap-4">
          <AuthCard mode="login" />
          <p className="text-sm text-[#5b6b7f]">
            Need an account?{" "}
            <Link href="/register" className="font-semibold text-[#12677c]">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

