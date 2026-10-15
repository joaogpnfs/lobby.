import type { Metadata } from "next";
import { EditEmployee } from "@/features/employees/edit-employee";

export const metadata: Metadata = { title: "Editar colaborador · lobby." };

export default async function Page({ params }: PageProps<"/employees/[id]/edit">) {
  const { id } = await params;
  return <EditEmployee id={id} />;
}
