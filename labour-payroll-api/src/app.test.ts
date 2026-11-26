import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";

process.env.MONGODB_URI ??= "mongodb://127.0.0.1:1/test"; // never connected in these tests
process.env.JWT_SECRET ??= "x".repeat(40);
process.env.FIELD_ENCRYPTION_KEY ??= "a".repeat(64);
process.env.NODE_ENV = "test";

let server: Server;
let base: string;
const token = (role: "admin" | "supervisor") =>
  jwt.sign({ role }, process.env.JWT_SECRET!, {
    subject: "64b000000000000000000001",
    expiresIn: "1h",
  });
const call = (
  path: string,
  role?: "admin" | "supervisor",
  init: RequestInit = {},
) =>
  fetch(base + path, {
    ...init,
    headers: {
      ...(role ? { Authorization: `Bearer ${token(role)}` } : {}),
      ...(init.headers ?? {}),
    },
  });

before(async () => {
  const { createApp } = await import("./app.js");
  server = createApp().listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => void server.close());

test("health and security headers", async () => {
  const r = await call("/health");
  assert.equal(r.status, 200);
  assert.ok(r.headers.get("x-content-type-options"));
});

test("unknown route returns JSON 404", async () => {
  const r = await call("/api/v1/nope", "admin");
  assert.equal(r.status, 404);
  assert.equal((await r.json()).error.code, "NOT_FOUND");
});

test("no token -> 401 everywhere that matters", async () => {
  for (const p of [
    "/api/v1/workers",
    "/api/v1/payouts?month=2026-11",
    "/api/v1/payment-runs/2026-11/bank-schedule.pdf",
    "/api/v1/proofs/64b000000000000000000001/file",
  ]) {
    assert.equal((await call(p)).status, 401, p);
  }
});

test("supervisors are blocked from salary, bank and proof endpoints", async () => {
  const id = "64b000000000000000000001";
  const blocked: [string, RequestInit?][] = [
    ["/api/v1/payouts?month=2026-11"],
    [`/api/v1/payouts/${id}/statement.pdf`],
    ["/api/v1/payouts/2026-11/generate", { method: "POST" }],
    ["/api/v1/payouts/2026-11/approve", { method: "POST" }],
    ["/api/v1/payment-runs/2026-11"],
    ["/api/v1/payment-runs/2026-11/bank-schedule.pdf"],
    ["/api/v1/payment-runs/2026-11/statements.pdf"],
    ["/api/v1/payment-runs/2026-11/proofs"],
    ["/api/v1/payment-runs/2026-11/proofs", { method: "POST" }],
    ["/api/v1/payment-runs/2026-11/mark-paid", { method: "POST" }],
    [`/api/v1/proofs/${id}/file`],
    ["/api/v1/settings"],
    [
      "/api/v1/workers",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      },
    ],
  ];
  for (const [path, init] of blocked) {
    const r = await call(path, "supervisor", init);
    assert.equal(r.status, 403, `${init?.method ?? "GET"} ${path}`);
  }
});

test("admin input is validated before touching the database", async () => {
  for (const p of [
    "/api/v1/payment-runs/2026-13",
    "/api/v1/payment-runs/abc/bank-schedule.pdf",
    "/api/v1/payouts?month=nov",
    "/api/v1/payouts/xyz/statement.pdf",
  ]) {
    const r = await call(p, "admin");
    assert.equal(r.status, 400, p);
    assert.equal((await r.json()).error.code, "VALIDATION_ERROR", p);
  }
});

test("login validates its body", async () => {
  const r = await call("/api/v1/auth/login", undefined, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "nope" }),
  });
  assert.equal(r.status, 400);
});
