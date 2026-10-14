import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const vercelConfig = JSON.parse(
  readFileSync(new URL("../vercel.json", import.meta.url), "utf8")
) as {
  headers: Array<{
    headers: Array<{ key: string; value: string }>;
  }>;
};

test("production theme bootstrap is external and compatible with script-src self", () => {
  assert.match(indexHtml, /<script src="\/theme-init\.js"><\/script>/);
  assert.doesNotMatch(indexHtml, /<script>(.|\n)*?<\/script>/);
});

test("production CSP permits only the required Google authentication and font resources", () => {
  const policies = vercelConfig.headers
    .flatMap((entry) => entry.headers)
    .filter((header) => header.key.toLowerCase() === "content-security-policy");
  assert.equal(policies.length, 1);
  const policy = policies[0]?.value ?? "";

  assert.match(policy, /script-src 'self' https:\/\/accounts\.google\.com\/gsi\/client/);
  assert.match(policy, /style-src [^;]*https:\/\/fonts\.googleapis\.com/);
  assert.match(policy, /style-src [^;]*https:\/\/accounts\.google\.com\/gsi\/style/);
  assert.match(policy, /font-src [^;]*https:\/\/fonts\.gstatic\.com/);
  assert.doesNotMatch(policy, /unsafe-eval/);
});
