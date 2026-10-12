// ponytail: no storage yet, emails only reach the server log. Persist them
// (API table or email-provider audience) before sharing the site publicly.
export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  const email =
    typeof body === "object" && body !== null && "email" in body && typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json(
      { success: false, error: { code: "INVALID_EMAIL", message: "Digite um e-mail válido." } },
      { status: 400 },
    );
  }

  console.info(JSON.stringify({ event: "waitlist.joined", email }));
  return Response.json({ success: true, data: null });
}
