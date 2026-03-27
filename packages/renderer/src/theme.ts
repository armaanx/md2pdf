export type RenderThemeFontId =
  | "manrope"
  | "systemSans"
  | "avenir"
  | "optima"
  | "georgia"
  | "garamond"
  | "baskerville"
  | "palatino"
  | "mono";

export type RenderThemePresetId =
  | "studio"
  | "editorial"
  | "graphite"
  | "sunrise"
  | "midnight"
  | "noir"
  | "obsidian"
  | "atelier"
  | "eclipse";

export type RenderThemeConfig = {
  bodyFont: RenderThemeFontId;
  headingFont: RenderThemeFontId;
  fontSize: number;
  lineHeight: number;
  pagePadding: number;
  pageRadius: number;
  h1Size: number;
  h2Size: number;
  h3Size: number;
  backgroundColor: string;
  sheetColor: string;
  textColor: string;
  mutedColor: string;
  lineColor: string;
  accentColor: string;
  accentSoftColor: string;
  codeBackground: string;
  codeText: string;
  tableHeadColor: string;
  blockquoteColor: string;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOpacity: number;
  shadowOffsetY: number;
};

export type RenderThemePreset = {
  id: RenderThemePresetId;
  label: string;
  description: string;
  tone: "light" | "dark";
  theme: RenderThemeConfig;
};

