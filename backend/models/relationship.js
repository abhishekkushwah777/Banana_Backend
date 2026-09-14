import mongoose from "mongoose";

const relationshipSchema = new mongoose.Schema(
  {
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    requestedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    connectionStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected", "blocked"],
      default: "pending",
    },

    relationType: {
      type: String,
      enum: [
        "friends",
        "bestfriends",
        "couples",
        "enemies",
      ],
      default : "friends",
    }
  },
  {
    timestamps: true,
  }
);

relationshipSchema.index(
  { userA: 1, userB: 1 },
  { unique: true }
);

const relationship = mongoose.model(
  "relationship",
  relationshipSchema
);

export default relationship;