import express from "express";
import { authenticateJWT } from "../../Users/middleware/authenticateJWT.js";
import { getConversations, getMessages, createMessage } from "../controllers/messageController.js";

const router = express.Router();

// Optional: ping to verify /messages is mounted (no auth)
router.get("/ping", (req, res) => res.json({ ok: true, service: "messages" }));

router.use(authenticateJWT);

router.get("/conversations", getConversations);
router.get("/conversation/:partnerId", getMessages);
router.post("/", createMessage);

export default router;
