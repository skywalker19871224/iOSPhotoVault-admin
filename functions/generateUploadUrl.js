export async function onRequest(context) {
  const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET_NAME } = context.env;

  const { searchParams } = new URL(context.request.url);
  const fileName = searchParams.get("name");

  if (!fileName) {
    return new Response("Missing file name", { status: 400 });
  }

  const url = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${fileName}`;

  const signedUrl = await context.env.BUCKET.createPresignedUrl({
    key: fileName,
    method: "PUT",
    expiration: 3600
  });

  return Response.json({ uploadUrl: signedUrl });
}
