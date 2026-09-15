import jwt from "jsonwebtoken";
import Conversation from "../models/conversation.js";
import Message from "../models/message.js";
import User from "../models/user.js";

export default function socketHandler(io) {

  // Authenticate socket
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth.token;

      if (!token) {
        return next(
          new Error("Authentication required")
        );
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      socket.user = decoded;

      next();
    } catch (error) {
      next(
        new Error("Invalid token")
      );
    }
  });

  io.on("connection", (socket) => {
    console.log(
      "User connected:",
      socket.user.userId
    );
    User.findByIdAndUpdate(socket.user.userId, {
          status: "Online"
    });

    console.log("User online:", socket.user.userId);

    socket.on(
      "join_conversation",
      async ({ conversationId }) => {
        try {
          console.log("joining convo", conversationId);
          
          const conversation =
            await Conversation.findOne({
              _id: conversationId,
              participants: socket.user.userId,
            });

          if (!conversation) {
            socket.emit("error_message", {
              message:
                "You are not allowed in this conversation",
            });

            return;
          }

          socket.join(
            `conversation:${conversationId}`
          );

          console.log(
            `User ${socket.user.userId} joined ${conversationId}`
          );
        } catch (error) {
          console.error(error);
        }
      }
    );

    socket.on(
      "leave_conversation",
      ({ conversationId }) => {
        socket.leave(
          `conversation:${conversationId}`
        );
      }
    );

    socket.on(
      "send_message",
      async ({ conversationId, content }) => {
        try {
          if (!content?.trim()) {
            return;
          }

          // Verify user belongs to conversation
          const conversation =
            await Conversation.findOne({
              _id: conversationId,
              participants: socket.user.userId,
            });

          if (!conversation) {
            socket.emit("error_message", {
              message:
                "You are not a participant",
            });

            return;
          }

          // Save message
          let message =
            await Message.create({
              conversationId: conversationId,
              senderId: socket.user.userId,
              content: content.trim(),
            });

          // Populate sender
          message =
            await message.populate(
              "senderId",
              "username"
            );

          // Update conversation
          conversation.updatedAt =
            new Date();

          await conversation.save();

          // Send to everyone in room
          io.to(
            `conversation:${conversationId}`
          ).emit(
            "receive_message",
            message
          );

        } catch (error) {
          console.error(
            "Send message error:",
            error
          );

          socket.emit("error_message", {
            message: "Failed to send message",
          });
        }
      }
    );

    socket.on("disconnect", () => {
      console.log(
        "User disconnected:",
        socket.user.userId
      );
      User.findByIdAndUpdate(socket.user.userId,{
        status: "Offline"
      })
    });
  });
}