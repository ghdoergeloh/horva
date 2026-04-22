/** @jsxImportSource react */
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface ResetPasswordEmailProps {
  url: string;
}

function ResetPasswordEmail({ url }: ResetPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your Horva password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Reset your password</Heading>
          <Text style={text}>
            Click the button below to choose a new password. This link expires
            in 1 hour.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={url}>
              Reset Password
            </Button>
          </Section>
          <Text style={textMuted}>
            If you didn&apos;t request a password reset, you can safely ignore
            this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  marginBottom: "64px",
  borderRadius: "8px",
  maxWidth: "480px",
};

const heading = {
  fontSize: "24px",
  letterSpacing: "-0.5px",
  lineHeight: "1.3",
  fontWeight: "600",
  color: "#1a1a1a",
  padding: "0 0 16px",
  margin: "0",
};

const text = {
  margin: "0 0 24px",
  fontSize: "16px",
  lineHeight: "24px",
  color: "#525f7f",
};

const textMuted = {
  margin: "0",
  fontSize: "14px",
  lineHeight: "20px",
  color: "#8898aa",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const button = {
  backgroundColor: "#5469d4",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
};

ResetPasswordEmail.PreviewProps = {
  url: "https://example.com/reset-password?token=abc123",
} satisfies ResetPasswordEmailProps;

export { ResetPasswordEmail };
export default ResetPasswordEmail;
