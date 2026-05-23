import "../config.js";
import mongoose from "mongoose";
import LoyaltyOffer from "../Loyalty/models/LoyaltyOffer.js";
import UserLoyalty from "../Loyalty/models/UserLoyalty.js";
import LoyaltyTransaction from "../Loyalty/models/LoyaltyTransaction.js";
import RedemptionLog from "../Loyalty/models/RedemptionLog.js";

const offers = [
  { name: "Rs. 50 off on service", pointsRequired: 10, valueInRupees: 50, minOrderValue: 300, conditionsJson: { minServiceValue: 300 } },
  { name: "Free waterless wash", pointsRequired: 12, valueInRupees: 60, minOrderValue: 0, conditionsJson: {} },
  { name: "Free oil top-up (200ml)", pointsRequired: 16, valueInRupees: 80, minOrderValue: 0, conditionsJson: { onlyWithPaidService: true } },
  { name: "Rs. 100 off on service", pointsRequired: 20, valueInRupees: 100, minOrderValue: 500, conditionsJson: { minServiceValue: 500 } },
  { name: "Free pickup or drop", pointsRequired: 20, valueInRupees: 100, minOrderValue: 0, conditionsJson: { oneWayOnly: true } },
  { name: "Free basic service (labour only)", pointsRequired: 30, valueInRupees: 150, minOrderValue: 0, conditionsJson: { minPartsCost: 200 } },
  { name: "Free brake pad set (drum)", pointsRequired: 40, valueInRupees: 200, minOrderValue: 0, conditionsJson: { fittingChargesWaived: true } },
  { name: "Free full service (labour + wash)", pointsRequired: 50, valueInRupees: 300, minOrderValue: 500, conditionsJson: { minPartsSpend: 500 } },
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  await UserLoyalty.createCollection();
  await LoyaltyTransaction.createCollection();
  await LoyaltyOffer.createCollection();
  await RedemptionLog.createCollection();

  for (const offer of offers) {
    await LoyaltyOffer.updateOne({ name: offer.name }, { $set: offer }, { upsert: true });
  }

  console.log("Loyalty collections initialized and offers seeded.");
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Loyalty migration failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
