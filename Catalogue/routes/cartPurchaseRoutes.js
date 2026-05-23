import express from "express";
import { authenticateJWT } from "../../Users/middleware/authenticateJWT.js";
import { authorizeRoles } from "../../Users/middleware/authorizedRoles.js";
import {
  addToCart,
  checkoutCart,
  getAllPurchases,
  getCart,
  getMyPurchases,
  updateCartItem,
} from "../controllers/cartPurchaseController.js";

const router = express.Router();

router.get("/cart", authenticateJWT, getCart);
router.post("/cart/add", authenticateJWT, addToCart);
router.patch("/cart/item", authenticateJWT, updateCartItem);
router.post("/cart/checkout", authenticateJWT, checkoutCart);

router.get("/purchases/me", authenticateJWT, getMyPurchases);
router.get("/purchases/admin", authenticateJWT, authorizeRoles("admin"), getAllPurchases);

export default router;
