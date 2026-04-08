/**
 * Route Handler — proxy server-side para la importación de inventario manual (Excel).
 *
 * El navegador no puede hacer un POST multipart directamente a api.production.newayzi.com
 * porque CloudFront/WAF devuelve 403 sin cabeceras CORS, causando "Failed to fetch".
 * Aquí el navegador sube el archivo al mismo origen (portal.newayzi.com/api/...) y
 * este handler lo reenvía al API de Django en el servidor, sin restricciones CORS.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

function getUpstream(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_PROXY_TARGET ||
    ""
  ).trim();
  if (!raw) return "";
  return raw.startsWith("http") ? raw.replace(/\/$/, "") : `https://${raw.replace(/\/$/, "")}`;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const upstream = getUpstream();
  if (!upstream) {
    return NextResponse.json(
      { detail: "Configuración incompleta: falta NEXT_PUBLIC_API_URL en el servidor." },
      { status: 500 }
    );
  }

  const { id } = await context.params;
  const target = `${upstream}/api/admin/properties/${id}/manual-inventory/import/`;

  const auth = request.headers.get("authorization") ?? "";

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { detail: "Cuerpo multipart inválido o ausente." },
      { status: 400 }
    );
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(target, {
      method: "POST",
      headers: auth ? { Authorization: auth } : {},
      body: formData,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { detail: `No se pudo conectar al API: ${msg}` },
      { status: 502 }
    );
  }

  const text = await backendRes.text();
  return new NextResponse(text, {
    status: backendRes.status,
    headers: {
      "Content-Type":
        backendRes.headers.get("content-type") ?? "application/json; charset=utf-8",
    },
  });
}
