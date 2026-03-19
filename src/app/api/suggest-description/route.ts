import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  name?: string;
  cityName?: string;
  address?: string;
  propertyType?: string;
  amenities?: string[];
  locale?: string;
};

/**
 * Genera una descripción sugerida para una propiedad (OpenAI).
 * Requiere OPENAI_API_KEY en el entorno del admin.
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY no está configurada en el servidor del admin." },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const locale = body.locale === "en" ? "en" : "es";
  const name = body.name?.trim() || "Alojamiento";
  const city = body.cityName?.trim() || "";
  const address = body.address?.trim() || "";
  const propertyType = body.propertyType?.trim() || "hotel";
  const amenities = Array.isArray(body.amenities)
    ? body.amenities.filter((a): a is string => typeof a === "string" && a.trim().length > 0)
    : [];

  const system =
    locale === "en"
      ? "You write concise, welcoming property descriptions for a vacation rental / hotel booking website. Output HTML with <p> paragraphs only (no headings). No placeholders like [city]. Be specific using the facts given."
      : "Escribes descripciones concisas y atractivas de alojamientos para un sitio de reservas. Salida en HTML solo con párrafos <p> (sin títulos). Sin marcadores tipo [ciudad]. Usa los datos proporcionados.";

  const userPayload = {
    locale,
    name,
    city,
    address,
    propertyType,
    amenities,
    instructions:
      locale === "en"
        ? "Write 2–3 short paragraphs: (1) location and atmosphere, (2) key amenities and comfort, (3) who it is ideal for (families, business, digital nomads, etc.). Tone: warm, professional."
        : "Redacta 2–3 párrafos breves: (1) ubicación y ambiente, (2) equipamiento y confort destacados, (3) para quién es ideal (familias, negocios, nómadas digitales, etc.). Tono: cercano y profesional.",
  };

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
        temperature: 0.65,
        max_tokens: 700,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[suggest-description] OpenAI error", res.status, errText);
      return NextResponse.json(
        { error: "No se pudo generar la descripción. Revisa la clave y el modelo." },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const description = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!description) {
      return NextResponse.json({ error: "Respuesta vacía del modelo" }, { status: 502 });
    }

    return NextResponse.json({ description });
  } catch (e) {
    console.error("[suggest-description]", e);
    return NextResponse.json({ error: "Error al contactar OpenAI" }, { status: 502 });
  }
}
