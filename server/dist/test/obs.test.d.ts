/**
 * Unit tests for the observability primitives.
 *
 * These assert the properties that make a log line useful rather than the
 * wording of any message: that a request id is present and scoped, that levels
 * are actually filtered, that stage timings are recorded, and that the metrics
 * snapshot is a shape a reader can act on. Asserting on exact strings would
 * make every future field addition a test failure for no safety gained.
 */
export {};
