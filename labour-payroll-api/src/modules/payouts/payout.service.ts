import { AppError } from "../../utils/AppError";
import { monthRange } from "../../utils/month";
import { audit } from "../audit/audit.service";
import { House } from "../projects/house.model";
import { HouseAssignment } from "../projects/assignment.model";
import { Project } from "../projects/project.model";
import { Payout } from "./payout.model";
import { allocateHouse } from "./split";

type Line = {
  houseId: unknown;
  projectName?: string;
  standNumber?: string;
  completedAt?: Date | null;
  positionName: string;
  shareBps: number;
  amountCents: number;
};

/**
 * Builds (or rebuilds) DRAFT payouts for a month from houses completed in it.
 * Safe to run repeatedly until the month is approved; refuses once it is locked.
 */
export async function generateDrafts(month: string, userId: string) {
  const locked = await Payout.exists({
    month,
    status: { $in: ["approved", "paid"] },
  });
  if (locked)
    throw new AppError(
      409,
      "MONTH_LOCKED",
      `Payouts for ${month} are already approved`,
    );

  const { start, end } = monthRange(month);
  const houses = await House.find({
    status: "complete",
    completedAt: { $gte: start, $lt: end },
  }).lean();

  const assignments = await HouseAssignment.find({
    houseId: { $in: houses.map((h) => h._id) },
  }).lean();
  const projects = await Project.find({
    _id: { $in: [...new Set(houses.map((h) => String(h.projectId)))] },
  }).lean();
  const projectName = new Map(projects.map((p) => [String(p._id), p.name]));

  const byWorker = new Map<string, Line[]>();
  for (const house of houses) {
    const snap = house.snapshot;
    if (!snap?.positions || snap.amountCents == null)
      throw new AppError(
        500,
        "BAD_SNAPSHOT",
        `House ${house._id} has no pay snapshot`,
      );
    const crew = assignments
      .filter((a) => String(a.houseId) === String(house._id))
      .map((a) => ({
        workerId: String(a.workerId),
        positionId: String(a.positionId),
      }));

    for (const alloc of allocateHouse(
      snap.amountCents,
      snap.positions as any,
      crew,
    )) {
      const lines = byWorker.get(alloc.workerId) ?? [];
      lines.push({
        houseId: house._id,
        projectName: projectName.get(String(house.projectId)),
        standNumber: house.standNumber,
        completedAt: house.completedAt,
        positionName: alloc.positionName,
        shareBps: alloc.shareBps,
        amountCents: alloc.amountCents,
      });
      byWorker.set(alloc.workerId, lines);
    }
  }

  const docs = [...byWorker.entries()].map(([workerId, lines]) => {
    lines.sort((a, b) => +new Date(a.completedAt!) - +new Date(b.completedAt!));
    return {
      workerId,
      month,
      lines,
      totalCents: lines.reduce((s, l) => s + l.amountCents, 0),
      status: "draft" as const,
    };
  });

  await Payout.deleteMany({ month, status: "draft" });
  if (docs.length) await Payout.insertMany(docs);

  const totalCents = docs.reduce((s, d) => s + d.totalCents, 0);
  await audit(userId, "payout.generate", "Payout", month, {
    workers: docs.length,
    houses: houses.length,
    totalCents,
  });
  return { month, houses: houses.length, workers: docs.length, totalCents };
}

/** Locks the month: every draft becomes approved. Edits after this need an explicit reopen (not built yet). */
export async function approveMonth(month: string, userId: string) {
  const payouts = await Payout.find({ month });
  if (!payouts.length)
    throw new AppError(404, "NO_PAYOUTS", `No payouts generated for ${month}`);
  if (payouts.some((p) => p.status !== "draft"))
    throw new AppError(409, "ALREADY_APPROVED", `${month} is already approved`);

  const now = new Date();
  await Payout.updateMany(
    { month, status: "draft" },
    { status: "approved", approvedAt: now, approvedBy: userId },
  );
  const totalCents = payouts.reduce((s, p) => s + p.totalCents, 0);
  await audit(userId, "payout.approve", "Payout", month, {
    workers: payouts.length,
    totalCents,
  });
  return { month, workers: payouts.length, totalCents, approvedAt: now };
}
