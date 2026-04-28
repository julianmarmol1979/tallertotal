import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("mecaflow_token");
  response.cookies.delete("mecaflow_tenant");
  return response;
}
