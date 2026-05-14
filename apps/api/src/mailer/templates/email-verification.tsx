import { Body, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components';
import { render } from '@react-email/render';
import * as React from 'react';

interface Props {
  verifyUrl: string;
  firstName?: string | null;
}

export function EmailVerificationTemplate({ verifyUrl, firstName }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Verify your email</Preview>
      <Body style={{ fontFamily: 'Inter, sans-serif', padding: 24 }}>
        <Container>
          <Heading>Welcome{firstName ? `, ${firstName}` : ''}!</Heading>
          <Text>Confirm your email address to finish creating your account.</Text>
          <Link href={verifyUrl}>{verifyUrl}</Link>
          <Text style={{ color: '#52606d', fontSize: 12 }}>
            This link expires in 24 hours. If you didn't sign up, you can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderEmailVerification(props: Props) {
  const html = await render(<EmailVerificationTemplate {...props} />);
  const text = await render(<EmailVerificationTemplate {...props} />, {
    plainText: true,
  });
  return { html, text };
}
