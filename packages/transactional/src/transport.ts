import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env["SMTP_HOST"] ?? "localhost",
  port: Number(process.env["SMTP_PORT"]) || 1025,
  secure: process.env["SMTP_SECURE"] === "true",
  ...(process.env["SMTP_USER"] && {
    auth: {
      user: process.env["SMTP_USER"],
      pass: process.env["SMTP_PASS"],
    },
  }),
});

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  await transporter.sendMail({
    from: process.env["SMTP_FROM"] ?? "noreply@localhost",
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
