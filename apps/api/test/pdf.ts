export type PdfText = { x: number; y: number; text: string };

export function makePdf(lines: PdfText[]) {
  const escape = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const stream = lines.map((l) => `BT /F1 10 Tf 1 0 0 1 ${l.x} ${l.y} Tm (${escape(l.text)}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((body, i) => {
    const offset = Buffer.byteLength(pdf, "latin1");
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

const column = (x: number, top: number, texts: string[]) => texts.map((text, i) => ({ x, y: top - i * 14, text }));

export const linkedinPdf = () =>
  makePdf([
    ...column(30, 760, [
      "Contato",
      "joao@exemplo.com",
      "www.linkedin.com/in/joao-",
      "gabriel-dev (LinkedIn)",
      "Principais competências",
      "TypeScript",
      "Liderança de equipes",
      "Idiomas",
      "Inglês (Professional Working)",
    ]),
    ...column(230, 760, [
      "João Gabriel",
      "Engenheiro de Software na Acme",
      "Teresina, Piauí, Brasil",
      "Resumo",
      "Construo produtos de RH.",
      "Experiência",
      "Acme",
      "3 anos 2 meses",
      "Engenheiro de Software Sênior",
      "janeiro de 2023 - o momento (1 ano 10 meses)",
      "Teresina, Piauí",
      "Engenheiro de Software",
      "setembro de 2021 - dezembro de 2022 (1 ano 4 meses)",
      "Globex",
      "Desenvolvedor",
      "março de 2019 - agosto de 2021 (2 anos 6 meses)",
      "Formação acadêmica",
      "Universidade Federal do Piauí",
      "Bacharelado, Ciência da Computação · (2015 - 2019)",
      "Página 1 de 1",
    ]),
  ]);
