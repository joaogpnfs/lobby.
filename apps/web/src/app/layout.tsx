import type { Metadata } from "next";
import { Gabarito } from "next/font/google";
import { connection } from "next/server";
import { QueryProvider } from "@/lib/query-provider";
import "./globals.css";

const gabarito = Gabarito({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "lobby.",
  description: "Gestão de pessoas para empresas brasileiras.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  return (
    <html lang="pt-BR" className={`${gabarito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
