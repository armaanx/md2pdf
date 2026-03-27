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

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(2).max(80)
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128)
});

export const createAssetSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(128)
});

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
  assetIds: z.array(z.string().min(1)).max(12).default([]),
  options: renderOptionsSchema.optional()
});

export const createJobSchema = z.object({
  markdown: z.string().min(1),
  filename: z.string().trim().min(1).max(255).optional(),
  assetIds: z.array(z.string().min(1)).max(12).default([]),
  options: renderOptionsSchema.optional()
});
