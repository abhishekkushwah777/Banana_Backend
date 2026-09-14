import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.8.8']);
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js"
import conversationRoutes from "./routes/conversationRoutes.js";
import searchRoutes from "./routes/searchRoutes.js"
import verificationRoutes from "./routes/verificationRoutes.js"
import socketHandler from "./socket/socketHandler.js";

dotenv.config();

const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.ORIGIN_URL || "*",
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: process.env.ORIGIN_URL || "*",
  })
);

app.use(express.json());

app.get('/test', (req, res) => {
  console.log('TEST REQUEST RECEIVED');
  res.json({ message: 'Backend is working' });
});

//services
app.use(
  "/api/services",
  serviceRoutes
);

// Routes
app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/email",
  verificationRoutes
);

app.use(
  "/api/search",
  searchRoutes
);

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/conversations",
  conversationRoutes
);


// Socket.IO
socketHandler(io);

// MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");

    const PORT =
      process.env.PORT || 5000;

    httpServer.listen(
      PORT,
      () => {
        console.log(
          `Server running on port ${PORT}`
        );
      }
    );
  })
  .catch((error) => {
    console.error(
      "MongoDB connection failed:",
      error
    );
  });