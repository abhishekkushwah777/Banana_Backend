import relationship from "../models/relationship.js";
import Conversation from "../models/conversation.js";

const getUsers = async (req, res) => {
  try {
    const myId = req.user._id;

    const relationships = await relationship.find({
      $or: [
        { userA: myId },
        { userB: myId }
      ],
      connectionStatus: "accepted"
    })
      .populate("userA", "username displayName avatar")
      .populate("userB", "username displayName avatar");

    if (!relationships || relationships.length === 0) {
      return res.status(200).json({
        message: "add friends or start a new conversation",
        friends: []
      });
    }

    const friends = await Promise.all(
      relationships.map(async (relationship) => {
        const otherUser =
          relationship.userA._id.toString() === myId.toString()
            ? relationship.userB
            : relationship.userA;

        // Find conversation between me and this friend
        const conversation = await Conversation.findOne({
          participants: {
            $all: [myId, otherUser._id]
          }
        }).select("updatedAt");

        return {
          relationshipId: relationship._id,
          user: otherUser,
          relationType: relationship.relationType,
          updatedAt: conversation?.updatedAt || null
        };
      })
    );

    // Most recently updated conversation first
    friends.sort((a, b) => {
      if (!a.updatedAt) return 1;
      if (!b.updatedAt) return -1;

      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    res.status(200).json({
      friends
    });

  } catch (error) {
    console.error("Get users error:", error);

    res.status(500).json({
      message: "Server error"
    });
  }
};

export default getUsers;