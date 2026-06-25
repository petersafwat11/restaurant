-- Replace the polygon-based `deliveryZones` JSON with a single delivery radius
-- (km) centred on the restaurant's geoPoint. The map draws this circle and the
-- order flow checks the delivery pin against it (haversine). Existing zone
-- polygons are dropped; rows default to a 7 km radius.

ALTER TABLE "Restaurant"
  DROP COLUMN "deliveryZones",
  ADD COLUMN "deliveryRadiusKm" DOUBLE PRECISION NOT NULL DEFAULT 7;
