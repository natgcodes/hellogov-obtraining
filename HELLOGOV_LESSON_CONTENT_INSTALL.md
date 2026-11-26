# HelloGov — Lesson Content & Day Editor

## Installation candidate — Query 644

This patch is based on HelloGov_Lesson_Content_Source.zip. It contains only changed/new HelloGov source files, one SQL migration and a focused test suite. No new npm dependencies. Back up local work and check `git status --short` before overwriting files. Do not stage unrelated work or iVisa files.

1. From your HelloGov repository, copy the migration to the clipboard:
   `unzip -p ~/Downloads/HelloGov_Lesson_Content_Update.zip supabase/migrations/644_lesson_content.sql | pbcopy`
2. Run the entire migration in the **HelloGov** Supabase SQL Editor as Query 644. Do not run it against iVisa. Stop on any error. Expected report: eight lesson metadata columns, private bucket true, and counts of retained legacy materials, material completions and module progress records. Take a database backup before running on production.
3. Extract: `unzip -o ~/Downloads/HelloGov_Lesson_Content_Update.zip -d .`
4. Run `git status --short`, `git diff --check`, `node tests/lesson-content.test.cjs`, and `npx tsc --noEmit`. Stop if errors occur.
5. Run `npm run dev`. Test on a draft wave and an authorized test learner before committing or deploying.

## Functional acceptance tests

- Existing day header, sidebar, modules, materials, quizzes, notes and progress remain unchanged on unmodified modules.
- Open a day from Program Builder; full-page editor, local outline, collapsed structure, previous/next and Add Module work.
- Add reading, Google Slides, Google Drive video, Loom, image, PDF, Supademo, callout and divider; verify learner view and read-only preview.
- Reorder day items and lesson blocks, save or cancel; reload and confirm order and stable IDs.
- Add a module after another module or at the end. Check draft publication and required settings.
- Check optional vs required completion in a draft wave, including material bookmarks and existing practice/quiz flow.
- Check already-published days: new blocks cannot become required through the new editor. Check that previously completed modules remain completed.
- Test private asset access with an authorized learner and denied access with an unrelated account. Verify uploads and reference links.
- Test Drive/Slides/Loom permissions using an actual authorized corporate account, including external fallback.
- Duplicate a draft training wave and verify lesson metadata/order and no copied learner progress.

## Design and limitations

Lesson blocks extend the existing materials table and reuse existing progress records. No automatic conversion of legacy content. New content is opt-in; old materials preserve their individual completion controls. New bookmark tasks use manual confirmation of browser bookmarks, not platform bookmarks. Existing quiz approval/manual-completion behavior is preserved. New required lesson blocks are restricted on already-published days; the new module creation path also protects completed enrollments. Legacy trainer controls still retain their prior behavior.

Reading supports a Markdown subset and toolbar rather than a full WYSIWYG editor. New module/day order and lesson block ordering use drag and drop with explicit Save/Cancel. Legacy sub-editors remain in place. Private file uploads are limited to 15 MB and supported image/PDF types. No malware scan or automatic orphan cleanup is included. Signed asset URLs expire; the authenticated resource route provides a stable reference. Third-party embeds depend on provider permissions/browser restrictions; external fallback is included. Do not make internal content public just to embed it.

Validation performed: 22 focused helper tests, syntax parsing of 17 TypeScript source files, strict standalone helper type check. Full application type checking/build, browser integration, and live database migration have not been executed in this environment because project dependencies and database access are unavailable. This is an installation candidate, not a production-certified release. Do not commit or push until the local and database checks pass.

## Source manifest

- `src/app/learn/day/[dayId]/page.tsx`
- `src/app/learn/resource/[materialId]/page.tsx`
- `src/app/trainer/impersonate/[learnerId]/day/[dayId]/page.tsx`
- `src/app/trainer/program/day/[dayId]/page.tsx`
- `src/components/learning/LearnerModuleCard.tsx`
- `src/components/lesson/LessonBody.tsx`
- `src/components/lesson/LessonCompletion.tsx`
- `src/components/lesson/LessonMedia.tsx`
- `src/components/lesson/LessonSections.tsx`
- `src/components/trainer/AddModuleEditor.tsx`
- `src/components/trainer/DayEditor.tsx`
- `src/components/trainer/LessonContentEditor.tsx`
- `src/components/trainer/ModuleEditor.tsx`
- `src/components/trainer/ProgramTimeline.tsx`
- `src/lib/learning/types.ts`
- `src/lib/lesson/content.ts`
- `src/lib/program/getDays.ts`
- `supabase/migrations/644_lesson_content.sql`
