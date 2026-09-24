"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type SelectedOption = {
  text: string;
  position: number;
};

type Match = {
  left: string;
  right: string;
  position: number;
};

type Props = {
  answerId: string;
  questionNumber?: number;
  question: string;
  questionType: string;
  maxPoints: number;

  answerText?: string | null;
  filePath?: string | null;
  fileName?: string | null;

  currentPoints?: number | null;
  currentFeedback?: string | null;
  isCorrect?: boolean | null;

  selectedOptionText?: string | null;
  selectedOptions?: SelectedOption[];
  matches?: Match[];
};

export default function ManualAnswerGrader({
  answerId,
  questionNumber,
  question,
  questionType,
  maxPoints,
  answerText,
  filePath,
  fileName,
  currentPoints,
  currentFeedback,
  isCorrect,
  selectedOptionText,
  selectedOptions = [],
  matches = [],
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const isManualQuestion =
    questionType === "open_text" ||
    questionType === "file_upload";

  const hasExistingGrade =
    currentPoints !== null &&
    currentPoints !== undefined;

  const [points, setPoints] = useState(
    hasExistingGrade
      ? currentPoints.toString()
      : ""
  );

  const [feedback, setFeedback] = useState(
    currentFeedback ?? ""
  );

  const [saving, setSaving] = useState(false);
  const [openingFile, setOpeningFile] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function openFile() {
    if (!filePath || openingFile) return;

    setOpeningFile(true);
    setError(null);

    const { data, error: fileError } =
      await supabase.storage
        .from("quiz-submissions")
        .createSignedUrl(filePath, 300);

    setOpeningFile(false);

    if (fileError) {
      setError(fileError.message);
      return;
    }

    window.open(
      data.signedUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function saveGrade() {
    const numericPoints = Number(points);

    if (points.trim() === "") {
      setError("Enter the points awarded.");
      return;
    }

    if (
      Number.isNaN(numericPoints) ||
      numericPoints < 0 ||
      numericPoints > maxPoints
    ) {
      setError(
        `Points must be between 0 and ${maxPoints}.`
      );
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: gradeError } =
      await supabase.rpc(
        "grade_manual_quiz_answer",
        {
          target_answer_id: answerId,
          awarded_points: numericPoints,
          feedback: feedback.trim() || null,
        }
      );

    setSaving(false);

    if (gradeError) {
      setError(gradeError.message);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {questionNumber && (
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Question {questionNumber}
              </span>
            )}

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-600">
              {questionType.replaceAll("_", " ")}
            </span>

            {hasExistingGrade && !isManualQuestion && (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                Auto-graded
              </span>
            )}

            {isManualQuestion &&
              !hasExistingGrade && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  Trainer review required
                </span>
              )}

            {hasExistingGrade &&
              isCorrect === true && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  Correct
                </span>
              )}

            {hasExistingGrade &&
              isCorrect === false && (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                  Incorrect / partial
                </span>
              )}
          </div>

          <h2 className="mt-3 text-lg font-semibold text-slate-950">
            {question}
          </h2>
        </div>

        <div className="text-right">
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {maxPoints}{" "}
            {maxPoints === 1 ? "pt" : "pts"} max
          </span>

          {hasExistingGrade && (
            <p className="mt-2 text-xs font-medium text-slate-500">
              Current: {Number(currentPoints)} /{" "}
              {maxPoints}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Learner response
        </p>

        <div className="mt-2">
          <LearnerResponse
            questionType={questionType}
            answerText={answerText}
            filePath={filePath}
            fileName={fileName}
            selectedOptionText={
              selectedOptionText
            }
            selectedOptions={selectedOptions}
            matches={matches}
            openingFile={openingFile}
            onOpenFile={openFile}
          />
        </div>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-6">
        <div className="mb-4">
          <p className="text-sm font-semibold text-slate-900">
            {isManualQuestion
              ? hasExistingGrade
                ? "Trainer grade"
                : "Grade response"
              : "Grade override"}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {isManualQuestion
              ? "Award points and optionally leave feedback for the learner."
              : "The original learner response remains unchanged. Adjust the awarded points only if the automatic grade needs to be overridden."}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[180px_1fr]">
          <label>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Points awarded
            </span>

            <div className="relative mt-2">
              <input
                type="number"
                min={0}
                max={maxPoints}
                step="0.01"
                value={points}
                onChange={(event) => {
                  setPoints(event.target.value);
                  setSaved(false);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-14 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />

              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-400">
                / {maxPoints}
              </span>
            </div>
          </label>

          <label>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Feedback
            </span>

            <textarea
              rows={3}
              value={feedback}
              onChange={(event) => {
                setFeedback(event.target.value);
                setSaved(false);
              }}
              className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              placeholder="Optional trainer feedback..."
            />
          </label>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {saved && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            Grade saved.
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={saveGrade}
            className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : hasExistingGrade
                ? "Save override"
                : "Save grade"}
          </button>
        </div>
      </div>
    </section>
  );
}

type LearnerResponseProps = {
  questionType: string;
  answerText?: string | null;
  filePath?: string | null;
  fileName?: string | null;
  selectedOptionText?: string | null;
  selectedOptions: SelectedOption[];
  matches: Match[];
  openingFile: boolean;
  onOpenFile: () => void;
};

function LearnerResponse({
  questionType,
  answerText,
  filePath,
  fileName,
  selectedOptionText,
  selectedOptions,
  matches,
  openingFile,
  onOpenFile,
}: LearnerResponseProps) {
  if (
    questionType === "single_choice" ||
    questionType === "true_false"
  ) {
    return (
      <ResponseBox>
        {selectedOptionText ||
          answerText ||
          "No answer recorded"}
      </ResponseBox>
    );
  }

  if (questionType === "multiple_choice") {
    if (selectedOptions.length === 0) {
      return (
        <ResponseBox>
          No answer recorded
        </ResponseBox>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {selectedOptions.map(
          (option, index) => (
            <span
              key={`${option.position}-${option.text}-${index}`}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
            >
              {option.text}
            </span>
          )
        )}
      </div>
    );
  }

  if (
    questionType === "matching" ||
    questionType === "match_cards"
  ) {
    if (matches.length === 0) {
      return (
        <ResponseBox>
          No answer recorded
        </ResponseBox>
      );
    }

    return (
      <div className="space-y-2">
        {matches.map((match, index) => (
          <div
            key={`${match.left}-${match.right}-${index}`}
            className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:grid-cols-[1fr_auto_1fr] sm:items-center"
          >
            <span className="font-medium text-slate-800">
              {match.left}
            </span>

            <span className="text-slate-400">
              →
            </span>

            <span className="text-slate-700">
              {match.right}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (questionType === "open_text") {
    return (
      <ResponseBox>
        {answerText ||
          "No written response recorded"}
      </ResponseBox>
    );
  }

  if (questionType === "file_upload") {
    if (!filePath) {
      return (
        <ResponseBox>
          No file recorded
        </ResponseBox>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800">
            {fileName || "Uploaded file"}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Learner submission
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenFile}
          disabled={openingFile}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
        >
          {openingFile
            ? "Opening..."
            : "View file"}
        </button>
      </div>
    );
  }

  return (
    <ResponseBox>
      {answerText || "Answer submitted"}
    </ResponseBox>
  );
}

function ResponseBox({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
      {children}
    </div>
  );
}