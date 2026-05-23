import LoyaltyOffer from "../models/LoyaltyOffer.js";
import LoyaltyTransaction from "../models/LoyaltyTransaction.js";
import RedemptionLog from "../models/RedemptionLog.js";
import User from "../../Users/models/User.js";
import { earnPoints, expireInactiveBalances, getLoyaltyBalance, redeemOffer } from "../services/loyaltyService.js";

export const getBalance = async (req, res) => {
  try {
    const loyalty = await getLoyaltyBalance(req.user._id);
    res.json({ success: true, data: loyalty });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);

    const query = { userId: req.user._id };
    const [transactions, total] = await Promise.all([
      LoyaltyTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      LoyaltyTransaction.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getOffers = async (_req, res) => {
  try {
    const offers = await LoyaltyOffer.find({ isActive: true }).sort({ pointsRequired: 1 });
    res.json({ success: true, data: offers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const redeem = async (req, res) => {
  try {
    const { offerId, orderId, canCombineCoupons = false } = req.body;
    if (!offerId || !orderId) {
      return res.status(400).json({ success: false, error: "offerId and orderId are required." });
    }

    const result = await redeemOffer({
      userId: req.user._id,
      offerId,
      orderId,
      canCombineCoupons,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

export const earn = async (req, res) => {
  try {
    const { totalExpenditure, referenceId, redeemedValue = 0, eventType = "payment_completed" } = req.body;
    if (totalExpenditure === undefined || totalExpenditure === null) {
      return res.status(400).json({ success: false, error: "totalExpenditure is required." });
    }

    if (eventType === "refund") {
      const reversePoints = Math.floor(Math.max(0, Number(totalExpenditure || 0) - Number(redeemedValue || 0)) / 100);
      const loyalty = await getLoyaltyBalance(req.user._id);
      const deduction = Math.min(loyalty.pointsBalance, reversePoints);
      loyalty.pointsBalance -= deduction;
      loyalty.lastActivityDate = new Date();
      await loyalty.save();

      await LoyaltyTransaction.create({
        userId: req.user._id,
        type: "reverse",
        amount: -deduction,
        referenceId,
        description: "Points reversed due to refunded order.",
      });

      return res.json({ success: true, data: { pointsReversed: deduction, pointsBalance: loyalty.pointsBalance } });
    }

    const result = await earnPoints({
      userId: req.user._id,
      totalExpenditure,
      referenceId,
      redeemedValue,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

export const expire = async (_req, res) => {
  try {
    const result = await expireInactiveBalances();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAdminOffersWithStats = async (_req, res) => {
  try {
    const offers = await LoyaltyOffer.find({}).sort({ createdAt: -1 }).lean();

    const redemptionAgg = await RedemptionLog.aggregate([
      {
        $group: {
          _id: "$offerId",
          redemptionCount: { $sum: 1 },
          totalPointsRedeemed: { $sum: "$pointsUsed" },
          totalDiscountGiven: { $sum: "$discountApplied" },
          uniqueUsers: { $addToSet: "$userId" }
        }
      }
    ]);

    const usersByOffer = await RedemptionLog.aggregate([
      {
        $group: {
          _id: { offerId: "$offerId", userId: "$userId" },
          redeemedCount: { $sum: 1 },
          totalPointsUsed: { $sum: "$pointsUsed" },
          totalDiscountApplied: { $sum: "$discountApplied" },
          lastRedeemedAt: { $max: "$redeemedAt" }
        }
      },
      {
        $group: {
          _id: "$_id.offerId",
          users: {
            $push: {
              userId: "$_id.userId",
              redeemedCount: "$redeemedCount",
              totalPointsUsed: "$totalPointsUsed",
              totalDiscountApplied: "$totalDiscountApplied",
              lastRedeemedAt: "$lastRedeemedAt"
            }
          }
        }
      }
    ]);

    const allUserIds = usersByOffer.flatMap((entry) => entry.users.map((u) => String(u.userId)));
    const uniqueUserIds = [...new Set(allUserIds)];
    const users = await User.find({ _id: { $in: uniqueUserIds } }).select("name email").lean();
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const statsMap = new Map(redemptionAgg.map((entry) => [String(entry._id), entry]));
    const usersMap = new Map(usersByOffer.map((entry) => [String(entry._id), entry.users]));

    const data = offers.map((offer) => {
      const stats = statsMap.get(String(offer._id));
      const redeemedUsers = (usersMap.get(String(offer._id)) || []).map((item) => {
        const user = userMap.get(String(item.userId));
        return {
          userId: item.userId,
          name: user?.name || "Unknown User",
          email: user?.email || "N/A",
          redeemedCount: item.redeemedCount,
          totalPointsUsed: item.totalPointsUsed,
          totalDiscountApplied: item.totalDiscountApplied,
          lastRedeemedAt: item.lastRedeemedAt
        };
      });

      return {
        ...offer,
        redemptionCount: stats?.redemptionCount || 0,
        uniqueUserCount: stats?.uniqueUsers?.length || 0,
        totalPointsRedeemed: stats?.totalPointsRedeemed || 0,
        totalDiscountGiven: stats?.totalDiscountGiven || 0,
        redeemedUsers
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createAdminOffer = async (req, res) => {
  try {
    const { name, pointsRequired, valueInRupees, isActive = true } = req.body;

    if (!name || pointsRequired === undefined || valueInRupees === undefined) {
      return res.status(400).json({ success: false, error: "name, pointsRequired and valueInRupees are required." });
    }

    const offer = await LoyaltyOffer.create({
      name: String(name).trim(),
      pointsRequired: Number(pointsRequired),
      valueInRupees: Number(valueInRupees),
      isActive: Boolean(isActive)
    });

    res.status(201).json({ success: true, data: offer });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateAdminOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { name, pointsRequired, valueInRupees, isActive } = req.body;

    const update = {};
    if (name !== undefined) update.name = String(name).trim();
    if (pointsRequired !== undefined) update.pointsRequired = Number(pointsRequired);
    if (valueInRupees !== undefined) update.valueInRupees = Number(valueInRupees);
    if (isActive !== undefined) update.isActive = Boolean(isActive);

    const offer = await LoyaltyOffer.findByIdAndUpdate(offerId, update, { new: true, runValidators: true });
    if (!offer) {
      return res.status(404).json({ success: false, error: "Offer not found." });
    }

    res.json({ success: true, data: offer });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteAdminOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const redemptionCount = await RedemptionLog.countDocuments({ offerId });

    if (redemptionCount > 0) {
      return res.status(400).json({
        success: false,
        error: "Offer has redemption history. You can deactivate it instead of deleting."
      });
    }

    const offer = await LoyaltyOffer.findByIdAndDelete(offerId);
    if (!offer) {
      return res.status(404).json({ success: false, error: "Offer not found." });
    }

    res.json({ success: true, message: "Offer deleted successfully." });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
