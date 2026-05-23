export const LOYALTY_RULES = {
  EARN_PER_RUPEES: 100,
  REDEEM_VALUE_PER_POINT: 5,
  MIN_REDEEM_POINTS: 10,
  MAX_REDEEM_POINTS_PER_TXN: 500,
  EXPIRY_MONTHS: 6,
};

export const calculateEarnPoints = (totalExpenditure, redeemedValue = 0) => {
  const eligibleSpend = Math.max(0, Number(totalExpenditure || 0) - Number(redeemedValue || 0));
  return Math.floor(eligibleSpend / LOYALTY_RULES.EARN_PER_RUPEES);
};

export const pointsToRupees = (points) => Number(points || 0) * LOYALTY_RULES.REDEEM_VALUE_PER_POINT;

export const validateRedeemRequest = ({ pointsBalance, pointsRequired, canCombineCoupons = false }) => {
  if (canCombineCoupons) {
    return { valid: false, reason: "Points cannot be combined with other coupons." };
  }

  if (pointsRequired < LOYALTY_RULES.MIN_REDEEM_POINTS) {
    return { valid: false, reason: `Minimum redemption is ${LOYALTY_RULES.MIN_REDEEM_POINTS} points.` };
  }

  if (pointsRequired > LOYALTY_RULES.MAX_REDEEM_POINTS_PER_TXN) {
    return { valid: false, reason: `Max redemption per transaction is ${LOYALTY_RULES.MAX_REDEEM_POINTS_PER_TXN} points.` };
  }

  if (pointsBalance < pointsRequired) {
    return { valid: false, reason: "Insufficient points balance." };
  }

  return { valid: true };
};
