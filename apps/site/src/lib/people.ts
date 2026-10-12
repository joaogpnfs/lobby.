// Example people used across the landing page. Illustrations are generated once
// by scripts/gen-avatars.mts (DiceBear "Notionists", CC0) into public/people/.
export type Tint = "sky" | "mint" | "peach" | "lavender" | "rose";

export type Person = { slug: string; name: string; role: string; tint: Tint };

export const people = [
  { slug: "larissa", name: "Larissa Prado", role: "Analista de RH", tint: "rose" },
  { slug: "tiago", name: "Tiago Menezes", role: "Desenvolvedor", tint: "sky" },
  { slug: "bruna", name: "Bruna Okamoto", role: "Designer", tint: "mint" },
  { slug: "caio", name: "Caio Ribeiro", role: "Vendas", tint: "peach" },
  { slug: "helena", name: "Helena Duarte", role: "Gerente de operações", tint: "lavender" },
  { slug: "jessica", name: "Jéssica Amaral", role: "Suporte", tint: "sky" },
  { slug: "otavio", name: "Otávio Lins", role: "Engenharia", tint: "mint" },
] as const satisfies readonly Person[];

export type PersonSlug = (typeof people)[number]["slug"];

export const person = (slug: PersonSlug) => people.find((p) => p.slug === slug)!;
