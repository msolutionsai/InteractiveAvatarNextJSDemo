// app/api/get-access-token/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY!;
const BASE_API =
  process.env.NEXT_PUBLIC_BASE_API_URL?.trim() || "https://api.heygen.com";

export async function POST() {
  try {
    if (!HEYGEN_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing HEYGEN_API_KEY" }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        }
      );
    }

    const url = `${BASE_API}/v1/streaming.create_token`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": HEYGEN_API_KEY,
        "content-type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return new Response(
        JSON.stringify({
          error: "Failed to create token",
          status: res.status,
          body: text,
        }),
        {
          status: res.status,
          headers: { "content-type": "application/json" },
        }
      );
    }

    const data = await res.json().catch(() => ({}));
    const token = data?.data?.token;

    if (!token) {
      return new Response(
        JSON.stringify({
          error: "Token missing in Heygen response",
          raw: data,
        }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: "Unexpected error",
        detail: String(err?.message || err),
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }
}
