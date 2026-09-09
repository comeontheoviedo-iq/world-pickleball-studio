#!/usr/bin/env node
/**
 * Photoreal studio pack lives in public/brand/backdrops/*.jpg (committed).
 * Checks the 18 ids stay on disk. Does not write geometric SVGs.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../public/brand/backdrops");
const ids = [
  "loft",
  "nightglass",
  "kitchen",
  "editorial",
  "neon",
  "afterhours",
  "ledwall",
  "dawn",
  "frost",
  "pulse",
  "skyline",
  "atrium",
  "carbon",
  "grid",
  "midnight",
  "rally",
  "mezzanine",
  "amber",
];

let missing = 0;
for (const id of ids) {
  const file = join(dir, `${id}.jpg`);
  if (!existsSync(file)) {
    console.error("missing", file);
    missing += 1;
  } else {
    console.log("ok", id);
  }
}
if (missing) process.exit(1);
console.log("backdrops:", ids.length, "photoreal JPGs");
