import { AppError } from "../../utils/AppError";
import { monthKey } from "../../utils/month";
import { audit } from "../audit/audit.service";
import { getSettingsOrThrow } from "../settings/settings.service";
import { missingPositions } from "../payouts/split";
import { House } from "./house.model";
import { HouseAssignment } from "./assignment.model";
import { Payout } from "../payouts/payout.model";

export async function completeHouse(houseId: string, userId: string) {
  const house = await House.findById(houseId);
  if (!house) throw new AppError(404, "NOT_FOUND", "House not found");
  if (house.status === "complete")
    throw new AppError(409, "ALREADY_COMPLETE", "House is already complete");

  const settings = await getSettingsOrThrow();
  const positions = settings.positions.map((p) => ({
    positionId: String(p._id),
    name: p.name,
    shareBps: p.shareBps,
  }));
  const crew = (await HouseAssignment.find({ houseId }).lean()).map((a) => ({
    workerId: String(a.workerId),
    positionId: String(a.positionId),
  }));

  if (crew.some((c) => !positions.some((p) => p.positionId === c.positionId))) {
    throw new AppError(
      422,
      "UNKNOWN_POSITION",
      "A crew member has a position that no longer exists. Re-assign the crew.",
    );
  }
  const missing = missingPositions(positions, crew);
  if (missing.length) {
    throw new AppError(
      422,
      "MISSING_POSITIONS",
      "Every position needs at least one worker before the house can be completed",
      {
        missing: missing.map((m) => m.name),
      },
    );
  }

  const now = new Date();
  const locked = await Payout.exists({
    month: monthKey(now),
    status: { $in: ["approved", "paid"] },
  });
  if (locked)
    throw new AppError(
      409,
      "MONTH_LOCKED",
      `Payouts for ${monthKey(now)} are already approved`,
    );

  house.status = "complete";
  house.completedAt = now;
  house.completedBy = userId as any;
  house.set("snapshot", { amountCents: settings.ratePerHouseCents, positions });
  await house.save();

  await audit(userId, "house.complete", "House", houseId, {
    amountCents: settings.ratePerHouseCents,
  });
  return house;
}
