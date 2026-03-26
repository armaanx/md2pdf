"use client";

import { markdown } from "@codemirror/lang-markdown";
import CodeMirror, { type EditorView } from "@uiw/react-codemirror";
import {
  Bell,
  Bold,
  Code,
  Download,
  FileText,
  FolderOpen,
  Heading1,
  Heading2,
  Hourglass,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  PencilLine,
  Printer,
  Quote,
  Ruler,
  Settings,
} from "lucide-react";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type AssetSummary = {
  id: string;
  name: string;
  markdownUrl: string;
};

type JobSummary = {
  id: string;
  status: string;
  filename: string;
  createdAt: string;
  completedAt: string | null;
  downloadUrl: string | null;
  errorMessage: string | null;
};

type EditorShellProps = {
  userName: string;
  initialJobs: JobSummary[];
};

type WorkspacePanel = "editor" | "assets" | "validation" | "queue";
type ToolbarAction = {
  id: string;
  label: string;
  icon: React.ElementType;
  run: () => void;
};

const starterMarkdown = `# Technical Specification: Project Aurora

## Overview
The goal is to establish a high-precision rendering engine that leverages the core principles of **Technical Elegance**.

### Key Performance Indicators
- **Latency:** < 100ms
- **Throughput:** 5k req/s
- **Reliability:** 99.99%
`;

const PDF_PAGE_RATIO = 1.414;

