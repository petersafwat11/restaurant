-- Replace Stripe with eService (Global Payments GP API) as the online processor.
-- Dev only, no production payments exist. Legacy method kinds are remapped to CARD
-- defensively; in practice the payment/order tables are reseeded after this runs.

-- 1. eService HPP identifiers (additive, nullable):
--    providerRef now holds our unique transaction `reference` (stable join key),
--    providerLinkId the HPP link id (LNK_…), providerTxnId the transaction id (TRN_…).
ALTER TABLE "Payment" ADD COLUMN "providerLinkId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "providerTxnId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "providerRedirectUrl" TEXT;

-- 2. Collapse PaymentMethodKind to { CARD, BLIK, COD }. Postgres cannot DROP enum
--    values in place, so swap the column to TEXT, remap removed kinds, then recreate
--    the type. STRIPE_CARD becomes the provider-neutral CARD.
ALTER TABLE "Payment" ALTER COLUMN "method" TYPE TEXT USING ("method"::TEXT);

UPDATE "Payment"
SET "method" = 'CARD'
WHERE "method" IN ('STRIPE_CARD', 'APPLE_PAY', 'GOOGLE_PAY', 'PAYMOB', 'WALLET', 'P24');

DROP TYPE "PaymentMethodKind";
CREATE TYPE "PaymentMethodKind" AS ENUM ('CARD', 'BLIK', 'COD');

ALTER TABLE "Payment"
ALTER COLUMN "method" TYPE "PaymentMethodKind" USING ("method"::"PaymentMethodKind");
