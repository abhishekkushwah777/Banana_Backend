import express from "express";
import { sendOTP, verifyOTP} from "../controllers/verificationController.js"

const router = express.Router();

router.post("/sendotp", sendOTP );

router.post("/verifyotp", verifyOTP );

export default router;