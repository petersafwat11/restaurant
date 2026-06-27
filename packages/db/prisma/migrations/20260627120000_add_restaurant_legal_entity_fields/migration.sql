-- Legal-entity & customer-support fields on Restaurant (payment-provider
-- readiness, plan §B1/§B2). All additive + nullable; the owner populates the
-- legal identity in admin against an official current KRS extract before Stripe
-- go-live. `name`/`address` keep their trade-name / trading-address meaning.

ALTER TABLE "Restaurant"
  ADD COLUMN "legalName"                      TEXT,
  ADD COLUMN "nip"                            TEXT,
  ADD COLUMN "regon"                          TEXT,
  ADD COLUMN "krs"                            TEXT,
  ADD COLUMN "registryCourt"                  TEXT,
  ADD COLUMN "shareCapital"                   DECIMAL(14,2),
  ADD COLUMN "shareCapitalCurrency"           TEXT,
  ADD COLUMN "registeredAddress"              JSONB,
  ADD COLUMN "registeredAddressSameAsTrading" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "supportEmail"                   TEXT,
  ADD COLUMN "supportPhone"                   TEXT,
  ADD COLUMN "complaintsEmail"                TEXT,
  ADD COLUMN "privacyEmail"                   TEXT,
  ADD COLUMN "statementDescriptor"            TEXT;

-- Provisional backfill (plan §B2). Safe + idempotent on the single-tenant row;
-- a harmless no-op against the empty table in fresh/CI environments (seed runs
-- after and is the source of truth there). Only `nip` (the one known value) and
-- the support/complaints/privacy contacts (provisionally = existing phone/email)
-- are set. legalName / krs / regon / registryCourt / shareCapital stay NULL until
-- the owner verifies them against an official eKRS extract.
UPDATE "Restaurant" SET
  "nip"             = COALESCE("nip", '6572959741'),
  "supportEmail"    = COALESCE("supportEmail", "email"),
  "supportPhone"    = COALESCE("supportPhone", "phone"),
  "complaintsEmail" = COALESCE("complaintsEmail", "email"),
  "privacyEmail"    = COALESCE("privacyEmail", "email");
