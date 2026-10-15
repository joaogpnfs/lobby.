import { redirect } from "next/navigation";

// The (app) layout sends visitors without a session on to /login.
export default function Home() {
  redirect("/dashboard");
}
