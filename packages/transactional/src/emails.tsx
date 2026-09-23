// Pins the JSX runtime. Tools such as tsx may compile this file with the
// tsconfig of the importing app, which can have other JSX settings.
/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { render } from "react-email";

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
