// ============================================================
// HELLOGOV — DATE & TIME UTILITIES
// Official timezone: Colombia / Peru (UTC-5)
// ============================================================

export const OFFICIAL_TIMEZONE = "America/Lima";

export const OFFICIAL_TIMEZONE_LABEL = "Colombia/Peru";

type DateInput = string | number | Date;

type DateTimeOptions = {
  includeSeconds?: boolean;
  includeYear?: boolean;
};

// ------------------------------------------------------------
// VALIDATE DATE
// ------------------------------------------------------------

function toDate(value: DateInput): Date | null {
  const date =
    value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

// ------------------------------------------------------------
// FORMAT OFFICIAL DATE & TIME
// ------------------------------------------------------------

export function formatOfficialDateTime(
  value: DateInput,
  options: DateTimeOptions = {}
): string {
  const date = toDate(value);

  if (!date) return "—";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: OFFICIAL_TIMEZONE,
    month: "short",
    day: "numeric",
    year:
      options.includeYear === false
        ? undefined
        : "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: options.includeSeconds
      ? "2-digit"
      : undefined,
    hour12: true,
  }).format(date);
}

// ------------------------------------------------------------
// DETECT USER TIMEZONE
// ------------------------------------------------------------

export function getUserTimezone(): string {
  try {
    return (
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone || OFFICIAL_TIMEZONE
    );
  } catch {
    return OFFICIAL_TIMEZONE;
  }
}

// ------------------------------------------------------------
// FORMAT LOCAL DATE & TIME
// ------------------------------------------------------------

export function formatLocalDateTime(
  value: DateInput,
  timezone?: string
): string {
  const date = toDate(value);

  if (!date) return "—";

  const targetTimezone =
    timezone ?? getUserTimezone();

  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: targetTimezone,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return formatOfficialDateTime(date);
  }
}

// ------------------------------------------------------------
// TIMEZONE LABEL
// ------------------------------------------------------------

export function getTimezoneLabel(
  timezone?: string
): string {
  const value = timezone ?? getUserTimezone();

  const labels: Record<string, string> = {
    "America/Lima": "Lima, Peru",
    "America/Bogota": "Bogota, Colombia",
    "Europe/Madrid": "Madrid, Spain",
    "America/New_York": "Miami / New York, USA",
  };

  return (
    labels[value] ??
    value.replaceAll("_", " ").replaceAll("/", " / ")
  );
}

// ------------------------------------------------------------
// CHECK WHETHER LOCAL TIME MATCHES OFFICIAL TIME
// ------------------------------------------------------------

export function isOfficialTimezone(
  timezone?: string
): boolean {
  const value = timezone ?? getUserTimezone();

  return (
    value === "America/Lima" ||
    value === "America/Bogota"
  );
}

// ------------------------------------------------------------
// FORMAT BOTH TIMEZONES
// ------------------------------------------------------------

export function getDualDateTime(
  value: DateInput,
  timezone?: string
) {
  const targetTimezone =
    timezone ?? getUserTimezone();

  return {
    official: formatOfficialDateTime(value),
    local: formatLocalDateTime(
      value,
      targetTimezone
    ),
    localTimezone: targetTimezone,
    localTimezoneLabel:
      getTimezoneLabel(targetTimezone),
    sameTimezone:
      isOfficialTimezone(targetTimezone),
  };
}

// ------------------------------------------------------------
// CONVERT OFFICIAL COLOMBIA/PERU TIME TO UTC
// ------------------------------------------------------------

export function officialDateTimeToUTC(
  date: string,
  time: string
): string | null {
  if (!date || !time) return null;

  const dateMatch = date.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  const timeMatch = time.match(
    /^(\d{2}):(\d{2})$/
  );

  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  // Validate the calendar date.
  const validationDate = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    validationDate.getUTCFullYear() !== year ||
    validationDate.getUTCMonth() !== month - 1 ||
    validationDate.getUTCDate() !== day
  ) {
    return null;
  }

  // Colombia and Peru use UTC-5 year-round.
  // Example: 2:00 PM official = 7:00 PM UTC.
  const utcDate = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hours + 5,
      minutes
    )
  );

  return utcDate.toISOString();
}

// ------------------------------------------------------------
// CONVERT SAVED UTC DATE TO OFFICIAL FORM INPUT VALUES
// ------------------------------------------------------------

export function getOfficialDateTimeParts(
  value: string | null
): {
  date: string;
  time: string;
} {
  if (!value) {
    return {
      date: "",
      time: "",
    };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      date: "",
      time: "",
    };
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: OFFICIAL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const getPart = (type: string) =>
    parts.find((part) => part.type === type)
      ?.value ?? "";

  return {
    date: `${getPart("year")}-${getPart("month")}-${getPart("day")}`,
    time: `${getPart("hour")}:${getPart("minute")}`,
  };
}