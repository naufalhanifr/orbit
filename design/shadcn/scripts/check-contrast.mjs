// WCAG contrast check for the oklch tokens in app/globals.css.
// Run: node scripts/check-contrast.mjs  (exit 1 if any text pair fails AA)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";

// oklch(L C h) -> relative luminance (WCAG), via OKLab -> linear sRGB
export function luminance([L, C, hDeg]) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (x) => Math.min(1, Math.max(0, x));
  const r = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bl = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Self-check: black vs white is 21:1 by definition.
assert.ok(Math.abs(contrast([1, 0, 0], [0, 0, 0]) - 21) < 0.01);

function parseTokens(css) {
  // Take the body of each theme block; ".dark" also matches the @custom-variant line, so anchor on "{".
  const block = (selector) => css.slice(css.indexOf(`${selector} {`) + selector.length + 2).split("}")[0];
  const parse = (chunk) =>
    Object.fromEntries(
      [...chunk.matchAll(/--([\w-]+):\s*oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/g)].map(
        (m) => [m[1], [+m[2], +m[3], +m[4]]],
      ),
    );
  return { light: parse(block(":root")), dark: parse(block(".dark")) };
}

// Text on background pairs used in the UI. [text, background, minimum ratio]
const PAIRS = [
  ["foreground", "background", 4.5],
  ["primary-foreground", "primary", 4.5],
  ["muted-foreground", "background", 4.5],
  ["muted-foreground", "muted", 4.5],
  ["destructive", "background", 4.5],
];

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "..", "app", "globals.css"), "utf8");
const tokens = parseTokens(css);

let failed = 0;
for (const mode of ["light", "dark"]) {
  console.log(`\n${mode}`);
  for (const [text, bg, min] of PAIRS) {
    const t = tokens[mode][text];
    const b = tokens[mode][bg];
    if (!t || !b) {
      console.log(`  ? ${text} on ${bg}: token missing`);
      failed++;
      continue;
    }
    const ratio = contrast(t, b);
    const ok = ratio >= min;
    if (!ok) failed++;
    console.log(`  ${ok ? "ok  " : "FAIL"} ${ratio.toFixed(2)}:1  ${text} on ${bg} (min ${min})`);
  }
}
process.exitCode = failed ? 1 : 0;
