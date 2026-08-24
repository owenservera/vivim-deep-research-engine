#!/usr/bin/env node
/** Generate a byte-level SHA-256 manifest for every file in archive/original-ideation. */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(process.cwd(), "archive", "original-ideation");
const out = join(process.cwd(), "archive", "sha256sums.txt");
const files: string[] = [];
function walk(dir: string) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path); else if (entry.isFile()) files.push(path);
  }
}
walk(root);
files.sort();
const lines = files.map(path => {
  const hash = createHash("sha256").update(readFileSync(path)).digest("hex");
  return `${hash}  ${relative(root, path).replaceAll("\\", "/")}`;
});
writeFileSync(out, lines.join("\n") + (lines.length ? "\n" : ""));
console.log(`Wrote ${lines.length} SHA-256 records to ${relative(process.cwd(), out)}`);
