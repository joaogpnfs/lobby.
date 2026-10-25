import type { Metadata } from "next";
import { DocumentsPage } from "@/features/documents/documents-list";

export const metadata: Metadata = { title: "Documentos · lobby." };

export default function Page() {
  return <DocumentsPage />;
}
