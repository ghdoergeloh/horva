import { render } from "@react-email/components";

import { ResetPasswordEmail } from "./templates/reset-password-email";
import { VerificationEmail } from "./templates/verification-email";
import { sendEmail } from "./transport";

export async function sendVerificationEmail(to: string, url: string) {
  const html = await render(<VerificationEmail url={url} />);
  await sendEmail({
    to,
    subject: "Verify your email address",
    html,
  });
}

export async function sendPasswordResetEmail(to: string, url: string) {
  const html = await render(<ResetPasswordEmail url={url} />);
  await sendEmail({
    to,
    subject: "Reset your Horva password",
    html,
  });
}
