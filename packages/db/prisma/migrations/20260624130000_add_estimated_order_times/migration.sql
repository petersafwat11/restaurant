-- Indicative order-ready times (minutes) on Restaurant. Surfaced to customers
-- (e.g. the Terms "Delivery & pickup" section) and editable in the admin
-- restaurant profile. Nullable — existing rows default to "not configured".

ALTER TABLE "Restaurant"
  ADD COLUMN "estimatedDeliveryMinutes" INTEGER,
  ADD COLUMN "estimatedPickupMinutes"   INTEGER;
