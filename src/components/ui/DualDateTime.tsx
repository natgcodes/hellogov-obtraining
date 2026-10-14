"use client";

import { useEffect, useState } from "react";

import {
  formatOfficialDateTime,
  getDualDateTime,
  getUserTimezone,
  OFFICIAL_TIMEZONE_LABEL,
} from "@/lib/datetime";

type Props = {
  value: string | Date;
  compact?: boolean;
  className?: string;
};

export default function DualDateTime({
  value,
  compact = false,
  className = "",
}: Props) {
  const [timezone, setTimezone] =
    useState<string | null>(null);

  useEffect(() => {
    setTimezone(getUserTimezone());
  }, []);

  const official = formatOfficialDateTime(value);

  const result = timezone
    ? getDualDateTime(value, timezone)
    : null;

  if (compact) {
    return (
      <div className={className}>
        <p className="text-[11px] font-medium text-[#172033]">
          {official} ({OFFICIAL_TIMEZONE_LABEL})
        </p>

        {result && !result.sameTimezone && (
          <p className="mt-1 text-[11px] text-[#667085]">
            Your local time: {result.local} (
            {result.localTimezoneLabel})
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-[#B9E8EE] bg-[#F0FAFB] px-4 py-3 ${className}`}
    >
      <p className="text-xs font-semibold text-[#08788A]">
        Official Time · Colombia / Peru
      </p>

      <p className="mt-1 text-sm font-semibold text-[#172033]">
        {official}
      </p>

      {result && !result.sameTimezone && (
        <div className="mt-3 border-t border-[#B9E8EE] pt-3">
          <p className="text-xs font-semibold text-[#08788A]">
            Your Local Time
          </p>

          <p className="mt-1 text-sm text-[#344054]">
            {result.local} (
            {result.localTimezoneLabel})
          </p>
        </div>
      )}
    </div>
  );
}