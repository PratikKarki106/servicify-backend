import Cart from "../models/Cart.js";
import Catalog from "../models/Catalog.js";
import Purchase from "../models/Purchase.js";
import User from "../../Users/models/User.js";
import { earnPoints } from "../../Loyalty/services/loyaltyService.js";

const hydrateCart = async (cart) => {
  const doc = await cart.populate("items.catalogItemId");
  return doc;
};

export const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) cart = await Cart.create({ userId: req.user._id, items: [], subtotal: 0 });
    cart = await hydrateCart(cart);
    res.json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { catalogItemId, quantity = 1 } = req.body;
    if (!catalogItemId) return res.status(400).json({ success: false, message: "catalogItemId is required." });

    const item = await Catalog.findById(catalogItemId);
    if (!item) return res.status(404).json({ success: false, message: "Catalog item not found." });

    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) cart = await Cart.create({ userId: req.user._id, items: [], subtotal: 0 });

    const qty = Math.max(1, Number(quantity || 1));
    const idx = cart.items.findIndex((i) => String(i.catalogItemId) === String(catalogItemId));
    const unitPrice = Number(item.totalCost || 0);

    if (idx >= 0) {
      cart.items[idx].quantity += qty;
      cart.items[idx].unitPrice = unitPrice;
      cart.items[idx].totalPrice = cart.items[idx].quantity * unitPrice;
    } else {
      cart.items.push({
        catalogItemId: item._id,
        quantity: qty,
        unitPrice,
        totalPrice: qty * unitPrice,
        itemSnapshot: {
          itemName: item.itemName,
          imageUrl: item.imageUrl || "",
          serviceCharge: item.serviceCharge,
          estimatedTime: item.estimatedTime,
        },
      });
    }

    cart.subtotal = cart.items.reduce((sum, i) => sum + i.totalPrice, 0);
    await cart.save();
    cart = await hydrateCart(cart);
    res.json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { catalogItemId, quantity } = req.body;
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found." });

    const idx = cart.items.findIndex((i) => String(i.catalogItemId) === String(catalogItemId));
    if (idx < 0) return res.status(404).json({ success: false, message: "Cart item not found." });

    const qty = Number(quantity || 0);
    if (qty <= 0) {
      cart.items.splice(idx, 1);
    } else {
      cart.items[idx].quantity = qty;
      cart.items[idx].totalPrice = qty * cart.items[idx].unitPrice;
    }

    cart.subtotal = cart.items.reduce((sum, i) => sum + i.totalPrice, 0);
    await cart.save();
    const hydrated = await hydrateCart(cart);
    res.json({ success: true, data: hydrated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const checkoutCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart || !cart.items.length) return res.status(400).json({ success: false, message: "Cart is empty." });

    const purchase = await Purchase.create({
      purchaseCode: `CAT-${Date.now()}`,
      userId: req.user._id,
      items: cart.items.map((i) => ({
        catalogItemId: i.catalogItemId,
        itemName: i.itemSnapshot?.itemName || "Catalog Item",
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
      subtotal: cart.subtotal,
      discount: 0,
      totalAmount: cart.subtotal,
      paymentStatus: "completed",
    });

    await earnPoints({
      userId: req.user._id,
      totalExpenditure: purchase.totalAmount,
      referenceId: purchase._id.toString(),
      redeemedValue: 0,
      description: "Points earned from catalog purchase",
    });

    cart.items = [];
    cart.subtotal = 0;
    await cart.save();

    res.json({ success: true, message: "Payment completed successfully.", data: purchase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: purchases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllPurchases = async (_req, res) => {
  try {
    const purchases = await Purchase.find({})
      .sort({ createdAt: -1 })
      .populate("userId", "name email");
    res.json({ success: true, data: purchases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
