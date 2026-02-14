require('dotenv').config()
const express = require("express");
const cors = require("cors");
const paymentRoutes = require("./routes/payment");
const authRoutes = require("./routes/auth");
const dataRoutes = require("./routes/data");
const imageRoutes = require("./routes/images");

const app = express();
app.use(cors({
    origin: "https://zstate.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE"]
})); app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
// app.use("/api/payments", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/images", imageRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
