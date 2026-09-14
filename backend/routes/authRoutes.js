import express from "express";
import {
  registerUser,
  loginUser,
} from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();


router.get("/me", authMiddleware, (req, res) => {
  // if we got here, the token is valid — req.user has the decoded payload
  console.log("request passed middleware")
  res.json({ user: req.user });
});

// Register
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);

export default router;