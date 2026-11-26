import { AppError } from "../../utils/AppError";
import { formatLocalDate, formatLocalDateTime } from "../../utils/month";
import { audit } from "../audit/audit.service";
import { Payout } from "../payouts/payout.model";
import { Settings } from "../settings/settings.model";
import { User } from "../auth/user.model";
import { Worker } from "../workers/worker.model";
import { bankProblems } from "../workers/worker.service";
import { decrypt } from "../../utils/crypto";
import { renderBankSchedule, type BankScheduleRow } from "../pdf/bankSchedule";
import { renderStatements, type StatementData } from "../pdf/statement";
import { buildReference } from "../pdf/reference";
import { PaymentProof } from "../proofs/proof.model";
import { PaymentRun } from "./payment-run.model";

type PayoutDoc = InstanceType<typeof Payout>;

async function companyName() {
  return (await Settings.findOne({ key: "company" }))?.companyName ?? "Company";
}

/** Payouts that are ready to pay. Refuses if the month is unapproved or has nothing in it. */
async function payablePayouts(month: string): Promise<PayoutDoc[]> {
  const all = await Payout.find({ month });
  if (!all.length)
    throw new AppError(404, "NO_PAYOUTS", `No payouts generated for ${month}`);
  if (all.some((p) => p.status === "draft")) {
    throw new AppError(
      409,
      "MONTH_NOT_APPROVED",
      `Approve ${month} before generating payment documents`,
    );
  }
  for (const p of all) {
    const linesTotal = p.lines.reduce((s, l) => s + l.amountCents, 0);
    if (linesTotal !== p.totalCents) {
      throw new AppError(
        500,
        "INTEGRITY_ERROR",
        `Payout ${p._id} total does not match its lines`,
      );
    }
  }
  return all.filter((p) => p.totalCents > 0);
}

async function workerMap(ids: unknown[]) {
  const workers = await Worker.find({ _id: { $in: ids } });
  return new Map(workers.map((w) => [String(w._id), w]));
}

export async function bankSchedulePdf(month: string, userId: string) {
  const payouts = await payablePayouts(month);
  const workers = await workerMap(payouts.map((p) => p.workerId));

  const problems = payouts
    .map((p) => {
      const w = workers.get(String(p.workerId));
      return {
        worker: w ? `${w.firstName} ${w.lastName}` : String(p.workerId),
        problems: w ? bankProblems(w) : ["Worker record not found"],
      };
    })
    .filter((x) => x.problems.length);
  if (problems.length) {
    throw new AppError(
      422,
      "BANK_DETAILS_INVALID",
      "Fix these workers' bank details before generating the bank schedule",
      { workers: problems },
    );
  }

  const rows: BankScheduleRow[] = payouts.map((p) => {
    const w = workers.get(String(p.workerId))!;
    return {
      workerName: `${w.firstName} ${w.lastName}`,
      accountHolder: w.bank!.accountHolder,
      bankName: w.bank!.bankName,
      accountNumber: decrypt(w.bank!.accountNumberEnc),
      branchCode: w.bank!.branchCode,
      accountType: w.bank!.accountType!,
      reference: buildReference(month, w.firstName, w.lastName),
      amountCents: p.totalCents,
    };
  });
  rows.sort(
    (a, b) =>
      a.bankName.localeCompare(b.bankName) ||
      a.workerName.localeCompare(b.workerName),
  );
  const totalCents = rows.reduce((s, r) => s + r.amountCents, 0);

  const user = await User.findById(userId);
  const now = new Date();
  const buffer = await renderBankSchedule({
    companyName: await companyName(),
    month,
    generatedAt: formatLocalDateTime(now),
    generatedBy: user?.name ?? "Admin",
    rows,
    totalCents,
  });

  const run = await PaymentRun.findOneAndUpdate(
    { month },
    {
      $set: {
        totalCents,
        workerCount: rows.length,
        generatedAt: now,
        generatedBy: userId,
      },
      $inc: { generationCount: 1 },
      $setOnInsert: { status: "generated" },
    },
    { upsert: true, new: true },
  );
  await Payout.updateMany(
    { _id: { $in: payouts.map((p) => p._id) } },
    { paymentRunId: run._id },
  );
  await audit(
    userId,
    "payment_run.bank_schedule",
    "PaymentRun",
    String(run._id),
    { month, totalCents, workers: rows.length },
  );
  return buffer;
}

