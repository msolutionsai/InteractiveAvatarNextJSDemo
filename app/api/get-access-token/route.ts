// app/api/get-access-token/route.ts
export const dynamic = "force-dynamic";  // ⬅️ empêche tout pre-render/caching
export const revalidate = 0;
export const runtime = "nodejs";         // (edge possible aussi, mais nodejs OK)

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY!;
const BASE_API =
  process.env.NEXT_PUBLIC_BASE_API_URL?.trim() || "https://api.heygen.com";

export async function POST() {
  try {
    if (!HEYGEN_API_KEY) {
      return Response.json(
        { error: "Missing HEYGEN_API_KEY" },
        { status: 500 }
      );
    }

    const url = `${BASE_API}/v1/streaming.create_token`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": HEYGEN_API_KEY,
        "content-type": "application/json",
      },
      // très important pour éviter tout cache intermédiaire
      cache: "no-store",
      // @ts-ignore – Next 15 tolère ce hint pour s'assurer du no cache
      next: { revalidate: 0 },
    });

    // Propager les erreurs Heygen (ex: 401 clés invalides)
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return Response.json(
        {
          error: "Failed to create token",
          status: res.status,
          body: text,
        },
        { status: res.status }
      );
    }

    const data = await res.json().catch(() => ({} as any));
    const token = data?.data?.token;

    if (!token) {
      return Response.json(
        { error: "Token missing in Heygen response", raw: data },
        { status: 500 }
      );
    }

    // On renvoie du JSON (plus simple à débug côté front)
    return Response.json({ token }, { status: 200 });
  } catch (err: any) {
    return Response.json(
      { error: "Unexpected error", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
