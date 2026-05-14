import { Body, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components';
import { render } from '@react-email/render';
import * as React from 'react';

interface Props {
  resetUrl: string;
  firstName?: string | null;
}

export function PasswordResetTemplate({ resetUrl, firstName }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Reset your password</Preview>
      <Body style={{ fontFamily: 'Inter, sans-serif', padding: 24 }}>
        <Container>
          <Heading>Reset your password{firstName ? `, ${firstName}` : ''}</Heading>
          <Text>Click the link below to choose a new password. This link expires in 1 hour.</Text>
          <Link href={resetUrl}>{resetUrl}</Link>
          <Text style={{ color: '#52606d', fontSize: 12 }}>
            If you didn't request this, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderPasswordReset(props: Props) {
  const html = await render(<PasswordResetTemplate {...props} />);
  const text = await render(<PasswordResetTemplate {...props} />, {
    plainText: true,
  });
  return { html, text };
}
