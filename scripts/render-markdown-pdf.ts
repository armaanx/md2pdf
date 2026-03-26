import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { closeRendererBrowser, renderMarkdownToPdf } from "../packages/renderer/src/pdf-entry";

async function main() {
  const [, , inputArg, outputArg] = process.argv;

  if (!inputArg || !outputArg) {
    console.error("Usage: node scripts/render-markdown-pdf.mjs <input.md> <output.pdf>");
    process.exit(1);
  }

  const projectRoot = process.cwd();
  const inputPath = path.resolve(projectRoot, inputArg);
  const outputPath = path.resolve(projectRoot, outputArg);

  try {
    const markdown = await readFile(inputPath, "utf8");
    const pdf = await renderMarkdownToPdf({
      markdown,
      options: {
        title: path.basename(outputPath)
      }
    });

    await writeFile(outputPath, pdf);
    console.log(`Rendered ${path.basename(inputPath)} -> ${outputPath}`);
  } finally {
    await closeRendererBrowser();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "PDF rendering failed.");
  process.exit(1);
});
