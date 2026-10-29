import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();


const transporter = nodemailer.createTransport({  //transporter is object which sends email using nodemailer
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOTPEmail = async (
  email: string,
  otp: string
) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Sprintly Email Verification",
    html: `
      <h2>Welcome to Sprintly!</h2>

      <p>Your verification OTP is:</p>

      <h1>${otp}</h1>

      <p>This OTP will expire in 10 minutes.</p>

      <p>If you did not create a Sprintly account, please ignore this email.</p>
    `,
  });
};

export const sendOrganizationInvitationEmail = async (
  email: string,
  organizationName: string,
  role: string,
  invitationId: string
) => {
  const registrationUrl = new URL(
    "/register",
    process.env.CLIENT_URL || "http://localhost:5173"
  );
  registrationUrl.searchParams.set("invitationId", invitationId);
  registrationUrl.searchParams.set("email", email);
  const safeRegistrationUrl = registrationUrl.toString()
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;");
  const safeOrganizationName = organizationName
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Invitation to join ${organizationName} on Sprintly`,
    text: `You have been invited to join ${organizationName} on Sprintly as a ${role}. Register using the invited email address and accept the invitation here: ${registrationUrl.toString()}`,
    html: `<p>You have been invited to join <strong>${safeOrganizationName}</strong> on Sprintly as a <strong>${role}</strong>.</p><p><a href="${safeRegistrationUrl}">Register and join the organization</a></p>`,
  });
};