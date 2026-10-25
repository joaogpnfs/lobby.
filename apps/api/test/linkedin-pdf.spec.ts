import { professionalProfileSchema } from "@lobby/types";
import { describe, expect, it } from "vitest";
import { parseLinkedinProfile, pdfLines } from "../src/modules/employees/linkedin-pdf.js";
import { linkedinPdf } from "./pdf.js";

const expected = {
  linkedinUrl: "https://www.linkedin.com/in/joao-gabriel-dev",
  profile: {
    headline: "Engenheiro de Software na Acme",
    summary: "Construo produtos de RH.",
    experiences: [
      { title: "Engenheiro de Software Sênior", company: "Acme", start: "2023-01", end: null },
      { title: "Engenheiro de Software", company: "Acme", start: "2021-09", end: "2022-12" },
      { title: "Desenvolvedor", company: "Globex", start: "2019-03", end: "2021-08" },
    ],
    education: [
      { school: "Universidade Federal do Piauí", degree: "Bacharelado, Ciência da Computação", period: "2015-2019" },
    ],
    skills: ["TypeScript", "Liderança de equipes"],
  },
};

describe("LinkedIn PDF import", () => {
  it("reads the two columns of a LinkedIn PDF and extracts the profile", async () => {
    const parsed = parseLinkedinProfile(await pdfLines(new Uint8Array(linkedinPdf())));
    expect(parsed).toEqual(expected);
    expect(professionalProfileSchema.safeParse(parsed.profile).success).toBe(true);
  });

  it("understands the English export", () => {
    const parsed = parseLinkedinProfile({
      side: ["Top Skills", "SQL"],
      main: [
        "Ana Lima",
        "HR Manager",
        "São Paulo",
        "Experience",
        "Initech",
        "HR Manager",
        "May 2020 - Present (4 years)",
      ],
    });
    expect(parsed.profile).toMatchObject({
      headline: "HR Manager",
      experiences: [{ title: "HR Manager", company: "Initech", start: "2020-05", end: null }],
      skills: ["SQL"],
    });
    expect(parsed.linkedinUrl).toBeNull();
  });
});
