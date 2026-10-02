import { test } from "node:test";
import assert from "node:assert/strict";
import { simulationReducer } from "../src/lib/chaos-simulation.ts";
import { liveChaosSource, validateLiveSnapshot, unavailableSnapshot } from "../src/lib/live-chaos-source.ts";

const initial = () => ({ index: 73.42, phase: "measuring", cycle: 1, selectedToken: null });

test("threshold starts exactly one demo and ignores slider changes while running", () => {
  let state = simulationReducer(initial(), { type: "adjust", index: 99.99 });
  assert.equal(state.phase, "measuring");
  state = simulationReducer(state, { type: "adjust", index: 100 });
  assert.equal(state.phase, "threshold");
  assert.equal(simulationReducer(state, { type: "adjust", index: 20 }), state);
  assert.equal(simulationReducer(state, { type: "adjust", index: 100 }), state);
});

test("full simulated lifecycle resets to zero and allows a second cycle", () => {
  let state = simulationReducer(initial(), { type: "adjust", index: 100 });
  for (const expected of ["triggered", "selecting", "selected", "distributing", "new-cycle", "measuring"]) {
    state = simulationReducer(state, { type: "advance", token: "$TOKEN" });
    assert.equal(state.phase, expected);
    if (expected === "selected") assert.equal(state.selectedToken, "$TOKEN");
  }
  assert.equal(state.index, 0);
  assert.equal(state.cycle, 2);
  assert.equal(state.selectedToken, null);
  assert.equal(simulationReducer(state, { type: "adjust", index: 100 }).phase, "threshold");
});

test("mode-switch cancellation and manual reset discard event state", () => {
  const running = { index: 100, phase: "selected", cycle: 4, selectedToken: "$DEMO" };
  for (const type of ["cancel", "reset"]) {
    const state = simulationReducer(running, { type });
    assert.deepEqual(state, { index: 0, phase: "measuring", cycle: 4, selectedToken: null });
    assert.equal(simulationReducer(state, { type: "advance", token: "$STALE" }), state);
  }
});

test("index input rejects nonfinite values and clamps its range", () => {
  const state = initial();
  assert.equal(simulationReducer(state, { type: "adjust", index: NaN }), state);
  assert.equal(simulationReducer(state, { type: "adjust", index: Infinity }), state);
  assert.equal(simulationReducer(state, { type: "adjust", index: -10 }).index, 0);
  assert.equal(simulationReducer(state, { type: "adjust", index: 110 }).index, 100);
});

test("live service is read-only and does not invent a measurement when the scanner is initializing", async () => {
  assert.deepEqual(Object.keys(liveChaosSource), ["readSnapshot"]);
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ schemaVersion: 1, provenance: "dexscreener", chaosIndex: null, eligibleTokens: [], events: [], lastUpdate: null, status: "initializing", eventStatus: "WAITING" });
  try {
    const snapshot = await liveChaosSource.readSnapshot(new AbortController().signal);
    assert.equal(snapshot.provenance, "market-data");
    assert.equal(snapshot.chaosIndex, null);
    assert.equal(snapshot.transaction, null);
  } finally { globalThis.fetch = previousFetch; }
});

test("reading a real threshold never synthesizes an event on the frontend", () => {
  const reported = { ...unavailableSnapshot, provenance: "verified", chaosIndex: 100 };
  assert.equal(validateLiveSnapshot(reported).phase, "measuring");
  assert.equal(validateLiveSnapshot(reported).chaosIndex, 100);
  assert.throws(() => validateLiveSnapshot({ ...reported, chaosIndex: 101 }));
  assert.throws(() => validateLiveSnapshot({ ...reported, chaosIndex: NaN }));
  assert.equal(validateLiveSnapshot({ ...reported, provenance: "mock" }).provenance, "mock");
});
