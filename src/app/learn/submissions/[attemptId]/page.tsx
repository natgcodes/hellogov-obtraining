import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    attemptId: string;
  }>;
};

type SubmissionRow = {
  answer_id: string;
  question_id: string;
  question_position: number;
  question_text: string;
  question_type: string;
  question_points: number;
  answer_text: string | null;
  file_path: string | null;
  file_name: string | null;
  is_correct: boolean | null;
  points_awarded: number | null;
  trainer_feedback: string | null;
  answer_graded_at: string | null;
  selected_option_text: string | null;
  match_left_text: string | null;
  match_right_text: string | null;
  match_position: number | null;
};

type GroupedAnswer = {
  answerId: string;
  questionId: string;
  position: number;
  questionText: string;
  questionType: string;
  points: number;
  answerText: string | null;
  filePath: string | null;
  fileName: string | null;
  isCorrect: boolean | null;
  pointsAwarded: number | null;
  trainerFeedback: string | null;
  gradedAt: string | null;
  selectedOptionText: string | null;

  selectedOptions: {
    text: string;
    position: number;
  }[];

  matches: {
    left: string;
    right: string;
    position: number;
  }[];
};

export default async function LearnerSubmissionPage({
  params,
}: Props) {
  const { attemptId } = await params;
  const supabase = await createClient();

  /*
   * AUTH
   */

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "trainer") {
    redirect("/trainer");
  }

  /*
   * ATTEMPT
   */

  const {
    data: attempt,
    error: attemptError,
  } = await supabase
    .from("quiz_attempts")
    .select(`
      id,
      quiz_id,
      learner_id,
      attempt_number,
      score,
      passed,
      status,
      started_at,
      submitted_at,
      graded_at,
      quizzes (
        id,
        title,
        description,
        passing_score,
        show_results,
        modules (
          id,
          title,
          day_id,
          days (
            id,
            day_number,
            title
          )
        )
      )
    `)
    .eq("id", attemptId)
    .eq("learner_id", user.id)
    .single();

  if (attemptError || !attempt) {
    notFound();
  }

  if (!attempt.submitted_at) {
    redirect("/learn");
  }

  /*
   * SUBMISSION ANSWERS
   *
   * Query 31:
   * get_learner_submission_detail
   *
   * Handles:
   * - Single Choice
   * - Multiple Choice
   * - True / False
   * - Matching
   * - Match Cards
   * - Open Text
   * - File Upload
   */

  const {
    data: submissionData,
    error: submissionError,
  } = await supabase.rpc(
    "get_learner_submission_detail",
    {
      target_attempt_id: attemptId,
    }
  );

  if (submissionError) {
    console.error(
      "Unable to load submission detail:",
      submissionError
    );
  }

  const submissionRows =
    (submissionData ?? []) as SubmissionRow[];

  /*
   * GROUP ANSWERS
   *
   * Multiple Choice returns one row per
   * selected option.
   *
   * Matching / Match Cards return one row
   * per submitted pair.
   *
   * Here we reconstruct each question into
   * one object for the UI.
   */

  const groupedMap = new Map<
    string,
    GroupedAnswer
  >();

  for (const row of submissionRows) {
    let answer = groupedMap.get(
      row.answer_id
    );

    if (!answer) {
      answer = {
        answerId: row.answer_id,
        questionId: row.question_id,
        position: row.question_position,
        questionText: row.question_text,
        questionType: row.question_type,

        points: Number(
          row.question_points ?? 0
        ),

        answerText: row.answer_text,
        filePath: row.file_path,
        fileName: row.file_name,

        isCorrect: row.is_correct,

        pointsAwarded:
          row.points_awarded === null
            ? null
            : Number(
                row.points_awarded
              ),

        trainerFeedback:
          row.trainer_feedback,

        gradedAt:
          row.answer_graded_at,

        selectedOptionText:
          row.question_type ===
          "multiple_choice"
            ? null
            : row.selected_option_text,

        selectedOptions: [],

        matches: [],
      };

      groupedMap.set(
        row.answer_id,
        answer
      );
    }

    /*
     * MULTIPLE CHOICE
     */

    if (
      row.question_type ===
        "multiple_choice" &&
      row.selected_option_text
    ) {
      answer.selectedOptions.push({
        text: row.selected_option_text,
        position: Number(
          row.match_position ?? 0
        ),
      });
    }

    /*
     * MATCHING / MATCH CARDS
     */

    if (
      row.match_left_text &&
      row.match_right_text
    ) {
      answer.matches.push({
        left: row.match_left_text,
        right: row.match_right_text,
        position: Number(
          row.match_position ?? 0
        ),
      });
    }
  }

  /*
   * SORT QUESTIONS AND THEIR INTERNAL
   * OPTIONS / MATCHES
   */

  const groupedAnswers = Array.from(
    groupedMap.values()
  )
    .map((answer) => ({
      ...answer,

      selectedOptions: [
        ...answer.selectedOptions,
      ].sort(
        (a, b) =>
          a.position - b.position
      ),

      matches: [
        ...answer.matches,
      ].sort(
        (a, b) =>
          a.position - b.position
      ),
    }))
    .sort(
      (a, b) =>
        a.position - b.position
    );

  /*
   * FILE SIGNED URLS
   *
   * Bucket stays private.
   * Links expire after 1 hour.
   */

  const fileUrlMap = new Map<
    string,
    string
  >();

  for (const answer of groupedAnswers) {
    if (!answer.filePath) {
      continue;
    }

    const {
      data: signedData,
      error: signedError,
    } = await supabase.storage
      .from("quiz-submissions")
      .createSignedUrl(
        answer.filePath,
        60 * 60
      );

    if (signedError) {
      console.error(
        "Unable to create signed file URL:",
        signedError
      );
    }

    if (signedData?.signedUrl) {
      fileUrlMap.set(
        answer.answerId,
        signedData.signedUrl
      );
    }
  }

  /*
   * QUIZ / MODULE / DAY METADATA
   */

  const quiz = Array.isArray(
    attempt.quizzes
  )
    ? attempt.quizzes[0]
    : attempt.quizzes;

  if (!quiz) {
    notFound();
  }

  const moduleData = Array.isArray(
    quiz.modules
  )
    ? quiz.modules[0]
    : quiz.modules;

  const day =
    moduleData?.days?.[0] ?? null;

  /*
   * ATTEMPT STATUS
   */

  const pending =
    attempt.status === "needs_review";

  const passed =
    attempt.passed === true;

  /*
   * HELPERS
   */

  function formatDate(
    value: string | null
  ) {
    if (!value) {
      return "—";
    }

    return new Intl.DateTimeFormat(
      "en",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    ).format(new Date(value));
  }

  function questionTypeLabel(
    type: string
  ) {
    switch (type) {
      case "single_choice":
        return "Single choice";

      case "multiple_choice":
        return "Multiple choice";

      case "true_false":
        return "True / False";

      case "matching":
        return "Matching";

      case "match_cards":
        return "Match cards";

      case "open_text":
        return "Open response";

      case "file_upload":
        return "File upload";

      default:
        return "Question";
    }
  }

  /*
   * UI
   */

  return (
    <AppShell role="learner">
      <div className="mx-auto max-w-5xl">
        {/* BACK */}

        <Link
          href="/learn/submissions"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          ← Back to submissions
        </Link>

        {/* SUMMARY */}

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {day && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    Day{" "}
                    {day.day_number}
                  </span>
                )}

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  Attempt{" "}
                  {
                    attempt.attempt_number
                  }
                </span>

                {pending ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    Pending review
                  </span>
                ) : passed ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Passed
                  </span>
                ) : (
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                    Not passed
                  </span>
                )}
              </div>

              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#e84545]">
                Submission
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {quiz.title}
              </h1>

              {moduleData && (
                <p className="mt-2 text-sm text-slate-500">
                  {
                    moduleData.title
                  }
                </p>
              )}

              <p className="mt-4 text-xs text-slate-400">
                Submitted{" "}
                {formatDate(
                  attempt.submitted_at
                )}
              </p>
            </div>

            {/* SCORE */}

            <div className="min-w-[190px] rounded-2xl bg-slate-50 p-5 text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {pending
                  ? "Partial score"
                  : "Final score"}
              </p>

              <p className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">
                {attempt.score !== null
                  ? `${Number(
                      attempt.score
                    )}%`
                  : "—"}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Passing score:{" "}
                {
                  quiz.passing_score
                }
                %
              </p>
            </div>
          </div>

          {/* PENDING REVIEW MESSAGE */}

          {pending && (
            <div className="mt-7 rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                Trainer review
                pending
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-700">
                Some responses
                require manual review.
                Your current score is
                partial and may change
                after your trainer
                completes the review.
              </p>
            </div>
          )}
        </div>

        {/* RESPONSES */}

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Submitted answers
          </p>

          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            Your responses
          </h2>

          {submissionError ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              Your answers could
              not be loaded.
            </div>
          ) : groupedAnswers.length ===
            0 ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              No submitted answers
              were found.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {groupedAnswers.map(
                (
                  answer,
                  index
                ) => {
                  const awaitingReview =
                    (answer.questionType ===
                      "open_text" ||
                      answer.questionType ===
                        "file_upload") &&
                    answer.gradedAt ===
                      null;

                  const fileUrl =
                    fileUrlMap.get(
                      answer.answerId
                    );

                  return (
                    <article
                      key={
                        answer.answerId
                      }
                      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                    >
                      {/* QUESTION HEADER */}

                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Question{" "}
                              {index +
                                1}
                            </span>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                              {questionTypeLabel(
                                answer.questionType
                              )}
                            </span>
                          </div>

                          <h3 className="mt-3 text-base font-semibold leading-6 text-slate-950">
                            {
                              answer.questionText
                            }
                          </h3>
                        </div>

                        {/* GRADING STATUS */}

                        <div className="shrink-0">
                          {awaitingReview ? (
                            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                              Pending
                              review
                            </span>
                          ) : answer.isCorrect ===
                            true ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                              Correct
                            </span>
                          ) : answer.isCorrect ===
                            false ? (
                            <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                              Incorrect
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                              Reviewed
                            </span>
                          )}
                        </div>
                      </div>

                      {/* YOUR ANSWER */}

                      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Your answer
                        </p>

                        {/* SINGLE CHOICE / TRUE FALSE */}

                        {(answer.questionType ===
                          "single_choice" ||
                          answer.questionType ===
                            "true_false") && (
                          <p className="mt-2 text-sm font-medium text-slate-800">
                            {answer.selectedOptionText ??
                              "No answer recorded"}
                          </p>
                        )}

                        {/* MULTIPLE CHOICE */}

                        {answer.questionType ===
                          "multiple_choice" && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {answer
                              .selectedOptions
                              .length >
                            0 ? (
                              answer.selectedOptions.map(
                                (
                                  option,
                                  optionIndex
                                ) => (
                                  <span
                                    key={`${answer.answerId}-option-${optionIndex}`}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                                  >
                                    {
                                      option.text
                                    }
                                  </span>
                                )
                              )
                            ) : (
                              <p className="text-sm text-slate-500">
                                No
                                answer
                                recorded
                              </p>
                            )}
                          </div>
                        )}

                        {/* MATCHING / MATCH CARDS */}

                        {(answer.questionType ===
                          "matching" ||
                          answer.questionType ===
                            "match_cards") && (
                          <div className="mt-3 space-y-2">
                            {answer
                              .matches
                              .length >
                            0 ? (
                              answer.matches.map(
                                (
                                  match,
                                  matchIndex
                                ) => (
                                  <div
                                    key={`${answer.answerId}-match-${matchIndex}`}
                                    className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                                  >
                                    <span className="text-sm font-semibold text-slate-800">
                                      {
                                        match.left
                                      }
                                    </span>

                                    <span className="text-slate-400">
                                      →
                                    </span>

                                    <span className="text-sm text-slate-600">
                                      {
                                        match.right
                                      }
                                    </span>
                                  </div>
                                )
                              )
                            ) : (
                              <p className="text-sm text-slate-500">
                                No
                                answer
                                recorded
                              </p>
                            )}
                          </div>
                        )}

                        {/* OPEN TEXT */}

                        {answer.questionType ===
                          "open_text" && (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                            {answer.answerText ||
                              "No response"}
                          </p>
                        )}

                        {/* FILE UPLOAD */}

                        {answer.questionType ===
                          "file_upload" && (
                          <div className="mt-3">
                            {answer.fileName ? (
                              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg">
                                    ↗
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-800">
                                      {
                                        answer.fileName
                                      }
                                    </p>

                                    <p className="mt-0.5 text-xs text-slate-400">
                                      Submitted
                                      file
                                    </p>
                                  </div>
                                </div>

                                {fileUrl ? (
                                  <a
                                    href={
                                      fileUrl
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold !text-slate-700 transition hover:bg-slate-50"
                                  >
                                    View
                                    file
                                  </a>
                                ) : (
                                  <span className="text-xs text-slate-400">
                                    File
                                    unavailable
                                  </span>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">
                                No file
                                submitted
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* POINTS */}

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-slate-400">
                          {answer.pointsAwarded !==
                          null
                            ? `${answer.pointsAwarded} / ${answer.points} ${
                                answer.points ===
                                1
                                  ? "point"
                                  : "points"
                              }`
                            : `${answer.points} ${
                                answer.points ===
                                1
                                  ? "point"
                                  : "points"
                              } available`}
                        </p>

                        {awaitingReview && (
                          <p className="text-xs font-medium text-amber-700">
                            Awaiting
                            trainer
                            grading
                          </p>
                        )}
                      </div>

                      {/* TRAINER FEEDBACK */}

                      {answer.trainerFeedback && (
                        <div className="mt-4 border-t border-slate-100 pt-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Trainer
                            feedback
                          </p>

                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {
                              answer.trainerFeedback
                            }
                          </p>
                        </div>
                      )}
                    </article>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}