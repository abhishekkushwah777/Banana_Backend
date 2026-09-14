import crypto from "crypto";
import { sendEmail } from "./emailController.js";
import mailotp from "../models/mailotp.js";
import User from "../models/user.js"

export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingEmail = await User.findOne({
      email: normalizedEmail,
    });
    if(existingEmail){
      return res.status(400).json({
        message: "Email already registered"
      })
    };


    // Delete previous OTP for this email
    await mailotp.deleteOne({
      success: false,
      email: normalizedEmail,
    });

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();


    // OTP expires in 5 minutes
    const expiresAt = new Date(
      Date.now() + 5 * 60 * 1000
    );

    // Save new OTP
    await mailotp.create({
      email: normalizedEmail,
      otp,
      expiresAt,
    });

    await sendEmail({
      to: normalizedEmail,

      subject: "Verify your email",

      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 500px;
          margin: auto;
          padding: 20px;
        ">

          <h2>Email Verification</h2>

          <p>
            Use the following OTP to verify your email address:
          </p>

          <div style="
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            margin: 25px 0;
          ">
            ${otp}
          </div>

          <p>
            This OTP will expire in <strong>5 minutes</strong>.
          </p>

          <p>
            If you didn't request this verification code,
            you can safely ignore this email.
          </p>

        </div>
      `,
    });


    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });

  } catch (error) {
    console.error("Send OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};







export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find OTP for this email
    const otpRecord = await mailotp.findOne({
      email: normalizedEmail,
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP not found or expired",
      });
    }

    // Check expiry
    if (otpRecord.expiresAt < new Date()) {
      await mailotp.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }


    // Compare hashes
    if (otp !== otpRecord.otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // OTP is correct → delete it so it cannot be reused
    await mailotp.deleteOne({
      _id: otpRecord._id,
    });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      email: normalizedEmail,
    });
  } catch (error) {
    console.error("backend Verify OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
    });
  }
};