export function EditorShell({ userName, initialJobs }: EditorShellProps) {
  const [activePanel, setActivePanel] = useState<WorkspacePanel>("editor");
  const [markdownValue, setMarkdownValue] = useState(starterMarkdown);
  const deferredMarkdown = useDeferredValue(markdownValue);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [previewPending, setPreviewPending] = useState(false);
  const [uploadPending, setUploadPending] = useState(false);
  const [exportPending, setExportPending] = useState(false);
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [jobs, setJobs] = useState<JobSummary[]>(initialJobs);
  const [toast, setToast] = useState<string | null>(null);
  const [logoutPending, setLogoutPending] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(420);
  const [isResizingPreview, setIsResizingPreview] = useState(false);
  const [previewViewportWidth, setPreviewViewportWidth] = useState(0);
  const [previewContentHeight, setPreviewContentHeight] = useState<number | null>(null);
  const pollTimer = useRef<number | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const previewFrameRef = useRef<HTMLDivElement | null>(null);

  const assetIds = useMemo(() => assets.map((asset) => asset.id), [assets]);

  const wordCount = useMemo(() => {
    const words = markdownValue.trim().split(/\s+/).filter(Boolean);
    return words.length;
  }, [markdownValue]);

  const fittedPreviewWidth = Math.max(previewViewportWidth - 48, 220);
  const previewPageWidth = fittedPreviewWidth;
  const previewPageHeight = previewContentHeight ?? previewPageWidth * PDF_PAGE_RATIO;

  useEffect(() => {
    if (!isResizingPreview) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      const workspace = workspaceRef.current;

      if (!workspace) {
        return;
      }

      const bounds = workspace.getBoundingClientRect();
      const nextWidth = bounds.right - event.clientX;
      const maxWidth = Math.min(720, Math.max(360, bounds.width - 420));
      const clampedWidth = Math.min(Math.max(nextWidth, 320), maxWidth);

      setPreviewWidth(clampedWidth);
    }

    function handlePointerUp() {
      setIsResizingPreview(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isResizingPreview]);

  useEffect(() => {
    const frame = previewFrameRef.current;

    if (!frame || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      setPreviewViewportWidth(entry.contentRect.width);
    });

    observer.observe(frame);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setPreviewContentHeight(null);
  }, [previewHtml, previewPageWidth]);

  async function readJsonResponse<T>(response: Response): Promise<T | null> {
    const text = await response.text();

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setPreviewPending(true);

        const response = await fetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            markdown: deferredMarkdown,
            assetIds
          }),
          signal: controller.signal
        });

        const payload = await readJsonResponse<{
          html?: string;
          error?: string;
          issues?: Array<{ message: string }>;
        }>(response);

        startTransition(() => {
          setPreviewPending(false);

          if (!response.ok) {
            setPreviewHtml("");
            setValidationIssues(
              payload?.issues?.map((issue) => issue.message) ??
              (payload?.error ? [payload.error] : ["Preview failed."])
            );
            return;
          }

          setPreviewHtml(payload?.html ?? "");
          setValidationIssues(payload?.issues?.map((issue) => issue.message) ?? []);
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        startTransition(() => {
          setPreviewPending(false);
          setPreviewHtml("");
          setValidationIssues([error instanceof Error ? error.message : "Preview failed."]);
        });
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [assetIds, deferredMarkdown]);

  useEffect(() => {
    const activeJobs = jobs.filter((job) => job.status === "queued" || job.status === "rendering");

    if (!activeJobs.length) {
      if (pollTimer.current) {
        window.clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
      return;
    }

    if (pollTimer.current) {
      return;
    }

    pollTimer.current = window.setInterval(async () => {
      const nextJobs = await Promise.all(
        activeJobs.map(async (job) => {
          const response = await fetch(`/api/jobs/${job.id}`, { cache: "no-store" });

          if (!response.ok) {
            return job;
          }

          return (await readJsonResponse<JobSummary>(response)) ?? job;
        })
      );

      startTransition(() => {
        setJobs((current) =>
          current.map((job) => nextJobs.find((candidate) => candidate.id === job.id) ?? job)
        );
      });
    }, 2_000);

    return () => {
      if (pollTimer.current) {
        window.clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [jobs]);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      return;
    }

    setUploadPending(true);

    try {
      const uploadedAssets: AssetSummary[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/assets", {
          method: "POST",
          body: formData
        });

        const payload =
          (await readJsonResponse<AssetSummary & { error?: string }>(response)) ??
          ({ error: `Failed to upload ${file.name}.` } as AssetSummary & { error?: string });

        if (!response.ok) {
          throw new Error(payload.error ?? `Failed to upload ${file.name}.`);
        }

        uploadedAssets.push({
          id: payload.id,
          name: payload.name,
          markdownUrl: payload.markdownUrl
        });
      }

      setAssets((current) => [...uploadedAssets, ...current]);
      setMarkdownValue((current) =>
        `${current}\n${uploadedAssets.map((asset) => `![${asset.name}](${asset.markdownUrl})`).join("\n")}\n`
      );
      setToast(`${uploadedAssets.length} asset${uploadedAssets.length > 1 ? "s" : ""} uploaded.`);
      event.target.value = "";
      setActivePanel("assets");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploadPending(false);
    }
  }

  async function handleExport() {
    setExportPending(true);

    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        markdown: markdownValue,
        assetIds,
        filename: "document.pdf"
      })
    });

    const payload = ((await readJsonResponse(response)) ?? {}) as
      | ({ issues?: Array<{ message: string }>; error?: string } & Partial<JobSummary>)
      | {
        jobId: string;
        status: string;
        filename: string;
        createdAt: string;
      };

    if (!response.ok) {
      if ("issues" in payload && payload.issues?.length) {
        setValidationIssues(payload.issues.map((issue) => issue.message));
        setActivePanel("validation");
      } else {
        const message = "error" in payload ? payload.error : undefined;
        setToast(message ?? "Failed to queue export.");
      }

      setExportPending(false);
      return;
    }

    const successPayload = payload as {
      jobId: string;
      status: string;
      filename: string;
      createdAt: string;
    };

    setJobs((current) => [
      {
        id: successPayload.jobId,
        status: successPayload.status,
        filename: successPayload.filename,
        createdAt: successPayload.createdAt,
        completedAt: null,
        downloadUrl: null,
        errorMessage: null
      },
      ...current
    ]);
    setToast("Export queued.");
    setExportPending(false);
    setActivePanel("queue");
  }

  async function handleLogout() {
    setLogoutPending(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } finally {
      setLogoutPending(false);
    }
  }

  function focusEditor() {
    editorViewRef.current?.focus();
  }

  function replaceSelection(transform: (selectedText: string) => { text: string; selectionStartOffset?: number; selectionEndOffset?: number }) {
    const view = editorViewRef.current;

    if (!view) {
      return;
    }

    const selection = view.state.selection.main;
    const selectedText = view.state.sliceDoc(selection.from, selection.to);
    const result = transform(selectedText);
    const selectionStartOffset = result.selectionStartOffset ?? result.text.length;
    const selectionEndOffset = result.selectionEndOffset ?? selectionStartOffset;

    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: result.text
      },
      selection: {
        anchor: selection.from + selectionStartOffset,
        head: selection.from + selectionEndOffset
      }
    });
    focusEditor();
  }

  function prefixLines(prefix: string) {
    replaceSelection((selectedText) => {
      const content = selectedText || "Item";
      const lines = content.split("\n");
      return {
        text: lines.map((line) => `${prefix}${line || "Item"}`).join("\n"),
        selectionStartOffset: 0,
        selectionEndOffset: lines.map((line) => `${prefix}${line || "Item"}`).join("\n").length
      };
    });
  }

  function insertWrapped(prefix: string, suffix = prefix, placeholder = "text") {
    replaceSelection((selectedText) => {
      const content = selectedText || placeholder;
      const text = `${prefix}${content}${suffix}`;
      const start = selectedText ? prefix.length : prefix.length;
      const end = selectedText ? prefix.length + content.length : prefix.length + placeholder.length;
      return {
        text,
        selectionStartOffset: start,
        selectionEndOffset: end
      };
    });
  }

  function insertHeading(level: 1 | 2) {
    const marker = level === 1 ? "# " : "## ";
    replaceSelection((selectedText) => {
      const content = selectedText || (level === 1 ? "Heading" : "Section");
      const lines = content.split("\n");
      const text = lines.map((line) => `${marker}${line || "Heading"}`).join("\n");
      return {
        text,
        selectionStartOffset: marker.length,
        selectionEndOffset: text.length
      };
    });
  }

  function insertCodeBlock() {
    replaceSelection((selectedText) => {
      const content = selectedText || "code";
      const text = `\`\`\`\n${content}\n\`\`\``;
      return {
        text,
        selectionStartOffset: 4,
        selectionEndOffset: 4 + content.length
      };
    });
  }

  function insertLink() {
    replaceSelection((selectedText) => {
      const label = selectedText || "link text";
      const url = "https://example.com";
      const text = `[${label}](${url})`;
      return {
        text,
        selectionStartOffset: 1,
        selectionEndOffset: 1 + label.length
      };
    });
  }

  function insertImage() {
    const asset = assets[0];
    replaceSelection((selectedText) => {
      const alt = selectedText || (asset?.name ?? "image");
      const source = asset?.markdownUrl ?? "asset://image-id";
      const text = `![${alt}](${source})`;
      return {
        text,
        selectionStartOffset: 2,
        selectionEndOffset: 2 + alt.length
      };
    });
  }

  const toolbarActions = useMemo(() => {
    const groups: ToolbarAction[][] = [
      [
        { id: "h1", label: "Heading 1", icon: Heading1, run: () => insertHeading(1) },
        { id: "h2", label: "Heading 2", icon: Heading2, run: () => insertHeading(2) },
        { id: "bold", label: "Bold", icon: Bold, run: () => insertWrapped("**", "**", "bold text") },
        { id: "italic", label: "Italic", icon: Italic, run: () => insertWrapped("*", "*", "italic text") }
      ],
      [
        { id: "link", label: "Link", icon: Link2, run: insertLink },
        { id: "quote", label: "Quote", icon: Quote, run: () => prefixLines("> ") },
        { id: "bullet-list", label: "Bulleted list", icon: List, run: () => prefixLines("- ") },
        { id: "number-list", label: "Numbered list", icon: ListOrdered, run: () => prefixLines("1. ") },
        { id: "code-block", label: "Code block", icon: Code, run: insertCodeBlock },
        { id: "image", label: assets.length ? "Insert uploaded image" : "Insert image placeholder", icon: ImageIcon, run: insertImage }
      ]
    ];

    return groups;
  }, [assets]);

  function handlePreviewFrameLoad(event: React.SyntheticEvent<HTMLIFrameElement>) {
    const frame = event.currentTarget;

    const updateHeight = () => {
      const doc = frame.contentDocument;

      if (!doc) {
        return;
      }

      const nextHeight = Math.max(
        doc.documentElement.scrollHeight,
        doc.body?.scrollHeight ?? 0,
        doc.documentElement.offsetHeight,
        doc.body?.offsetHeight ?? 0
      );

      if (nextHeight > 0) {
        setPreviewContentHeight(nextHeight);
      }
    };

    updateHeight();
    window.requestAnimationFrame(updateHeight);
    window.setTimeout(updateHeight, 150);
    window.setTimeout(updateHeight, 500);
  }

  const sideNavItems = [
    { id: "editor" as const, icon: PencilLine, label: "Editor" },
    { id: "assets" as const, icon: FolderOpen, label: "Assets" },
    { id: "validation" as const, icon: Ruler, label: "Validation" },
    { id: "queue" as const, icon: Hourglass, label: "Queue" }
  ];

  function renderWorkspacePanel() {
    if (activePanel === "assets") {
      return (
        <div className="h-full overflow-y-auto px-6 py-7">
          <div className="mx-auto max-w-3xl space-y-6">
            <div>
              <h2 className="text-4xl font-extrabold tracking-tight text-foreground">Asset Library</h2>
              <p className="mt-3 max-w-xl text-base leading-8 text-muted-foreground">
                Uploaded assets are rewritten into renderer-safe references for your Markdown documents.
              </p>
            </div>

            <label>
              <Button asChild className="h-10 rounded-lg">
                <span>{uploadPending ? "Uploading..." : "Upload assets"}</span>
              </Button>
              <input type="file" multiple className="hidden" onChange={handleUpload} />
            </label>

            <div className="space-y-4">
              {assets.length ? (
                assets.map((asset) => (
                  <div key={asset.id} className="rounded-xl bg-[#1f2022] p-4">
                    <p className="text-sm font-semibold text-foreground">{asset.name}</p>
                    <p className="mt-3 break-all font-mono text-xs text-muted-foreground">
                      {asset.markdownUrl}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-[#1f2022] p-5 text-sm leading-7 text-muted-foreground">
                  No assets uploaded yet. Use the upload action to add images and embed them as
                  `asset://` references.
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (activePanel === "validation") {
      return (
        <div className="h-full overflow-y-auto px-6 py-7">
          <div className="mx-auto max-w-3xl space-y-6">
            <div>
              <h2 className="text-4xl font-extrabold tracking-tight text-foreground">Validation</h2>
              <p className="mt-3 max-w-xl text-base leading-8 text-muted-foreground">
                Preview and export feedback from the renderer pipeline appears here.
              </p>
            </div>

            <div className="space-y-4">
              {validationIssues.length ? (
                validationIssues.map((issue) => (
                  <Alert
                    key={issue}
                    className="rounded-xl border-amber-500/20 bg-[#1f2022] text-amber-200"
                  >
                    <AlertTitle>Renderer issue</AlertTitle>
                    <AlertDescription className="text-amber-100/80">{issue}</AlertDescription>
                  </Alert>
                ))
              ) : (
                <div className="rounded-xl bg-[#1f2022] p-5 text-sm leading-7 text-muted-foreground">
                  No validation issues. The document is currently ready for preview and export.
                </div>
              )}

              {toast ? (
                <div className="rounded-xl bg-[#1f2022] p-5 text-sm leading-7 text-muted-foreground">
                  {toast}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    if (activePanel === "queue") {
      return (
        <div className="h-full overflow-y-auto px-6 py-7">
          <div className="mx-auto max-w-3xl space-y-6">
            <div>
              <h2 className="text-4xl font-extrabold tracking-tight text-foreground">Export Queue</h2>
              <p className="mt-3 max-w-xl text-base leading-8 text-muted-foreground">
                Track queued jobs and download completed PDFs from the renderer worker.
              </p>
            </div>

            <div className="space-y-4">
              {jobs.length ? (
                jobs.map((job) => (
                  <div key={job.id} className="rounded-xl bg-[#1f2022] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{job.filename}</p>
                        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          {job.status}
                        </p>
                      </div>
                      {job.downloadUrl ? (
                        <Button asChild size="sm" className="h-8 rounded-lg px-3">
                          <a href={job.downloadUrl} target="_blank" rel="noreferrer">
                            <Download className="size-3.5" />
                            Download
                          </a>
                        </Button>
                      ) : null}
                    </div>

                    {job.errorMessage ? (
                      <p className="mt-3 text-xs text-destructive">{job.errorMessage}</p>
                    ) : null}

                    <p className="mt-4 text-xs text-muted-foreground">
                      Created {new Date(job.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-[#1f2022] p-5 text-sm leading-7 text-muted-foreground">
                  No export jobs yet. Generate your first PDF from the preview panel.
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    /* ── Editor panel (default) ── */
    return (
      <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
        {/* Editor Toolbar */}
        <div className="flex h-12 items-center justify-between border-b border-[var(--border)]/10 px-6 bg-[var(--background)]">
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-4 font-mono text-xs uppercase tracking-[0.22em] text-[#859399]">
                DOCUMENT_v4.md
              </span>
              {toolbarActions.map((group, groupIndex) => (
                <div key={`toolbar-group-${groupIndex}`} className="flex items-center gap-1">
                  {group.map(({ id, label, icon: Icon, run }) => (
                    <button
                      key={id}
                      type="button"
                      title={label}
                      aria-label={label}
                      onClick={run}
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-[#292a2c] hover:text-[var(--ring)]"
                    >
                      <Icon className="size-4" />
                    </button>
                  ))}
                  {groupIndex < toolbarActions.length - 1 ? (
                    <div className="mx-2 h-4 w-px bg-[var(--border)]/20" />
                  ) : null}
                </div>
              ))}
            </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#859399]">
            Words: {wordCount.toLocaleString()}
          </span>
        </div>

        {/* Editor Content */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <CodeMirror
            value={markdownValue}
            height="100%"
            extensions={[markdown()]}
            onChange={(value: string) => setMarkdownValue(value)}
            onCreateEditor={(view) => {
              editorViewRef.current = view;
            }}
            basicSetup={{
              lineNumbers: false,
              highlightActiveLine: false,
              foldGutter: false
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* ── Side Navigation ── */}
      <aside className="hidden w-20 shrink-0 flex-col items-center border-r border-[var(--border)]/20 bg-[#1b1c1e] py-8 md:flex">
        {/* Gradient Logo */}
        <div className="mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#00d1ff] to-[#a4e6ff] shadow-lg shadow-[#00d1ff]/20">
            <FileText className="size-5 text-[#001f28]" />
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex flex-1 flex-col items-center gap-6">
          {sideNavItems.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActivePanel(id)}
              title={label}
              className={`group relative flex h-12 w-12 items-center justify-center rounded-lg transition-all duration-200 ${activePanel === id
                ? "scale-110 bg-[#343537]/50 text-[var(--ring)]"
                : "text-muted-foreground hover:bg-[#343537] hover:text-foreground"
                }`}
            >
              <Icon className="size-5" />
              <span className="pointer-events-none absolute left-16 z-50 whitespace-nowrap rounded bg-[#343537] px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                {label}
              </span>
            </button>
          ))}
        </nav>

        {/* Bottom: Settings + User Avatar */}
        <div className="flex flex-col items-center gap-5 pb-2">
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-[#343537] hover:text-foreground"
            title="Settings"
          >
            <Settings className="size-5" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={logoutPending}
            title="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#343537] text-xs font-semibold text-foreground transition-all hover:ring-2 hover:ring-[var(--ring)]/30 overflow-hidden border border-[var(--border)]/20"
          >
            {userName.slice(0, 1).toUpperCase()}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* ── Top Navigation Bar ── */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)]/20 bg-background px-6">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold tracking-tighter text-[var(--ring)]">Markdown Studio</span>
            <nav className="hidden items-center gap-6 text-sm md:flex">
              <a href="#" className="border-b-2 border-[var(--ring)] pb-1 font-semibold text-[var(--ring)]">
                Workspace
              </a>
              <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
                Templates
              </a>
              <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
                History
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Synced Badge */}
            <div className="hidden items-center rounded-full bg-[#1b1c1e] px-3 py-1.5 border border-[var(--border)]/10 mr-4 md:flex">
              <span className="mr-2 h-2 w-2 rounded-full bg-[var(--ring)] animate-pulse shadow-[0_0_8px_rgba(0,209,255,0.6)]" />
              <span className="font-mono text-[10px] uppercase tracking-tight text-muted-foreground">
                {previewPending ? "Syncing" : "Synced to Cloud"}
              </span>
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-muted-foreground transition-all duration-200 hover:bg-[#343537] active:scale-95"
            >
              <Bell className="size-4" />
            </button>
            {/* Separator */}
            <div className="hidden h-8 w-px bg-[var(--border)]/20 mx-1 lg:block" />
            {/* User Avatar (header) */}
            <div className="hidden lg:flex h-8 w-8 items-center justify-center rounded-full bg-[#343537] text-xs font-semibold text-foreground overflow-hidden border border-[var(--ring)]/30">
              {userName.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        {/* ── Workspace Area ── */}
        <div
          ref={workspaceRef}
          className={`flex min-h-0 flex-1 overflow-hidden ${isResizingPreview ? "cursor-col-resize select-none" : ""}`}
        >
          {/* Left Pane: Editor / Active Panel */}
          <section className="min-w-0 flex-1 flex flex-col bg-[#1b1c1e]">
            {renderWorkspacePanel()}
          </section>

          <div className="hidden lg:flex w-3 shrink-0 items-stretch justify-center bg-background">
            <button
              type="button"
              aria-label="Resize editor and preview panels"
              onPointerDown={() => setIsResizingPreview(true)}
              className="group flex w-full cursor-col-resize items-center justify-center"
            >
              <span className="h-full w-px bg-[var(--border)]/20 transition-all group-hover:w-[3px] group-hover:bg-[var(--ring)]/60" />
            </button>
          </div>

          {/* Right Pane: Live PDF Preview */}
          <section
            className="hidden lg:flex min-w-[320px] max-w-[720px] shrink-0 flex-col bg-background"
            style={{ width: `${previewWidth}px` }}
          >
            {/* Preview Header */}
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border)]/10 px-6">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Live PDF Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-[#292a2c]"
                >
                  <Printer className="size-4" />
                </button>
              </div>
            </div>

            {/* PDF Preview Body */}
            <div
              ref={previewFrameRef}
              className="preview-frame flex flex-1 items-start justify-center overflow-y-auto overflow-x-hidden p-6"
            >
              {previewHtml ? (
                <div
                  className="flex w-full justify-center"
                  style={{ minHeight: `${previewPageHeight}px` }}
                >
                  <iframe
                    title="Markdown preview"
                    srcDoc={previewHtml}
                    className="rounded-sm bg-white shadow-2xl shadow-black/60"
                    onLoad={handlePreviewFrameLoad}
                    scrolling="no"
                    style={{
                      width: `${previewPageWidth}px`,
                      height: `${previewPageHeight}px`,
                      maxWidth: "100%",
                      overflow: "hidden"
                    }}
                  />
                </div>
              ) : (
                <div
                  className="flex w-full justify-center"
                  style={{ minHeight: `${previewPageHeight}px` }}
                >
                  <div
                    className="rounded-sm bg-white p-10 text-zinc-900 shadow-2xl shadow-black/60"
                    style={{
                      width: `${previewPageWidth}px`,
                      height: `${previewPageHeight}px`,
                      maxWidth: "100%"
                    }}
                  >
                    <div className="mb-8 border-b-4 border-zinc-900 pb-4">
                      <h2 className="text-3xl font-extrabold uppercase leading-none tracking-tighter">
                        Technical<br />Report
                      </h2>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                        Document ID: MD-2024-X12
                      </p>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-base font-bold">1. Executive Summary</h3>
                      <div className="h-1.5 w-full rounded-full bg-zinc-200" />
                      <div className="h-1.5 w-5/6 rounded-full bg-zinc-200" />
                      <div className="h-1.5 w-full rounded-full bg-zinc-200" />
                      <div className="h-1.5 w-4/6 rounded-full bg-zinc-200" />
                      <h3 className="text-base font-bold pt-4">2. Visual Analysis</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="aspect-video rounded border border-zinc-200 bg-zinc-100" />
                        <div className="aspect-video rounded border border-zinc-200 bg-zinc-100" />
                      </div>
                      <div className="mt-4 h-1.5 w-full rounded-full bg-zinc-200" />
                      <div className="h-1.5 w-full rounded-full bg-zinc-200" />
                      <div className="h-1.5 w-2/3 rounded-full bg-zinc-200" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Generate PDF CTA */}
            <div className="shrink-0 border-t border-[var(--border)]/10 bg-[#1f2022] p-6">
              <button
                type="button"
                onClick={handleExport}
                disabled={exportPending}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ring)] py-4 font-bold text-[#001f28] shadow-lg shadow-[var(--ring)]/20 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              >
                <FileText className="size-5" />
                <span>{exportPending ? "Generating..." : "Generate PDF"}</span>
                <svg className="size-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[#859399]">
                Estimated file size: 1.2 MB
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
