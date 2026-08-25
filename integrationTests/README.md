# Integration tests

These suites boot **real Harper** (via [`@harperfast/integration-testing`](https://github.com/HarperFast/integration-testing)) with the app's backend loaded as a component, then exercise it over the REST + Operations APIs. No mocks, no remote infrastructure — Harper is spawned as a child process into a throwaway install directory and torn down afterward.

What's covered:

- **`product-catalog.test.ts`** — boot + table registration (`describe_all`), data seeding, catalog REST reads (list, get-by-slug, indexed `category` filter, 404).
- **`orders.test.ts`** — the `Order` resource: server-side total/shipping/VAT/grand-total computation from **catalog** prices (never client input), the full validation matrix (unknown slug, empty cart, bad quantity, malformed email, missing customer field, e-Money number required), and order persistence.

`helpers/app-fixture.ts` builds a **backend-only** component (config + `schemas/` + `resources/` + `data/`) in a temp dir — it deliberately omits `@harperfast/vite` and `@harperfast/schema-codegen` (frontend build / type codegen), which aren't part of the API surface under test.

## Running

```sh
npm run test:integration
```

This uses the package's runner (`harper-integration-test-run`), which executes each file in its own process and runs them concurrently — each Harper instance binds to its own loopback address.

### Loopback addresses (one-time, macOS/Windows)

Concurrent instances need multiple loopback addresses (`127.0.0.2`, `127.0.0.3`, …). **Linux** enables `127.0.0.0/8` by default. **macOS/Windows** do not — configure them once:

```sh
sudo npx harper-integration-test-setup-loopback
```

(See the package README for persisting these across reboots.)

### Running without the loopback pool (no sudo)

For a quick local run without configuring the pool, use a single-address pool on `127.0.0.1` and run sequentially:

```sh
HARPER_INTEGRATION_TEST_LOOPBACK_POOL_START=1 \
HARPER_INTEGRATION_TEST_LOOPBACK_POOL_COUNT=1 \
node --test --test-concurrency=1 "integrationTests/**/*.test.ts"
```

Requires the `harper` dev dependency (already in `package.json`) so the harness can resolve the Harper CLI; `helpers/app-fixture.ts` locates its bin automatically.

## A note on auth

The harness starts Harper with `AUTHENTICATION_AUTHORIZELOCAL=true`, so every request from the (loopback) test process is authorized as **super_user**. These tests therefore focus on data, schema, and resource business logic. The app's public-read / authenticated-write access rules (`Product.allowRead`, `Order.allowCreate`) are enforced by Harper's auth layer in a real remote deployment and can't be distinguished from super_user access in this harness.
