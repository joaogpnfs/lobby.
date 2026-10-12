import Image from "next/image";
import { person, type PersonSlug, type Tint } from "@/lib/people";

// Light "paper" behind each line-art face.
const paper: Record<Tint, string> = {
  sky: "#dfeafb",
  mint: "#dcf2e3",
  peach: "#fde6d3",
  lavender: "#e8e3f6",
  rose: "#fbe1ea",
};

export function Avatar({
  slug,
  size = 40,
  className = "",
  decorative = false,
}: {
  slug: PersonSlug;
  size?: number;
  className?: string;
  decorative?: boolean;
}) {
  const p = person(slug);
  return (
    <Image
      src={`/people/${slug}.svg`}
      alt={decorative ? "" : p.name}
      width={size}
      height={size}
      unoptimized
      className={`shrink-0 rounded-full ring-2 ring-canvas ${className}`}
      style={{ background: paper[p.tint] }}
    />
  );
}
