import type { ProfessionalProfile, ProfileImport } from "@lobby/types";
import { getDocumentProxy } from "unpdf";

type Lines = { main: string[]; side: string[] };

const SIDEBAR_RATIO = 0.35;
const PAGE_FOOTER = /^(page|página)\s+\d+\s+(of|de)\s+\d+$/i;

export async function pdfLines(data: Uint8Array): Promise<Lines> {
  const pdf = await getDocumentProxy(data);
  const out: Lines = { main: [], side: [] };
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const width = page.view[2]!;
    const rows = new Map<string, { side: boolean; y: number; items: { x: number; w: number; str: string }[] }>();
    for (const item of (await page.getTextContent()).items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const [, , , , x, y] = item.transform as number[];
      const side = x! < width * SIDEBAR_RATIO;
      const key = `${side}:${Math.round(y!)}`;
      const row = rows.get(key) ?? { side, y: y!, items: [] };
      row.items.push({ x: x!, w: item.width, str: item.str });
      rows.set(key, row);
    }
    for (const row of [...rows.values()].sort((a, b) => b.y - a.y)) {
      const items = row.items.sort((a, b) => a.x - b.x);
      let text = "";
      for (const [i, it] of items.entries()) {
        const prev = items[i - 1];
        text += prev && it.x - (prev.x + prev.w) > 1 ? ` ${it.str}` : it.str;
      }
      text = text.replace(/\s+/g, " ").trim();
      if (text && !PAGE_FOOTER.test(text)) (row.side ? out.side : out.main).push(text);
    }
  }
  return out;
}

const HEADINGS: Record<string, string[]> = {
  summary: ["resumo", "summary", "sobre", "about"],
  experience: ["experiência", "experience"],
  education: ["formação acadêmica", "education"],
  skills: ["principais competências", "top skills", "competências"],
  contact: ["contato", "contact"],
  other: [
    "languages",
    "idiomas",
    "certifications",
    "certificações",
    "honors-awards",
    "prêmios",
    "publications",
    "publicações",
  ],
};

function sections(lines: string[]) {
  const out: Record<string, string[]> = { head: [] };
  let current = "head";
  for (const line of lines) {
    const heading = Object.entries(HEADINGS).find(([, names]) => names.includes(line.toLowerCase()));
    if (heading) {
      current = heading[0];
      out[current] ??= [];
    } else {
      (out[current] ??= []).push(line);
    }
  }
  return out;
}

const MONTHS: Record<string, string> = {};
[
  ["janeiro", "january"],
  ["fevereiro", "february"],
  ["março", "march"],
  ["abril", "april"],
  ["maio", "may"],
  ["junho", "june"],
  ["julho", "july"],
  ["agosto", "august"],
  ["setembro", "september"],
  ["outubro", "october"],
  ["novembro", "november"],
  ["dezembro", "december"],
].forEach((names, i) => names.forEach((m) => (MONTHS[m] = String(i + 1).padStart(2, "0"))));

const monthNames = Object.keys(MONTHS).join("|");
const point = `(?:(${monthNames})\\s+(?:de\\s+)?)?(\\d{4})`;
const RANGE = new RegExp(`^${point}\\s*[-–]\\s*(?:${point}|present|presente|o momento|atual)`, "i");
const DURATION = /^(\d+\s+(anos?|years?|m[eê]s(es)?|months?)\s*)+$/i;
const DEGREE = /\s·\s|\(\d{4}\s*[-–]\s*\d{4}\)/;

const cut = (text: string | null | undefined, max: number) => (text ? text.slice(0, max) : null);

const yearMonth = (month: string | undefined, year: string | undefined) =>
  year ? (month ? `${year}-${MONTHS[month.toLowerCase()]}` : year) : null;

function experiences(lines: string[]): ProfessionalProfile["experiences"] {
  const out: ProfessionalProfile["experiences"] = [];
  let prevDate = -10;
  lines.forEach((line, i) => {
    const m = RANGE.exec(line);
    if (!m || i === 0) return;
    const title = lines[i - 1]!;
    let company: string | null;
    const sameCompany = i - 2 === prevDate || (i - 2 === prevDate + 1 && lines[i - 2]!.includes(","));
    if (sameCompany) company = out.at(-1)?.company ?? null;
    else if (lines[i - 2] && DURATION.test(lines[i - 2]!)) company = lines[i - 3] ?? null;
    else company = lines[i - 2] ?? null;
    out.push({
      title: title.slice(0, 200),
      company: cut(company, 200),
      start: yearMonth(m[1], m[2]),
      end: yearMonth(m[3], m[4]),
    });
    prevDate = i;
  });
  return out;
}

function education(lines: string[]): ProfessionalProfile["education"] {
  const out: ProfessionalProfile["education"] = [];
  for (const line of lines) {
    if (DEGREE.test(line) && out.length && out.at(-1)!.degree === null) {
      const [degree, period] = line.split(/\s·\s/);
      out.at(-1)!.degree =
        degree!
          .replace(/\(\d{4}.*\)$/, "")
          .trim()
          .slice(0, 300) || null;
      out.at(-1)!.period = (period ?? line).match(/\d{4}\s*[-–]\s*\d{4}/)?.[0].replace(/\s/g, "") ?? null;
    } else if (!DEGREE.test(line)) {
      out.push({ school: line.slice(0, 200), degree: null, period: null });
    }
  }
  return out;
}

export function parseLinkedinProfile({ main, side }: Lines): ProfileImport {
  const body = sections(main);
  const aside = sections(side);
  const url = aside.contact?.join("").match(/linkedin\.com\/in\/[\w%-]+/i)?.[0];
  return {
    linkedinUrl: url ? `https://www.${url.toLowerCase()}` : null,
    profile: {
      headline: cut(body.head?.[1], 220),
      summary: body.summary?.join(" ").slice(0, 2600) || null,
      experiences: experiences(body.experience ?? []).slice(0, 50),
      education: education(body.education ?? []).slice(0, 20),
      skills: (aside.skills ?? []).slice(0, 50).map((skill) => skill.slice(0, 80)),
    },
  };
}
