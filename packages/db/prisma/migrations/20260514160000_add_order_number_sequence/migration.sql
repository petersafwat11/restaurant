-- Sprint 3 — atomic, monotonically-increasing order numbers.
-- Used by the OrdersService to format `R-{YYYY}-{NNNNNN}` order numbers.
-- A Postgres sequence is the simplest correct primitive: atomic and lock-free.

CREATE SEQUENCE IF NOT EXISTS order_number_seq
  START WITH 1
  INCREMENT BY 1
  NO CYCLE;
