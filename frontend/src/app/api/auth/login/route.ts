import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:5123";

export async function POST(request: Request) {
  const body = await request.json();

  // Determine if this is an admin login or regular user login
  const endpoint = body.password && !body.username
    ? `${BACKEND}/api/auth/admin-login`
    : `${BACKEND}/api/auth/login`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Error de autenticación" }));
    return NextResponse.json(err, { status: res.status });
  }

  const data = await res.json();
  const response = NextResponse.json({ ok: true, role: data.role, tenantName: data.tenantName });

  const cookieOpts = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  };

  response.cookies.set("mecaflow_token", data.token, { ...cookieOpts, httpOnly: true });

  // Readable cookie so the client-side sidebar can show the tenant name
  if (data.tenantName) {
    response.cookies.set("mecaflow_tenant", data.tenantName, { ...cookieOpts, httpOnly: false });
  }

  return response;
}
