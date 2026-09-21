import jwt from "jsonwebtoken";
import Conversation from "../models/conversation.js";
import Message from "../models/message.js";
import User from "../models/user.js";
const onlineUsers = new Map();
const HEARTBEAT_TIMEOUT = 60 * 1000; // 60 seconds
const PRESENCE_CHECK_INTERVAL = 20 * 1000; // check every 20 seconds

export default function socketHandler(io) {

  // ==============================
  // Authenticate socket
  // ==============================
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;

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

  // ==========================================
  // STALE PRESENCE CHECKER
  // ==========================================

  setInterval(async () => {

    const now = Date.now();

    for (
      const [userId, presence]
      of onlineUsers
    ) {

      const timeSinceHeartbeat =
        now - presence.lastHeartbeat;


      if (
        timeSinceHeartbeat >
        HEARTBEAT_TIMEOUT
      ) {

        console.log(
          `Heartbeat timeout for user: ${userId}`
        );


        // Remove from memory
        onlineUsers.delete(userId);


        try {

          await User.findByIdAndUpdate(
            userId,
            {
              status: "Offline",
              lastSeen: new Date(),
            }
          );


          io.emit(
            "user_inactive",
            {
              userId,
            }
          );


          console.log(
            "user inactive emitted due to heartbeat timeout:",
            userId
          );

        } catch (error) {

          console.error(
            "Failed to update stale user:",
            error
          );

        }
      }
    }

  }, PRESENCE_CHECK_INTERVAL);


  // ==============================
  // Connection
  // ==============================

  io.on("connection", (socket) => {

    const userId = socket.user.userId;

    console.log("User connected:", userId);


    // ==============================
    // PERSONAL ROOM
    // ==============================

    socket.join(`user:${userId}`);

    console.log(
      `User ${userId} joined personal room`
    );


    // ==============================
    // PRESENCE
    // ==============================

    let userPresence = onlineUsers.get(userId);

    const isFirstConnection = !userPresence;

    if (!userPresence) {

      userPresence = {
        sockets: new Set(),
        lastHeartbeat: Date.now(),
      };

      onlineUsers.set(
        userId,
        userPresence
      );
    }

    // Add this socket
    userPresence.sockets.add(socket.id);

    // Every connection is proof that the user is alive
    userPresence.lastHeartbeat = Date.now();


    // ==============================
    // USER BECAME ONLINE
    // ==============================

    if (isFirstConnection) {

      User.findByIdAndUpdate(
        userId,
        {
          status: "Online",
        }
      ).catch((error) => {

        console.error(
          "Failed to update online status:",
          error
        );

      });

      io.emit("user_active", {
        userId,
      });

      console.log(
        "user active emitted:",
        userId
      );
    }


    // ==============================
    // HEARTBEAT
    // ==============================

    socket.on(
      "presence_heartbeat",
      () => {

        const presence =
          onlineUsers.get(userId);

        if (!presence) {
          return;
        }

        // Only update server memory.
        // DO NOT write to MongoDB.
        presence.lastHeartbeat =
          Date.now();

        console.log(
          "Heartbeat:",
          userId
        );
      }
    );


    // ==============================
    // JOIN CONVERSATION
    // ==============================

    socket.on(
      "join_conversation",
      async ({ conversationId }) => {

        try {

          console.log(
            "joining convo",
            conversationId
          );

          const conversation =
            await Conversation.findOne({
              _id: conversationId,
              participants: userId,
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
            `User ${userId} joined ${conversationId}`
          );

        } catch (error) {

          console.error(
            "Join conversation error:",
            error
          );

        }
      }
    );


    // ==============================
    // LEAVE CONVERSATION
    // ==============================
    socket.on(
      "leave_conversation",
      async ({ conversationId }) => {
        try {
          // Leave the conversation room
          socket.leave(
            `conversation:${conversationId}`
          );

          // Make sure typing state is stopped
          socket
            .to(`conversation:${conversationId}`)
            .emit("user_stopped_typing", {
              conversationId,
              userId,
            });

        } catch (error) {
          console.error(
            "Leave conversation error:",
            error
          );
        }
      }
    );

    // ==============================
    // SEND MESSAGE
    // ==============================

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
              participants: userId,
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
              conversationId,
              senderId: userId,
              content: content.trim(),
            });


          // Populate sender
          message =
            await message.populate(
              "senderId",
              "username avatar"
            );


          // Update conversation
          conversation.updatedAt =
            new Date();

          // Store last message
          conversation.lastMessage = message._id;

          await conversation.save();


          // ==============================
          // SEND MESSAGE TO CONVERSATION
          // ==============================

          io.to(
            `conversation:${conversationId}`
          ).emit(
            "receive_message",
            message
          );


          // ==============================
          // SEND MESSAGE TO OTHER
          // USER'S PERSONAL ROOM
          // ==============================

          const recipientId =
            conversation.participants.find(
              (participant) =>
                participant.toString() !==
                userId.toString()
            );

          if (recipientId) {

            io.to(
              `user:${recipientId}`
            ).emit(
              "new_message_notification",
              {
                conversationId,
                message,
              }
            );
          }


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


    // ==============================
    // TYPING START
    // ==============================

    socket.on(
      "typing_start",
      ({ conversationId }) => {

        socket
          .to(`conversation:${conversationId}`)
          .emit(
            "user_typing",
            {
              conversationId,
              userId,
            }
          );
      }
    );


    // ==============================
    // TYPING STOP
    // ==============================

    socket.on(
      "typing_stop",
      ({ conversationId }) => {

        socket
          .to(`conversation:${conversationId}`)
          .emit(
            "user_stopped_typing",
            {
              conversationId,
              userId,
            }
          );
      }
    );


    // ==============================
    // CONVERSATION READ
    // ==============================
    socket.on("read_msg", async ({ conversationId, lastMessageId }) => {
      try {
        const userId = socket.user.userId;

        if (!conversationId || !lastMessageId) {
          return;
        }

        // 1. Verify that this user belongs to the conversation
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });

        if (!conversation) {
          return;
        }

        // 2. Verify that the message belongs to this conversation
        const message = await Message.findOne({
          _id: lastMessageId,
          conversationId,
        });

        if (!message) {
          return;
        }

        // 3. Get user's current read position
        const currentReadAt = conversation.lastReadAt.get(
          userId.toString()
        );

        // 4. Never move read position backwards
        if (
          currentReadAt &&
          message.createdAt <= currentReadAt
        ) {
          return;
        }

        // 5. Move read cursor forward
        conversation.lastReadAt.set(
          userId.toString(),
          message.createdAt
        );

        // Don't modify conversation.updatedAt
        await conversation.save({
          timestamps: false,
        });

        // 6. Tell other users in this conversation
        socket.to(`conversation:${conversationId}`).emit(
          "messages_read",
          {
            conversationId,
            userId,
            lastMessageId,
            readAt: message.createdAt,
          }
        );

      } catch (error) {
        console.error("read_msg error:", error);
      }
    });


    // ==============================
    // DISCONNECT
    // ==============================

    socket.on(
      "disconnect",
      async () => {

        console.log(
          "User disconnected:",
          userId,
          socket.id
        );


        const presence =
          onlineUsers.get(userId);

        if (!presence) {
          return;
        }


        // Remove this socket
        presence.sockets.delete(
          socket.id
        );


        // Another device/socket
        // is still connected.
        if (presence.sockets.size > 0) {

          console.log(
            `User ${userId} still has ${presence.sockets.size} active socket(s)`
          );

          return;
        }


        // No sockets remain.
        onlineUsers.delete(userId);


        try {

          await User.findByIdAndUpdate(
            userId,
            {
              status: "Offline",
              lastSeen: new Date(),
            }
          );


          io.emit(
            "user_inactive",
            {
              userId,
            }
          );


          console.log(
            "user inactive emitted:",
            userId
          );

        } catch (error) {

          console.error(
            "Failed to update offline status:",
            error
          );

        }
      }
    );
  });
}