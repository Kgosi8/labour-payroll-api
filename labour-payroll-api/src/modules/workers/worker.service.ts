import { decrypt } from "../../utils/crypto";
import type { Worker } from "./worker.model";

type WorkerDoc = InstanceType<typeof Worker>;

/**
 * basic  -> no ID number, no bank info (supervisors)
 * masked -> bank name + last 4 digits only (admin lists)
 * full   -> everything, decrypted (admin detail, payment PDF)
 */
export type Detail = "basic" | "masked" | "full";

export function serializeWorker(w: WorkerDoc, detail: Detail) {
  const base = {
    id: w._id,
    firstName: w.firstName,
    lastName: w.lastName,
    phone: w.phone,
    address: w.address,
    status: w.status,
    createdAt: (w as any).createdAt,
  };
  if (detail === "basic") return base;
  if (detail === "masked") {
    return {
      ...base,
      bank: { bankName: w.bank!.bankName, accountLast4: w.bank!.accountLast4 },
    };
  }
  return {
    ...base,
    idNumber: decrypt(w.idNumberEnc),
    bank: {
      bankName: w.bank!.bankName,
      accountHolder: w.bank!.accountHolder,
      accountNumber: decrypt(w.bank!.accountNumberEnc),
      branchCode: w.bank!.branchCode,
      accountType: w.bank!.accountType,
    },
  };
}

/** Returns human-readable problems that would stop a bank from processing this worker's payment. */
export function bankProblems(w: WorkerDoc): string[] {
  const problems: string[] = [];
  const b = w.bank;
  if (!b) return ["No bank details"];
  if (!b.bankName) problems.push("Missing bank name");
  if (!b.accountHolder) problems.push("Missing account holder");
  if (!/^\d{6}$/.test(b.branchCode ?? ""))
    problems.push("Branch code must be 6 digits");
  try {
    if (!/^\d{6,16}$/.test(decrypt(b.accountNumberEnc)))
      problems.push("Account number must be 6-16 digits");
  } catch {
    problems.push("Account number could not be read");
  }
  return problems;
}
