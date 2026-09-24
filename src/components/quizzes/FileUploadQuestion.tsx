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
    if (!file || disabled) return;

    setUploading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Your session has expired.");
      setUploading(false);
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
      setUploading(false);
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
      await supabase.storage
        .from("quiz-submissions")
        .remove([path]);

      setError(saveError.message);
      setUploading(false);
      return;
    }

    onUploaded(path, file.name);
    setUploading(false);
  }

  return (
    <div>
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center transition hover:border-slate-300">
        <span className="text-2xl">↑</span>

        <span className="mt-2 font-medium text-slate-900">
          {uploading
            ? "Uploading..."
            : "Upload a file"}
        </span>

        <span className="mt-1 text-xs text-slate-500">
          Maximum file size: 10 MB
        </span>

        <input
          type="file"
          disabled={disabled || uploading}
          onChange={(event) =>
            uploadFile(
              event.target.files?.[0]
            )
          }
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