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
  const [isDeleting, setIsDeleting] =
    useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
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
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete user."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (isCurrentUser) {
    return (
      <span className="text-xs text-slate-400">
        Current user
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setShowConfirmation(true);
        }}
        className="text-xs font-semibold text-red-600 transition hover:text-red-700"
      >
        Delete
      </button>

      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Delete user?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              This will permanently remove{" "}
              <span className="font-semibold text-slate-700">
                {userName}
              </span>{" "}
              and their Learning Center access. This
              action cannot be undone.
            </p>

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() =>
                  setShowConfirmation(false)
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting
                  ? "Deleting..."
                  : "Delete user"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
