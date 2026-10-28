// zsviczian -- the maintained fork ledger owns discovery, not a filename prefix.
import { readFileSync } from "node:fs";
const ledger = JSON.parse(
  readFileSync(
    new URL("../../../dev-docs/Obsidian/file-inventory.json", import.meta.url),
    "utf8",
  ),
);
export const ownedTests = ledger.files
  .filter(
    (file) =>
      file.status === "fork-only" && /\.(test|spec)\.(ts|tsx)$/.test(file.path),
  )
  .map((file) => file.path);
if (!ownedTests.length) {
  throw Error("Fork-owned test ledger is empty");
}
