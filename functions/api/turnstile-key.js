/* Public sitekey only. The secret stays on POST /api/form. */

export async function onRequestGet({ env }) {
  const siteKey = String(env.FORM_TS_KEY || "").trim();

  if (!siteKey) {
    return Response.json({ siteKey: "" }, { status: 404 });
  }

  return Response.json(
    { siteKey },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
