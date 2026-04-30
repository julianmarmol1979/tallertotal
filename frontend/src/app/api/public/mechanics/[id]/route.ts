import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL!;

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const res = await fetch(`${BACKEND}/api/mechanics/${id}/public`, { cache: "no-store" });
  const body = await res.text();
  return new NextResponse(body, { status: res.status, headers: { "Content-Type": "application/json" } });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.text();
  const res = await fetch(`${BACKEND}/api/mechanics/${id}/push-subscribe`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return new NextResponse(null, { status: res.status });
}
