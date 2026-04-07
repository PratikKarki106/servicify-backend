import "./config.js";
import localAuthRoutes from "./Users/routes/localAuth.js";
import authRoutes from "./Users/routes/auth.js";
import notificationRoutes from "./Users/routes/notificationRoutes.js";
import adminNotificationRoutes from "./Users/routes/adminNotificationRoutes.js";
import profileRoutes from "./Users/routes/profileRoutes.js";
import adminUserRoutes from "./Users/routes/adminUserRoutes.js";
import "./Users/config/passport.js";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import passport from "./Users/config/passport.js";
import appointmentRoutes from "./BookAppointment/routes/appointmentRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import catalogRoutes from "./Catalogue/routes/catalogRoutes.js";
import packageRoutes from "./Package/routes/packageRoutes.js";
import forgotPasswordRoutes from "./ForgotPassword/Routes/forgotPasswordRoutes.js";
import vehicleRoutes from "./Dashboard/routes/vehicleRoutes.js";
import dashboardRoutes from "./Dashboard/routes/dashboardRoutes.js";
import adminDashboardRoutes from "./Admin/routes/adminDashboardRoutes.js";
import messageRoutes from "./Messages/routes/messageRoutes.js";
import paymentRoutes from "./Payment/Routes/paymentRoutes.js";
import analyticsRoutes from "./Analytics/routes/analyticsRoutes.js";
import userAnalyticsRoutes from "./Analytics/routes/userAnalyticsRoutes.js";
import historyRoutes from "./History/routes/historyRoutes.js";
import http from "http";
import setupWebSocket from "./Sockets/index.js"; // 👈 Import our organized socket setup

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://192.168.254.1:5173",
  "http://localhost:5173",
];

// CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy does not allow access from this origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB", process.env.MONGO_URI))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// 👇 Initialize WebSocket with our organized setup
const io = setupWebSocket(server, allowedOrigins);

// Make io available to routes if needed
app.set('io', io);

// Routes
app.use("/auth", authRoutes);
app.use("/auth", localAuthRoutes);
app.use("/notifications", notificationRoutes);
app.use("/admin/notifications", adminNotificationRoutes);
app.use("/appointments", appointmentRoutes);
app.use("/api", catalogRoutes);
app.use("/api/packages", packageRoutes);
app.use('/forgot-password', forgotPasswordRoutes);
app.use("/vehicles", vehicleRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/admin/dashboard", adminDashboardRoutes);
app.use("/messages", messageRoutes);
app.use("/profile", profileRoutes);
app.use("/payment", paymentRoutes);
app.use("/admin/users", adminUserRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/analytics/user", userAnalyticsRoutes);
app.use("/api/history", historyRoutes);

app.get("/", (req, res) => {
  res.send("Servicify backend is running!");
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Network access: http://192.168.254.1:${PORT}`);
});