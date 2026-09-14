import mongoose from "mongoose";

const mailotpSchema = new mongoose.Schema(
{
    email: 
    {
        type: String,
        required: true,
        lowercase: true,
        index: true,
    },

    otp: 
    {
        type: String,
        required: true,
    },

    expiresAt: 
    {
        type: Date,
        required: true,
        index: { expires: 0 },
    },
});

export default mongoose.model("mailotp", mailotpSchema );