// Mock for the `server-only` package so tests can import DAL modules.
// This file is intentionally empty – `server-only` is a build-time guard
// that simply throws when imported in a client bundle.
export { };
