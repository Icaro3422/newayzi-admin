/**
 * Proxy server-side para multipart/form-data hacia Django.
 *
 * Vive bajo /mpx/ (no bajo /api/) porque CloudFront/WAF del portal suele bloquear
 * POST grandes o multipart a rutas /api/* con 403 genérico, antes de llegar a Vercel.
 *
 * Rutas: /mpx/<path>  →  <BACKEND_URL>/<path>
 * Ej.: /mpx/api/admin/properties/1/pictures/ → BACKEND/api/admin/properties/1/pictures/
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function normalizeBackendUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

function getBackendUrl(): string {
  return normalizeBackendUrl(
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || ""
  );
}

function buildAuthHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  const auth = req.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;
  const xClerk = req.headers.get("x-clerk-authorization");
  if (xClerk) headers["X-Clerk-Authorization"] = xClerk;
  return headers;
}

async function proxyMultipart(
  req: NextRequest,
  path: string[],
  method: "POST" | "PATCH"
): Promise<NextResponse> {
  const backendBase = getBackendUrl();
  if (!backendBase) {
    console.error("[mpx] BACKEND_API_URL / NEXT_PUBLIC_API_URL no configurado.");
    return NextResponse.json(
      { detail: "Backend URL no configurada en el servidor del admin." },
      { status: 503 }
    );
  }

  const targetPath = path.join("/");
  const targetUrl = `${backendBase}/${targetPath}`;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (e) {
    console.error("[mpx] Error al parsear FormData:", e);
    return NextResponse.json({ detail: "FormData inválido." }, { status: 400 });
  }

  const authHeaders = buildAuthHeaders(req);

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method,
      body: formData,
      headers: authHeaders,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[mpx] Error de red al llamar ${targetUrl}:`, msg);
    return NextResponse.json(
      { detail: `No se pudo conectar al backend: ${msg}` },
      { status: 502 }
    );
  }

  const contentType = upstream.headers.get("content-type") || "application/json";
  const responseBody = await upstream.text();
  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: { "Content-Type": contentType },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyMultipart(req, path, "POST");
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyMultipart(req, path, "PATCH");
}
