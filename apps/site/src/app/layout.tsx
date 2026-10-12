import type { Metadata } from "next";
import { Gabarito } from "next/font/google";
import "./globals.css";

const gabarito = Gabarito({ variable: "--font-gabarito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "lobby.",
  description:
    "Colaboradores, férias, documentos, benefícios e ponto num lugar só. Gestão de pessoas para empresas brasileiras.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${gabarito.variable} antialiased`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
