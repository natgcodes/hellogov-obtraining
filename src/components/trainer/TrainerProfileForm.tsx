"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type TrainerProfileFormProps = {
  userId: string;
  initialFullName?: string | null;
  initialEmail?: string | null;
};

export default function TrainerProfileForm({
  userId,
  initialFullName,
  initialEmail,
}: TrainerProfileFormProps) {
  const router = useRouter();

  const safeInitialFullName =
    typeof initialFullName === "string"
      ? initialFullName
      : "";

  const safeInitialEmail =
    typeof initialEmail === "string"
      ? initialEmail
      : "";

  const [fullName, setFullName] = useState(
    safeInitialFullName
  );

  const [email, setEmail] = useState(
    safeInitialEmail
  );

  const [isSaving, setIsSaving] =
    useState(false);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const hasChanges =
    fullName.trim() !==
      safeInitialFullName.trim() ||
    email.trim().toLowerCase() !==
      safeInitialEmail.trim().toLowerCase();

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanName = fullName.trim();
    const cleanEmail = email
      .trim()
      .toLowerCase();

    if (!cleanName) {
      setErrorMessage(
        "Full name is required."
      );
      setSuccessMessage(null);
      return;
    }

    if (!cleanEmail) {
      setErrorMessage(
        "Email is required."
      );
      setSuccessMessage(null);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        "/api/trainer/users",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            userId,
            fullName: cleanName,
            email: cleanEmail,
            role: "trainer",
            teamLead: null,
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ??
            "We couldn't update your profile."
        );
      }

      setFullName(cleanName);
      setEmail(cleanEmail);

      setSuccessMessage(
        "Profile updated successfully."
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Profile update error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We couldn't update your profile."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    setFullName(safeInitialFullName);
    setEmail(safeInitialEmail);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-[18px] border border-[#e5e7eb] bg-white"
    >
      {/* HEADER */}

      <div className="border-b border-[#eef0f3] px-5 py-5 sm:px-6">
        <h2 className="text-[16px] font-semibold text-[#172033]">
          Personal information
        </h2>

        <p className="mt-1 text-xs leading-5 text-[#98a2b3]">
          Update the name and email associated
          with your trainer account.
        </p>
      </div>

      {/* FORM */}

      <div className="space-y-5 px-5 py-6 sm:px-6">
        {/* FULL NAME */}

        <div>
          <label
            htmlFor="trainer-full-name"
            className="text-sm font-medium text-[#344054]"
          >
            Full name
          </label>

          <input
            id="trainer-full-name"
            type="text"
            value={fullName}
            onChange={(event) => {
              setFullName(
                event.target.value
              );

              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            disabled={isSaving}
            autoComplete="name"
            className="mt-2 w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#98a2b3] focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10 disabled:bg-[#f9fafb]"
          />
        </div>

        {/* EMAIL */}

        <div>
          <label
            htmlFor="trainer-email"
            className="text-sm font-medium text-[#344054]"
          >
            Email address
          </label>

          <input
            id="trainer-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(
                event.target.value
              );

              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            disabled={isSaving}
            autoComplete="email"
            className="mt-2 w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#98a2b3] focus:border-[#08A9C1] focus:ring-4 focus:ring-[#08A9C1]/10 disabled:bg-[#f9fafb]"
          />

          <p className="mt-2 text-xs leading-5 text-[#98a2b3]">
            This is the email used for your
            HelloGov training account.
          </p>
        </div>

        {/* ROLE */}

        <div>
          <label className="text-sm font-medium text-[#344054]">
            Role
          </label>

          <div className="mt-2 flex min-h-[42px] items-center justify-between rounded-xl border border-[#e4e7ec] bg-[#f9fafb] px-3.5">
            <span className="text-sm text-[#475467]">
              Trainer
            </span>

            <span className="rounded-full bg-[#F0FAFB] px-2.5 py-1 text-[10px] font-semibold text-[#08788A]">
              Protected
            </span>
          </div>

          <p className="mt-2 text-xs leading-5 text-[#98a2b3]">
            You cannot change your own trainer
            permissions from this page.
          </p>
        </div>

        {/* SUCCESS */}

        {successMessage && (
          <div className="rounded-xl border border-[#abefc6] bg-[#ecfdf3] px-4 py-3">
            <p className="text-sm font-medium text-[#067647]">
              {successMessage}
            </p>
          </div>
        )}

        {/* ERROR */}

        {errorMessage && (
          <div className="rounded-xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3">
            <p className="text-sm text-[#b42318]">
              {errorMessage}
            </p>
          </div>
        )}
      </div>

      {/* ACTIONS */}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eef0f3] bg-[#fcfcfd] px-5 py-4 sm:px-6">
        <p className="text-xs text-[#98a2b3]">
          Changes apply to your trainer
          account.
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={
              isSaving || !hasChanges
            }
            className="rounded-xl border border-[#d0d5dd] bg-white px-4 py-2.5 text-sm font-semibold text-[#475467] transition hover:bg-[#f7f8fa] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              isSaving || !hasChanges
            }
            className="rounded-xl bg-[#172033] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#263247] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving
              ? "Saving..."
              : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}