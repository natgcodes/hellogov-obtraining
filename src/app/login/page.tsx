"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    const user = data.user;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      setError("We couldn't load your HelloGov profile.");
      setLoading(false);
      return;
    }

    if (profile.role === "trainer") {
      router.push("/trainer");
    } else {
      router.push("/learn");
    }

    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f6f8f9] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-64px)] w-full max-w-[1180px] overflow-hidden rounded-[28px] border border-[#e4e7ec] bg-white shadow-[0_20px_60px_rgba(16,24,40,0.08)] lg:grid-cols-[1.05fr_0.95fr]">

        {/* LEFT — HELLOGOV / ONBOARDING */}

        <section className="relative hidden overflow-hidden bg-[#EAF8FA] p-12 lg:flex lg:flex-col lg:justify-between">

          {/* Decorative shapes */}

          <div
            aria-hidden="true"
            className="absolute -right-28 -top-28 h-72 w-72 rounded-full border-[52px] border-white/45"
          />

          <div
            aria-hidden="true"
            className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#D5F2F6]"
          />

          <div
            aria-hidden="true"
            className="absolute bottom-[23%] right-[-35px] h-24 w-24 rounded-full bg-[#08A9C1]/10"
          />

          {/* Logo */}

          <div className="relative z-10">
            <Image
              src="/hellogov-logo-transparent.png"
              alt="HelloGov"
              width={190}
              height={70}
              priority
              className="h-auto w-[165px] object-contain"
            />
          </div>

          {/* Main content */}

          <div className="relative z-10 max-w-[440px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#07879B]">
              Customer Support Onboarding
            </p>

            <h1 className="mt-4 text-[42px] font-semibold leading-[1.08] tracking-[-0.045em] text-[#111827]">
              Everything you need to get started.
            </h1>

            <p className="mt-5 max-w-[390px] text-[14px] leading-6 text-[#53646b]">
              Learn the process, practice real scenarios, and keep
              track of your progress throughout your HelloGov
              onboarding.
            </p>

            {/* Journey preview */}

            <div className="mt-9 max-w-[390px] rounded-[18px] border border-white/90 bg-white/70 p-5 shadow-[0_10px_30px_rgba(8,169,193,0.07)] backdrop-blur-sm">

              {/* Learn */}

              <div className="flex items-center gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#08A9C1] text-[12px] font-bold text-white">
                  1
                </div>

                <div>
                  <p className="text-[12px] font-semibold text-[#172033]">
                    Learn
                  </p>

                  <p className="mt-0.5 text-[11px] text-[#667085]">
                    Build your HelloGov foundation.
                  </p>
                </div>
              </div>

              <div className="ml-[17px] h-4 w-px bg-[#A9DFE7]" />

              {/* Practice */}

              <div className="flex items-center gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#8DD4DF] bg-[#F1FBFC] text-[12px] font-bold text-[#07879B]">
                  2
                </div>

                <div>
                  <p className="text-[12px] font-semibold text-[#172033]">
                    Practice
                  </p>

                  <p className="mt-0.5 text-[11px] text-[#667085]">
                    Apply what you learn to real scenarios.
                  </p>
                </div>
              </div>

              <div className="ml-[17px] h-4 w-px bg-[#A9DFE7]" />

              {/* Get ready */}

              <div className="flex items-center gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#8DD4DF] bg-[#F1FBFC] text-[12px] font-bold text-[#07879B]">
                  3
                </div>

                <div>
                  <p className="text-[12px] font-semibold text-[#172033]">
                    Get ready
                  </p>

                  <p className="mt-0.5 text-[11px] text-[#667085]">
                    Complete your journey and prepare for live work.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}

          <div className="relative z-10 flex items-center gap-2 text-[10px] text-[#6F9197]">
            <span>HelloGov Learning Center</span>
            <span>•</span>
            <span>Onboarding</span>
          </div>
        </section>

        {/* RIGHT — LOGIN */}

        <section className="flex min-h-[650px] items-center justify-center px-6 py-10 sm:px-10 lg:min-h-0 lg:px-14">
          <div className="w-full max-w-[390px]">

            {/* Mobile logo */}

            <div className="mb-10 lg:hidden">
              <Image
                src="/hellogov-logo-transparent.png"
                alt="HelloGov"
                width={165}
                height={60}
                priority
                className="h-auto w-[145px] object-contain"
              />
            </div>

            {/* Header */}

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#07879B]">
                Learning Center
              </p>

              <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.04em] text-[#172033]">
                Welcome back
              </h2>

              <p className="mt-2 text-[13px] leading-5 text-[#667085]">
                Sign in to continue your onboarding journey.
              </p>
            </div>

            {/* Form */}

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-[12px] font-semibold text-[#344054]"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@hellogov.com"
                  disabled={loading}
                  className="h-12 w-full rounded-[11px] border border-[#d0d5dd] bg-white px-4 text-[13px] text-[#172033] outline-none transition placeholder:text-[#98a2b3] focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10 disabled:bg-[#f9fafb]"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <label
                    htmlFor="password"
                    className="text-[12px] font-semibold text-[#344054]"
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-semibold text-[#07879B] transition hover:text-[#066F80]"
                  >
                    Forgot password?
                  </Link>
                </div>

                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  className="h-12 w-full rounded-[11px] border border-[#d0d5dd] bg-white px-4 text-[13px] text-[#172033] outline-none transition placeholder:text-[#98a2b3] focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10 disabled:bg-[#f9fafb]"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-[10px] border border-[#fecdca] bg-[#fef3f2] px-4 py-3"
                >
                  <p className="text-[11px] leading-5 text-[#b42318]">
                    {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center rounded-[11px] bg-[#08A9C1] px-4 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(8,169,193,0.18)] transition hover:bg-[#0795AA] focus:outline-none focus:ring-4 focus:ring-[#08A9C1]/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <div className="mt-8 border-t border-[#eef0f3] pt-5">
              <p className="text-center text-[10px] leading-5 text-[#98a2b3]">
                Access is provided by your HelloGov training team.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}