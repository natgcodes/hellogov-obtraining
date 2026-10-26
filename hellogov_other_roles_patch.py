from pathlib import Path

path = Path('src/app/trainer/learners/page.tsx')
source = path.read_text()
original = source

def replace_once(old, new, label):
    global source
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected one occurrence, found {count}. No changes saved.')
    source = source.replace(old, new, 1)

replace_once('  learner_id: string;\n  full_name:', '  learner_id: string;\n  user_role?: string;\n  full_name:', 'type')
replace_once('export default async function TrainerLearnersPage() {', '''type PageProps = {
  searchParams: Promise<{ tab?: string; role?: string }>;
};

const roleLabels: Record<string, string> = {
  observer: "Observer",
  cross_training: "Cross-Training",
  team_leader: "Team Leader",
};

export default async function TrainerLearnersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const otherRolesTab = params.tab === "other";
  const selectedRole = ["observer", "cross_training", "team_leader"].includes(params.role ?? "")
    ? params.role
    : "all";''', 'page signature')
start = source.index('  const { data, error } = await supabase.rpc(')
end = source.index('  // ---------------------------------------------------------\n  // METRICS', start)
source = source[:start] + '''  const { data, error } = await supabase.rpc(
    otherRolesTab ? "get_trainer_other_roles" : "get_trainer_learners",
    { target_program_id: program.id }
  );

  const roster = (data ?? []) as TrainerLearner[];
  const learners = otherRolesTab && selectedRole !== "all"
    ? roster.filter((person) => person.user_role === selectedRole)
    : roster;

''' + source[end:]
replace_once('''                Trainees
              </h1>''', '''                {otherRolesTab ? "Other Roles" : "Trainees"}
              </h1>''', 'header')
replace_once('''                Track onboarding progress,
                assessments and certification
                status for every trainee.''', '''                Track onboarding progress, assessments and certification status
                {otherRolesTab ? " for observers, cross-training users and team leaders." : " for every trainee."}''', 'description')
replace_once('''          {/* ERROR */}''', '''          {/* ROSTER TABS */}
          <nav aria-label="Onboarding roster" className="mt-7 flex gap-2 border-b border-[var(--border)]">
            <Link href="/trainer/learners" aria-current={!otherRolesTab ? "page" : undefined}
              className={`border-b-2 px-4 py-3 text-[13px] font-semibold transition ${!otherRolesTab ? "border-[#08A9C1] text-[#07879B]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
              Trainees
            </Link>
            <Link href="/trainer/learners?tab=other" aria-current={otherRolesTab ? "page" : undefined}
              className={`border-b-2 px-4 py-3 text-[13px] font-semibold transition ${otherRolesTab ? "border-[#08A9C1] text-[#07879B]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
              Other Roles
            </Link>
          </nav>

          {otherRolesTab && (
            <div className="mt-5 flex flex-wrap items-center gap-2" aria-label="Filter by role">
              {[
                { value: "all", label: "All Roles" },
                { value: "observer", label: "Observer" },
                { value: "cross_training", label: "Cross-Training" },
                { value: "team_leader", label: "Team Leader" },
              ].map((option) => (
                <Link key={option.value}
                  href={option.value === "all" ? "/trainer/learners?tab=other" : `/trainer/learners?tab=other&role=${option.value}`}
                  aria-current={selectedRole === option.value ? "true" : undefined}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${selectedRole === option.value ? "border-[#08A9C1] bg-[#EAF8FA] text-[#07879B]" : "border-[var(--border)] bg-white text-[var(--text-secondary)] hover:bg-[#FAFCFC]"}`}>
                  {option.label}
                </Link>
              ))}
            </div>
          )}

          {/* ERROR */}''', 'tabs')
replace_once('''              label="Trainees"
              value={totalLearners}''', '''              label={otherRolesTab ? "Other Roles" : "Trainees"}
              value={totalLearners}''', 'metric label')
replace_once('''              helper="Across all trainees"''', '''              helper={otherRolesTab ? "Across selected roles" : "Across all trainees"}''', 'metric helper')
replace_once('''                  {totalLearners}{" "}
                  {totalLearners === 1
                    ? "trainee"
                    : "trainees"}{" "}
                  enrolled''', '''                  {totalLearners} {otherRolesTab ? (totalLearners === 1 ? "person" : "people") : (totalLearners === 1 ? "trainee" : "trainees")} enrolled''', 'roster count')
replace_once('''                  No trainees yet''', '''                  {otherRolesTab ? "No users in this role" : "No trainees yet"}''', 'empty title')
replace_once('''                  No trainees have started this
                  program yet.''', '''                  {otherRolesTab ? "No enrolled users match this filter." : "No trainees have started this program yet."}''', 'empty description')
replace_once('''                        Trainee
                      </th>''', '''                        {otherRolesTab ? "Name" : "Trainee"}
                      </th>

                      {otherRolesTab && (
                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                          Role
                        </th>
                      )}''', 'role header')
replace_once('''                                  {learner.full_name ||
                                    "Trainee"}''', '''                                  {learner.full_name ||
                                    "User"}''', 'fallback name')
replace_once('''                          {/* PROGRESS */}''', '''                          {otherRolesTab && (
                            <td className="px-4 py-4">
                              <span className="inline-flex rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
                                {roleLabels[learner.user_role ?? ""] ?? learner.user_role ?? "—"}
                              </span>
                            </td>
                          )}

                          {/* PROGRESS */}''', 'role cell')
if source == original:
    raise RuntimeError('No modifications')
backup = path.with_suffix('.tsx.before-other-roles.bak')
if backup.exists():
    raise RuntimeError(f'Backup already exists: {backup}. No changes saved.')
backup.write_text(original)
path.write_text(source)
print(f'Updated: {path}')
print(f'Backup: {backup}')
print('Next: npm run build')
