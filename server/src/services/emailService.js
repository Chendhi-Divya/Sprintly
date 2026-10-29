
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOTPEmail = async (
  email,
  otp
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

export const sendTaskAssignmentEmail = async ({
  email,
  assigneeName,
  taskTitle,
  taskKey,
  priority,
  dueDate,
  assignedBy,
}) => {
  const formattedDueDate = dueDate
    ? new Date(dueDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Not specified";

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Sprintly: You have been assigned ${taskKey}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>You have a new task in Sprintly</h2>

        <p>Hi ${escapeHtml(assigneeName)},</p>

        <p>You have been assigned a task${assignedBy ? ` by ${escapeHtml(assignedBy)}` : ""}.</p>

        <div style="padding: 16px; background: #f4f4f5; border-radius: 8px;">
          <p><strong>Task:</strong> ${escapeHtml(taskTitle)}</p>
          <p><strong>Task ID:</strong> ${escapeHtml(taskKey)}</p>
          <p><strong>Priority:</strong> ${escapeHtml(priority || "Medium")}</p>
          <p><strong>Due date:</strong> ${escapeHtml(formattedDueDate)}</p>
        </div>

        <p>Please sign in to Sprintly to view your task and update its progress.</p>

        <p>Regards,<br />Sprintly Team</p>
      </div>
    `,
  });
};

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}
