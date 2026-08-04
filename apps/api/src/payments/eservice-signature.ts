import { createHash, timingSafeEqual } from 'node:crypto';

/** Compute the signature eService uses for notification content. */
export function computeEserviceSignature(content: Buffer | string, appKey: string): string {
  const bytes = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
  return createHash('sha512')
    .update(Buffer.concat([bytes, Buffer.from(appKey, 'utf8')]))
    .digest('hex');
}

function signaturesEqual(received: string | undefined, expected: string): boolean {
  if (!received || !/^[a-fA-F0-9]{128}$/.test(received)) return false;
  try {
    const actualBytes = Buffer.from(received, 'hex');
    const expectedBytes = Buffer.from(expected, 'hex');
    return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
  } catch {
    return false;
  }
}

/** Validate a POST notification signed over its exact body bytes plus app_key. */
export function verifyEservicePostSignature(
  rawBody: Buffer,
  signature: string | undefined,
  appKey: string,
): boolean {
  if (!appKey) return false;
  return signaturesEqual(signature, computeEserviceSignature(rawBody, appKey));
}

export interface SignedParameterVerification {
  valid: boolean;
  signature?: string;
  /** Exact encoded parameter substring covered by the signature. */
  signedContent?: string;
}

/**
 * Validate the GET/form return format used by eService APM/HPP redirects.
 *
 * eService inserts `X-GP-Signature=<hex>` and signs every exact encoded byte
 * after the following `&`. A merchant query prefix (our `orderId`) may precede
 * the signature, so locate the signature rather than assuming it is the first
 * parameter in the complete callback URL. Never parse/re-encode the signed
 * substring: ordering, empty values, and percent-encoding are significant.
 */
export function verifyEserviceSignedParameters(
  rawUrlOrFormBody: string,
  appKey: string,
): SignedParameterVerification {
  if (!appKey) return { valid: false };
  const question = rawUrlOrFormBody.indexOf('?');
  const parameters = question >= 0 ? rawUrlOrFormBody.slice(question + 1) : rawUrlOrFormBody;
  const match = /(?:^|&)X-GP-Signature=([^&]+)&([\s\S]+)$/i.exec(parameters);
  if (!match) return { valid: false };

  let signature: string;
  try {
    signature = decodeURIComponent(match[1]);
  } catch {
    return { valid: false };
  }
  const signedContent = match[2];
  const expected = computeEserviceSignature(signedContent, appKey);
  return {
    valid: signaturesEqual(signature, expected),
    signature,
    signedContent,
  };
}
