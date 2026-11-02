
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

// Nodemailer transporter using Resend SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: 2465,
  secure: true,
  auth: {
    user: "resend",
    pass: process.env.RESEND_API_KEY || "",
  },
});

// Common email sending function
const sendEmail = async (
  email: string,
  subject: string,
  html: string,
  text?: string
) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing");
  }

  try {
    const info = await transporter.sendMail({
      from: "Sprintly <onboarding@resend.dev>",
      to: email,
      subject,
      html,
      ...(text ? { text } : {}),
    });

    console.log("Email sent successfully:", info.messageId);

    return info;
  } catch (error) {
    console.error("Nodemailer email sending failed:", error);
    throw error;
  }
};

// Send OTP verification email
export const sendOTPEmail = async (
  email: string,
  otp: string
) => {
  await sendEmail(
    email,
    "Sprintly Email Verification",
    `
      <h2>Welcome to Sprintly!</h2>

      <p>Your verification OTP is:</p>

      <h1>${otp}</h1>

      <p>This OTP will expire in 10 minutes.</p>

      <p>
        If you did not create a Sprintly account,
        please ignore this email.
      </p>
    `,
    `Welcome to Sprintly! Your verification OTP is ${otp}. This OTP will expire in 10 minutes.`
  );
};

// Send organization invitation email
export const sendOrganizationInvitationEmail = async (
  email: string,
  organizationName: string,
  role: string,
  inviteToken: string
) => {
  const registrationUrl = new URL(
    "/register",
    process.env.CLIENT_URL || "http://localhost:5173"
  );

  registrationUrl.hash = new URLSearchParams({
    invite: inviteToken,
  }).toString();

  // Escape HTML characters
  const escapeHtml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const safeOrganizationName = escapeHtml(organizationName);
  const safeRole = escapeHtml(role);

  const safeRegistrationUrl = escapeHtml(
    registrationUrl.toString()
  );

  await sendEmail(
    email,
    `Invitation to join ${organizationName} on Sprintly`,
    `
      <h2>You have been invited to Sprintly!</h2>

      <p>
        You have been invited to join
        <strong>${safeOrganizationName}</strong>
        as a <strong>${safeRole}</strong>.
      </p>

      <p>
        <a href="${safeRegistrationUrl}">
          Register and join the organization
        </a>
      </p>
    `,
    `You have been invited to join ${organizationName} on Sprintly as a ${role}. Register using the invited email address and accept the invitation here: ${registrationUrl.toString()}`
  );
};
