/**
 * zsviczian -- keep the exact offline font-subsetting binaries in a smaller IIFE.
 * Author: zsviczian. References: dev-docs/Obsidian/runtime-compaction.md.
 * The generated upstream modules encode raw WASM as Base64. Compressing binary
 * first improves the host's final DEFLATE payload too. Only the production
 * Obsidian builder applies this transform; ESM, development sources and the
 * generated WASM source files stay unchanged. Pako is already used by the
 * component's PNG metadata path, so this adds no runtime dependency.
 */
const zlib = require("node:zlib");

const ts = require("typescript");

/** Encode an existing generated module without changing a single WASM byte. */
function compressWasmModule(source, filename) {
  const tree = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const exports = tree.statements.filter(ts.isExportAssignment);
  const expression = exports.length === 1 && exports[0].expression;
  if (
    !expression ||
    !ts.isCallExpression(expression) ||
    expression.expression.getText(tree) !== "__toBinary" ||
    expression.arguments.length !== 1 ||
    !ts.isNoSubstitutionTemplateLiteral(expression.arguments[0])
  ) {
    throw new Error(
      `Review changed font WASM module before packaging: ${filename}`,
    );
  }
  const encoded = expression.arguments[0].text.replace(/\s/g, "");
  const binary = Buffer.from(encoded, "base64");
  if (binary.toString("base64") !== encoded || !WebAssembly.validate(binary)) {
    throw new Error(`Invalid generated font WASM module: ${filename}`);
  }
  const compressed = zlib.deflateSync(binary, { level: 9 }).toString("base64");
  return [
    'import { inflate } from "pako";',
    `export default inflate(Uint8Array.from(atob(${JSON.stringify(
      compressed,
    )}), character => character.charCodeAt(0)));`,
  ].join("\n");
}

module.exports = { compressWasmModule };
