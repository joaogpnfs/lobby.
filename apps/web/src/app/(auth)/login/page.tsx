import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Entrar · lobby." };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, linkedin } = await searchParams;
  return (
    <LoginForm
      next={typeof next === "string" ? next : undefined}
      linkedin={
        process.env.LINKEDIN_CLIENT_ID ? { result: typeof linkedin === "string" ? linkedin : undefined } : undefined
      }
    />
  );
}
