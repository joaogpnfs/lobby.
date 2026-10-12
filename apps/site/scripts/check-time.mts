// Run: node --experimental-strip-types scripts/check-time.mts
// ponytail: plain asserts until Vitest lands in Phase 1.
import assert from "node:assert/strict";
import { formatHours, workedMinutes } from "../src/lib/time.ts";

assert.equal(workedMinutes([]), 0);
assert.equal(workedMinutes(["08:58"]), 0); // open span doesn't count
assert.equal(workedMinutes(["08:58", "12:02"]), 184);
assert.equal(workedMinutes(["08:58", "12:02", "13:01"]), 184); // on break
assert.equal(workedMinutes(["08:58", "12:02", "13:01", "18:04"]), 487);
assert.equal(formatHours(487), "8h07");
assert.equal(formatHours(0), "0h00");
console.log("time: ok");
