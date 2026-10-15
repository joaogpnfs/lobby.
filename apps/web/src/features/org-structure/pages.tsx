"use client";

import {
  branchInputSchema,
  departmentInputSchema,
  positionInputSchema,
  type BranchDto,
  type DepartmentDto,
  type PositionDto,
} from "@lobby/types";
import { CatalogPage } from "./catalog-page";

const text = (v: string | null | undefined) => v ?? "";

export function DepartmentsPage() {
  return (
    <CatalogPage<DepartmentDto>
      config={{
        resource: "departments",
        title: "Departamentos",
        description: "Como a empresa se divide: Engenharia, Financeiro, Pessoas.",
        singular: "departamento",
        empty: {
          title: "Nenhum departamento ainda",
          description: "Crie os departamentos da empresa para organizar as pessoas e definir quem lidera cada área.",
        },
        schema: departmentInputSchema,
        fields: [
          { name: "name", label: "Nome" },
          { name: "description", label: "Descrição", kind: "textarea" },
          { name: "managerId", label: "Responsável", kind: "employee" },
        ],
        columns: [
          { header: "Nome", cell: (d) => d.name },
          { header: "Responsável", cell: (d) => d.manager?.name ?? "—" },
        ],
        toForm: (d) => ({ name: d.name, description: text(d.description), managerId: text(d.manager?.id) }),
      }}
    />
  );
}

export function PositionsPage() {
  return (
    <CatalogPage<PositionDto>
      config={{
        resource: "positions",
        title: "Cargos",
        description: "As funções da empresa e seus níveis.",
        singular: "cargo",
        empty: {
          title: "Nenhum cargo ainda",
          description: "Cadastre cargos como Analista de RH ou Desenvolvedor para usar nos perfis dos colaboradores.",
        },
        schema: positionInputSchema,
        fields: [
          { name: "name", label: "Nome" },
          { name: "level", label: "Nível", hint: "Por exemplo: Júnior, Pleno, Sênior." },
          { name: "description", label: "Descrição", kind: "textarea" },
        ],
        columns: [
          { header: "Nome", cell: (p) => p.name },
          { header: "Nível", cell: (p) => p.level ?? "—" },
        ],
        toForm: (p) => ({ name: p.name, level: text(p.level), description: text(p.description) }),
      }}
    />
  );
}

export function BranchesPage() {
  return (
    <CatalogPage<BranchDto>
      config={{
        resource: "branches",
        title: "Filiais",
        description: "Onde as pessoas trabalham, incluindo remoto.",
        singular: "filial",
        empty: {
          title: "Nenhuma filial ainda",
          description: "Cadastre as unidades da empresa, como São Paulo, Teresina ou Remoto.",
        },
        schema: branchInputSchema,
        fields: [
          { name: "name", label: "Nome" },
          { name: "address", label: "Endereço" },
          { name: "city", label: "Cidade" },
          { name: "state", label: "Estado", hint: "Sigla, como PI ou SP." },
        ],
        columns: [
          { header: "Nome", cell: (b) => b.name },
          { header: "Cidade", cell: (b) => [b.city, b.state].filter(Boolean).join(" / ") || "—" },
        ],
        toForm: (b) => ({ name: b.name, address: text(b.address), city: text(b.city), state: text(b.state) }),
      }}
    />
  );
}
