import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components';
import { render } from '@react-email/render';
import * as React from 'react';

export interface ReviewRequestEmailProps {
  locale: 'pl' | 'en';
  orderNumber: string;
  firstName?: string | null;
  reviewUrl: string;
  /** Signed-in customers: link to notification settings. Null for guests. */
  preferencesUrl: string | null;
}

/**
 * Post-order Google review request.
 *
 * Google review policy: every customer gets the same neutral ask — no
 * incentive, no satisfaction filter ("review gating"), no pre-written text.
 */
const COPY = {
  pl: {
    subject: (n: string) => `Dziękujemy za zamówienie ${n} — Szef Donald`,
    preview: 'Dziękujemy za zamówienie w Szef Donald',
    greeting: (name?: string | null) => (name ? `Cześć ${name},` : 'Cześć,'),
    thanks: (n: string) => `dziękujemy za zamówienie ${n} w Szef Donald.`,
    ask: 'Jeśli masz chwilę, podziel się swoją opinią w Google. Każda opinia — także krytyczna — pomaga nam robić lepszy kebab i pomaga innym znaleźć nasz lokal.',
    button: 'Oceń nas w Google',
    footerGuest: (n: string) =>
      `To jednorazowa wiadomość dotycząca zamówienia ${n}. Nie wyślemy kolejnej prośby o opinię do tego zamówienia.`,
    footerUser: 'Nie chcesz takich wiadomości? Zmień ustawienia powiadomień e-mail:',
    preferences: 'ustawienia powiadomień',
  },
  en: {
    subject: (n: string) => `Thanks for your order ${n} — Szef Donald`,
    preview: 'Thanks for ordering from Szef Donald',
    greeting: (name?: string | null) => (name ? `Hi ${name},` : 'Hi,'),
    thanks: (n: string) => `thank you for your order ${n} at Szef Donald.`,
    ask: 'If you have a moment, please share your opinion on Google. Every review — critical ones too — helps us make better kebab and helps others find us.',
    button: 'Review us on Google',
    footerGuest: (n: string) =>
      `This is a one-off message about order ${n}. We won't send another review request for this order.`,
    footerUser: "Don't want these emails? Change your email notification settings:",
    preferences: 'notification settings',
  },
} as const;

function ReviewRequestTemplate(p: ReviewRequestEmailProps) {
  const c = COPY[p.locale];
  return (
    <Html lang={p.locale}>
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={{ fontFamily: 'Inter, Arial, sans-serif', padding: 24, color: '#1f2933' }}>
        <Container>
          <Heading as="h2">{c.greeting(p.firstName)}</Heading>
          <Text>{c.thanks(p.orderNumber)}</Text>
          <Text>{c.ask}</Text>
          <Button
            href={p.reviewUrl}
            style={{
              background: '#111',
              color: '#fff',
              borderRadius: 8,
              padding: '12px 20px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            {c.button}
          </Button>
          <Text style={{ color: '#52606d', fontSize: 12, marginTop: 32 }}>
            {p.preferencesUrl ? (
              <>
                {c.footerUser} <Link href={p.preferencesUrl}>{c.preferences}</Link>
              </>
            ) : (
              c.footerGuest(p.orderNumber)
            )}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderReviewRequest(props: ReviewRequestEmailProps) {
  const html = await render(<ReviewRequestTemplate {...props} />);
  const text = await render(<ReviewRequestTemplate {...props} />, { plainText: true });
  return { subject: COPY[props.locale].subject(props.orderNumber), html, text };
}
