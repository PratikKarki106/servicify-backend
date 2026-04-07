// Sockets/ChatSockets.js
import Message from "../Messages/models/Message.js";

const setupChatSockets = (io, socket) => {
  console.log("💬 Chat sockets ready for:", socket.id);

  // Join user's personal room
  socket.on('join_user_room', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`👤 User ${userId} joined room user_${userId}`);
    }
  });

  // Join admin room
  socket.on('join_admin_room', () => {
    socket.join('admin_room');
    console.log('👑 Admin joined admin_room');
  });

  // Handle sending messages
  socket.on('send_message', async (payload) => {
    const { senderId, senderRole, receiverId, content } = payload || {};
    
    if (!senderId || !senderRole || !receiverId || !content || !String(content).trim()) {
      console.log("❌ Invalid message payload");
      return;
    }

    try {
      const receiverRole = receiverId === 'admin' ? 'admin' : 'user';
      
      // Save to database
      const doc = await Message.create({
        senderId,
        senderRole,
        receiverId,
        receiverRole,
        content: String(content).trim(),
      });

      const msg = doc.toObject();
      msg.createdAt = doc.createdAt;

      // Send to recipient's room
      if (receiverId === 'admin') {
        io.to('admin_room').emit('new_message', msg);
      } else {
        io.to(`user_${receiverId}`).emit('new_message', msg);
      }

      // Send back to sender for confirmation
      socket.emit('new_message', msg);
      
      console.log(`📨 Message sent from ${senderId} to ${receiverId}`);
    } catch (err) {
      console.error('❌ send_message error:', err);
    }
  });
};

export default setupChatSockets;