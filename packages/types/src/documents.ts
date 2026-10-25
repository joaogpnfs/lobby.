import { z } from "zod";
import { listQuerySchema, type Ref } from "./people.js";

export const DOCUMENT_TYPES = ["CONTRACT", "IDENTITY", "CERTIFICATE", "PAYSLIP", "MEDICAL", "OTHER"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
export type DocumentMimeType = (typeof DOCUMENT_MIME_TYPES)[number];

export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024;

export const createDocumentSchema = z
  .object({
    employeeId: z.uuid(),
    name: z.string().trim().min(1).max(200),
    type: z.enum(DOCUMENT_TYPES),
    mimeType: z.enum(DOCUMENT_MIME_TYPES, "Tipo de arquivo não aceito"),
    size: z.number().int().min(1).max(MAX_DOCUMENT_SIZE, "O arquivo passa de 20 MB"),
    expiresAt: z.iso.date().nullish(),
  })
  .strict();
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const documentListQuerySchema = listQuerySchema.extend({
  employeeId: z.uuid().optional(),
  type: z.enum(DOCUMENT_TYPES).optional(),
  expiringBefore: z.iso.date().optional(),
});
export type DocumentListQuery = z.infer<typeof documentListQuerySchema>;

export type DocumentDto = {
  id: string;
  name: string;
  type: DocumentType;
  mimeType: string;
  size: number;
  status: "PENDING_UPLOAD" | "AVAILABLE";
  expiresAt: string | null;
  employee: Ref;
  uploadedBy: Ref;
  createdAt: string;
};

export type DocumentUpload = { document: DocumentDto; uploadUrl: string; headers: Record<string, string> };

export type SignedUrl = { url: string };
