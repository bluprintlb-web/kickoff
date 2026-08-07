import { Shield, Snowflake, Sparkle, Star, Trophy } from "lucide-react";
import {
  getActiveCampaign,
  type Campaign,
  type CampaignId,
} from "@/lib/football-events";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

const CAMPAIGN_ICON: Record<CampaignId, typeof Trophy> = {
  christmas: Snowflake,
  "world-cup": Trophy,
  "champions-league": Star,
  "la-liga": Shield,
};

const CAMPAIGN_MOTIF_ICON: Record<CampaignId, typeof Trophy> = {
  christmas: Snowflake,
  "world-cup": Sparkle,
  "champions-league": Star,
  "la-liga": Shield,
};

const CAMPAIGN_COPY_KEY: Record<CampaignId, "christmas" | "worldCup" | "championsLeague" | "laLiga"> = {
  christmas: "christmas",
  "world-cup": "worldCup",
  "champions-league": "championsLeague",
  "la-liga": "laLiga",
};

const MOTIF_ANIMATION: Record<Campaign["motif"], string> = {
  fall: "kickoff-motif-fall",
  twinkle: "kickoff-motif-twinkle",
  bounce: "kickoff-motif-bounce",
};

// Fixed spread across the bar's width, each on its own delay/duration so
// they don't all move in lockstep — kept small/low-opacity so they never
// compete with the banner text for attention.
const MOTIF_SLOTS = [
  { left: "8%", delay: "0s", duration: "3.2s" },
  { left: "24%", delay: "0.6s", duration: "2.6s" },
  { left: "62%", delay: "1.1s", duration: "3.6s" },
  { left: "78%", delay: "0.3s", duration: "2.9s" },
  { left: "92%", delay: "1.6s", duration: "3.1s" },
];

// Whenever a known football event/holiday is active (see
// src/lib/football-events.ts), the storefront's top strip themes itself
// instead of showing the plain promo tagline — same slot, so it never adds
// extra vertical clutter above the header.
export function CampaignBanner({ locale }: { locale: Locale }) {
  const dict = dictionaries[locale];
  const campaign = getActiveCampaign();

  if (!campaign) {
    return (
      <div className="bg-secondary px-4 py-2 text-center text-xs font-medium tracking-wide text-secondary-foreground">
        {dict.promoBar}
      </div>
    );
  }

  const Icon = CAMPAIGN_ICON[campaign.id];
  const MotifIcon = CAMPAIGN_MOTIF_ICON[campaign.id];
  const copy = dict.campaigns[CAMPAIGN_COPY_KEY[campaign.id]];

  return (
    <div
      className="relative overflow-hidden px-4 py-2 text-center text-xs font-semibold tracking-wide text-white"
      style={{ background: campaign.gradient }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0">
        {MOTIF_SLOTS.map((slot, i) => (
          <MotifIcon
            key={i}
            className="absolute top-1/2 size-3 text-white/70"
            style={{
              left: slot.left,
              animation: `${MOTIF_ANIMATION[campaign.motif]} ${slot.duration} ease-in-out ${slot.delay} infinite`,
            }}
          />
        ))}
      </span>
      <span className="relative inline-flex items-center gap-1.5">
        <Icon className="size-3.5 shrink-0" />
        {copy}
      </span>
    </div>
  );
}
