import express from "express";
import searchUsers from "../controllers/searchController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/username", authMiddleware, searchUsers);

export default router;