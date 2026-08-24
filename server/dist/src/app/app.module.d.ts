/**
 * Composition root for the edge.
 *
 * Under the port epic's proposed D12, NestJS lives at the edge only:
 * controllers and providers. Pipeline modules are wired in as plain functions
 * and pure classes in later waves, so that the eval harness can import the same
 * modules without booting Nest.
 */
export declare class AppModule {
}
