/**
 * Pure pay-split logic. No database, no floats: money is integer cents and
 * position shares are integer basis points (10000 = 100%).
 *
 * Rules:
 *  1. Each position's pool = floor(houseAmount * shareBps / 10000).
 *  2. Any cents left after flooring go to the position with the highest share
 *     (ties: the first in the configured order).
 *  3. A position's pool is split equally between its workers; leftover cents go
 *     one each to workers in ascending workerId order (deterministic).
 * The allocations always add up to exactly the house amount.
 */
export interface PositionShare {
  positionId: string;
  name: string;
  shareBps: number;
}
export interface CrewMember {
  workerId: string;
  positionId: string;
}
export interface Allocation {
  workerId: string;
  positionId: string;
  positionName: string;
  shareBps: number; // the position's share of the house (not the worker's slice of it)
  amountCents: number;
}

export function missingPositions(
  positions: PositionShare[],
  crew: CrewMember[],
): PositionShare[] {
  const used = new Set(crew.map((c) => c.positionId));
  return positions.filter((p) => !used.has(p.positionId));
}

export function allocateHouse(
  amountCents: number,
  positions: PositionShare[],
  crew: CrewMember[],
): Allocation[] {
  if (!Number.isInteger(amountCents) || amountCents < 0)
    throw new Error("amountCents must be a non-negative integer");
  if (positions.reduce((s, p) => s + p.shareBps, 0) !== 10000)
    throw new Error("Position shares must total 10000 bps");
  if (new Set(crew.map((c) => c.workerId)).size !== crew.length)
    throw new Error("A worker appears twice in the crew");
  const unknown = crew.find(
    (c) => !positions.some((p) => p.positionId === c.positionId),
  );
  if (unknown) throw new Error(`Unknown position ${unknown.positionId}`);
  const missing = missingPositions(positions, crew);
  if (missing.length)
    throw new Error(`No workers for: ${missing.map((m) => m.name).join(", ")}`);

  const pools = new Map<string, number>(
    positions.map((p) => [
      p.positionId,
      Math.floor((amountCents * p.shareBps) / 10000),
    ]),
  );
  const leftover = amountCents - [...pools.values()].reduce((a, b) => a + b, 0);
  if (leftover > 0) {
    const top = positions.reduce(
      (best, p) => (p.shareBps > best.shareBps ? p : best),
      positions[0],
    );
    pools.set(top.positionId, pools.get(top.positionId)! + leftover);
  }

  const out: Allocation[] = [];
  for (const pos of positions) {
    const members = crew
      .filter((c) => c.positionId === pos.positionId)
      .sort((a, b) => (a.workerId < b.workerId ? -1 : 1));
    const pool = pools.get(pos.positionId)!;
    const base = Math.floor(pool / members.length);
    const extra = pool - base * members.length;
    members.forEach((m, i) =>
      out.push({
        workerId: m.workerId,
        positionId: pos.positionId,
        positionName: pos.name,
        shareBps: pos.shareBps,
        amountCents: base + (i < extra ? 1 : 0),
      }),
    );
  }
  return out;
}
