"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DeleteUserButtonProps = {
  userId: string;
  userName: string;
  isCurrentUser?: boolean;
};

export default function DeleteUserButton({
  userId,
  userName,
  isCurrentUser = false,
}: DeleteUserButtonProps) {
  const router = useRouter();

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [confirmationText, setConfirmationText] =
    useState("");

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [error, setError] = useState("");

  const canConfirm =
    confirmationText.trim() === "DELETE";

  // =========================================================
  // OPEN CONFIRMATION
  // =========================================================

  function openConfirmation() {
    setError("");
    setConfirmationText("");
    setShowConfirmation(true);
  }

  // =========================================================
  // CLOSE CONFIRMATION
  // =========================================================

  function closeConfirmation() {
    if (isDeleting) {
      return;
    }

    setShowConfirmation(false);
    setConfirmationText("");
    setError("");
  }

  // =========================================================
  // DELETE USER
  // =========================================================

  async function handleDelete() {
    if (!canConfirm || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch(
        "/api/trainer/users",
        {
          method: "DELETE",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            userId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to delete user."
        );
      }

      setShowConfirmation(false);
      setConfirmationText("");

      router.refresh();
    } catch (deleteError) {
      console.error(
        "Unable to delete user:",
        deleteError
      );

      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete user."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  // =========================================================
  // PROTECT CURRENT USER
  // =========================================================

  if (isCurrentUser) {
    return (
      <span className="text-xs text-slate-400">
        Current user
      </span>
    );
  }

  // =========================================================
  // DELETE BUTTON
  // =========================================================

  return (
    <>
      <button
        type="button"
        onClick={openConfirmation}
        className="text-xs font-semibold text-red-600 transition hover:text-red-700"
      >
        Delete
      </button>

      {/* CONFIRMATION MODAL */}

      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            {/* HEADER */}

            <h2
              id="delete-user-title"
              className="text-xl font-semibold tracking-tight text-slate-950"
            >
              Permanently delete user?
            </h2>

            {/* DESCRIPTION */}

            <p className="mt-2 text-sm leading-6 text-slate-500">
              You are about to permanently remove{" "}
              <span className="font-semibold text-slate-700">
                {userName}
              </span>{" "}
              from the HelloGov Learning Center.
            </p>

            {/* WARNING */}

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-900">
                This action cannot be undone.
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-800">
                Only accounts without training
                activity can be permanently
                deleted. Accounts with existing
                progress or historical records
                will be protected automatically.
              </p>
            </div>

            {/* CONFIRMATION INPUT */}

            <div className="mt-5">
              <label
                htmlFor={`delete-confirmation-${userId}`}
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Type{" "}
                <span className="font-bold text-red-600">
                  DELETE
                </span>{" "}
                to confirm
              </label>

              <input
                id={`delete-confirmation-${userId}`}
                type="text"
                value={confirmationText}
                onChange={(event) => {
                  setConfirmationText(
                    event.target.value
                  );

                  setError("");
                }}
                placeholder="DELETE"
                autoComplete="off"
                disabled={isDeleting}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-50 disabled:bg-slate-50"
              />
            </div>

            {/* ERROR */}

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {/* ACTIONS */}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={closeConfirmation}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  isDeleting || !canConfirm
                }
                onClick={handleDelete}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting
                  ? "Deleting..."
                  : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}