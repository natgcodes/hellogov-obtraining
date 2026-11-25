export default function DashboardWaveSelector({ programs, selected, action }: {
  programs: { id: string; title: string }[];
  selected: string;
  action: "/trainer" | "/team";
}) {
  return <form action={action} method="GET" className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
    <label className="flex min-w-0 flex-col gap-2 text-xs font-semibold text-slate-700">
      Training wave
      <select name="programId" defaultValue={selected} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
        <option value="all">All Waves</option>
        {programs.map(program => <option key={program.id} value={program.id}>{program.title}</option>)}
      </select>
    </label>
    <button type="submit" className="min-h-10 rounded-lg bg-[#08A9C1] px-4 text-xs font-semibold text-white">Apply filter</button>
    <p className="text-xs text-slate-500">Results are separated by onboarding enrollment.</p>
  </form>;
}
