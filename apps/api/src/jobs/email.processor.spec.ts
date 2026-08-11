import { JOB_EMAIL_STAFF_ACCOUNT_CREATED } from '@repo/jobs';
import type { Job } from 'bullmq';
import { describe, expect, it, vi } from 'vitest';
import { EmailProcessor } from './email.processor';

describe('EmailProcessor staff account email', () => {
  it('sends the login URL and never includes a password', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const processor = new EmailProcessor({ send } as never, {} as never);

    await processor.process({
      name: JOB_EMAIL_STAFF_ACCOUNT_CREATED,
      data: {
        email: 'manager@example.com',
        firstName: 'Maya',
        roleKey: 'manager',
        loginUrl: 'https://admin.example.com',
      },
    } as Job);

    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'manager@example.com',
        subject: expect.stringContaining('staff account'),
        text: expect.stringContaining('https://admin.example.com'),
      }),
    );
    const message = JSON.stringify(send.mock.calls[0]?.[0]);
    expect(message).not.toMatch(/temporary123|password:/i);
  });
});
