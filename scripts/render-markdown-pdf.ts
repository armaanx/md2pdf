import path from "node:path";
import {
  closeCliRenderer,
  derivePdfOutputPath,
  prepareDocument,
  renderPreparedDocument
} from "../packages/cli-core/src";

async function main() {
  const [, , inputArg, outputArg] = process.argv;

  if (!inputArg || !outputArg) {
    console.error("Usage: node scripts/render-markdown-pdf.mjs <input.md> <output.pdf>");
    process.exit(1);
  }

  const projectRoot = process.cwd();
  const inputPath = path.resolve(projectRoot, inputArg);

  try {
    const prepared = await prepareDocument(inputPath, {
      title: outputArg ? path.basename(outputArg) : undefined
    });
    const outputPath = derivePdfOutputPath(prepared.inputPath, outputArg, prepared.workspace);

    await renderPreparedDocument(prepared, outputPath);
    console.log(`Rendered ${path.basename(inputPath)} -> ${outputPath}`);
  } finally {
    await closeCliRenderer();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "PDF rendering failed.");
  process.exit(1);
});
