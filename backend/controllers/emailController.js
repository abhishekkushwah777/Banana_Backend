import "dotenv/config";
import { BrevoClient } from "@getbrevo/brevo";

console.log(
  "Brevo API key loaded:",
  !!process.env.BREVO_API_KEY
);

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const result =
      await brevo.transactionalEmails.sendTransacEmail({
        sender: {
          name: process.env.BREVO_SENDER_NAME,
          email: process.env.BREVO_SENDER_EMAIL,
        },

        to: [
          {
            email: to,
          },
        ],

        subject,
        htmlContent: html,
      });

    console.log("Email sent:", result.messageId);

    return result;
  } catch (error) {
    console.error("Brevo email error:", error);
    throw error;
  }
};