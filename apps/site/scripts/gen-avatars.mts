// Run: node --experimental-strip-types scripts/gen-avatars.mts
import { mkdirSync, writeFileSync } from "node:fs";
import { createAvatar } from "@dicebear/core";
import { notionists } from "@dicebear/collection";
import { people } from "../src/lib/people.ts";

const dir = new URL("../public/people/", import.meta.url);
mkdirSync(dir, { recursive: true });

for (const p of people) {
  const svg = createAvatar(notionists, { seed: p.name }).toString();
  writeFileSync(new URL(`${p.slug}.svg`, dir), svg);
}
console.log(`wrote ${people.length} avatars`);
