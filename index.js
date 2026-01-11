
import "./config.js";
import localAuthRoutes from "./Users/routes/localAuth.js"; 
import authRoutes from "./Users/routes/auth.js";   
import "./Users/config/passport.js";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import passport from "./Users/config/passport.js";
import appointmentRoutes from "./BookAppointment/routes/appointmentRoutes.js";
import errorHandler  from "./middleware/errorHandler.js";
import catalogRoutes from "./Catalogue/routes/catalogRoutes.js";
import packageRoutes from "./Package/routes/packageRoutes.js";


const app = express();
const allowedOrigins = [
  process.env.CLIENT_URL,            // Usually http://localhost:5173
  "http://192.168.254.1:5173",       // Your friend accessing via IP
  "http://localhost:5173"            // Fallback for your local work
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(passport.initialize());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB", process.env.MONGO_URI))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/auth", authRoutes);
app.use("/auth", localAuthRoutes);
app.use("/appointments", appointmentRoutes);
app.use("/api", catalogRoutes);
app.use("/api/packages", packageRoutes);

app.get("/", (req, res) => {
  res.send("Servicify backend is running!");
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Network access: http://192.168.254.1:${PORT}`);
});