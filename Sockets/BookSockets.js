// Sockets/BookSockets.js
const setupBookSockets = (io, socket) => {
  console.log("📅 Booking sockets ready for:", socket.id);

  // Join user's personal room (for notifications, bill updates, etc.)
  socket.on('join_user_room', (userId) => {
    if (userId) {
      const roomName = `user_${userId}`;
      socket.join(roomName);
      console.log(`👤 User ${userId} joined room: ${roomName}`);
    }
  });

  // Leave user's personal room
  socket.on('leave_user_room', (userId) => {
    if (userId) {
      const roomName = `user_${userId}`;
      socket.leave(roomName);
      console.log(`👤 User ${userId} left room: ${roomName}`);
    }
  });

  // Join appointment tracking room
  socket.on('track_appointment', (appointmentId) => {
    if (appointmentId) {
      socket.join(`appointment_${appointmentId}`);
      console.log(`🔍 Tracking appointment: ${appointmentId}`);
    }
  });

  // Stop tracking appointment
  socket.on('stop_tracking_appointment', (appointmentId) => {
    if (appointmentId) {
      socket.leave(`appointment_${appointmentId}`);
      console.log(`⏹️ Stopped tracking: ${appointmentId}`);
    }
  });

  // Join user's appointment list room (for all their appointments)
  socket.on('join_user_appointments', (userId) => {
    if (userId) {
      socket.join(`user_appointments_${userId}`);
      console.log(`📋 User ${userId} joined their appointments room`);
    }
  });

  // Leave user's appointment list room
  socket.on('leave_user_appointments', (userId) => {
    if (userId) {
      socket.leave(`user_appointments_${userId}`);
      console.log(`📋 User ${userId} left their appointments room`);
    }
  });

  // Request specific appointment data
  socket.on('get_appointment_details', async (appointmentId) => {
    try {
      // You can fetch from database here if needed
      socket.emit('appointment_details_requested', {
        appointmentId,
        message: 'Fetching appointment details...'
      });
    } catch (error) {
      console.error('Error in get_appointment_details:', error);
    }
  });
};

export default setupBookSockets;