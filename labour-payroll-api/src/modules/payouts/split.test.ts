import test from "node:test";
import assert from "node:assert/strict";
import { allocateHouse, missingPositions, type PositionShare } from "./split";

const positions: PositionShare[] = [
  { positionId: "foreman", name: "Foreman", shareBps: 2000 },
  { positionId: "brick", name: "Bricklayer", shareBps: 5000 },
  { positionId: "labour", name: "Labourer", shareBps: 3000 },
];
const sum = (a: { amountCents: number }[]) =>
  a.reduce((s, x) => s + x.amountCents, 0);

test("simple split adds up and follows position shares", () => {
  const crew = [
    { workerId: "a", positionId: "foreman" },
    { workerId: "b", positionId: "brick" },
    { workerId: "c", positionId: "labour" },
  ];
  const r = allocateHouse(1_000_000, positions, crew);
  assert.equal(sum(r), 1_000_000);
  assert.equal(r.find((x) => x.workerId === "a")!.amountCents, 200_000);
  assert.equal(r.find((x) => x.workerId === "b")!.amountCents, 500_000);
});

test("3 bricklayers with awkward cents still total exactly", () => {
  const crew = [
    { workerId: "a", positionId: "foreman" },
    { workerId: "b1", positionId: "brick" },
    { workerId: "b2", positionId: "brick" },
    { workerId: "b3", positionId: "brick" },
    { workerId: "c", positionId: "labour" },
  ];
  for (const amount of [1_234_567, 999_999, 1, 100, 3_333_333]) {
    const r = allocateHouse(amount, positions, crew);
    assert.equal(sum(r), amount, `amount ${amount}`);
    const bricks = r
      .filter((x) => x.positionId === "brick")
      .map((x) => x.amountCents);
    assert.ok(
      Math.max(...bricks) - Math.min(...bricks) <= 1,
      "bricklayers differ by at most 1 cent",
    );
  }
});

test("result is deterministic regardless of crew order", () => {
  const crew = [
    { workerId: "b2", positionId: "brick" },
    { workerId: "a", positionId: "foreman" },
    { workerId: "b1", positionId: "brick" },
    { workerId: "c", positionId: "labour" },
  ];
  const a = allocateHouse(1_000_001, positions, crew);
  const b = allocateHouse(1_000_001, positions, [...crew].reverse());
  const key = (r: typeof a) =>
    JSON.stringify(r.map((x) => [x.workerId, x.amountCents]).sort());
  assert.equal(key(a), key(b));
});

test("missing position is reported and rejected", () => {
  const crew = [
    { workerId: "b", positionId: "brick" },
    { workerId: "c", positionId: "labour" },
  ];
  assert.deepEqual(
    missingPositions(positions, crew).map((p) => p.name),
    ["Foreman"],
  );
  assert.throws(() => allocateHouse(1_000_000, positions, crew), /Foreman/);
});

test("rejects bad inputs", () => {
  const crew = [
    { workerId: "a", positionId: "foreman" },
    { workerId: "b", positionId: "brick" },
    { workerId: "c", positionId: "labour" },
  ];
  assert.throws(() => allocateHouse(10.5, positions, crew));
  assert.throws(() =>
    allocateHouse(
      1000,
      [{ ...positions[0], shareBps: 9000 }, ...positions.slice(1)],
      crew,
    ),
  );
  assert.throws(() =>
    allocateHouse(1000, positions, [
      ...crew,
      { workerId: "a", positionId: "labour" },
    ]),
  );
});
