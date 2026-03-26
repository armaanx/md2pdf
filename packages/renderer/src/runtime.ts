import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { browserRuntimeSource } from "./browser-runtime-source";

let cachedScripts: Promise<{
  fontCss: string;
  markedSource: string;
  mermaidSource: string;
  runtimeSource: string;
}> | null = null;

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

function markedCandidates() {
  return [
    path.resolve(process.cwd(), "node_modules", "marked", "lib", "marked.umd.js"),
    path.resolve(process.cwd(), "..", "node_modules", "marked", "lib", "marked.umd.js"),
    path.resolve(process.cwd(), "..", "..", "node_modules", "marked", "lib", "marked.umd.js")
  ];
}

function mermaidCandidates() {
  return [
    path.resolve(process.cwd(), "node_modules", "mermaid", "dist", "mermaid.min.js"),
    path.resolve(process.cwd(), "..", "node_modules", "mermaid", "dist", "mermaid.min.js"),
    path.resolve(process.cwd(), "..", "..", "node_modules", "mermaid", "dist", "mermaid.min.js")
  ];
}

function manropeFontCandidates(filename: string) {
  return [
    path.resolve(process.cwd(), "node_modules", "@fontsource", "manrope", "files", filename),
    path.resolve(process.cwd(), "..", "node_modules", "@fontsource", "manrope", "files", filename),
    path.resolve(
      process.cwd(),
      "..",
      "..",
      "node_modules",
      "@fontsource",
      "manrope",
      "files",
      filename
    )
  ];
}

function jetBrainsFontCandidates(filename: string) {
  return [
    path.resolve(
      process.cwd(),
      "node_modules",
      "@fontsource",
      "jetbrains-mono",
      "files",
      filename
    ),
    path.resolve(
      process.cwd(),
      "..",
      "node_modules",
      "@fontsource",
      "jetbrains-mono",
      "files",
      filename
    ),
    path.resolve(
      process.cwd(),
      "..",
      "..",
      "node_modules",
      "@fontsource",
      "jetbrains-mono",
      "files",
      filename
    )
  ];
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
