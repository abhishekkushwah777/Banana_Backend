import express from "express"
import validateUsername from "../controllers/validateUsername.js"
import authMiddleware from "../middleware/authMiddleware.js"
import addFriend from "../controllers/addfriendController.js";
import {getrequests, acceptRequest} from "../controllers/services.js"

const router = express.Router();

router.get("/validateusername", validateUsername)

router.post("/addFriend", authMiddleware, addFriend)

router.get("/getnotifications", authMiddleware,  getrequests)

router.get("/acceptrequest", acceptRequest)

export default router;