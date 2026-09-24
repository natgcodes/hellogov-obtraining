"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AppShellProps = {
  children: ReactNode;
  userName?: string | null;
  userEmail?: string | null;
  role: "learner" | "trainer";
};

export default function AppShell({
  children,
  userName,
  userEmail,
  role,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const isTrainer = role === "trainer";

  const navigation = isTrainer
    ? [
        {
          label: "Dashboard",
          href: "/trainer",
        },
        {
          label: "Program",
          href: "/trainer/program",
        },
        {
          label: "Learners",
          href: "/trainer/learners",
        },
        {
          label: "Review",
          href: "/trainer/review",
        },
      ]
    : [
        {
          label: "Overview",
          href: "/learn",
        },
        { label: "Checkpoints", href: "/learn/checkpoints" },
        { label: "Submissions", href: "/learn/submissions" },
        { label: "Certification", href: "/learn/certification" },
        { label: "Next Steps", href: "/learn/post-training" },
      ];

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setLogoutError("Could not sign out. Please try again.");
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <header className="sticky top-0 z-40 border-b border-[#e9ebef] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-10">
            <Link
              href={isTrainer ? "/trainer" : "/learn"}
              className="flex items-center gap-3"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e84545] text-sm font-bold text-white shadow-sm">
                H
              </div>

              <div>
                <div className="text-[15px] font-semibold tracking-[-0.01em] text-[#172033]">
                  HelloGov
                </div>

                <div className="text-[11px] font-medium text-[#98a2b3]">
                  Learning Center
                </div>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {navigation.map((item) => {
                const active =
                  item.href === "/trainer"
                    ? pathname === "/trainer"
                    : item.href === "/learn"
                      ? pathname === "/learn"
                      : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-[#f3f4f6] text-[#172033]"
                        : "text-[#667085] hover:bg-[#f7f8fa] hover:text-[#172033]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isTrainer && (
              <div className="hidden rounded-full bg-[#fff1f1] px-3 py-1.5 text-xs font-semibold text-[#d83d3d] sm:block">
                Trainer
              </div>
            )}

            <div className="h-8 w-px bg-[#eaecf0]" />

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f3f5] text-sm font-semibold text-[#475467]">
                {(userName || userEmail || "U").charAt(0).toUpperCase()}
              </div>

              <div className="hidden max-w-[180px] sm:block">
                <div className="truncate text-sm font-medium text-[#344054]">
                  {userName || "HelloGov User"}
                </div>

                <div className="truncate text-xs text-[#98a2b3]">
                  {userEmail}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="ml-1 rounded-lg border border-[#e4e7ec] bg-white px-3.5 py-2 text-sm font-medium text-[#475467] transition hover:bg-[#f7f8fa] hover:text-[#172033] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loggingOut ? "Signing out..." : "Log out"}
              </button>
            </div>
          </div>
        </div>

        {logoutError && (
          <div className="border-t border-red-100 bg-red-50 px-6 py-2 text-center text-xs font-medium text-red-600">
            {logoutError}
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-[1440px] px-6 py-8 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}