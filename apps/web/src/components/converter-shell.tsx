"use client";

import { markdown } from "@codemirror/lang-markdown";
import {
  getDefaultRenderTheme,
  getRenderThemePreset,
  renderThemePresets,
  type RenderThemeConfig,
  type RenderThemePresetId
} from "@md2pdf/renderer/theme";
import CodeMirror from "@uiw/react-codemirror";
import { Download, FileText, Palette, PencilLine } from "lucide-react";
import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ThemeStudioPanel } from "@/components/theme-studio-panel";

const starterMarkdown = `# Hello md2pdf

Convert **Markdown** and Mermaid diagrams into a PDF.

## Mermaid example

\`\`\`mermaid
flowchart LR
  Markdown --> HTML
  HTML --> PDF
\`\`\`

## Features

- Headings, lists, and code blocks
- Mermaid diagram rendering
- Theme-aware styling
`;

type PreviewIssue = {
  code: string;
  message: string;
};

type WorkspacePanel = "editor" | "styles";

export function ConverterShell() {
  const [activePanel, setActivePanel] = useState<WorkspacePanel>("editor");
  const [markdownValue, setMarkdownValue] = useState(starterMarkdown);
  const deferredMarkdown = useDeferredValue(markdownValue);
  const [themePresetId, setThemePresetId] = useState<RenderThemePresetId | "custom">("studio");
  const [themeConfig, setThemeConfig] = useState<RenderThemeConfig>({
    ...getDefaultRenderTheme()
  });
  const deferredThemeConfig = useDeferredValue(themeConfig);
  const [previewHtml, setPreviewHtml] = useState("");
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [previewPending, setPreviewPending] = useState(false);
  const [exportPending, setExportPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setPreviewPending(true);

      try {
        const response = await fetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            markdown: deferredMarkdown,
            options: { theme: deferredThemeConfig }
          }),
          signal: controller.signal
        });

        const payload = (await response.json()) as {
          html?: string;
          issues?: PreviewIssue[];
          error?: string;
        };

        if (!response.ok) {
          startTransition(() => {
            setPreviewPending(false);
            setPreviewHtml("");
            setValidationIssues(
              payload.issues?.map((issue) => issue.message) ??
                (payload.error ? [payload.error] : ["Preview failed."])
            );
          });
          return;
        }

        startTransition(() => {
          setPreviewPending(false);
          setPreviewHtml(payload.html ?? "");
          setValidationIssues(payload.issues?.map((issue) => issue.message) ?? []);
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        startTransition(() => {
          setPreviewPending(false);
          setPreviewHtml("");
          setValidationIssues([
            error instanceof Error ? error.message : "Preview failed."
          ]);
        });
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [deferredMarkdown, deferredThemeConfig]);

  function applyThemePreset(presetId: RenderThemePresetId) {
    setThemePresetId(presetId);
    setThemeConfig({ ...getRenderThemePreset(presetId) });
  }

  function handleThemeConfigChange(nextTheme: RenderThemeConfig) {
    setThemePresetId("custom");
    setThemeConfig(nextTheme);
  }

  const activeThemeLabel =
    themePresetId === "custom"
      ? "Custom"
      : (renderThemePresets.find((preset) => preset.id === themePresetId)?.label ?? themePresetId);

  async function handleDownload() {
    setExportPending(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: markdownValue,
          filename: "document.pdf",
          options: {
            title: "Document",
            theme: themeConfig
          }
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          issues?: Array<{ message: string }>;
        } | null;

        const issues = payload?.issues?.map((issue) => issue.message) ?? [];
        if (issues.length) {
          setValidationIssues(issues);
        }

        throw new Error(payload?.error ?? "PDF conversion failed.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "document.pdf";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "PDF conversion failed.");
    } finally {
      setExportPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#121314] text-[#e8eaed]">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight">md2pdf</h1>
          <p className="text-sm text-[#859399]">Markdown and Mermaid to PDF</p>
        </div>
        <Button
          type="button"
          onClick={handleDownload}
          disabled={exportPending}
          className="gap-2 bg-[var(--ring)] font-semibold text-[#001f28] hover:brightness-110"
        >
          {exportPending ? (
            <>
              <FileText className="size-4 animate-pulse" />
              Generating...
            </>
          ) : (
            <>
              <Download className="size-4" />
              Download PDF
            </>
          )}
        </Button>
      </header>

      <main className="grid flex-1 gap-0 lg:grid-cols-2">
        <section className="flex min-h-[420px] flex-col border-b border-white/10 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActivePanel("editor")}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
                  activePanel === "editor"
                    ? "bg-white/10 text-[#e8eaed]"
                    : "text-[#859399] hover:bg-white/5 hover:text-[#e8eaed]"
                }`}
              >
                <PencilLine className="size-3.5" />
                Editor
              </button>
              <button
                type="button"
                onClick={() => setActivePanel("styles")}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
                  activePanel === "styles"
                    ? "bg-white/10 text-[#e8eaed]"
                    : "text-[#859399] hover:bg-white/5 hover:text-[#e8eaed]"
                }`}
              >
                <Palette className="size-3.5" />
                Styles
              </button>
            </div>
            <span className="hidden text-[10px] uppercase tracking-[0.18em] text-[#859399] sm:inline">
              {activeThemeLabel}
            </span>
          </div>

          {activePanel === "editor" ? (
            <div className="min-h-[420px] flex-1 p-4">
              <CodeMirror
                value={markdownValue}
                height="100%"
                minHeight="420px"
                theme="dark"
                extensions={[markdown()]}
                onChange={(value) => setMarkdownValue(value)}
                className="overflow-hidden rounded-lg border border-white/10"
              />
            </div>
          ) : (
            <div className="min-h-[420px] flex-1 overflow-hidden bg-[#1b1c1e]">
              <ThemeStudioPanel
                activePresetId={themePresetId}
                theme={themeConfig}
                onPresetChange={applyThemePreset}
                onThemeChange={handleThemeConfigChange}
              />
            </div>
          )}
        </section>

        <section className="flex min-h-[420px] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#859399]">
            <span>Preview {previewPending ? "· updating..." : ""}</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] text-[#859399]">
              {activeThemeLabel}
            </span>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {validationIssues.length > 0 && (
              <Alert className="mb-4 border-amber-500/30 bg-amber-500/10">
                <AlertTitle>Validation</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {validationIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {errorMessage && (
              <Alert className="mb-4 border-red-500/30 bg-red-500/10">
                <AlertTitle>Export failed</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {previewHtml ? (
              <iframe
                title="Markdown preview"
                srcDoc={previewHtml}
                className="h-[min(70vh,900px)] w-full rounded-lg border border-white/10 bg-white"
                sandbox="allow-scripts"
              />
            ) : (
              <div className="flex h-[min(70vh,900px)] items-center justify-center rounded-lg border border-dashed border-white/10 text-sm text-[#859399]">
                {previewPending ? "Rendering preview..." : "Preview will appear here"}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
