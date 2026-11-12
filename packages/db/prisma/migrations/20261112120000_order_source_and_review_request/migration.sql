-- Additive, nullable columns only.

-- Order-source attribution (SEO / AI-visibility tracking).
ALTER TABLE "Order" ADD COLUMN "utmSource" TEXT;
ALTER TABLE "Order" ADD COLUMN "utmMedium" TEXT;
ALTER TABLE "Order" ADD COLUMN "utmCampaign" TEXT;
ALTER TABLE "Order" ADD COLUMN "referrerHost" TEXT;
ALTER TABLE "Order" ADD COLUMN "landingPath" TEXT;
ALTER TABLE "Order" ADD COLUMN "heardAboutUs" TEXT;

-- Post-order Google review request (sent at most once per order).
ALTER TABLE "Order" ADD COLUMN "reviewRequestSentAt" TIMESTAMP(3);
ALTER TABLE "Restaurant" ADD COLUMN "googleReviewUrl" TEXT;

-- Backfill the owner-verified Google review link for the existing restaurant
-- so the feature works right after deploy; editable afterwards in admin.
UPDATE "Restaurant"
SET "googleReviewUrl" = 'https://g.page/r/CVAovYDd9tytEBM/review'
WHERE "googleReviewUrl" IS NULL AND "slug" = 'szef-donald';
