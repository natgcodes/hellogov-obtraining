"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SetupPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [loading, setLoading] =
    useState(false);
  const [checkingSession, setCheckingSession] =
    useState(true);
  const [error, setError] =
    useState("");

  useEffect(() => {
    let mounted = true;

    async function initializeInvitation() {
      setError("");

      try {
        // ---------------------------------------------------
        // PKCE / query-param flow
        // ---------------------------------------------------

        const searchParams =
          new URLSearchParams(
            window.location.search
          );

        const code =
          searchParams.get("code");

        if (code) {
          const {
            error: exchangeError,
          } =
            await supabase.auth.exchangeCodeForSession(
              code
            );

          if (exchangeError) {
            console.error(
              "Unable to exchange invitation code:",
              exchangeError
            );
          }
        }

        // ---------------------------------------------------
        // IMPLICIT / HASH FLOW
        //
        // Supabase invitation links may return access_token
        // and refresh_token in the URL hash.
        // ---------------------------------------------------

        const hashParams =
          new URLSearchParams(
            window.location.hash.substring(1)
          );

        const accessToken =
          hashParams.get("access_token");

        const refreshToken =
          hashParams.get("refresh_token");

        if (
          accessToken &&
          refreshToken
        ) {
          const {
            error: sessionError,
          } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (sessionError) {
            console.error(
              "Unable to establish invitation session:",
              sessionError
            );
          }

          // Remove tokens from the visible URL after
          // Supabase has stored the session.
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        }

        // ---------------------------------------------------
        // VERIFY SESSION
        // ---------------------------------------------------

        const {
          data: { session },
          error: sessionError,
        } =
          await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (
          sessionError ||
          !session
        ) {
          setError(
            "This invitation link is invalid or has expired. Please request a new invitation."
          );
        }
      } catch (initializationError) {
        console.error(
          "Unable to initialize invitation:",
          initializationError
        );

        if (mounted) {
          setError(
            "This invitation link is invalid or has expired. Please request a new invitation."
          );
        }
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    }

    initializeInvitation();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    if (password.length < 8) {
      setError(
        "Your password must be at least 8 characters long."
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "The passwords do not match."
      );
      return;
    }

    setLoading(true);

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      setError(
        "Your invitation session could not be verified. Please open the invitation link again."
      );
      setLoading(false);
      return;
    }

    const {
      error: updateError,
    } =
      await supabase.auth.updateUser({
        password,
      });

    if (updateError) {
      console.error(
        "Unable to set password:",
        updateError
      );

      setError(
        "We couldn't set your password. Please try again."
      );
      setLoading(false);
      return;
    }

    const {
      data: profile,
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (
      profileError ||
      !profile
    ) {
      console.error(
        "Unable to load profile:",
        profileError
      );

      setError(
        "Your password was created, but we couldn't load your HelloGov profile."
      );
      setLoading(false);
      return;
    }

    if (
      profile.role === "trainer"
    ) {
      router.replace("/trainer");
    } else {
      router.replace("/learn");
    }

    router.refresh();
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] p-6">
        <p className="text-sm text-slate-500">
          Verifying your invitation...
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-red-600">
            HelloGov
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Activate your account
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Create your password to access the
            HelloGov Learning Center.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                New password
              </label>

              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Create a password"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Use at least 8 characters.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Confirm password
              </label>

              <input
                id="confirm-password"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Enter your password again"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                checkingSession ||
                Boolean(error)
              }
              className="w-full rounded-xl bg-red-600 px-4 py-3 font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Activating..."
                : "Activate account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          HelloGov Learning Center
        </p>
      </div>
    </main>
  );
}