import Appointment from "../../BookAppointment/models/Appointment.js";
import LoyaltyOffer from "../models/LoyaltyOffer.js";
import LoyaltyTransaction from "../models/LoyaltyTransaction.js";
import RedemptionLog from "../models/RedemptionLog.js";
import UserLoyalty from "../models/UserLoyalty.js";
import {
  LOYALTY_RULES,
  calculateEarnPoints,
  pointsToRupees,
  validateRedeemRequest,
} from "../utils/loyaltyRules.js";

const ensureUserLoyalty = async (userId) => {
  let userLoyalty = await UserLoyalty.findOne({ userId });
  if (!userLoyalty) {
    userLoyalty = await UserLoyalty.create({ userId });
  }
  return userLoyalty;
};

export const getLoyaltyBalance = async (userId) => {
  const loyalty = await ensureUserLoyalty(userId);
  return loyalty;
};

export const earnPoints = async ({
  userId,
  totalExpenditure,
  referenceId,
  redeemedValue = 0,
  description = "Points earned after payment completion",
}) => {
  const points = calculateEarnPoints(totalExpenditure, redeemedValue);
  if (points <= 0) return { pointsEarned: 0 };

  const loyalty = await ensureUserLoyalty(userId);
  loyalty.pointsBalance += points;
  loyalty.lifetimePointsEarned += points;
  loyalty.lastActivityDate = new Date();
  await loyalty.save();

  await LoyaltyTransaction.create({
    userId,
    type: "earn",
    amount: points,
    referenceId,
    description,
  });

  return { pointsEarned: points, pointsBalance: loyalty.pointsBalance };
};

export const redeemOffer = async ({ userId, offerId, orderId, canCombineCoupons = false }) => {
  const loyalty = await ensureUserLoyalty(userId);
  const offer = await LoyaltyOffer.findOne({ _id: offerId, isActive: true });

  if (!offer) throw new Error("Offer not found or inactive.");

  const validation = validateRedeemRequest({
    pointsBalance: loyalty.pointsBalance,
    pointsRequired: offer.pointsRequired,
    canCombineCoupons,
  });
  if (!validation.valid) throw new Error(validation.reason);

  const existingRedemption = await RedemptionLog.findOne({
    userId,
    orderId: String(orderId),
  });
  if (existingRedemption) {
    throw new Error("An offer has already been redeemed for this order.");
  }

  const appointment = await Appointment.findOne({ appointmentId: Number(orderId) });
  if (appointment && appointment.status === "cancelled") {
    throw new Error("Cannot redeem points on cancelled order.");
  }

  loyalty.pointsBalance -= offer.pointsRequired;
  loyalty.lifetimePointsRedeemed += offer.pointsRequired;
  loyalty.lastActivityDate = new Date();
  await loyalty.save();

  await LoyaltyTransaction.create({
    userId,
    type: "redeem",
    amount: -offer.pointsRequired,
    referenceId: String(orderId),
    description: `Redeemed ${offer.name}`,
  });

  await RedemptionLog.create({
    userId,
    offerId: offer._id,
    orderId: String(orderId),
    pointsUsed: offer.pointsRequired,
    discountApplied: offer.valueInRupees,
    redeemedAt: new Date(),
  });

  return {
    pointsUsed: offer.pointsRequired,
    discountApplied: offer.valueInRupees,
    redemptionValue: pointsToRupees(offer.pointsRequired),
    remainingPoints: loyalty.pointsBalance,
  };
};

export const expireInactiveBalances = async () => {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - LOYALTY_RULES.EXPIRY_MONTHS);

  const usersToExpire = await UserLoyalty.find({
    pointsBalance: { $gt: 0 },
    lastActivityDate: { $lt: cutoff },
  });

  let expiredUsers = 0;
  let totalExpiredPoints = 0;

  for (const loyalty of usersToExpire) {
    const expiring = loyalty.pointsBalance;
    loyalty.pointsBalance = 0;
    await loyalty.save();

    await LoyaltyTransaction.create({
      userId: loyalty.userId,
      type: "expire",
      amount: -expiring,
      description: "Points expired after 6 months of inactivity.",
    });

    expiredUsers += 1;
    totalExpiredPoints += expiring;
  }

  return { expiredUsers, totalExpiredPoints };
};
