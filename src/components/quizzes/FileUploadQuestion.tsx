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
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center transition ${
          disabled || uploading
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:border-slate-300"
        }`}
      >
        <span className="text-2xl">↑</span>

        <span className="mt-2 font-medium text-slate-900">
          {uploading
            ? "Uploading..."
            : currentFileName
              ? "Upload another file"
              : "Upload a file"}
        </span>

        <span className="mt-1 text-xs text-slate-500">
          Maximum file size: 10 MB
        </span>

        <input
          type="file"
          disabled={disabled || uploading}
          onChange={(event) => {
            const file =
              event.target.files?.[0];

            void uploadFile(file);

            // Allows selecting the same file again
            // after an upload error.
            event.target.value = "";
          }}
          className="hidden"
        />
      </label>

      {currentFileName && (
        <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          ✓ {currentFileName}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}