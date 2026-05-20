import { z } from "zod";

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const renderThemeFontSchema = z.enum([
  "manrope",
  "systemSans",
  "avenir",
  "optima",
  "georgia",
  "garamond",
  "baskerville",
  "palatino",
  "mono"
]);

export const renderThemeSchema = z.object({
  bodyFont: renderThemeFontSchema,
  headingFont: renderThemeFontSchema,
  fontSize: z.number().int().min(12).max(20),
  lineHeight: z.number().min(1.2).max(2),
  pagePadding: z.number().int().min(28).max(88),
  pageRadius: z.number().int().min(0).max(28),
  h1Size: z.number().int().min(22).max(42),
  h2Size: z.number().int().min(16).max(32),
  h3Size: z.number().int().min(14).max(26),
  backgroundColor: hexColorSchema,
  sheetColor: hexColorSchema,
  textColor: hexColorSchema,
  mutedColor: hexColorSchema,
  lineColor: hexColorSchema,
  accentColor: hexColorSchema,
  accentSoftColor: hexColorSchema,
  codeBackground: hexColorSchema,
  codeText: hexColorSchema,
  tableHeadColor: hexColorSchema,
  blockquoteColor: hexColorSchema,
  shadowEnabled: z.boolean(),
  shadowColor: hexColorSchema,
  shadowBlur: z.number().int().min(0).max(100),
  shadowOpacity: z.number().min(0).max(0.5),
  shadowOffsetY: z.number().int().min(0).max(40)
});

export const renderOptionsSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  timeoutMs: z.number().int().positive().max(120_000).optional(),
  theme: renderThemeSchema.optional()
});

export const previewRequestSchema = z.object({
  markdown: z.string().min(1),
  options: renderOptionsSchema.optional()
});

export const convertRequestSchema = z.object({
  markdown: z.string().min(1),
  filename: z.string().trim().min(1).max(255).optional(),
  options: renderOptionsSchema.optional()
});

export const MAX_MARKDOWN_BYTES = Number(process.env.MAX_MARKDOWN_BYTES ?? 262_144);
export const RENDER_TIMEOUT_MS = Number(process.env.RENDER_TIMEOUT_MS ?? 30_000);
