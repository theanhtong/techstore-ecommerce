interface CampaignPeriod {
  startsAt: Date | null;
  endsAt: Date | null;
}

interface ClampedPeriod {
  startsAt: Date | null;
  endsAt: Date | null;
}

/**
 * Clamps a child entity's startsAt/endsAt to fit within its parent campaign's period.
 * - If the campaign has a limited period and the child doesn't specify a date, it inherits the campaign's date.
 * - If the child's date falls outside the campaign's period, it is clamped to the nearest boundary.
 * - If the campaign has no limit (null), the child's date is used as-is.
 */
export function clampToCampaignPeriod(
  campaign: CampaignPeriod,
  startsAt?: string,
  endsAt?: string,
): ClampedPeriod {
  let start = startsAt ? new Date(startsAt) : null;
  let end = endsAt ? new Date(endsAt) : null;

  if (campaign.startsAt && (!start || start < campaign.startsAt)) {
    start = campaign.startsAt;
  }

  if (campaign.endsAt && (!end || end > campaign.endsAt)) {
    end = campaign.endsAt;
  }

  // Safety net: if clamping somehow produced an inverted range, fall back to the full campaign period
  if (start && end && start > end) {
    start = campaign.startsAt ?? start;
    end = campaign.endsAt ?? end;
  }

  return { startsAt: start, endsAt: end };
}
