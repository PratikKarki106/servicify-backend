import "../config.js";
import mongoose from "mongoose";
import { expireInactiveBalances } from "../Loyalty/services/loyaltyService.js";

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const result = await expireInactiveBalances();
  console.log("Loyalty expiry cron completed:", result);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Loyalty expiry cron failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
