require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const webhookRoutes = require("./routes/webhookRoutes");
const reminderRoutes = require("./routes/reminderRoutes");
const errorHandler = require("./middleware/errorHandler");
const { startReminderScheduler } = require("./services/reminderScheduler");

const app = express();

connectDB();

app.use(
  cors({
    origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",") : "*",
  })
);

// Twilio webhooks send form-urlencoded data, not JSON
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "Campus Circular Agent backend is running" });
});

app.use("/api/webhook", webhookRoutes);
app.use("/api/reminders", reminderRoutes);

app.use(errorHandler);

startReminderScheduler();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
