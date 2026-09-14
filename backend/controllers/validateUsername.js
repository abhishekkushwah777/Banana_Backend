import User from "../models/user.js";

const validateUsername = async (req, res) => {
    try {
        const { q } = req.query;

        // Check if query exists
        if (!q) {
            return res.status(400).json({
                available: false,
                message: "Username is required"
            });
        }

        const username = q.trim();

        // Minimum username length
        if (username.length < 3) {
            return res.status(400).json({
                available: false,
                message: "Username must be at least 3 characters"
            });
        }

        // Check if username already exists
        const user = await User.findOne({
            username: {
                $regex: `^${username}$`,
                $options: "i"
            }
        });

        if (user) {
            return res.status(201).json({
                available: false,
                message: "Username already exists"
            });
        }

        // Username doesn't exist
        return res.status(200).json({
            available: true,
            message: "Username is available"
        });

    } catch (error) {
        console.error("Username validation error:", error);

        return res.status(500).json({
            available: false,
            message: "Internal server error"
        });
    }
};

export default validateUsername;