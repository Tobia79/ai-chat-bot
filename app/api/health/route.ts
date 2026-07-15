import { NextResponse } from "next/server";
import { getServerConfig } from "@/server/config";

export const runtime = "nodejs";

export async function GET() {
  const config = getServerConfig();
  return NextResponse.json({
    ok: true,
    mode: config.mode,
    model: config.mode === "unconfigured" ? null : config.model,
  });
}
