import { z } from "zod";

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

export const createJobSchema = z.object({
  markdown: z.string().min(1),
  filename: z.string().trim().min(1).max(255).optional(),
  assetIds: z.array(z.string().min(1)).max(12).default([])
});

