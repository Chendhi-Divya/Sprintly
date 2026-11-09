
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

const emailProvider = process.env.EMAIL_PROVIDER || "nodemailer";

// Gmail SMTP transporter for local development
const transporter =
  emailUser && emailPass
    ? nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      })
    : null;

// Production email service using Google Apps Script
const sendUsingAppsScript = async (
  email: string,
  subject: string,
  html: string,
  text?: string
) => {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  const secret = process.env.GOOGLE_SCRIPT_SECRET;

  if (!scriptUrl || !secret) {
    throw new Error("Google Apps Script configuration is missing");
  }

  const response = await fetch(scriptUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      secret,
      to: email,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Google Apps Script request failed: ${response.status}`
    );
  }

  const result = (await response.json()) as {
    success: boolean;
    message?: string;
  };

  if (!result.success) {
    throw new Error(
      result.message || "Google Apps Script could not send the email"
    );
  }

  console.log("Email sent successfully through Google Apps Script");

  return result;
};

// Common email sending function
export const sendEmail = async (
  email: string,
  subject: string,
  html: string,
  text?: string
) => {
  try {
    // Production: Google Apps Script
    if (emailProvider === "apps-script") {
      return await sendUsingAppsScript(email, subject, html, text);
    }

    // Local development: Nodemailer
    if (emailProvider === "nodemailer") {
      if (!transporter || !emailUser) {
        throw new Error("EMAIL_USER or EMAIL_PASS is missing");
      }

      const info = await transporter.sendMail({
        from: `Sprintly <${emailUser}>`,
        to: email,
        subject,
        html,
        ...(text ? { text } : {}),
      });

      console.log("Email sent successfully:", info.messageId);

      return info;
    }

    throw new Error(`Unsupported email provider: ${emailProvider}`);
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
};

// Registration, resend OTP and other OTP emails
export const sendOTPEmail = async (
  email: string,
  otp: string
) => {
  const subject = "Sprintly Email Verification";

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Verify Your Email - Sprintly</h2>
      <p>Your verification OTP is:</p>
      <h1 style="letter-spacing: 5px;">${otp}</h1>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    </div>
  `;

  const text = `
    Your Sprintly verification OTP is ${otp}.
    This OTP will expire in 10 minutes.
  `;

  return sendEmail(email, subject, html, text);
};

// Organization invitation email
export const sendOrganizationInvitationEmail = async (
  email: string,
  organizationName: string,
  role: string,
  inviteToken: string
) => {
  const clientUrl =
    process.env.CLIENT_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://sprintly-gamma.vercel.app"
      : "http://localhost:5173");

  const invitationBaseUrl =
    process.env.INVITATION_ACCEPT_URL ||
    `${clientUrl.replace(/\/+$/, "")}/accept-invitation`;

  // Add invitation token to the frontend URL
  const invitationUrl = new URL(invitationBaseUrl);

  invitationUrl.searchParams.set("token", inviteToken);

  const invitationLink = invitationUrl.toString();

  const subject = `Invitation to join ${organizationName} on Sprintly`;

  const html = `
    <div style="
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 24px;
      color: #333;
    ">
      <h2>You're invited to Sprintly!</h2>

      <p>
        You have been invited to join
        <strong>${organizationName}</strong>
        as a <strong>${role}</strong>.
      </p>

      <p>
        Click the button below to accept your invitation.
      </p>

      <a
        href="${invitationLink}"
        style="
          display: inline-block;
          padding: 12px 24px;
          background-color: #2563eb;
          color: #ffffff;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
        "
      >
        Accept Invitation
      </a>

      <p style="margin-top: 24px;">
        This invitation expires in 7 days.
      </p>

      <p>
        If you were not expecting this invitation, you can ignore this email.
      </p>
    </div>
  `;

  const text = `
    You have been invited to join ${organizationName} on Sprintly
    as a ${role}.

    Accept your invitation here:
    ${invitationLink}

    This invitation expires in 7 days.
  `;

  return sendEmail(email, subject, html, text);
};

// Check email service configuration
export const verifyEmailConnection = async () => {
  try {
    if (emailProvider === "apps-script") {
      const configured = Boolean(
        process.env.GOOGLE_SCRIPT_URL &&
        process.env.GOOGLE_SCRIPT_SECRET
      );

      if (!configured) {
        console.error("Google Apps Script configuration is missing");
      }

      return configured;
    }

    if (emailProvider === "nodemailer") {
      if (!transporter) {
        console.error("Gmail email configuration is missing");
        return false;
      }

      await transporter.verify();

      console.log("Gmail SMTP connection successful!");

      return true;
    }

    console.error(`Unsupported email provider: ${emailProvider}`);

    return false;
  } catch (error) {
    console.error("Email service check failed:", error);

    return false;
  }
};

// Configuration test
export const testEmail = async () => {
  const configured = await verifyEmailConnection();

  if (configured) {
    console.log(`Email service is configured: ${emailProvider}`);
  }
};