export const renderThemeFontChoices: Array<{
  id: RenderThemeFontId;
  label: string;
  cssValue: string;
}> = [
  { id: "manrope", label: "Manrope", cssValue: '"Manrope", sans-serif' },
  {
    id: "systemSans",
    label: "System Sans",
    cssValue:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  {
    id: "avenir",
    label: "Avenir",
    cssValue: '"Avenir Next", Avenir, "Segoe UI", "Helvetica Neue", sans-serif'
  },
  {
    id: "optima",
    label: "Optima",
    cssValue: 'Optima, Candara, "Noto Sans", sans-serif'
  },
  { id: "georgia", label: "Georgia", cssValue: 'Georgia, "Times New Roman", serif' },
  {
    id: "garamond",
    label: "Garamond",
    cssValue: 'Garamond, Baskerville, "Times New Roman", serif'
  },
  {
    id: "baskerville",
    label: "Baskerville",
    cssValue: 'Baskerville, "Palatino Linotype", "Book Antiqua", Georgia, serif'
  },
  {
    id: "palatino",
    label: "Palatino",
    cssValue: '"Palatino Linotype", "Book Antiqua", Palatino, serif'
  },
  { id: "mono", label: "Mono", cssValue: '"JetBrains Mono", monospace' }
];

const defaultTheme: RenderThemeConfig = {
  bodyFont: "manrope",
  headingFont: "manrope",
  fontSize: 14,
  lineHeight: 1.62,
  pagePadding: 50,
  pageRadius: 0,
  h1Size: 28,
  h2Size: 19,
  h3Size: 15,
  backgroundColor: "#edf2f7",
  sheetColor: "#ffffff",
  textColor: "#132238",
  mutedColor: "#5b6b7f",
  lineColor: "#d9e2ec",
  accentColor: "#12677c",
  accentSoftColor: "#e3f2f3",
  codeBackground: "#0f172a",
  codeText: "#e2e8f0",
  tableHeadColor: "#f6fbfc",
  blockquoteColor: "#f7fbfc",
  shadowEnabled: true,
  shadowColor: "#0f172a",
  shadowBlur: 60,
  shadowOpacity: 0.12,
  shadowOffsetY: 24
};

export const renderThemePresets: RenderThemePreset[] = [
  {
    id: "studio",
    label: "Studio",
    description: "Clean cyan technical document styling.",
    tone: "light",
    theme: defaultTheme
  },
  {
    id: "editorial",
    label: "Editorial",
    description: "Serif headings, warmer paper tones, and softer contrast.",
    tone: "light",
    theme: {
      bodyFont: "georgia",
      headingFont: "palatino",
      fontSize: 15,
      lineHeight: 1.72,
      pagePadding: 56,
      pageRadius: 0,
      h1Size: 31,
      h2Size: 22,
      h3Size: 17,
      backgroundColor: "#efe8dc",
      sheetColor: "#fffdf8",
      textColor: "#2c241f",
      mutedColor: "#7a6658",
      lineColor: "#e2d5c4",
      accentColor: "#8b5e34",
      accentSoftColor: "#f0e4d7",
      codeBackground: "#2f241f",
      codeText: "#f8efe6",
      tableHeadColor: "#f8f1e7",
      blockquoteColor: "#f7efe4",
      shadowEnabled: true,
      shadowColor: "#3a2414",
      shadowBlur: 54,
      shadowOpacity: 0.14,
      shadowOffsetY: 22
    }
  },
  {
    id: "graphite",
    label: "Graphite",
    description: "Sharper monochrome layout with cooler accents.",
    tone: "light",
    theme: {
      bodyFont: "systemSans",
      headingFont: "systemSans",
      fontSize: 14,
      lineHeight: 1.56,
      pagePadding: 48,
      pageRadius: 10,
      h1Size: 29,
      h2Size: 20,
      h3Size: 16,
      backgroundColor: "#d8dde3",
      sheetColor: "#f9fafb",
      textColor: "#18212b",
      mutedColor: "#586473",
      lineColor: "#c4ced8",
      accentColor: "#304b67",
      accentSoftColor: "#dfe7ef",
      codeBackground: "#111827",
      codeText: "#e5edf6",
      tableHeadColor: "#edf2f7",
      blockquoteColor: "#eef3f8",
      shadowEnabled: true,
      shadowColor: "#111827",
      shadowBlur: 44,
      shadowOpacity: 0.14,
      shadowOffsetY: 18
    }
  },
  {
    id: "sunrise",
    label: "Sunrise",
    description: "Warm contrast with brighter accent color and rounded surfaces.",
    tone: "light",
    theme: {
      bodyFont: "manrope",
      headingFont: "manrope",
      fontSize: 15,
      lineHeight: 1.68,
      pagePadding: 54,
      pageRadius: 18,
      h1Size: 30,
      h2Size: 21,
      h3Size: 16,
      backgroundColor: "#fff1e6",
      sheetColor: "#fffaf5",
      textColor: "#2b1b14",
      mutedColor: "#785c4a",
      lineColor: "#f0d6c7",
      accentColor: "#d95d39",
      accentSoftColor: "#fde4d8",
      codeBackground: "#3d231d",
      codeText: "#fff1ea",
      tableHeadColor: "#fff0e7",
      blockquoteColor: "#fff1ea",
      shadowEnabled: true,
      shadowColor: "#5d2e20",
      shadowBlur: 56,
      shadowOpacity: 0.16,
      shadowOffsetY: 22
    }
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "Dark technical paper with electric cyan accents.",
    tone: "dark",
    theme: {
      bodyFont: "manrope",
      headingFont: "manrope",
      fontSize: 14,
      lineHeight: 1.62,
      pagePadding: 50,
      pageRadius: 16,
      h1Size: 29,
      h2Size: 20,
      h3Size: 16,
      backgroundColor: "#091018",
      sheetColor: "#101a24",
      textColor: "#e8f3fb",
      mutedColor: "#98aebc",
      lineColor: "#243847",
      accentColor: "#42d7ff",
      accentSoftColor: "#163442",
      codeBackground: "#06131d",
      codeText: "#d7efff",
      tableHeadColor: "#132430",
      blockquoteColor: "#10202b",
      shadowEnabled: true,
      shadowColor: "#000000",
      shadowBlur: 72,
      shadowOpacity: 0.34,
      shadowOffsetY: 28
    }
  },
  {
    id: "noir",
    label: "Noir",
    description: "Minimal dark PDF styling with neutral graphite contrast.",
    tone: "dark",
    theme: {
      bodyFont: "systemSans",
      headingFont: "systemSans",
      fontSize: 14,
      lineHeight: 1.58,
      pagePadding: 48,
      pageRadius: 10,
      h1Size: 28,
      h2Size: 20,
      h3Size: 16,
      backgroundColor: "#111315",
      sheetColor: "#191d21",
      textColor: "#f2f4f7",
      mutedColor: "#a2abb4",
      lineColor: "#2a3138",
      accentColor: "#d3d7dc",
      accentSoftColor: "#23292f",
      codeBackground: "#0d1014",
      codeText: "#e8edf3",
      tableHeadColor: "#20262c",
      blockquoteColor: "#1d2228",
      shadowEnabled: true,
      shadowColor: "#000000",
      shadowBlur: 66,
      shadowOpacity: 0.3,
      shadowOffsetY: 24
    }
  },
  {
    id: "obsidian",
    label: "Obsidian",
    description: "Luxurious charcoal pages with a warm brass accent and refined serif headings.",
    tone: "dark",
    theme: {
      bodyFont: "avenir",
      headingFont: "baskerville",
      fontSize: 15,
      lineHeight: 1.68,
      pagePadding: 56,
      pageRadius: 18,
      h1Size: 32,
      h2Size: 22,
      h3Size: 17,
      backgroundColor: "#090909",
      sheetColor: "#141416",
      textColor: "#f3ede2",
      mutedColor: "#b8ad9c",
      lineColor: "#302b26",
      accentColor: "#c8a977",
      accentSoftColor: "#2a231d",
      codeBackground: "#0b0d10",
      codeText: "#f7efe4",
      tableHeadColor: "#1b1c20",
      blockquoteColor: "#17181c",
      shadowEnabled: true,
      shadowColor: "#000000",
      shadowBlur: 76,
      shadowOpacity: 0.36,
      shadowOffsetY: 28
    }
  },
  {
    id: "atelier",
    label: "Atelier",
    description: "Ink-blue editorial dark mode with elegant serif rhythm and soft champagne contrast.",
    tone: "dark",
    theme: {
      bodyFont: "garamond",
      headingFont: "palatino",
      fontSize: 15,
      lineHeight: 1.74,
      pagePadding: 60,
      pageRadius: 14,
      h1Size: 31,
      h2Size: 22,
      h3Size: 17,
      backgroundColor: "#081018",
      sheetColor: "#101924",
      textColor: "#f5efe7",
      mutedColor: "#b4ad9f",
      lineColor: "#223242",
      accentColor: "#d9b27c",
      accentSoftColor: "#182838",
      codeBackground: "#09131d",
      codeText: "#eaf3ff",
      tableHeadColor: "#142230",
      blockquoteColor: "#11202d",
      shadowEnabled: true,
      shadowColor: "#000000",
      shadowBlur: 74,
      shadowOpacity: 0.34,
      shadowOffsetY: 30
    }
  },
  {
    id: "eclipse",
    label: "Eclipse",
    description: "Deep plum-black document styling with bright porcelain text and crisp cyan structure.",
    tone: "dark",
    theme: {
      bodyFont: "optima",
      headingFont: "avenir",
      fontSize: 14,
      lineHeight: 1.64,
      pagePadding: 52,
      pageRadius: 20,
      h1Size: 30,
      h2Size: 21,
      h3Size: 16,
      backgroundColor: "#0b0b12",
      sheetColor: "#161822",
      textColor: "#f3f5ff",
      mutedColor: "#aeb4c8",
      lineColor: "#2a3144",
      accentColor: "#7fe5ff",
      accentSoftColor: "#1b2233",
      codeBackground: "#0b1020",
      codeText: "#ebf6ff",
      tableHeadColor: "#1a2030",
      blockquoteColor: "#171d2a",
      shadowEnabled: true,
      shadowColor: "#000000",
      shadowBlur: 80,
      shadowOpacity: 0.38,
      shadowOffsetY: 30
    }
  }
];

const themePresetMap = new Map(renderThemePresets.map((preset) => [preset.id, preset.theme]));
const fontCssMap = new Map(renderThemeFontChoices.map((choice) => [choice.id, choice.cssValue]));

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function pickFont(fontId: RenderThemeFontId | undefined) {
  return fontId && fontCssMap.has(fontId) ? fontId : defaultTheme.bodyFont;
}

function pickColor(color: string | undefined, fallback: string) {
  return color && isHexColor(color) ? color : fallback;
}

function hexToRgbTriplet(hex: string) {
  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `${red} ${green} ${blue}`;
}

export function getRenderThemePreset(id: RenderThemePresetId) {
  return themePresetMap.get(id) ?? defaultTheme;
}

export function getDefaultRenderTheme() {
  return defaultTheme;
}

export function resolveRenderTheme(theme?: Partial<RenderThemeConfig>): RenderThemeConfig {
  return {
    bodyFont: pickFont(theme?.bodyFont),
    headingFont: pickFont(theme?.headingFont),
    fontSize: clamp(theme?.fontSize ?? defaultTheme.fontSize, 12, 20),
    lineHeight: clamp(theme?.lineHeight ?? defaultTheme.lineHeight, 1.2, 2),
    pagePadding: clamp(theme?.pagePadding ?? defaultTheme.pagePadding, 28, 88),
    pageRadius: clamp(theme?.pageRadius ?? defaultTheme.pageRadius, 0, 28),
    h1Size: clamp(theme?.h1Size ?? defaultTheme.h1Size, 22, 42),
    h2Size: clamp(theme?.h2Size ?? defaultTheme.h2Size, 16, 32),
    h3Size: clamp(theme?.h3Size ?? defaultTheme.h3Size, 14, 26),
    backgroundColor: pickColor(theme?.backgroundColor, defaultTheme.backgroundColor),
    sheetColor: pickColor(theme?.sheetColor, defaultTheme.sheetColor),
    textColor: pickColor(theme?.textColor, defaultTheme.textColor),
    mutedColor: pickColor(theme?.mutedColor, defaultTheme.mutedColor),
    lineColor: pickColor(theme?.lineColor, defaultTheme.lineColor),
    accentColor: pickColor(theme?.accentColor, defaultTheme.accentColor),
    accentSoftColor: pickColor(theme?.accentSoftColor, defaultTheme.accentSoftColor),
    codeBackground: pickColor(theme?.codeBackground, defaultTheme.codeBackground),
    codeText: pickColor(theme?.codeText, defaultTheme.codeText),
    tableHeadColor: pickColor(theme?.tableHeadColor, defaultTheme.tableHeadColor),
    blockquoteColor: pickColor(theme?.blockquoteColor, defaultTheme.blockquoteColor),
    shadowEnabled: theme?.shadowEnabled ?? defaultTheme.shadowEnabled,
    shadowColor: pickColor(theme?.shadowColor, defaultTheme.shadowColor),
    shadowBlur: clamp(theme?.shadowBlur ?? defaultTheme.shadowBlur, 0, 100),
    shadowOpacity: clamp(theme?.shadowOpacity ?? defaultTheme.shadowOpacity, 0, 0.5),
    shadowOffsetY: clamp(theme?.shadowOffsetY ?? defaultTheme.shadowOffsetY, 0, 40)
  };
}

export function getRenderThemeCssVariables(theme: RenderThemeConfig) {
  const resolved = resolveRenderTheme(theme);

  return `:root {
        --page-bg: ${resolved.backgroundColor};
        --sheet-bg: ${resolved.sheetColor};
        --text: ${resolved.textColor};
        --muted: ${resolved.mutedColor};
        --line: ${resolved.lineColor};
        --accent: ${resolved.accentColor};
        --accent-soft: ${resolved.accentSoftColor};
        --code-bg: ${resolved.codeBackground};
        --code-text: ${resolved.codeText};
        --table-head: ${resolved.tableHeadColor};
        --blockquote-bg: ${resolved.blockquoteColor};
        --font-body: ${fontCssMap.get(resolved.bodyFont)};
        --font-heading: ${fontCssMap.get(resolved.headingFont)};
        --font-mono: "JetBrains Mono", monospace;
        --font-size: ${resolved.fontSize}px;
        --line-height: ${resolved.lineHeight};
        --page-padding: ${resolved.pagePadding}px;
        --sheet-radius: ${resolved.pageRadius}px;
        --h1-size: ${resolved.h1Size}px;
        --h2-size: ${resolved.h2Size}px;
        --h3-size: ${resolved.h3Size}px;
        --shadow: ${resolved.shadowEnabled
          ? `0 ${resolved.shadowOffsetY}px ${resolved.shadowBlur}px rgb(${hexToRgbTriplet(resolved.shadowColor)} / ${resolved.shadowOpacity})`
          : "none"};
      }`;
}
