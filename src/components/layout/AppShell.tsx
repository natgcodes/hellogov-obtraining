"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import LearnerHelpBox from "@/components/learning/LearnerHelpBox";

export type LearnerJourneyDay = {
  id: string;
  dayNumber: number;
  title: string;
  shortTitle?: string | null;
  unlocked: boolean;
  completed: boolean;
};

export type LearnerJourney = {
  setupCompleted: number;
  setupTotal: number;
  days: LearnerJourneyDay[];
  certificationUnlocked: boolean;
};

type AppShellProps = {
  children: ReactNode;
  userName?: string | null;
  userEmail?: string | null;
  role:
    | "learner"
    | "trainer"
    | "observer"
    | "cross_training"
    | "team_leader";
  learnerJourney?: LearnerJourney;

  impersonation?: {
    learnerId: string;
    learnerName: string;
    learnerEmail?: string | null;
  };
};

type IconName =
  | "home"
  | "submissions"
  | "dashboard"
  | "program"
  | "learners"
  | "users"
  | "review"
  | "notes"
  | "check"
  | "current"
  | "lock"
  | "certificate"
  | "arrow"
  | "search"
  | "menu"
  | "collapse"
  | "expand";

type NavigationItem = {
  label: string;
  href: string;
  icon: IconName;
};

// ---------------------------------------------------------
// ICONS
// ---------------------------------------------------------

function Icon({
  name,
  className = "h-[18px] w-[18px]",
}: {
  name: IconName;
  className?: string;
}) {
  const commonProps = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "home":
    case "dashboard":
      return (
        <svg {...commonProps}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
          <path d="M9.5 21v-6h5v6" />
        </svg>
      );

    case "submissions":
      return (
        <svg {...commonProps}>
          <path d="M6 3.5h9l3 3V20.5H6z" />
          <path d="M15 3.5v4h4" />
          <path d="M9 11h6" />
          <path d="M9 15h6" />
        </svg>
      );

    case "program":
      return (
        <svg {...commonProps}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 8h8" />
          <path d="M8 12h8" />
          <path d="M8 16h5" />
        </svg>
      );

    case "learners":
      return (
        <svg {...commonProps}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19c.6-3.2 2.4-5 5.5-5s4.9 1.8 5.5 5" />
          <path d="M16 6.5a2.5 2.5 0 0 1 0 5" />
          <path d="M17 14c2.1.5 3.2 2 3.5 4" />
        </svg>
      );

    case "users":
      return (
        <svg {...commonProps}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19c.6-3.2 2.4-5 5.5-5s4.9 1.8 5.5 5" />
          <path d="M17 8v6" />
          <path d="M14 11h6" />
        </svg>
      );

    case "notes":
      return (
        <svg {...commonProps}>
          <path d="M6 3.5h9l3 3V20.5H6z" />
          <path d="M15 3.5v4h4" />
          <path d="M9 11h6" />
          <path d="M9 15h4" />
          <path d="M9 7.5h2" />
        </svg>
      );

    case "review":
    case "check":
      return (
        <svg {...commonProps}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "current":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="7" />
          <circle
            cx="12"
            cy="12"
            r="3"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      );

    case "lock":
      return (
        <svg {...commonProps}>
          <rect x="6" y="10" width="12" height="10" rx="2" />
          <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
        </svg>
      );

    case "certificate":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="9" r="5" />
          <path d="m9 13-1 8 4-2 4 2-1-8" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...commonProps}>
          <path d="M5 12h14" />
          <path d="m14 7 5 5-5 5" />
        </svg>
      );

    case "search":
      return (
        <svg {...commonProps}>
          <circle cx="11" cy="11" r="6" />
          <path d="m16 16 4 4" />
        </svg>
      );

    case "menu":
      return (
        <svg {...commonProps}>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      );

    case "collapse":
      return (
        <svg {...commonProps}>
          <path d="m14 6-6 6 6 6" />
        </svg>
      );

    case "expand":
      return (
        <svg {...commonProps}>
          <path d="m10 6 6 6-6 6" />
        </svg>
      );

    default:
      return null;
  }
}

function getDayShortTitle(day: LearnerJourneyDay) {
  if (day.shortTitle) {
    return day.shortTitle;
  }

  const fallbacks: Record<number, string> = {
    1: "Foundations",
    2: "Platform & Tools",
    3: "Support Actions",
    4: "Exceptions",
  };

  return fallbacks[day.dayNumber] ?? day.title;
}

