import test from "node:test";
import assert from "node:assert/strict";
import { buildReference, monthLabel } from "./reference";
import { renderBankSchedule } from "./bankSchedule";
import { renderStatements } from "./statement";

test("reference is within 20 chars and clean", () => {
  const r = buildReference("2026-11", "Johannes", "van der Merwe");
  assert.ok(r.length <= 20, r);
  assert.match(r, /^RDP NOV26 J /);
  assert.equal(buildReference("2026-01", "Zoë", "O'Neil"), "RDP JAN26 Z ONEIL");
});

test("month label", () => assert.equal(monthLabel("2026-11"), "November 2026"));

test("bank schedule renders a multi-page PDF", async () => {
  const rows = Array.from({ length: 60 }, (_, i) => ({
    workerName: `Worker ${i}`,
    accountHolder: `W ${i}`,
    bankName: "FNB",
    accountNumber: "62000000000",
    branchCode: "250655",
    accountType: "savings",
    reference: "RDP NOV26 W",
    amountCents: 100_000 + i,
  }));
  const buf = await renderBankSchedule({
    companyName: "Test Co",
    month: "2026-11",
    generatedAt: "now",
    generatedBy: "Admin",
    rows,
    totalCents: rows.reduce((s, r) => s + r.amountCents, 0),
  });
  assert.equal(buf.subarray(0, 4).toString(), "%PDF");
  assert.ok(
    (buf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length >= 2,
    "expected multiple pages",
  );
});

test("statements render one worker per page", async () => {
  const mk = (n: string) => ({
    companyName: "Test Co",
    month: "2026-11",
    statementNo: n,
    workerName: n,
    workerRef: n,
    generatedOn: "today",
    lines: [
      {
        completedOn: "02 Nov 2026",
        projectName: "P",
        standNumber: "1",
        positionName: "Foreman",
        positionSharePct: "20%",
        amountCents: 200_000,
      },
    ],
    totalCents: 200_000,
    bankName: "FNB",
    accountLast4: "1234",
    reference: "RDP NOV26 X",
  });
  const buf = await renderStatements([mk("A"), mk("B"), mk("C")]);
  assert.equal(
    (buf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length,
    3,
  );
});
