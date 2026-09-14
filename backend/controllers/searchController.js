import User from "../models/user.js";
import relationship from "../models/relationship.js";

const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const myId = req.user._id;

    if (!q || q.trim().length < 3) {
      return res.status(200).json({
        users: [],
      });
    }
    console.log("search request recieved for ", q);
    // 1. Search users globally
    const users = await User.find({
      _id: { $ne: myId },
      username: {
        $regex: q.trim(),
        $options: "i",
      },
    })
      .select("_id username avatar")
      .limit(20);

    // 2. Get relationships between me and these users
    const userIds = users.map((user) => user._id);

    console.log(userIds);
    console.log(myId);
    
    

    const relationships = await relationship.find({
      $or: [
        {
          userA: myId,
          userB: { $in: userIds },
        },
        {
          userB: myId,
          userA: { $in: userIds },
        },
      ],
    }).select(
      "userA userB requestedBy connectionStatus relationType"
    );

    console.log("relationship :", relationships);

    // 3. Create a quick lookup map
    const relationshipMap = new Map();

    relationships.forEach((relationship) => {
      const otherUserId =
        relationship.userA.toString() === myId.toString()
          ? relationship.userB.toString()
          : relationship.userA.toString();

      relationshipMap.set(otherUserId, relationship);
    });

    // 4. Combine users + relationship
    const result = users.map((user) => {
      const relationship = relationshipMap.get(
        user._id.toString()
      );

      return {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,

        relationship: relationship
          ? {
              connectionStatus: relationship.connectionStatus,
              relationType: relationship.relationType,
              requestedBy: relationship.requestedBy,
            }
          : null,
      };
    });

    console.log({
      users: result,
    });
    
    res.status(200).json({
      users: result,
    });

  } catch (error) {
    console.error("Search users error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export default searchUsers;