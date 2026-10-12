import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lobby",
  description:
    "Colaboradores, férias, documentos, benefícios e ponto num lugar só. Gestão de pessoas para empresas brasileiras.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${figtree.variable} antialiased`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
