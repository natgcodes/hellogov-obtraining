"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  attemptId: string;
  questionId: string;
  currentFileName?: string;
  disabled?: boolean;
  onUploaded: (
    filePath: string,
    fileName: string
  ) => void;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function FileUploadQuestion({
  attemptId,
  questionId,
  currentFileName,
  disabled = false,
  onUploaded,
}: Props) {
  const supabase = createClient();

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function uploadFile(
    file: File | undefined
  ) {
    if (!file || disabled || uploading) {
      return;
    }

    setError(null);

    if (file.size > MAX_FILE_SIZE) {
      setError(
        "This file is larger than the 10 MB limit."
      );
      return;
    }

    setUploading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(
          "Your session has expired. Please sign in again."
        );
        return;
      }

      const safeName = file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

      const path =
        `${user.id}/${attemptId}/${questionId}/` +
        `${Date.now()}-${safeName}`;

      const { error: uploadError } =
        await supabase.storage
          .from("quiz-submissions")
          .upload(path, file, {
            upsert: false,
          });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const { error: saveError } =
        await supabase.rpc(
          "save_file_answer",
          {
            target_attempt_id: attemptId,
            target_question_id: questionId,
            target_file_path: path,
            target_file_name: file.name,
          }
        );

      if (saveError) {
        const { error: cleanupError } =
          await supabase.storage
            .from("quiz-submissions")
            .remove([path]);

        if (cleanupError) {
          console.error(
            "Unable to remove failed quiz upload:",
            cleanupError
          );
        }

        setError(saveError.message);
        return;
      }

      onUploaded(path, file.name);
    } catch (uploadError) {
      console.error(
        "Unexpected file upload error:",
        uploadError
      );

      setError(
        "Something went wrong while uploading the file. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label
        className={`flex flex-col items-center justify-center rounded-[14px] border border-dashed px-6 py-8 text-center transition ${
          disabled || uploading
            ? "cursor-not-allowed border-[var(--border)] bg-[var(--surface-soft)] opacity-60"
            : "cursor-pointer border-[#08A9C1]/35 bg-[#F7FCFD] hover:border-[#08A9C1] hover:bg-[#F1FAFB]"
        }`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#EAF8FA] text-[#07879B]">
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M5 20h14" />
          </svg>
        </span>

        <span className="mt-3 text-[13px] font-semibold text-[var(--text-primary)]">
          {uploading
            ? "Uploading..."
            : currentFileName
              ? "Upload another file"
              : "Upload a file"}
        </span>

        <span className="mt-1 text-[11px] text-[var(--text-muted)]">
          Maximum file size: 10 MB
        </span>

        <input
          type="file"
          disabled={disabled || uploading}
          onChange={(event) => {
            const file =
              event.target.files?.[0];

            void uploadFile(file);

            event.target.value = "";
          }}
          className="hidden"
        />
      </label>

      {currentFileName && (
        <div className="mt-3 flex items-center gap-2 rounded-[11px] border border-[var(--success)]/15 bg-[var(--success-soft)] px-4 py-3 text-[12px] font-medium text-[var(--success)]">
          <span aria-hidden="true">
            ✓
          </span>

          <span className="min-w-0 truncate">
            {currentFileName}
          </span>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-[11px] border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}