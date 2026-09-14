import express from "express";
import mongoose from "mongoose";
import Message from "../models/message.js"
import Conversation from "../models/conversation.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid userId",
      });
    }

    if (userId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message: "You cannot start a conversation with yourself",
      });
    }

    // Check whether a private conversation already exists
    let conversation = await Conversation.findOne({
      type: "private",
      participants: {
        $all: [req.user._id, userId],
      },
    }).populate(
      "participants",
      "username email avatar status"
    );

    // Existing conversation
    if (conversation) {
      const messages = await Message.find({
          conversationId: conversation._id,
        })
          .populate("senderId", "username")
          .sort({ createdAt: 1 });
      return res.status(200).json({
        conversation, 
        messages
      });
    }

    // Create new conversation
    conversation = await Conversation.create({
      type: "private",
      participants: [req.user._id, userId],
      createdBy: req.user._id,
    });

    // Populate users after creation
    conversation = await conversation.populate(
      "participants",
      "username email avatar status"
    );

    return res.status(201).json(conversation);
  } catch (error) {
    console.error("Create conversation error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

export default router;