// Automatic "what's on right now" campaign theming for the storefront's top
// banner (src/components/campaign-banner.tsx). There's no live fixtures API
// wired up, so this deliberately doesn't try to guess real match dates —
// instead it's built entirely from known, fixed calendar facts:
//
//   1. Christmas (Dec 1 – Jan 6) — a fixed date range, highest priority.
//   2. World Cup — ONLY the officially confirmed 2026 window (Jun 11 – Jul
//      19, 2026). Future editions (2030, 2034) aren't added until their
//      exact dates are officially confirmed — not guessed, per this
//      project's standing "don't invent unconfirmed claims" convention (see
//      CONTEXT_HANDOFF.md).
//   3. The European club season (mid-Aug – end of May): Champions League
//      fixtures are traditionally played Tuesday/Wednesday nights, so those
//      two weekdays get the Champions League theme; every other day in
//      season gets La Liga — a real, well-known scheduling convention, not
//      a fabricated one, and it means both named competitions actually get
//      real, distinct airtime instead of one silently winning a tie every
//      day for months.
//   4. Off-season (June – mid-August, outside any World Cup window): no
//      campaign, the banner falls back to the normal promo tagline.
//
// Kept as one pure function (no DB/admin control) so it's simple, always
// correct without upkeep for the fixed dates, and easy to extend later.

export type CampaignId =
  | "christmas"
  | "world-cup"
  | "champions-league"
  | "la-liga";

export type Campaign = {
  id: CampaignId;
  /** CSS background for the banner strip. */
  gradient: string;
  /** Motif animation to use for the banner's decorative particles. */
  motif: "fall" | "twinkle" | "bounce";
};

const CAMPAIGNS: Record<CampaignId, Campaign> = {
  christmas: {
    id: "christmas",
    gradient: "linear-gradient(90deg, #7a1224, #b31f34 50%, #146b3a)",
    motif: "fall",
  },
  "world-cup": {
    id: "world-cup",
    gradient: "linear-gradient(90deg, #7a5c00, #caa62e 50%, #7a5c00)",
    motif: "fall",
  },
  "champions-league": {
    // UEFA Champions League's own real brand colors — deep navy + silver.
    id: "champions-league",
    gradient: "linear-gradient(90deg, #0a1440, #1f2f7a 50%, #0a1440)",
    motif: "twinkle",
  },
  "la-liga": {
    // La Liga's real brand color is a deep red/orange.
    id: "la-liga",
    gradient: "linear-gradient(90deg, #7a1500, #d1401f 50%, #7a1500)",
    motif: "bounce",
  },
};

function monthDayValue(month: number, day: number) {
  return month * 100 + day;
}

/** Handles ranges that wrap across the year boundary (e.g. Dec 1 → Jan 6). */
function inSeasonWindow(
  date: Date,
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number
): boolean {
  const cur = monthDayValue(date.getMonth() + 1, date.getDate());
  const start = monthDayValue(startMonth, startDay);
  const end = monthDayValue(endMonth, endDay);
  if (start <= end) return cur >= start && cur <= end;
  return cur >= start || cur <= end;
}

const WORLD_CUP_WINDOWS: {
  year: number;
  start: [number, number];
  end: [number, number];
}[] = [
  // FIFA World Cup 2026 (USA/Mexico/Canada) — officially confirmed dates.
  { year: 2026, start: [6, 11], end: [7, 19] },
];

function isWorldCupActive(date: Date): boolean {
  return WORLD_CUP_WINDOWS.some(
    ({ year, start, end }) =>
      date.getFullYear() === year &&
      inSeasonWindow(date, start[0], start[1], end[0], end[1])
  );
}

export function getActiveCampaign(date: Date = new Date()): Campaign | null {
  if (inSeasonWindow(date, 12, 1, 1, 6)) return CAMPAIGNS.christmas;
  if (isWorldCupActive(date)) return CAMPAIGNS["world-cup"];
  if (inSeasonWindow(date, 8, 15, 5, 31)) {
    const weekday = date.getDay(); // 2 = Tuesday, 3 = Wednesday
    return weekday === 2 || weekday === 3
      ? CAMPAIGNS["champions-league"]
      : CAMPAIGNS["la-liga"];
  }
  return null;
}
