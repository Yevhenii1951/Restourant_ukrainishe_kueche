import { z } from "zod";
import type { PublicMenu, SupportedLocale } from "./domain";

export interface ReferenceRow {
  code: string;
  label_localized: { de: string; en?: string; uk?: string };
}

export interface MenuStore {
  listPublicMenu(locale: SupportedLocale): Promise<PublicMenu>;
}

const referenceRowSchema = z.object({
  code: z.string().min(1),
  label_localized: z.object({
    de: z.string(),
    en: z.string().optional(),
    uk: z.string().optional(),
  }),
});

export function parseReferenceRow(row: unknown): ReferenceRow {
  return referenceRowSchema.parse(row);
}