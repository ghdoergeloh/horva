import { render } from "@react-email/components";

import { VerificationEmail } from "./templates/verification-email.js";
import { sendEmail } from "./transport.js";

export async function sendVerificationEmail(to: string, url: string) {
  const html = await render(<VerificationEmail url={url} />);
  await sendEmail({
    to,
    subject: "Verify your email address",
    html,
  });
}
