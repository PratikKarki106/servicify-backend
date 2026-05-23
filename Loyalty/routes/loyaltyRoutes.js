import express from "express";
import { authenticateJWT } from "../../Users/middleware/authenticateJWT.js";
import { authorizeRoles } from "../../Users/middleware/authorizedRoles.js";
import {
  createAdminOffer,
  deleteAdminOffer,
  earn,
  expire,
  getAdminOffersWithStats,
  getBalance,
  getOffers,
  getTransactions,
  redeem,
  updateAdminOffer
} from "../controllers/loyaltyController.js";

const router = express.Router();

router.get("/balance", authenticateJWT, getBalance);
router.get("/transactions", authenticateJWT, getTransactions);
router.get("/offers", authenticateJWT, getOffers);
router.post("/redeem", authenticateJWT, redeem);
router.post("/earn", authenticateJWT, earn);
router.post("/expire", expire); // Intended for cron/system calls

// Admin manage redeem offers
router.get("/admin/offers", authenticateJWT, authorizeRoles("admin"), getAdminOffersWithStats);
router.post("/admin/offers", authenticateJWT, authorizeRoles("admin"), createAdminOffer);
router.put("/admin/offers/:offerId", authenticateJWT, authorizeRoles("admin"), updateAdminOffer);
router.delete("/admin/offers/:offerId", authenticateJWT, authorizeRoles("admin"), deleteAdminOffer);

export default router;
