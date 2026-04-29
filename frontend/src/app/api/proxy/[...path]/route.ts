import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:5123";

async function forward(req: Request, params: { path: string[] }, method: string) {
  const token = (await cookies()).get("tallertotal_token")?.value;
  const path = params.path.join("/");
  const search = new URL(req.url).search;
  const url = `${BACKEND}/api/${path}${search}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const body = method !== "GET" && method !== "DELETE" ? await req.text() : undefined;
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(req, await params, "GET");
}
export async function POST(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(req, await params, "POST");
}
export async function PUT(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(req, await params, "PUT");
}
export async function PATCH(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(req, await params, "PATCH");
}
export async function DELETE(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(req, await params, "DELETE");
}
