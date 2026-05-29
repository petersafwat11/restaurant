'use client';

import { useSendContactMessage } from '@/features/contact/hooks';
import { mockLocation } from '@/lib/mock/szef-donald';
import { zodResolver } from '@hookform/resolvers/zod';
import { type CreateContactMessageDto, CreateContactMessageSchema } from '@repo/types';
import { Container, FormField, SectionHeader } from '@repo/ui';
import { Check, Mail, MapPin, Navigation, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

export default function ContactApp() {
  const t = useTranslations('web.marketing.contact');
  const tVal = useTranslations('validation');
  const send = useSendContactMessage();
  const [sent, setSent] = React.useState(false);

  const errorMap: z.ZodErrorMap = React.useCallback(
    (issue, ctx) => {
      if (issue.code === z.ZodIssueCode.too_small && issue.minimum === 1) {
        return { message: tVal('required') };
      }
      if (issue.code === z.ZodIssueCode.invalid_string && issue.validation === 'email') {
        return { message: tVal('invalidEmail') };
      }
      if (issue.code === z.ZodIssueCode.too_big && typeof issue.maximum === 'number') {
        return { message: tVal('tooLong', { max: issue.maximum }) };
      }
      return { message: ctx.defaultError };
    },
    [tVal],
  );

  const form = useForm<CreateContactMessageDto>({
    resolver: zodResolver(CreateContactMessageSchema, { errorMap }),
    defaultValues: { name: '', email: '', subject: '', message: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const res = await send.mutateAsync(values).catch(() => null);
    if (res) {
      setSent(true);
      form.reset();
    }
  });

  const phone = t('phone');
  const tel = phone.replace(/\s/g, '');

  return (
    <>
      <section className="bg-bg pt-section-y-mobile sm:pt-section-y">
        <Container>
          <SectionHeader
            eyebrow={t('eyebrow')}
            title={t('title')}
            description={t('description')}
            align="center"
          />
        </Container>
      </section>

      <section className="bg-surface py-section-y-mobile sm:py-section-y">
        <Container>
          <div className="mx-auto grid max-w-[960px] grid-cols-1 gap-12 lg:grid-cols-[2fr_3fr]">
            <aside className="flex flex-col gap-4 rounded-card border border-border/[var(--border-strong-alpha)] bg-surface-2 p-6">
              <h3 className="font-display text-h3 font-semibold text-fg">{t('findUs')}</h3>
              <ul className="flex flex-col gap-3">
                <li className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                    <MapPin size={18} strokeWidth={1.75} />
                  </span>
                  <div className="flex flex-col leading-snug">
                    <span className="text-caption uppercase tracking-wide text-fg-subtle">
                      {t('addressLabel')}
                    </span>
                    <span className="text-body font-medium text-fg">{t('address1')}</span>
                    <span className="text-small text-fg-muted">{t('address2')}</span>
                  </div>
                </li>
                <li>
                  <a href={`tel:${tel}`} className="group flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                      <Phone size={18} strokeWidth={1.75} />
                    </span>
                    <div className="flex flex-col leading-snug">
                      <span className="text-caption uppercase tracking-wide text-fg-subtle">
                        {t('phoneLabel')}
                      </span>
                      <span className="text-body font-medium text-fg group-hover:text-accent">
                        {phone}
                      </span>
                    </div>
                  </a>
                </li>
                <li>
                  <a href={`mailto:${t('email')}`} className="group flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                      <Mail size={18} strokeWidth={1.75} />
                    </span>
                    <div className="flex flex-col leading-snug">
                      <span className="text-caption uppercase tracking-wide text-fg-subtle">
                        {t('emailLabel')}
                      </span>
                      <span className="text-body font-medium text-fg group-hover:text-accent break-all">
                        {t('email')}
                      </span>
                    </div>
                  </a>
                </li>
                <li>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${mockLocation.coords.lat},${mockLocation.coords.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start gap-3"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                      <Navigation size={18} strokeWidth={1.75} />
                    </span>
                    <div className="flex flex-col leading-snug">
                      <span className="text-caption uppercase tracking-wide text-fg-subtle">
                        {t('directionsLabel')}
                      </span>
                      <span className="text-body font-medium text-fg group-hover:text-accent">
                        {t('openInGoogleMaps')}
                      </span>
                    </div>
                  </a>
                </li>
              </ul>
            </aside>

            {sent ? (
              <div className="flex flex-col items-center gap-3 rounded-card border border-positive/20 bg-positive/10 p-8 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-positive text-text-on-accent">
                  <Check size={24} strokeWidth={2} />
                </span>
                <h3 className="font-display text-h3 text-fg">{t('success.title')}</h3>
                <p className="text-small text-fg-muted">{t('success.description')}</p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="mt-2 text-small text-accent hover:underline"
                >
                  {t('success.sendAnother')}
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField
                    id="ct-name"
                    label={t('form.nameLabel')}
                    required
                    size="lg"
                    error={form.formState.errors.name?.message}
                  >
                    <input
                      {...form.register('name')}
                      autoComplete="name"
                      placeholder={t('form.namePlaceholder')}
                      className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                    />
                  </FormField>
                  <FormField
                    id="ct-email"
                    label={t('form.emailLabel')}
                    required
                    size="lg"
                    error={form.formState.errors.email?.message}
                  >
                    <input
                      {...form.register('email')}
                      type="email"
                      autoComplete="email"
                      placeholder={t('form.emailPlaceholder')}
                      className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                    />
                  </FormField>
                </div>
                <FormField
                  id="ct-subject"
                  label={t('form.subjectLabel')}
                  size="lg"
                  error={form.formState.errors.subject?.message}
                >
                  <input
                    {...form.register('subject')}
                    placeholder={t('form.subjectPlaceholder')}
                    className="h-12 w-full rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                </FormField>
                <FormField
                  id="ct-message"
                  label={t('form.messageLabel')}
                  required
                  size="lg"
                  error={form.formState.errors.message?.message}
                >
                  <textarea
                    {...form.register('message')}
                    rows={6}
                    maxLength={5000}
                    placeholder={t('form.messagePlaceholder')}
                    className="w-full resize-none rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 p-4 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                </FormField>
                <button
                  type="submit"
                  disabled={send.isPending}
                  className="inline-flex h-12 items-center justify-center self-start rounded-button bg-accent px-6 text-[15px] font-medium text-text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
                >
                  {send.isPending ? t('form.submitting') : t('form.submit')}
                </button>
              </form>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
