/** Verify packed generated declarations from a clean, independently resolved consumer. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const work = join(root, ".test-work/consumers", randomUUID());
mkdirSync(work, { recursive: true });
const npm = [
  process.env.npm_execpath,
  join(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"),
  join(dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js"),
]
  .filter(Boolean)
  .find(existsSync);
assert.ok(npm, "Run through npm run test:package or install npm beside Node");
function command(args, cwd = join(root, "packages/excalidraw")) {
  const result = spawnSync(process.execPath, [npm, ...args], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    timeout: 180000,
  });
  assert.equal(
    result.status,
    0,
    result.error?.message || result.stderr || result.stdout,
  );
  return result.stdout;
}
const packed = JSON.parse(
  command(["pack", "--ignore-scripts", "--json", "--pack-destination", work]),
);
const entries = Array.isArray(packed) ? packed : Object.values(packed);
assert.equal(entries.length, 1, "Exactly one package must be packed");
const pack = entries[0];
for (const path of [
  "types/excalidraw/index.d.ts",
  "types/excalidraw/obsidianExcalidrawHost.d.ts",
  "types/common/src/commonObsidianHost.d.ts",
  "dist/prod/index.js",
  "dist/dev/index.js",
  "dist/obsidian/excalidraw.production.min.js",
  "dist/obsidian/excalidraw.development.js",
  "dist/obsidian/excalidraw.production.min.css",
  "dist/obsidian/excalidraw.development.css",
]) {
  assert.ok(
    pack.files.some((file) => file.path === path),
    `Missing packed ${path}`,
  );
}
assert.ok(
  !pack.files.some(
    (file) =>
      file.path.startsWith("scripts/") ||
      file.path.startsWith("tests/") ||
      file.path.startsWith(".test-work/"),
  ),
);
writeFileSync(
  join(work, "package.json"),
  JSON.stringify({ private: true, type: "module" }),
);
command(
  [
    "install",
    "--prefer-offline",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--legacy-peer-deps",
    join(work, pack.filename),
  ],
  work,
);
writeFileSync(
  join(work, "consumer.ts"),
  `import {OBSIDIAN_EXCALIDRAW_HOST_PROTOCOL_VERSION,configureObsidianExcalidrawHost} from '@zsviczian/excalidraw';
import type {ObsidianCommonHostAdapter} from '@zsviczian/excalidraw/common/commonObsidianHost';
const protocol:3=OBSIDIAN_EXCALIDRAW_HOST_PROTOCOL_VERSION;
declare const component:Parameters<typeof configureObsidianExcalidrawHost>[0];
declare const common:ObsidianCommonHostAdapter;
const dispose:()=>void=configureObsidianExcalidrawHost(component);
const live = common.getCanvasLimits();
// @ts-expect-error protocol mismatch must remain rejected by generated declarations
const wrong:2=OBSIDIAN_EXCALIDRAW_HOST_PROTOCOL_VERSION;
void [protocol,dispose,live];`,
);
const checked = spawnSync(
  process.execPath,
  [
    join(root, "node_modules/typescript/bin/tsc"),
    "--noEmit",
    "--strict",
    "--skipLibCheck",
    "--target",
    "ES2022",
    "--module",
    "ESNext",
    "--moduleResolution",
    "Bundler",
    "consumer.ts",
  ],
  { cwd: work, encoding: "utf8", windowsHide: true, timeout: 60000 },
);
assert.equal(checked.status, 0, checked.stdout || checked.stderr);
writeFileSync(
  join(work, "evidence.json"),
  JSON.stringify(
    {
      package: pack.name,
      version: pack.version,
      sha512: pack.integrity,
      files: pack.files.length,
      status: "passed",
      consumer:
        "isolated install of packed package; generated API calls and invalid-input type rejection",
    },
    null,
    2,
  ),
);
process.stdout.write(`Packed fork consumer passed: ${work}\n`);
