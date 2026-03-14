import Message from "../models/Message.js";
import User from "../../Users/models/User.js";

const ADMIN_ID = "admin";

// Get conversation list: for admin = users who have chatted; for user = just admin
export const getConversations = async (req, res) => {
  try {
    const { role } = req.user;
    const id = req.user.userId != null ? String(req.user.userId) : req.user._id?.toString();

    if (role === "admin") {
      const withAdmin = await Message.aggregate([
        { $match: { $or: [{ senderId: ADMIN_ID }, { receiverId: ADMIN_ID }] } },
        {
          $project: {
            otherId: { $cond: [{ $eq: ["$senderId", ADMIN_ID] }, "$receiverId", "$senderId"] },
            createdAt: 1,
            content: 1,
            senderId: 1,
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$otherId",
            lastMessage: { $first: { content: "$content", createdAt: "$createdAt", senderId: "$senderId" } },
          },
        },
        { $sort: { "lastMessage.createdAt": -1 } },
        { $project: { userId: "$_id", lastMessage: 1, _id: 0 } },
      ]);

      // Fetch user details for each conversation
      const conversationsWithUserDetails = await Promise.all(
        withAdmin.map(async (conv) => {
          try {
            // Convert userId to number for proper matching
            const userIdNum = parseInt(conv.userId, 10);
            console.log(`Fetching user with userId: ${userIdNum} (from conv.userId: ${conv.userId})`);
            const user = await User.findOne({ userId: userIdNum }).select('name email');
            console.log(`User found:`, user ? { name: user.name, email: user.email } : 'null');
            return {
              ...conv,
              userName: user?.name || `User #${conv.userId}`,
              userEmail: user?.email || null
            };
          } catch (err) {
            console.error(`Error fetching user ${conv.userId}:`, err.message);
            return {
              ...conv,
              userName: `User #${conv.userId}`,
              userEmail: null
            };
          }
        })
      );

      return res.json({ success: true, conversations: conversationsWithUserDetails });
    }

    // User: single conversation with admin
    const lastMsg = await Message.findOne({
      $or: [
        { senderId: id, receiverId: ADMIN_ID },
        { senderId: ADMIN_ID, receiverId: id },
      ],
    })
      .sort({ createdAt: -1 })
      .select("content createdAt senderId")
      .lean();

    const conversations = [{ userId: ADMIN_ID, lastMessage: lastMsg || null }];
    return res.json({ success: true, conversations });
  } catch (err) {
    console.error("getConversations error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get messages between current user and partnerId (partnerId = 'admin' for user, or userId for admin)
export const getMessages = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { role } = req.user;
    const myId = req.user.userId?.toString() || req.user._id?.toString();

    const id1 = role === "admin" ? ADMIN_ID : myId;
    const id2 = role === "admin" ? partnerId : ADMIN_ID;

    const messages = await Message.find({
      $or: [
        { senderId: id1, receiverId: id2 },
        { senderId: id2, receiverId: id1 },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    res.json({ success: true, messages });
  } catch (err) {
    console.error("getMessages error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Optional: create message via REST (socket will also create)
export const createMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const { role } = req.user;
    const myId = req.user.userId?.toString() || req.user._id?.toString();

    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: "Content is required" });
    }

    const senderRole = role;
    const receiverRole = receiverId === ADMIN_ID ? "admin" : "user";

    const msg = await Message.create({
      senderId: myId,
      senderRole,
      receiverId: receiverId || ADMIN_ID,
      receiverRole,
      content: content.trim(),
    });

    res.status(201).json({ success: true, message: msg });
  } catch (err) {
    console.error("createMessage error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
