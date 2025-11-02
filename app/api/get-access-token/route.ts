// app/api/get-access-token/route.ts
export const dynamic = "force-dynamic";

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

export async function POST() {
  if (!HEYGEN_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing HEYGEN_API_KEY" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const response = await fetch("https://api.heygen.com/v1/streaming.create_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": HEYGEN_API_KEY,
      },
    });

    const data = await response.json();
    if (!data?.data?.token) {
      return new Response(
        JSON.stringify({ error: "Failed to create token", raw: data }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ token: data.data.token }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: "Unexpected error", detail: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
