import relationship from "../models/relationship.js";

export const getrequests = async (req, res) => {
    try {
        const userid = req.user._id;

        if (!userid) {
            return res.status(400).json({
                message: "userid is required",
            });
        }

        const response = await relationship
            .find({
                requestedTo: userid,
                connectionStatus: "pending",
            })
            .populate("requestedBy", "username displayName avatar");

        return res.status(200).json(response);

    } catch (error) {
        console.error("Error getting friend requests:", error);

        return res.status(500).json({
            message: "Error getting requests",
        });
    }
};



export const acceptRequest = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({
                message: "relationship q is required",
            });
        }

        const existing = await relationship.findById(q);

        if (!existing) {
            return res.status(404).json({
                message: "relationship not found",
            });
        }

        // ensure only the recipient of the request can accept it
        if (req.user && String(existing.requestedTo) !== String(req.user._id)) {
            return res.status(403).json({
                message: "you are not authorized to accept this request",
            });
        }

        if (existing.connectionStatus === "accepted") {
            return res.status(400).json({
                message: "request already accepted",
            });
        }

        const response = await relationship.findByIdAndUpdate(
            q,
            { connectionStatus: "accepted" },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            response,
        });

    } catch (error) {
        console.error("error accepting friend request:", error);

        return res.status(500).json({
            message: "error accepting friend request",
        });
    }
};