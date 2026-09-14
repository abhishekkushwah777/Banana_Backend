import mongoose from "mongoose";

const conversationMemberSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      enum: ["member", "admin"],
      default: "member",
    },

    lastReadMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },

    muted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

conversationMemberSchema.index(
  { conversationId: 1, userId: 1 },
  { unique: true }
);

const ConversationMember = mongoose.model(
  "ConversationMember",
  conversationMemberSchema
);

export default ConversationMember;