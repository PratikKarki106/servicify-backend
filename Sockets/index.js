// Sockets/index.js
import { Server } from "socket.io";
import setupChatSockets from "./ChatSockets.js";
import setupBookSockets from "./BookSockets.js";

const setupWebSocket = (server, allowedOrigins) => {
  console.log("🔌 Initializing WebSocket server...");
  
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Main connection handler
  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // Set up all socket handlers
    setupChatSockets(io, socket);
    
    setupBookSockets(io, socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });

  return io;
};

export default setupWebSocket;