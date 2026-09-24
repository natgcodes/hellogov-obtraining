"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type QuizOption = {
  id: string;
  option_text: string;
  is_correct: boolean;
  position: number;
};

export type MatchingPair = {
  id: string;
  left_text: string;
  right_text: string;
  position: number;
};

type Props = {
  questionId: string;
  questionType: string;
  options: QuizOption[];
  matchingPairs: MatchingPair[];
};

export default function QuizQuestionBuilder({
  questionId,
  questionType,
  options,
  matchingPairs,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [localOptions, setLocalOptions] =
    useState<QuizOption[]>(options);

  const [localPairs, setLocalPairs] =
    useState<MatchingPair[]>(matchingPairs);

  const [optionText, setOptionText] = useState("");
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalOptions(options);
  }, [options]);

  useEffect(() => {
    setLocalPairs(matchingPairs);
  }, [matchingPairs]);

  const usesOptions = [
    "single_choice",
    "multiple_choice",
    "true_false",
  ].includes(questionType);

  const usesPairs = ["matching", "match_cards"].includes(
    questionType
  );

  // --------------------------------------------------
  // OPTIONS
  // --------------------------------------------------

  async function addOption() {
    const cleanText = optionText.trim();

    if (!cleanText || isSaving) return;

    setIsSaving(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("quiz_options")
      .insert({
        question_id: questionId,
        option_text: cleanText,
        is_correct: false,
        position: localOptions.length + 1,
      })
      .select(
        "id, option_text, is_correct, position"
      )
      .single();

    if (insertError || !data) {
      console.error(insertError);
      setError("Could not add the option.");
      setIsSaving(false);
      return;
    }

    setLocalOptions((current) => [
      ...current,
      data as QuizOption,
    ]);

    setOptionText("");
    setIsSaving(false);

    router.refresh();
  }

  async function updateOptionText(
    optionId: string,
    text: string
  ) {
    const cleanText = text.trim();

    if (!cleanText) return;

    setError(null);

    const { error: updateError } = await supabase
      .from("quiz_options")
      .update({ option_text: cleanText })
      .eq("id", optionId);

    if (updateError) {
      console.error(updateError);
      setError("Could not update the option.");
      return;
    }

    setLocalOptions((current) =>
      current.map((option) =>
        option.id === optionId
          ? {
              ...option,
              option_text: cleanText,
            }
          : option
      )
    );

    router.refresh();
  }

  async function toggleCorrect(option: QuizOption) {
    if (isSaving) return;

    setIsSaving(true);
    setError(null);

    // SINGLE CHOICE + TRUE/FALSE
    // Exactly one answer can be correct.
    if (
      questionType === "single_choice" ||
      questionType === "true_false"
    ) {
      const { error: resetError } = await supabase
        .from("quiz_options")
        .update({ is_correct: false })
        .eq("question_id", questionId);

      if (resetError) {
        console.error(resetError);
        setError("Could not update the correct answer.");
        setIsSaving(false);
        return;
      }

      const { error: correctError } = await supabase
        .from("quiz_options")
        .update({ is_correct: true })
        .eq("id", option.id)
        .eq("question_id", questionId);

      if (correctError) {
        console.error(correctError);
        setError("Could not update the correct answer.");
        setIsSaving(false);
        return;
      }

      // Update the UI immediately.
      setLocalOptions((current) =>
        current.map((item) => ({
          ...item,
          is_correct: item.id === option.id,
        }))
      );
    }

    // MULTIPLE CHOICE
    else {
      const newValue = !option.is_correct;

      const { error: updateError } = await supabase
        .from("quiz_options")
        .update({
          is_correct: newValue,
        })
        .eq("id", option.id)
        .eq("question_id", questionId);

      if (updateError) {
        console.error(updateError);
        setError("Could not update the correct answer.");
        setIsSaving(false);
        return;
      }

      setLocalOptions((current) =>
        current.map((item) =>
          item.id === option.id
            ? {
                ...item,
                is_correct: newValue,
              }
            : item
        )
      );
    }

    setIsSaving(false);
    router.refresh();
  }

  async function deleteOption(optionId: string) {
    if (!window.confirm("Delete this option?")) return;

    setError(null);

    const { error: deleteError } = await supabase
      .from("quiz_options")
      .delete()
      .eq("id", optionId)
      .eq("question_id", questionId);

    if (deleteError) {
      console.error(deleteError);
      setError("Could not delete the option.");
      return;
    }

    setLocalOptions((current) =>
      current.filter((option) => option.id !== optionId)
    );

    router.refresh();
  }

  // --------------------------------------------------
  // TRUE / FALSE
  // --------------------------------------------------

  async function createOrRepairTrueFalse() {
    if (isSaving) return;

    setIsSaving(true);
    setError(null);

    /*
      A True / False question must contain exactly:

      True
      False

      This also repairs duplicates created by the
      previous version of the builder.
    */

    const { error: deleteError } = await supabase
      .from("quiz_options")
      .delete()
      .eq("question_id", questionId);

    if (deleteError) {
      console.error(deleteError);
      setError(
        "Could not prepare the True / False answers."
      );
      setIsSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("quiz_options")
      .insert([
        {
          question_id: questionId,
          option_text: "True",
          is_correct: true,
          position: 1,
        },
        {
          question_id: questionId,
          option_text: "False",
          is_correct: false,
          position: 2,
        },
      ])
      .select(
        "id, option_text, is_correct, position"
      )
      .order("position", { ascending: true });

    if (insertError || !data) {
      console.error(insertError);
      setError(
        "Could not create True / False answers."
      );
      setIsSaving(false);
      return;
    }

    setLocalOptions(data as QuizOption[]);
    setIsSaving(false);

    router.refresh();
  }

  // --------------------------------------------------
  // MATCHING
  // --------------------------------------------------

  async function addPair() {
    const cleanLeft = leftText.trim();
    const cleanRight = rightText.trim();

    if (!cleanLeft || !cleanRight || isSaving) {
      setError("Both sides of the match are required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("quiz_matching_pairs")
      .insert({
        question_id: questionId,
        left_text: cleanLeft,
        right_text: cleanRight,
        position: localPairs.length + 1,
      })
      .select(
        "id, left_text, right_text, position"
      )
      .single();

    if (insertError || !data) {
      console.error(insertError);
      setError("Could not add the matching pair.");
      setIsSaving(false);
      return;
    }

    setLocalPairs((current) => [
      ...current,
      data as MatchingPair,
    ]);

    setLeftText("");
    setRightText("");
    setIsSaving(false);

    router.refresh();
  }

  async function updatePair(
    pairId: string,
    left: string,
    right: string
  ) {
    const cleanLeft = left.trim();
    const cleanRight = right.trim();

    if (!cleanLeft || !cleanRight) return;

    setError(null);

    const { error: updateError } = await supabase
      .from("quiz_matching_pairs")
      .update({
        left_text: cleanLeft,
        right_text: cleanRight,
      })
      .eq("id", pairId)
      .eq("question_id", questionId);

    if (updateError) {
      console.error(updateError);
      setError("Could not update the matching pair.");
      return;
    }

    setLocalPairs((current) =>
      current.map((pair) =>
        pair.id === pairId
          ? {
              ...pair,
              left_text: cleanLeft,
              right_text: cleanRight,
            }
          : pair
      )
    );

    router.refresh();
  }

  async function deletePair(pairId: string) {
    if (!window.confirm("Delete this matching pair?")) {
      return;
    }

    setError(null);

    const { error: deleteError } = await supabase
      .from("quiz_matching_pairs")
      .delete()
      .eq("id", pairId)
      .eq("question_id", questionId);

    if (deleteError) {
      console.error(deleteError);
      setError("Could not delete the matching pair.");
      return;
    }

    setLocalPairs((current) =>
      current.filter((pair) => pair.id !== pairId)
    );

    router.refresh();
  }

  // --------------------------------------------------
  // MANUAL REVIEW TYPES
  // --------------------------------------------------

  if (
    questionType === "open_text" ||
    questionType === "file_upload"
  ) {
    return (
      <div className="rounded-xl bg-[#f9fafb] px-4 py-3">
        <p className="text-xs leading-5 text-[#667085]">
          {questionType === "open_text"
            ? "The learner will enter a written response. This question requires trainer review."
            : "The learner will upload supporting evidence. This question requires trainer review."}
        </p>
      </div>
    );
  }

  // --------------------------------------------------
  // TRUE / FALSE SETUP / REPAIR
  // --------------------------------------------------

  if (
    questionType === "true_false" &&
    localOptions.length !== 2
  ) {
    return (
      <div className="space-y-3">
        {error && (
          <div className="rounded-lg bg-[#fef3f2] px-3 py-2 text-xs text-[#b42318]">
            {error}
          </div>
        )}

        {localOptions.length > 0 && (
          <div className="rounded-xl border border-[#fedf89] bg-[#fffaeb] px-4 py-3">
            <p className="text-xs font-semibold text-[#b54708]">
              This True / False question has invalid or
              duplicate answers.
            </p>

            <p className="mt-1 text-xs leading-5 text-[#667085]">
              Repairing it will replace the current answers
              with exactly one True and one False.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={createOrRepairTrueFalse}
          disabled={isSaving}
          className="rounded-xl border border-[#d0d5dd] bg-white px-4 py-2 text-xs font-semibold text-[#475467] disabled:opacity-50"
        >
          {isSaving
            ? "Preparing..."
            : localOptions.length > 0
              ? "Repair True / False answers"
              : "Create True / False answers"}
        </button>
      </div>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-[#fef3f2] px-3 py-2 text-xs text-[#b42318]">
          {error}
        </div>
      )}

      {usesOptions && (
        <>
          <div className="space-y-2">
            {localOptions.map((option) => (
              <OptionRow
                key={option.id}
                option={option}
                questionType={questionType}
                disabled={isSaving}
                onSave={updateOptionText}
                onCorrect={() => toggleCorrect(option)}
                onDelete={() =>
                  deleteOption(option.id)
                }
              />
            ))}
          </div>

          {questionType !== "true_false" && (
            <div className="flex gap-2">
              <input
                value={optionText}
                onChange={(event) =>
                  setOptionText(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addOption();
                  }
                }}
                placeholder="Add answer option"
                className="min-w-0 flex-1 rounded-xl border border-[#d0d5dd] px-3 py-2 text-sm outline-none focus:border-[#7c5cff]"
              />

              <button
                type="button"
                onClick={addOption}
                disabled={isSaving}
                className="rounded-xl bg-[#172033] px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Add
              </button>
            </div>
          )}
        </>
      )}

      {usesPairs && (
        <>
          <div className="rounded-xl bg-[#f3f0ff] px-4 py-3">
            <p className="text-xs font-semibold text-[#6847df]">
              {questionType === "match_cards"
                ? "Match Cards"
                : "Matching"}
            </p>

            <p className="mt-1 text-xs leading-5 text-[#667085]">
              {questionType === "match_cards"
                ? "Add a term on the left and its correct meaning on the right."
                : "Add each item and the answer it should be matched with."}
            </p>
          </div>

          <div className="space-y-2">
            {localPairs.map((pair) => (
              <PairRow
                key={pair.id}
                pair={pair}
                onSave={updatePair}
                onDelete={() =>
                  deletePair(pair.id)
                }
              />
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center">
            <input
              value={leftText}
              onChange={(event) =>
                setLeftText(event.target.value)
              }
              placeholder={
                questionType === "match_cards"
                  ? "Term"
                  : "Item"
              }
              className="min-w-0 rounded-xl border border-[#d0d5dd] px-3 py-2 text-sm outline-none focus:border-[#7c5cff]"
            />

            <span className="hidden text-[#98a2b3] sm:block">
              →
            </span>

            <input
              value={rightText}
              onChange={(event) =>
                setRightText(event.target.value)
              }
              placeholder={
                questionType === "match_cards"
                  ? "Meaning"
                  : "Correct match"
              }
              className="min-w-0 rounded-xl border border-[#d0d5dd] px-3 py-2 text-sm outline-none focus:border-[#7c5cff]"
            />

            <button
              type="button"
              onClick={addPair}
              disabled={isSaving}
              className="rounded-xl bg-[#172033] px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function OptionRow({
  option,
  questionType,
  disabled,
  onSave,
  onCorrect,
  onDelete,
}: {
  option: QuizOption;
  questionType: string;
  disabled: boolean;
  onSave: (id: string, text: string) => void;
  onCorrect: () => void;
  onDelete: () => void;
}) {
  const [text, setText] = useState(option.option_text);

  useEffect(() => {
    setText(option.option_text);
  }, [option.option_text]);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#eaecf0] bg-white p-2">
      <button
        type="button"
        onClick={onCorrect}
        disabled={disabled}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold disabled:opacity-50 ${
          option.is_correct
            ? "border-[#abefc6] bg-[#ecfdf3] text-[#067647]"
            : "border-[#d0d5dd] text-[#98a2b3]"
        }`}
        title={
          questionType === "multiple_choice"
            ? "Toggle correct answer"
            : "Set as correct answer"
        }
      >
        ✓
      </button>

      <input
        value={text}
        onChange={(event) =>
          setText(event.target.value)
        }
        onBlur={() => {
          if (text !== option.option_text) {
            onSave(option.id, text);
          }
        }}
        className="min-w-0 flex-1 rounded-lg border-0 px-2 py-1.5 text-sm text-[#344054] outline-none focus:bg-[#f9fafb]"
      />

      {questionType !== "true_false" && (
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[#b42318] hover:bg-[#fef3f2] disabled:opacity-50"
        >
          Delete
        </button>
      )}
    </div>
  );
}

function PairRow({
  pair,
  onSave,
  onDelete,
}: {
  pair: MatchingPair;
  onSave: (
    id: string,
    left: string,
    right: string
  ) => void;
  onDelete: () => void;
}) {
  const [left, setLeft] = useState(pair.left_text);
  const [right, setRight] = useState(pair.right_text);

  useEffect(() => {
    setLeft(pair.left_text);
    setRight(pair.right_text);
  }, [pair.left_text, pair.right_text]);

  function save() {
    if (
      left !== pair.left_text ||
      right !== pair.right_text
    ) {
      onSave(pair.id, left, right);
    }
  }

  return (
    <div className="grid gap-2 rounded-xl border border-[#eaecf0] bg-white p-2 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center">
      <input
        value={left}
        onChange={(event) =>
          setLeft(event.target.value)
        }
        onBlur={save}
        className="min-w-0 rounded-lg bg-[#f9fafb] px-3 py-2 text-sm outline-none"
      />

      <span className="hidden text-[#98a2b3] sm:block">
        →
      </span>

      <input
        value={right}
        onChange={(event) =>
          setRight(event.target.value)
        }
        onBlur={save}
        className="min-w-0 rounded-lg bg-[#f9fafb] px-3 py-2 text-sm outline-none"
      />

      <button
        type="button"
        onClick={onDelete}
        className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[#b42318] hover:bg-[#fef3f2]"
      >
        Delete
      </button>
    </div>
  );
}