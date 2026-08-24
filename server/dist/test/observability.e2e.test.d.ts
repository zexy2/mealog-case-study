/**
 * Drives the real application over HTTP to check the observability wiring.
 *
 * The unit tests in `obs.test.ts` prove the primitives work; these prove they
 * are actually connected — that the interceptor is registered globally, that
 * the id reaches the client, and that `/metrics` reports traffic that really
 * happened. A green unit suite with an unregistered interceptor is exactly the
 * failure this file exists to catch.
 */
import 'reflect-metadata';
