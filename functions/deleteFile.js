export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const key = searchParams.get("key");

  if (!key) return new Response("Missing key", { status: 400 });

  await context.env.BUCKET.delete(key);
  return new Response("OK", { status: 200 });
}
