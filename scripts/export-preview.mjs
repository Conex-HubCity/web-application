import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const output = path.join(root, "exports", "conex-preview");
const url = new URL(process.argv[2] ?? "http://localhost:3000/");
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
  throw new Error("Export the locally running Conex homepage only.");
}
const response = await fetch(url);
if (!response.ok) throw new Error(`Homepage returned ${response.status}`);
const converted = spawnSync("python", ["scripts/export-preview-html.py"], {
  input: await response.text(),
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024,
});
if (converted.status !== 0) throw new Error(converted.stderr || "HTML conversion failed");

// Read only literal journey data from the existing component; do not execute application code.
const source = ts.createSourceFile(
  "journey.tsx",
  await readFile("components/journey.tsx", "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
let journeyNode;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "journeys")
    journeyNode = node.initializer;
  ts.forEachChild(node, visit);
}
visit(source);
function literal(node) {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node))
    return Object.fromEntries(
      node.properties.map((property) => {
        if (!ts.isPropertyAssignment(property))
          throw new Error("Expected literal journey property");
        return [property.name.getText(source).replaceAll('"', ""), literal(property.initializer)];
      }),
    );
  throw new Error("Expected literal journey data");
}
if (!journeyNode) throw new Error("Journey data not found");
const journeys = literal(journeyNode);
for (const journey of Object.values(journeys)) delete journey.action;
const globalCss = await readFile("app/globals.css", "utf8");
const baseCss = globalCss
  .slice(0, globalCss.indexOf(".workspace {"))
  .replace('@import "tailwindcss";', "")
  .replace(/@theme inline\s*\{[^}]*\}/, "");
const css = [
  baseCss,
  await readFile("app/welcome.css", "utf8"),
  await readFile("app/home-sections.css", "utf8"),
  await readFile("references/preview-runtime/preview.css", "utf8"),
].join("\n");
const js = `const journeys = ${JSON.stringify(journeys, null, 2)};\n\n${await readFile("references/preview-runtime/script.js", "utf8")}`;
if (
  /(?:\/_next\/|href="\/(?:connexion|inscription|compte)|<form\b|<input\b)/i.test(converted.stdout)
)
  throw new Error("Framework or authentication references remain in the export");
await mkdir(output, { recursive: true });
const assetVersion = (content) => createHash("sha256").update(content).digest("hex").slice(0, 12);
const html = converted.stdout
  .replace('href="./style.css"', `href="./style.css?v=${assetVersion(css)}"`)
  .replace('src="./script.js"', `src="./script.js?v=${assetVersion(js)}"`);
await writeFile(path.join(output, "index.html"), html);
await writeFile(path.join(output, "style.css"), css);
await writeFile(path.join(output, "script.js"), js);
await cp("public/assets/conex", path.join(output, "assets"), { recursive: true });
await cp("references/preview-runtime/README.md", path.join(output, "README.md"));
console.log(`Standalone preview exported to ${path.relative(root, output)}`);
