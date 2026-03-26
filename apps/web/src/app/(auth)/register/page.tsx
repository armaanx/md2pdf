import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { getCurrentUser } from "@/lib/auth";

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col items-center justify-center gap-4">
          <AuthCard mode="register" />
          <p className="text-sm text-[#5b6b7f]">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#12677c]">
              Sign in
            </Link>
          </p>
        </div>
        <section className="rounded-[32px] bg-[#f7fbfc] p-10 shadow-[0_28px_64px_rgba(15,35,50,0.12)]">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#12677c]">
            What you get
          </p>
          <div className="mt-6 space-y-6">
            {[
              "Renderer-backed preview that stays close to the final PDF.",
              "Temporary asset uploads rewritten into allowed render sources.",
              "Queued exports with status tracking and downloadable output."
            ].map((item) => (
              <div key={item} className="rounded-[24px] border border-[#d9e2ec] bg-white p-5">
                <p className="text-base font-semibold text-[#102431]">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