function statementData(
  p: PayoutDoc,
  w: InstanceType<typeof Worker>,
  company: string,
): StatementData {
  const ref = String(p._id).slice(-6).toUpperCase();
  return {
    companyName: company,
    month: p.month,
    statementNo: `${p.month}-${ref}`,
    workerName: `${w.firstName} ${w.lastName}`,
    workerRef: String(w._id).slice(-6).toUpperCase(),
    generatedOn: formatLocalDate(new Date()),
    lines: p.lines.map((l) => ({
      completedOn: l.completedAt ? formatLocalDate(l.completedAt) : "",
      projectName: l.projectName ?? "",
      standNumber: l.standNumber ?? "",
      positionName: l.positionName ?? "",
      positionSharePct: `${(l.shareBps ?? 0) / 100}%`,
      amountCents: l.amountCents,
    })),
    totalCents: p.totalCents,
    bankName: w.bank?.bankName ?? "",
    accountLast4: w.bank?.accountLast4 ?? "",
    reference: buildReference(p.month, w.firstName, w.lastName),
  };
}

export async function singleStatementPdf(payoutId: string, userId: string) {
  const p = await Payout.findById(payoutId);
  if (!p) throw new AppError(404, "NOT_FOUND", "Payout not found");
  if (p.status === "draft")
    throw new AppError(
      409,
      "MONTH_NOT_APPROVED",
      "Statements are available once the month is approved",
    );
  const w = await Worker.findById(p.workerId);
  if (!w) throw new AppError(404, "NOT_FOUND", "Worker not found");
  await audit(userId, "statement.generate", "Payout", payoutId);
  return {
    buffer: await renderStatements([statementData(p, w, await companyName())]),
    month: p.month,
    worker: w,
  };
}

export async function allStatementsPdf(month: string, userId: string) {
  const payouts = await payablePayouts(month);
  const workers = await workerMap(payouts.map((p) => p.workerId));
  const company = await companyName();
  const items = payouts
    .map((p) => ({ p, w: workers.get(String(p.workerId)) }))
    .filter((x): x is { p: PayoutDoc; w: InstanceType<typeof Worker> } => !!x.w)
    .sort((a, b) =>
      `${a.w.lastName}${a.w.firstName}`.localeCompare(
        `${b.w.lastName}${b.w.firstName}`,
      ),
    )
    .map(({ p, w }) => statementData(p, w, company));
  await audit(userId, "statement.generate_all", "PaymentRun", month, {
    count: items.length,
  });
  return renderStatements(items);
}

export async function runOverview(month: string) {
  const run = await PaymentRun.findOne({ month });
  const payouts = await Payout.find({ month });
  const proofs = run
    ? await PaymentProof.find({ paymentRunId: run._id }).sort({
        uploadedAt: -1,
      })
    : [];
  return {
    month,
    run,
    payouts: {
      count: payouts.length,
      totalCents: payouts.reduce((s, p) => s + p.totalCents, 0),
      byStatus: payouts.reduce<Record<string, number>>(
        (acc, p) => ((acc[p.status] = (acc[p.status] ?? 0) + 1), acc),
        {},
      ),
    },
    proofs: proofs.map((x) => ({
      id: x._id,
      originalName: x.originalName,
      mimeType: x.mimeType,
      sizeBytes: x.sizeBytes,
      uploadedAt: (x as any).uploadedAt,
    })),
  };
}

/** Marks the run (and every payout in it) as paid. Needs at least one proof of payment on file. */
export async function markPaid(month: string, userId: string) {
  const run = await PaymentRun.findOne({ month });
  if (!run)
    throw new AppError(
      409,
      "NO_RUN",
      "Generate the bank payment schedule first",
    );
  if (run.status === "paid")
    throw new AppError(
      409,
      "ALREADY_PAID",
      `${month} is already marked as paid`,
    );
  if (!(await PaymentProof.exists({ paymentRunId: run._id }))) {
    throw new AppError(
      409,
      "PROOF_REQUIRED",
      "Upload the bank proof of payment before marking this month as paid",
    );
  }
  const now = new Date();
  run.status = "paid";
  run.paidAt = now;
  run.paidBy = userId as any;
  await run.save();
  await Payout.updateMany({ month, status: "approved" }, { status: "paid" });
  await audit(userId, "payment_run.mark_paid", "PaymentRun", String(run._id), {
    month,
  });
  return run;
}