export default function AppShell({
  children,
  userName,
  userEmail,
  role,
  learnerJourney,
  impersonation,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isTrainer = role === "trainer";
  const isTeamLeader = role === "team_leader";
  const isImpersonating = Boolean(impersonation);

  const showTrainerNavigation =
    isTrainer && !isImpersonating;

  const learnerBasePath = isImpersonating
    ? `/trainer/impersonate/${impersonation!.learnerId}`
    : "/learn";

  const shellHomePath = showTrainerNavigation
    ? "/trainer"
    : learnerBasePath;

  const profilePath = showTrainerNavigation
    ? "/trainer/profile"
    : `${learnerBasePath}/profile`;

  const profileLabel = showTrainerNavigation
    ? "My Profile"
    : "Profile";

  // ============================================================
  // TRAINER NAVIGATION
  // ============================================================

  const trainerNavigation: NavigationItem[] = [
    {
      label: "Dashboard",
      href: "/trainer",
      icon: "dashboard",
    },
    {
      label: "Program",
      href: "/trainer/program",
      icon: "program",
    },
    {
      label: "Trainees",
      href: "/trainer/learners",
      icon: "learners",
    },
    {
      label: "Users",
      href: "/trainer/users",
      icon: "users",
    },
    {
      label: "Review",
      href: "/trainer/review",
      icon: "review",
    },
    {
      label: "Quiz Review",
      href: "/trainer/quiz-review",
      icon: "submissions",
    },
    {
      label: "Q&A",
      href: "/trainer/questions",
      icon: "submissions",
    },
    {
      label: "Training Notes",
      href: "/trainer/notes",
      icon: "notes",
    },
  ];

  // ============================================================
  // FALLBACK LEARNER NAVIGATION
  //
  // Certification is included only when unlocked.
  // ============================================================

  const fallbackLearnerNavigation: NavigationItem[] = [
    ...(isTeamLeader && !isImpersonating
      ? [
          {
            label: "My Team",
            href: "/team",
            icon: "dashboard" as IconName,
          },
        ]
      : []),

    {
      label: "Overview",
      href: learnerBasePath,
      icon: "home",
    },

    {
      label: "Submissions",
      href: `${learnerBasePath}/submissions`,
      icon: "submissions",
    },

    ...(learnerJourney?.certificationUnlocked
      ? [
          {
            label: "Certification",
            href: `${learnerBasePath}/certification`,
            icon: "certificate" as IconName,
          },
        ]
      : []),

    {
      label: "Next Steps",
      href: `${learnerBasePath}/post-training`,
      icon: "arrow",
    },
  ];

  function isActive(href: string) {
    if (href === "/trainer") {
      return pathname === "/trainer";
    }

    if (href === "/learn") {
      return pathname === "/learn";
    }

    if (href === learnerBasePath) {
      return pathname === learnerBasePath;
    }

    return pathname.startsWith(href);
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setLogoutError(
        "Could not sign out. Please try again."
      );
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  const displayName = isImpersonating
    ? impersonation!.learnerName || "Trainee"
    : userName || "HelloGov User";

  const displayEmail = isImpersonating
    ? impersonation!.learnerEmail ?? null
    : userEmail ?? null;

  const initial = (
    displayName ||
    displayEmail ||
    "U"
  )
    .charAt(0)
    .toUpperCase();

  const currentDayId =
    learnerJourney?.days.find(
      (day) =>
        day.unlocked && !day.completed
    )?.id ?? null;

  const setupComplete =
    Boolean(learnerJourney) &&
    learnerJourney!.setupTotal > 0 &&
    learnerJourney!.setupCompleted >=
      learnerJourney!.setupTotal;

  // ============================================================
  // STANDARD NAVIGATION ITEM
  // ============================================================

  function renderStandardNavItem(
    item: NavigationItem,
    mobile = false
  ) {
    const active = isActive(item.href);
    const collapsed =
      !mobile && sidebarCollapsed;

    return (
      <Link
        key={item.href}
        href={item.href}
        title={
          collapsed
            ? item.label
            : undefined
        }
        onClick={
          mobile
            ? () =>
                setMobileMenuOpen(false)
            : undefined
        }
        className={`flex min-h-10 items-center rounded-[10px] text-[14px] font-medium transition-colors ${
          collapsed
            ? "justify-center px-2"
            : "gap-3 px-3"
        } ${
          active
            ? "bg-[var(--teal-soft)] text-[var(--teal-deep)]"
            : "text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
        }`}
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center ${
            active
              ? "text-[var(--teal)]"
              : "text-[var(--text-muted)]"
          }`}
        >
          <Icon name={item.icon} />
        </span>

        {!collapsed && (
          <span>{item.label}</span>
        )}
      </Link>
    );
  }

  // ============================================================
  // LEARNER JOURNEY NAVIGATION
  // ============================================================

  function renderJourneyNavigation(
    mobile = false
  ) {
    const collapsed =
      !mobile && sidebarCollapsed;

    if (!learnerJourney) {
      return (
        <nav className="space-y-1">
          {fallbackLearnerNavigation.map(
            (item) =>
              renderStandardNavItem(
                item,
                mobile
              )
          )}
        </nav>
      );
    }

    return (
      <nav className="space-y-1">
        {renderStandardNavItem(
          {
            label: "Overview",
            href: learnerBasePath,
            icon: "home",
          },
          mobile
        )}

        {renderStandardNavItem(
          {
            label: "Submissions",
            href: `${learnerBasePath}/submissions`,
            icon: "submissions",
          },
          mobile
        )}

        {!collapsed && (
          <div className="px-3 pb-1 pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Your Journey
            </p>
          </div>
        )}

        {collapsed && (
          <div className="mx-2 my-3 border-t border-[var(--border-soft)]" />
        )}

        <div
          title={
            collapsed
              ? `Before Day 1 · ${learnerJourney.setupCompleted}/${learnerJourney.setupTotal}`
              : undefined
          }
          className={`flex min-h-10 items-center rounded-[10px] text-[14px] font-medium ${
            collapsed
              ? "justify-center px-2"
              : "gap-3 px-3"
          }`}
        >
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center ${
              setupComplete
                ? "text-[var(--success)]"
                : "text-[var(--text-muted)]"
            }`}
          >
            {setupComplete ? (
              <Icon name="check" />
            ) : (
              <span className="h-2 w-2 rounded-full border border-current" />
            )}
          </span>

          {!collapsed && (
            <>
              <span className="min-w-0 flex-1 text-[var(--text-secondary)]">
                Before Day 1
              </span>

              <span className="shrink-0 text-[11px] font-semibold text-[var(--text-muted)]">
                {learnerJourney.setupCompleted}
                /
                {learnerJourney.setupTotal}
              </span>
            </>
          )}
        </div>

        {learnerJourney.days.map(
          (day) => {
            const current =
              day.id === currentDayId;

            const active =
              pathname.startsWith(
                `${learnerBasePath}/day/${day.id}`
              );

            const accessible =
              day.unlocked ||
              day.completed;

            const shortTitle =
              getDayShortTitle(day);

            return (
              <Link
                key={day.id}
                href={
                  accessible
                    ? `${learnerBasePath}/day/${day.id}`
                    : learnerBasePath
                }
                title={
                  collapsed
                    ? `Day ${day.dayNumber} · ${shortTitle}`
                    : day.title
                }
                onClick={(event) => {
                  if (!accessible) {
                    event.preventDefault();
                    return;
                  }

                  if (mobile) {
                    setMobileMenuOpen(false);
                  }
                }}
                aria-disabled={!accessible}
                className={`flex min-h-10 items-center rounded-[10px] text-[14px] transition-colors ${
                  collapsed
                    ? "justify-center px-2"
                    : "gap-3 px-3"
                } ${
                  active
                    ? "bg-[var(--teal-soft)]"
                    : accessible
                      ? "hover:bg-[var(--surface-soft)]"
                      : "cursor-default"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center ${
                    day.completed
                      ? "text-[var(--success)]"
                      : current
                        ? "text-[var(--teal)]"
                        : "text-[var(--text-muted)]"
                  }`}
                >
                  {day.completed ? (
                    <Icon name="check" />
                  ) : current ? (
                    <Icon name="current" />
                  ) : (
                    <Icon
                      name="lock"
                      className="h-[15px] w-[15px]"
                    />
                  )}
                </span>

                {!collapsed && (
                  <>
                    <span
                      className={`shrink-0 font-medium ${
                        active || current
                          ? "text-[var(--teal-deep)]"
                          : accessible
                            ? "text-[var(--text-secondary)]"
                            : "text-[var(--text-muted)]"
                      }`}
                    >
                      Day {day.dayNumber}
                    </span>

                    <span
                      className={`ml-auto max-w-[110px] truncate text-right text-[11px] ${
                        current
                          ? "text-[var(--teal-deep)]"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      {shortTitle}
                    </span>
                  </>
                )}
              </Link>
            );
          }
        )}

        {/* =================================================
            CERTIFICATION — ONLY WHEN UNLOCKED
        ================================================= */}

        {learnerJourney.certificationUnlocked && (
          <Link
            href={`${learnerBasePath}/certification`}
            title={
              collapsed
                ? "Certification"
                : undefined
            }
            onClick={() => {
              if (mobile) {
                setMobileMenuOpen(false);
              }
            }}
            className={`mt-2 flex min-h-10 items-center rounded-[10px] text-[14px] font-medium transition-colors ${
              collapsed
                ? "justify-center px-2"
                : "gap-3 px-3"
            } ${
              pathname.startsWith(
                `${learnerBasePath}/certification`
              )
                ? "bg-[var(--teal-soft)] text-[var(--teal-deep)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              <Icon name="certificate" />
            </span>

            {!collapsed && (
              <span>Certification</span>
            )}
          </Link>
        )}

        {renderStandardNavItem(
          {
            label: "Next Steps",
            href: `${learnerBasePath}/post-training`,
            icon: "arrow",
          },
          mobile
        )}
      </nav>
    );
  }

  // ============================================================
  // TRAINER NAVIGATION
  // ============================================================

  function renderTrainerNavigation(
    mobile = false
  ) {
    return (
      <nav className="space-y-1">
        {trainerNavigation.map((item) =>
          renderStandardNavItem(
            item,
            mobile
          )
        )}
      </nav>
    );
  }

  // ============================================================
  // APP SHELL
  // ============================================================

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      {/* DESKTOP SIDEBAR */}

      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-[var(--border)] bg-white transition-[width] duration-200 ease-out lg:flex ${
          sidebarCollapsed
            ? "w-[76px]"
            : "w-[var(--sidebar-width)]"
        }`}
      >
        <div
          className={`flex h-[var(--topbar-height)] items-center border-b border-[var(--border-soft)] ${
            sidebarCollapsed
              ? "justify-center px-2"
              : "justify-between px-5"
          }`}
        >
          <Link
            href={shellHomePath}
            title={
              sidebarCollapsed
                ? "HelloGov"
                : undefined
            }
            className="flex min-w-0 items-center gap-3"
          >
            {sidebarCollapsed ? (
              <Image
                src="/hellogov-logo-transparent.png"
                alt="HelloGov"
                width={42}
                height={22}
                className="h-auto w-[42px] object-contain"
              />
            ) : (
              <div className="min-w-0">
                <Image
                  src="/hellogov-logo-transparent.png"
                  alt="HelloGov"
                  width={125}
                  height={42}
                  priority
                  className="h-auto w-[118px] object-contain"
                />

                {showTrainerNavigation && (
                  <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    Training Admin
                  </div>
                )}
              </div>
            )}
          </Link>

          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={() =>
                setSidebarCollapsed(true)
              }
              className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <Icon
                name="collapse"
                className="h-4 w-4"
              />
            </button>
          )}
        </div>

        {sidebarCollapsed && (
          <div className="px-2 pt-3">
            <button
              type="button"
              onClick={() =>
                setSidebarCollapsed(false)
              }
              className="flex h-9 w-full items-center justify-center rounded-[9px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <Icon
                name="expand"
                className="h-4 w-4"
              />
            </button>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          <div
            className={`overflow-y-auto ${
              sidebarCollapsed
                ? "px-2 py-3"
                : "px-3 py-6"
            }`}
          >
            {!sidebarCollapsed && (
              <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.04em] text-[var(--text-muted)]">
                {showTrainerNavigation
                  ? "Training Management"
                  : "Onboarding"}
              </p>
            )}

            {showTrainerNavigation
              ? renderTrainerNavigation()
              : renderJourneyNavigation()}
          </div>

          {!sidebarCollapsed && (
            <div className="mt-auto p-4">
              {showTrainerNavigation ? (
                <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                    Training workspace
                  </p>

                  <p className="mt-1.5 text-[11px] leading-[1.55] text-[var(--text-secondary)]">
                    Manage onboarding
                    content, trainees, and
                    submissions.
                  </p>
                </div>
              ) : isImpersonating ? (
                <div className="rounded-[12px] border border-[#08A9C1]/20 bg-[#F3FBFC] p-4">
                  <p className="text-[12px] font-semibold text-[#07879B]">
                    Read-only preview
                  </p>

                  <p className="mt-1.5 text-[11px] leading-[1.55] text-[var(--text-secondary)]">
                    You are viewing this
                    onboarding as{" "}
                    {impersonation!.learnerName}.
                  </p>
                </div>
              ) : (
                <LearnerHelpBox />
              )}
            </div>
          )}
        </div>
      </aside>

      {/* APP AREA */}

      <div
        className={`transition-[padding] duration-200 ease-out ${
          sidebarCollapsed
            ? "lg:pl-[76px]"
            : "lg:pl-[var(--sidebar-width)]"
        }`}
      >
        {/* TOP BAR */}

        <header className="sticky top-0 z-30 h-[var(--topbar-height)] border-b border-[var(--border)] bg-white/95 backdrop-blur">
          <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-7">
            <button
              type="button"
              onClick={() =>
                setMobileMenuOpen(
                  (current) => !current
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--border)] bg-white text-[var(--text-primary)] lg:hidden"
              aria-label="Open navigation"
            >
              <Icon name="menu" />
            </button>

            <div className="hidden w-full max-w-[500px] sm:block">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[var(--text-muted)]">
                  <Icon
                    name="search"
                    className="h-[15px] w-[15px]"
                  />
                </span>

                <input
                  type="search"
                  placeholder={
                    showTrainerNavigation
                      ? "Search trainees or training content..."
                      : "Search modules, topics or resources..."
                  }
                  className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white pl-10 pr-4 text-[13px] text-[var(--text-primary)] shadow-[var(--shadow-xs)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--teal)]"
                />
              </div>
            </div>

            <div className="relative ml-auto flex items-center gap-3">
              {showTrainerNavigation && (
                <span className="hidden rounded-full bg-[var(--teal-soft)] px-3 py-1.5 text-[11px] font-semibold text-[var(--teal-deep)] md:inline-flex">
                  Trainer
                </span>
              )}

              {isImpersonating && (
                <span className="hidden rounded-full bg-[#EAF8FA] px-3 py-1.5 text-[11px] font-semibold text-[#07879B] md:inline-flex">
                  Trainee Preview
                </span>
              )}

              <div className="hidden h-7 w-px bg-[var(--border-soft)] sm:block" />

              <button
                type="button"
                onClick={() =>
                  setUserMenuOpen(
                    (current) => !current
                  )
                }
                className={`flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 transition-colors ${
                  userMenuOpen
                    ? "bg-[var(--surface-soft)]"
                    : "hover:bg-[var(--surface-soft)]"
                }`}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--teal-soft)] text-[11px] font-semibold text-[var(--teal-deep)]">
                  {initial}
                </div>

                <div className="hidden max-w-[160px] text-left xl:block">
                  <p className="truncate text-[12px] font-medium text-[var(--text-secondary)]">
                    {displayName}
                  </p>
                </div>

                <svg
                  className={`hidden h-3.5 w-3.5 text-[var(--text-muted)] transition-transform sm:block ${
                    userMenuOpen
                      ? "rotate-180"
                      : ""
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {/* USER DROPDOWN */}

              {userMenuOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close account menu"
                    onClick={() =>
                      setUserMenuOpen(false)
                    }
                    className="fixed inset-0 z-40 cursor-default"
                  />

                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+8px)] z-50 w-[240px] overflow-hidden rounded-[12px] border border-[var(--border)] bg-white shadow-[var(--shadow-lg)]"
                  >
                    <div className="border-b border-[var(--border-soft)] px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--teal-soft)] text-[12px] font-semibold text-[var(--teal-deep)]">
                          {initial}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                            {displayName}
                          </p>

                          {displayEmail && (
                            <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
                              {displayEmail}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-1.5">
                      {/* PROFILE */}

                      <Link
                        href={profilePath}
                        role="menuitem"
                        onClick={() =>
                          setUserMenuOpen(false)
                        }
                        className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
                      >
                        <svg
                          className="h-4 w-4 text-[var(--text-muted)]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <circle
                            cx="12"
                            cy="8"
                            r="3.5"
                          />
                          <path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6" />
                        </svg>

                        <span>{profileLabel}</span>
                      </Link>

                      {isImpersonating && (
                        <Link
                          href={`/trainer/learners/${impersonation!.learnerId}`}
                          role="menuitem"
                          onClick={() =>
                            setUserMenuOpen(false)
                          }
                          className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-[12px] font-medium text-[#07879B] transition-colors hover:bg-[#F3FBFC]"
                        >
                          <Icon
                            name="arrow"
                            className="h-4 w-4"
                          />

                          <span>
                            Exit impersonation
                          </span>
                        </Link>
                      )}

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleLogout();
                        }}
                        disabled={loggingOut}
                        className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)] disabled:opacity-50"
                      >
                        <svg
                          className="h-4 w-4 text-[var(--text-muted)]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M10 5H5v14h5" />
                          <path d="M14 8l4 4-4 4" />
                          <path d="M18 12H9" />
                        </svg>

                        <span>
                          {loggingOut
                            ? "Signing out..."
                            : "Log out"}
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {logoutError && (
            <div className="absolute inset-x-0 top-full border-b border-red-100 bg-red-50 px-4 py-2 text-center text-xs font-medium text-red-600">
              {logoutError}
            </div>
          )}
        </header>

        {/* MOBILE NAVIGATION */}

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() =>
                setMobileMenuOpen(false)
              }
              className="absolute inset-0 bg-[#102f38]/20 backdrop-blur-[2px]"
            />

            <aside className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col border-r border-[var(--border)] bg-white shadow-[var(--shadow-lg)]">
              <div className="flex h-[var(--topbar-height)] items-center justify-between border-b border-[var(--border-soft)] px-5">
                <Link
                  href={shellHomePath}
                  onClick={() =>
                    setMobileMenuOpen(false)
                  }
                  className="flex items-center gap-3"
                >
                  <Image
                    src="/hellogov-logo-transparent.png"
                    alt="HelloGov"
                    width={125}
                    height={42}
                    priority
                    className="h-auto w-[118px] object-contain"
                  />
                </Link>

                <button
                  type="button"
                  onClick={() =>
                    setMobileMenuOpen(false)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
                  aria-label="Close navigation"
                >
                  ×
                </button>
              </div>

              <div className="overflow-y-auto p-3 pt-5">
                <p className="mb-2 px-3 text-[11px] font-semibold text-[var(--text-muted)]">
                  {showTrainerNavigation
                    ? "Training Management"
                    : "Onboarding"}
                </p>

                {showTrainerNavigation
                  ? renderTrainerNavigation(true)
                  : renderJourneyNavigation(true)}
              </div>

              <div className="mt-auto border-t border-[var(--border-soft)] p-4">
                {isImpersonating && (
                  <div className="mb-4 rounded-[10px] border border-[#08A9C1]/20 bg-[#F3FBFC] px-3 py-3">
                    <p className="text-[11px] font-semibold text-[#07879B]">
                      Read-only trainee preview
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-muted)] text-xs font-semibold">
                    {initial}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {displayName}
                    </p>

                    {displayEmail && (
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {displayEmail}
                      </p>
                    )}
                  </div>
                </div>

                {/* PROFILE */}

                <Link
                  href={profilePath}
                  onClick={() =>
                    setMobileMenuOpen(false)
                  }
                  className="mt-4 flex w-full items-center justify-center rounded-[9px] border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-soft)]"
                >
                  {profileLabel}
                </Link>

                {isImpersonating && (
                  <Link
                    href={`/trainer/learners/${impersonation!.learnerId}`}
                    onClick={() =>
                      setMobileMenuOpen(false)
                    }
                    className="mt-3 flex w-full items-center justify-center rounded-[9px] border border-[#08A9C1]/30 bg-[#F3FBFC] px-4 py-2.5 text-sm font-semibold text-[#07879B]"
                  >
                    Exit impersonation
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="mt-3 w-full rounded-[9px] border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
                >
                  {loggingOut
                    ? "Signing out..."
                    : "Log out"}
                </button>
              </div>
            </aside>
          </div>
        )}

        <main className="min-h-[calc(100vh-var(--topbar-height))]">
          {children}
        </main>
      </div>
    </div>
  );
}