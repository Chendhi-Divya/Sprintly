import dotenv from "dotenv";
import { sendEmail } from "./services/emailService.js";

dotenv.config();

const test = async () => {
  try {
    await sendEmail(
      "YOUR_GMAIL_ADDRESS@gmail.com",
      "Sprintly Email Test",
      "<h1>Gmail SMTP is working!</h1>"
    );

    console.log("Test email sent!");
  } catch (error) {
    console.error("Test failed:", error);
  }
};

test();