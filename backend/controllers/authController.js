import bcrypt from "bcryptjs";
import User from "../models/user.js";
import generateToken from "../utils/generateToken.js";

// =========================
// REGISTER USER
// =========================

export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check required fields
    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required",
      });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username });

    if (existingUsername) {
      return res.status(409).json({
        message: "Username already exists",
      });
    }

    // Check if email already exists
    if (email) {
      const existingEmail = await User.findOne({ email });

      if (existingEmail) {
        return res.status(409).json({
          message: "Email already exists",
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    // Generate JWT
    const token = generateToken(user);

    res.status(201).json({
      message: "Registration successful",

      token,

      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// =========================
// LOGIN USER
// =========================

export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check required fields
    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required",
      });
    }

    // Find user
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    // Compare password with hashed password
    const passwordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordCorrect) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    // Generate JWT
    const token = generateToken(user);

    res.status(200).json({
      message: "Login successful",

      token,

      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
    console.log("logged in user:", user);
    console.log("token:", token);
  } catch (error) {
    console.log("Login error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};
