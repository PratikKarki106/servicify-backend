import test from "node:test";
import assert from "node:assert/strict";
import { LOYALTY_RULES, calculateEarnPoints, pointsToRupees, validateRedeemRequest } from "../Loyalty/utils/loyaltyRules.js";

test("calculateEarnPoints floors by Rs. 100", () => {
  assert.equal(calculateEarnPoints(999), 9);
  assert.equal(calculateEarnPoints(1000), 10);
});

test("calculateEarnPoints excludes redeemed value to prevent double-dipping", () => {
  assert.equal(calculateEarnPoints(1000, 200), 8);
  assert.equal(calculateEarnPoints(80, 100), 0);
});

test("pointsToRupees uses 1 point = Rs. 5", () => {
  assert.equal(pointsToRupees(10), 50);
  assert.equal(pointsToRupees(30), 150);
});

test("validateRedeemRequest applies min, max, and balance limits", () => {
  const belowMin = validateRedeemRequest({ pointsBalance: 100, pointsRequired: 5 });
  assert.equal(belowMin.valid, false);

  const aboveMax = validateRedeemRequest({ pointsBalance: 1000, pointsRequired: LOYALTY_RULES.MAX_REDEEM_POINTS_PER_TXN + 1 });
  assert.equal(aboveMax.valid, false);

  const insufficient = validateRedeemRequest({ pointsBalance: 10, pointsRequired: 20 });
  assert.equal(insufficient.valid, false);

  const ok = validateRedeemRequest({ pointsBalance: 50, pointsRequired: 20 });
  assert.equal(ok.valid, true);
});
