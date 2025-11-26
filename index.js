
import "./config.js";
import localAuthRoutes from "./routes/localAuth.js"; 
import authRoutes from "./routes/auth.js";   
import "./config/passport.js";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import passport from "./config/passport.js";
import { errorHandler } from "./middleware/errorHandler.js";


const app = express();
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// // Session Configuration
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//   })
// );

app.use(passport.initialize());
// app.use(passport.session());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB", process.env.MONGO_URI))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/auth", authRoutes);
app.use("/auth", localAuthRoutes);

app.get("/", (req, res) => {
  res.send("Servicify backend is running!");
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});