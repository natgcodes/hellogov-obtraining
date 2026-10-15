"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { userId: string; userName: string; accountStatus: "active" | "deactivated"; isCurrentUser: boolean };
export default function AccountStatusButton({ userId, userName, accountStatus, isCurrentUser }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (isCurrentUser) return <span className="text-xs text-slate-400">Current user</span>;
  const deactivate = accountStatus === "active";
  async function save() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/trainer/users/status", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: deactivate ? "deactivate" : "reactivate", reason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update account.");
      setOpen(false); setReason(""); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update account."); }
    finally { setBusy(false); }
  }
  return <>
    <button type="button" onClick={() => { setOpen(true); setError(""); }} className="text-xs font-semibold text-[#07879B] hover:underline">
      {deactivate ? "Deactivate" : "Reactivate"}
    </button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-left shadow-xl">
        <h2 className="text-lg font-semibold">{deactivate ? "Deactivate" : "Reactivate"} {userName}?</h2>
        <p className="mt-2 text-sm text-slate-600">{deactivate ? "Login access will be blocked. Training progress, submissions and reviews will be retained." : "Login access will be restored. Previous training records will remain unchanged."}</p>
        {deactivate && <label className="mt-4 block text-sm">Reason <textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={500} className="mt-2 w-full rounded-lg border p-3" rows={3} placeholder="e.g. Resigned" /></label>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button disabled={busy} onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2">Cancel</button>
          <button disabled={busy || (deactivate && !reason.trim())} onClick={save} className="rounded-lg bg-[#07879B] px-4 py-2 text-white disabled:opacity-50">{busy ? "Saving..." : "Confirm"}</button>
        </div>
      </div>
    </div>}
  </>;
}
