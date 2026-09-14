import relationship from "../models/relationship.js";

const addFriend = async (req, res) => {

    try {
        const currentUser = req.user._id;
        const { otherUserId } = req.body;

        console.log("BODY:", req.body);
        console.log("DESTRUCTURED:", otherUserId);
        console.log("currentuser :", currentUser);
        

        if (!otherUserId) {
            return res.status(400).json({
                success: false,
                message: "Other user ID is required"
            });
        }

        if (currentUser.toString() === otherUserId.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot add yourself"
            });
        }

        // Sort IDs so A-B and B-A always become the same pair
        const [userA, userB] = [
            currentUser.toString(),
            otherUserId.toString()
        ].sort();

        // Check for existing relationship
        const existingRelationship = await relationship.findOne({
            userA,
            userB
        });

        if (existingRelationship) {
            if (existingRelationship.requestedTo === otherUserId && existingRelationship.requestedBy === currentUser) {
                return res.status(201).json({
                    message: "Request already sent",
                })
            } else if (existingRelationship.requestedTo === currentUser && existingRelationship.requestedBy === otherUserId) {
                await relationship.findByIdAndUpdate(existingRelationship._id, {
                    connectionStatus: "accepted"
                });
                return res.status(201).json({
                    success: true,
                    message: "request accepted"
                })
            };
        }

        const newRelationship = await relationship.create({
            userA,
            userB,
            requestedBy: currentUser,
            requestedTo: otherUserId,
            connectionStatus: "pending",
        });

        return res.status(201).json({
            success: true,
            message: "Friend request sent",
            relationship: newRelationship
        });

    } catch (error) {
        console.error("Add friend error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to send friend request"
        });
    }
};

export default addFriend;