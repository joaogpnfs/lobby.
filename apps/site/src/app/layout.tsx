import type { Metadata } from "next";
import { Cal_Sans, Figtree, Geist } from "next/font/google";
import { DesignSwitch } from "@/components/design-switch";
import "./globals.css";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
// Option B fonts (/b).
const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const cal = Cal_Sans({ variable: "--font-cal", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lobby",
  description:
    "Colaboradores, férias, documentos, benefícios e ponto num lugar só. Gestão de pessoas para empresas brasileiras.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${figtree.variable} ${geist.variable} ${cal.variable} antialiased`}>
      <body className="font-sans">
        {children}
        <DesignSwitch />
      </body>
    </html>
  );
}
