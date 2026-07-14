/**
 * Minimal ambient declarations for the few Node.js built-ins this SDK uses.
 *
 * The SDK ships with ZERO runtime dependencies and `typescript` as its only
 * devDependency, so it cannot rely on `@types/node`. These declarations cover
 * exactly the surface we call (Node >= 18 guarantees all of it at runtime).
 * They are compile-time only and are not emitted into the published `dist/`
 * declaration files, because no public type references them.
 */

declare module "node:crypto" {
  interface Hmac {
    update(data: string | Uint8Array): Hmac;
    digest(encoding: "hex"): string;
  }
  export function createHmac(algorithm: string, key: string | Uint8Array): Hmac;
  export function timingSafeEqual(a: ArrayBufferView, b: ArrayBufferView): boolean;
}

declare module "node:fs" {
  export function readFileSync(path: string): Uint8Array;
}

declare module "node:path" {
  export function basename(path: string): string;
}

// `process` global (only `env` is used, to read OMNISOCIALS_API_KEY).
declare var process: {
  env: Record<string, string | undefined>;
};
