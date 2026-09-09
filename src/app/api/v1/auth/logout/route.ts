import { jsonOk } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const res = jsonOk({ ok: true }, { status: 200 });
  clearSessionCookie(res);
  res.headers.set("Location", "/");
  return res;
}