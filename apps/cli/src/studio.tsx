import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import React, { useEffect, useState } from "react";
import { Box, Text, render, useApp, useInput } from "ink";
import {
  closeCliRenderer,
  generatePreviewHtml,
  importWorkspaceAssets,
  listRenderHistory,
  prepareDocument,
  recordHistory,
  renderPreparedDocument,
  validatePreparedDocument
} from "@md2pdf/cli-core";
import { getRenderThemePreset, renderThemePresets } from "@md2pdf/renderer/theme";
import { heading, muted } from "./console";
import { openTarget } from "./open-target";

type StudioProps = {
  inputPath?: string;
  themeOption?: string;
};

type StudioState = {
  inputPath: string | null;
  themePreset: string;
  themeOption?: string;
  validationMessages: string[];
  assets: Array<{ id: string; originalName: string }>;
  history: Array<{ title: string; status: string; createdAt: string }>;
  lastOutputPath: string | null;
  status: string;
  loading: boolean;
};

type PromptMode = null | "asset" | "path";

function findNextPreset(currentPreset: string, direction: 1 | -1) {
  const currentIndex = renderThemePresets.findIndex((preset) => preset.id === currentPreset);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;
  const nextIndex = (safeIndex + direction + renderThemePresets.length) % renderThemePresets.length;
  return renderThemePresets[nextIndex]?.id ?? "studio";
}

function Prompt({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={1} marginTop={1}>
      <Text>
        {label}: {value}
      </Text>
    </Box>
  );
}

async function tryOpenTarget(target: string) {
  const result = await openTarget(target);

  if (!result.ok) {
    return result.message;
  }

  return null;
}

