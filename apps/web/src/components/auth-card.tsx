"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type AuthCardProps = {
  mode: "login" | "register";
};

export function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const body =
      mode === "register"
        ? {
            name: String(formData.get("name") ?? ""),
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? "")
          }
        : {
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? "")
          };

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Authentication failed.");
      setPending(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="panel w-full max-w-md rounded-[28px] p-8">
      <div className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#12677c]">
          md2pdf Studio
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#102431]">
          {mode === "register" ? "Create your workspace" : "Welcome back"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#5b6b7f]">
          {mode === "register"
            ? "Sign in to upload assets, preview Mermaid diagrams, and export production-grade PDFs."
            : "Resume editing and export your Markdown documents with the renderer-backed workflow."}
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === "register" ? (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#24394d]">Name</span>
            <input
              name="name"
              required
              className="w-full rounded-2xl border border-[#d9e2ec] bg-white px-4 py-3 outline-none transition focus:border-[#12677c]"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#24394d]">Email</span>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-2xl border border-[#d9e2ec] bg-white px-4 py-3 outline-none transition focus:border-[#12677c]"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#24394d]">Password</span>
          <input
            name="password"
            type="password"
            minLength={8}
            required
            className="w-full rounded-2xl border border-[#d9e2ec] bg-white px-4 py-3 outline-none transition focus:border-[#12677c]"
          />
        </label>

        {error ? (
          <div className="rounded-2xl border border-[#fecaca] bg-[#fff5f5] px-4 py-3 text-sm text-[#991b1b]">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl bg-[#12677c] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0f5161] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Working..." : mode === "register" ? "Create account" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

