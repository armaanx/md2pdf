import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { browserRuntimeSource } from "./browser-runtime-source";

let cachedScripts: Promise<{
  fontCss: string;
  markedSource: string;
  mermaidSource: string;
  runtimeSource: string;
}> | null = null;
const moduleDir = path.dirname(fileURLToPath(import.meta.url));

async function resolveExistingPath(candidates: string[]) {
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(`Unable to resolve runtime asset. Tried: ${candidates.join(", ")}`);
}

function nodeModuleRoots(fromDir: string) {
  const roots: string[] = [];
  let current = fromDir;

  for (let index = 0; index < 6; index += 1) {
    roots.push(path.resolve(current, "node_modules"));
    const parent = path.dirname(current);

    if (parent === current) {
      break;
    }

    current = parent;
  }

  return roots;
}

function buildCandidates(...segments: string[]) {
  return [...new Set([...nodeModuleRoots(process.cwd()), ...nodeModuleRoots(moduleDir)])].map((root) =>
    path.resolve(root, ...segments)
  );
}

function markedCandidates() {
  return buildCandidates("marked", "lib", "marked.umd.js");
}

function mermaidCandidates() {
  return buildCandidates("mermaid", "dist", "mermaid.min.js");
}

function manropeFontCandidates(filename: string) {
  return buildCandidates("@fontsource", "manrope", "files", filename);
}

function jetBrainsFontCandidates(filename: string) {
  return buildCandidates("@fontsource", "jetbrains-mono", "files", filename);
}

async function createEmbeddedFontFace(input: {
  family: string;
  weight: number;
  sourcePath: string;
}) {
  const buffer = await readFile(input.sourcePath);
  const mimeType = input.sourcePath.endsWith(".woff2") ? "font/woff2" : "font/woff";
  const base64 = buffer.toString("base64");

  return `@font-face {
    font-family: "${input.family}";
    font-style: normal;
    font-weight: ${input.weight};
    font-display: swap;
    src: url("data:${mimeType};base64,${base64}") format("${input.sourcePath.endsWith(".woff2") ? "woff2" : "woff"}");
  }`;
}

export function getBrowserRuntimeScripts() {
  if (cachedScripts) {
    return cachedScripts;
  }

  cachedScripts = Promise.all([
    resolveExistingPath(markedCandidates()).then((resolvedPath) => readFile(resolvedPath, "utf8")),
    resolveExistingPath(mermaidCandidates()).then((resolvedPath) => readFile(resolvedPath, "utf8")),
    Promise.all(
      [400, 500, 600, 700, 800].map((weight) =>
        resolveExistingPath(manropeFontCandidates(`manrope-latin-${weight}-normal.woff2`)).then(
          (resolvedPath) =>
            createEmbeddedFontFace({
              family: "Manrope",
              weight,
              sourcePath: resolvedPath
            })
        )
      )
    ),
    Promise.all(
      [400, 600].map((weight) =>
        resolveExistingPath(
          jetBrainsFontCandidates(`jetbrains-mono-latin-${weight}-normal.woff2`)
        ).then((resolvedPath) =>
          createEmbeddedFontFace({
            family: "JetBrains Mono",
            weight,
            sourcePath: resolvedPath
          })
        )
      )
    )
  ]).then(([markedSource, mermaidSource, manropeFaces, monoFaces]) => ({
    fontCss: [...manropeFaces, ...monoFaces].join("\n"),
    markedSource,
    mermaidSource,
    runtimeSource: browserRuntimeSource
  }));

  return cachedScripts;
}