function StudioApp({ inputPath, themeOption }: StudioProps) {
  const { exit } = useApp();
  const [state, setState] = useState<StudioState>({
    inputPath: inputPath ? path.resolve(inputPath) : null,
    themePreset: themeOption ?? "studio",
    themeOption,
    validationMessages: [],
    assets: [],
    history: [],
    lastOutputPath: null,
    status: "Loading studio…",
    loading: true
  });
  const [promptMode, setPromptMode] = useState<PromptMode>(null);
  const [promptValue, setPromptValue] = useState("");

  async function refresh(nextInputPath = state.inputPath, nextThemeOption = state.themeOption) {
    if (!nextInputPath) {
      setState((current) => ({
        ...current,
        loading: false,
        status: "No document selected. Press f to set a markdown file."
      }));
      return;
    }

    setState((current) => ({
      ...current,
      loading: true,
      status: "Refreshing workspace state…"
    }));

    try {
      const prepared = await prepareDocument(nextInputPath, {
        theme: nextThemeOption
      });
      const validation = await validatePreparedDocument(prepared);
      const history = await listRenderHistory(prepared.workspace, 6);

      setState((current) => ({
        ...current,
        inputPath: prepared.inputPath,
        themePreset: prepared.theme.presetId,
        themeOption: nextThemeOption,
        validationMessages: validation.issues.map((issue) => issue.message),
        assets: prepared.workspace.config.assets.map((asset) => ({
          id: asset.id,
          originalName: asset.originalName
        })),
        history: history.map((entry) => ({
          title: entry.title,
          status: entry.status,
          createdAt: entry.createdAt
        })),
        status: validation.ok
          ? "Document is ready for preview and export."
          : `${validation.issues.length} validation issue(s) need attention.`,
        loading: false
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        status: error instanceof Error ? error.message : "Failed to refresh studio."
      }));
    }
  }

  useEffect(() => {
    void refresh(inputPath ? path.resolve(inputPath) : null, themeOption);
  }, [inputPath, themeOption]);

  async function handleRender() {
    if (!state.inputPath) {
      setState((current) => ({ ...current, status: "Pick a markdown file first." }));
      return;
    }

    setState((current) => ({ ...current, loading: true, status: "Rendering PDF…" }));

    try {
      const prepared = await prepareDocument(state.inputPath, { theme: state.themeOption });
      const outputPath = path.join(
        path.dirname(prepared.inputPath),
        `${path.basename(prepared.inputPath, path.extname(prepared.inputPath))}.pdf`
      );
      const startedAt = Date.now();
      try {
        await renderPreparedDocument(prepared, outputPath);
      } finally {
        await closeCliRenderer();
      }
      await recordHistory(prepared.workspace, {
        kind: "render",
        inputPath: prepared.inputPath,
        outputPath,
        title: prepared.title,
        themePreset: prepared.theme.presetId,
        status: "success",
        durationMs: Date.now() - startedAt,
        issueCount: 0
      });
      setState((current) => ({
        ...current,
        loading: false,
        lastOutputPath: outputPath,
        status: `Rendered ${path.basename(outputPath)}`
      }));
      await refresh(state.inputPath);
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        status: error instanceof Error ? error.message : "Render failed."
      }));
    }
  }

  async function handlePreview() {
    if (!state.inputPath) {
      setState((current) => ({ ...current, status: "Pick a markdown file first." }));
      return;
    }

    const prepared = await prepareDocument(state.inputPath, { theme: state.themeOption });
    const previewHtmlPath = path.join(prepared.workspace.workspaceDir, "studio-preview.html");

    await mkdir(prepared.workspace.workspaceDir, { recursive: true });
    const htmlResult = await generatePreviewHtml(prepared);
    await writeFile(previewHtmlPath, htmlResult.html, "utf8");
    const openError = await tryOpenTarget(previewHtmlPath);
    setState((current) => ({
      ...current,
      status: openError ? `${openError} Open manually: ${previewHtmlPath}` : "Opened preview in the browser."
    }));
  }

  async function handleImportAssets(rawValue: string) {
    if (!state.inputPath) {
      setState((current) => ({ ...current, status: "Pick a markdown file first." }));
      return;
    }

    const sourcePaths = rawValue
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (!sourcePaths.length) {
      setState((current) => ({ ...current, status: "No asset paths provided." }));
      return;
    }

    const { imported } = await importWorkspaceAssets(path.dirname(state.inputPath), sourcePaths);
    setState((current) => ({
      ...current,
      status: `Imported ${imported.length} asset(s): ${imported
        .map((asset) => asset.markdownUrl)
        .join(", ")}`
    }));
    await refresh(state.inputPath);
  }

  async function handleSwitchFile(rawValue: string) {
    const nextInputPath = path.resolve(rawValue);
    await refresh(nextInputPath);
  }

  useInput((inputKey, key) => {
    if (promptMode) {
      if (key.return) {
        const submittedValue = promptValue.trim();
        setPromptValue("");
        const currentMode = promptMode;
        setPromptMode(null);

        if (!submittedValue) {
          setState((current) => ({
            ...current,
            status: currentMode === "asset" ? "Asset import cancelled." : "Path update cancelled."
          }));
          return;
        }

        void (currentMode === "asset"
          ? handleImportAssets(submittedValue)
          : handleSwitchFile(submittedValue));
        return;
      }

      if (key.escape) {
        setPromptMode(null);
        setPromptValue("");
        return;
      }

      if (key.backspace || key.delete) {
        setPromptValue((current) => current.slice(0, -1));
        return;
      }

      if (!key.ctrl && !key.meta && inputKey) {
        setPromptValue((current) => current + inputKey);
      }
      return;
    }

    if (inputKey === "q") {
      exit();
      return;
    }

    if (inputKey === "r") {
      void handleRender();
      return;
    }

    if (inputKey === "p") {
      void handlePreview();
      return;
    }

    if (inputKey === "v") {
      void refresh();
      return;
    }

    if (inputKey === "i") {
      setPromptMode("asset");
      setPromptValue("");
      return;
    }

    if (inputKey === "f") {
      setPromptMode("path");
      setPromptValue(state.inputPath ?? "");
      return;
    }

    if (inputKey === "]") {
      const nextPreset = findNextPreset(state.themePreset, 1);
      const presetTheme = getRenderThemePreset(nextPreset as typeof renderThemePresets[number]["id"]);
      setState((current) => ({
        ...current,
        themePreset: nextPreset,
        themeOption: nextPreset,
        status: `Theme preview target switched to ${nextPreset} (${presetTheme.bodyFont}/${presetTheme.headingFont}).`
      }));
      void refresh(state.inputPath, nextPreset);
      return;
    }

    if (inputKey === "[") {
      const nextPreset = findNextPreset(state.themePreset, -1);
      const presetTheme = getRenderThemePreset(nextPreset as typeof renderThemePresets[number]["id"]);
      setState((current) => ({
        ...current,
        themePreset: nextPreset,
        themeOption: nextPreset,
        status: `Theme preview target switched to ${nextPreset} (${presetTheme.bodyFont}/${presetTheme.headingFont}).`
      }));
      void refresh(state.inputPath, nextPreset);
      return;
    }

    if (inputKey === "o" && state.lastOutputPath) {
      void tryOpenTarget(state.lastOutputPath).then((openError) => {
        if (!openError) {
          return;
        }

        setState((current) => ({
          ...current,
          status: `${openError} Open manually: ${state.lastOutputPath}`
        }));
      });
    }
  });

  return (
    <Box flexDirection="column">
      <Text>{heading("md2pdf studio")}</Text>
      <Text>{muted("Keys: r render, p preview, v validate, i import assets, f file, q quit")}</Text>
      <Text>{muted("Theme cycle: [ previous, ] next. Open last PDF: o")}</Text>
      <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
        <Text>Document: {state.inputPath ?? "None selected"}</Text>
        <Text>Theme preset: {state.themePreset}</Text>
        <Text>Assets: {state.assets.length}</Text>
        <Text>Status: {state.loading ? "Working…" : state.status}</Text>
      </Box>

      {!!state.validationMessages.length && (
        <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
          <Text>Validation</Text>
          {state.validationMessages.slice(0, 5).map((message) => (
            <Text key={message}>- {message}</Text>
          ))}
        </Box>
      )}

      <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="green" paddingX={1}>
        <Text>Imported assets</Text>
        {state.assets.length ? (
          state.assets.slice(0, 6).map((asset) => (
            <Text key={asset.id}>
              - {asset.id} ({asset.originalName})
            </Text>
          ))
        ) : (
          <Text>{muted("No managed assets yet.")}</Text>
        )}
      </Box>

      <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1}>
        <Text>Recent activity</Text>
        {state.history.length ? (
          state.history.map((entry) => (
            <Text key={`${entry.createdAt}-${entry.title}`}>
              - {entry.title} [{entry.status}] {entry.createdAt}
            </Text>
          ))
        ) : (
          <Text>{muted("No recent history yet.")}</Text>
        )}
      </Box>

      {promptMode === "asset" ? (
        <Prompt label="Import asset paths (comma separated)" value={promptValue} />
      ) : null}
      {promptMode === "path" ? (
        <Prompt label="Markdown file path" value={promptValue} />
      ) : null}
    </Box>
  );
}

export async function launchStudio(props: StudioProps) {
  render(<StudioApp {...props} />);
}
