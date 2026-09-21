import relationship from "../models/relationship.js";
import Conversation from "../models/conversation.js";
import Message from "../models/message.js";

const getUsers = async (req, res) => {
  try {
    const myId = req.user._id;

    const relationships = await relationship
      .find({
        $or: [
          { userA: myId },
          { userB: myId }
        ],
        connectionStatus: "accepted"
      })
      .populate("userA", "username displayName avatar status streak")
      .populate("userB", "username displayName avatar status streak");

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

        const conversation = await Conversation.findOne({
          type: "private",
          participants: {
            $all: [myId, otherUser._id]
          }
        })
          .select("updatedAt lastMessage lastReadAt")
          .populate("lastMessage");

        console.log(conversation.lastReadAt);
          
        const lastReadAt = conversation.lastReadAt.get(
          otherUser._id.toString()
        );

        const unreadFilter = {
          conversationId: conversation._id,
          senderId: { $ne: myId },
        };

        if (lastReadAt) {
          unreadFilter.createdAt = {
            $gt: lastReadAt,
          };
        }

        const unreadCount = await Message.countDocuments(unreadFilter);

        console.log("otheruser : ", otherUser);

        return {
          relationshipId: relationship._id,

          // Needed by UserList to identify
          // which conversation received a new message
          conversationId: conversation?._id || null,

          user: otherUser,

          relationType: relationship.relationType,

          updatedAt: conversation?.updatedAt || null,

          lastMessage: conversation?.lastMessage || null,

          unreadCount
        };
      })
    );

    friends.sort((a, b) => {
      if (!a.updatedAt) return 1;
      if (!b.updatedAt) return -1;

      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    return res.status(200).json({
      friends
    });

  } catch (error) {
    console.error("Get users error:", error);

    return res.status(500).json({
      message: "Server error"
    });
  }
};

export default getUsers;