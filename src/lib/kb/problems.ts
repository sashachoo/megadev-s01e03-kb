// The problems inside one merged ticket, counted the desk's way. causes.ts places every report by
// its tenant and channel, and that is where it stays counted. desk-notes.json lists the reports
// whose words do not fit that place: a date moved by one day, not a day and month swapped. A
// month-first parser cannot move a date by one day, so those reports are a problem of their own
// too, listed on their own while staying counted where they are filed.
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'one-day' | 'unplaced';

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  // What intake tagged these reports as: tag → count.
  taggedAs: Record<string, number>;
  channels: Record<string, number>;
  tenants: number;
  firstSeen: string;
  lastSeen: string;
  // For one-day: where the desk files these reports (placement → count).
  filedUnder: Record<string, number>;
};

const tally = (keys: string[]) => keys.reduce<Record<string, number>>((n, k) => ({ ...n, [k]: (n[k] ?? 0) + 1 }), {});

function group(problem: Problem, rs: Report[], placed: (r: Report) => Problem): ProblemGroup {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  return {
    problem,
    reports: rs,
    taggedAs: tally(rs.map((r) => r.meta.intakeTag)),
    channels: tally(rs.map((r) => r.channel)),
    tenants: new Set(rs.map((r) => r.tenant)).size,
    firstSeen: days[0],
    lastSeen: days[days.length - 1],
    filedUnder: problem === 'one-day' ? tally(rs.map(placed)) : {},
  };
}

export function groupByProblem(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const placed = (r: Report): Problem => causeOf(r, tenantOf(r)) ?? 'unplaced';
  const byPlace = new Map<Problem, Report[]>();
  for (const r of reports) byPlace.set(placed(r), [...(byPlace.get(placed(r)) ?? []), r]);
  const groups = [...byPlace.entries()].map(([p, rs]) => group(p, rs, placed));
  const oneDay = reports.filter((r) => oneDayMove.includes(r.id));
  if (oneDay.length) groups.push(group('one-day', oneDay, placed));
  return groups.sort((a, b) => b.reports.length - a.reports.length);
}

// What the export itself says before anyone reads a report: rows, repeated rows, and how often
// intake's tag names a different place than the tenant gives the report.
export function exportFacts(rows: Report[], ticket: number, tenantOf: (r: Report) => Tenant | undefined) {
  const merged = uniqueById(rows).filter((r) => r.mergedInto === ticket);
  return {
    rows: rows.filter((r) => r.mergedInto === ticket).length,
    reports: merged.length,
    intakeDiffers: merged.filter((r) => r.meta.intakeTag !== causeOf(r, tenantOf(r))).length,
  };
}
