import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.HEYGEN_API_KEY;

  // ✅ 1. Vérifie la présence de la clé API
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing HEYGEN_API_KEY in environment variables" },
      { status: 500 }
    );
  }

  try {
    // ✅ 2. Appel direct au vrai endpoint Heygen (plus de baseApiUrl inutile)
    const response = await fetch("https://api.heygen.com/v1/streaming.create_token", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      cache: "no-store", // ✅ 3. Empêche le cache Vercel (évite les vieux tokens)
    });

    // ✅ 4. Gestion stricte des erreurs HTTP
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Erreur API Heygen: ${text}`);
    }

    const data = await response.json();

    // ✅ 5. Retourne UNIQUEMENT le token (pas de JSON complet)
    return new Response(data.data.token, {
      status: 200,
    });
  } catch (err: any) {
    console.error("❌ Erreur création token Heygen:", err);
    return new Response("Failed to retrieve access token", { status: 500 });
  }
}
