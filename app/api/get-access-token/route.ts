// app/api/get-access-token/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // ✅ exécution côté Node

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const BASE_URL = "https://api.heygen.com/v1/streaming.create_token";

export async function POST() {
  try {
    if (!HEYGEN_API_KEY) {
      console.error("🚫 HEYGEN_API_KEY manquant dans .env");

      return new Response(
        JSON.stringify({ error: "Missing HEYGEN_API_KEY" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "x-api-key": HEYGEN_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ Erreur Heygen API:", res.status, text);

      return new Response(
        JSON.stringify({ error: `Heygen API error: ${res.status}`, raw: text }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const data = await res.json();
    const token = data?.data?.token;

    if (!token) {
      console.error("⚠️ Aucun token reçu de Heygen:", data);

      return new Response(
        JSON.stringify({ error: "Token not received", raw: data }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log("✅ Token Heygen généré avec succès");
    return new Response(
      JSON.stringify({ token }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("🔥 Erreur inattendue /api/get-access-token:", err);

    return new Response(
      JSON.stringify({ error: "Unexpected error", detail: err?.message || err }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
