export async function onRequest(context) {
  const list = await context.env.BUCKET.list();
  return Response.json(list.objects);
}
