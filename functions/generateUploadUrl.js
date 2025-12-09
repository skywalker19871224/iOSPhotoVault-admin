/**
 * Cloudflare Pages Function: generateUploadUrl
 * 
 * Generates an AWS Signature Version 4 (SigV4) presigned URL for R2 upload.
 * This implementation uses pure Web Crypto API and does not assume 'aws-sdk' dependency,
 * ensuring it works in a clean Cloudflare Pages environment without package.json.
 */

export async function onRequest(context) {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME
  } = context.env;

  // Basic validation of env vars
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error("Missing R2 Config: ", { R2_ACCOUNT_ID: !!R2_ACCOUNT_ID, R2_BUCKET_NAME: !!R2_BUCKET_NAME });
    return new Response(JSON.stringify({ error: "Missing R2 configuration environment variables." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { searchParams } = new URL(context.request.url);
  const fileName = searchParams.get("name");

  if (!fileName) {
    return new Response(JSON.stringify({ error: "Missing file name parameter." }), { status: 400 });
  }

  // Configuration for SigV4
  const REGION = "auto"; // R2 uses 'auto'
  const SERVICE = "s3";
  const EXPIRATION = 3600; // 1 hour
  const METHOD = "PUT";

  // Prepare date strings
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8); // YYYYMMDD

  // Host setup
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  // NOTE: R2/S3 requires specific encoding for the signature path calculation.
  // Standard encodeURIComponent encodes spaces as %20, which is correct for S3 path.
  // However, we must ensure consistency between the signed path and the actual requested path.
  const encodedFileName = encodeURIComponent(fileName);

  const objectPath = `/${R2_BUCKET_NAME}/${encodedFileName}`;
  const endpoint = `https://${host}${objectPath}`;

  // Canonical Request components
  // 1. Canonical URI
  const canonicalUri = objectPath;

  // 2. Canonical Query String
  // Must be sorted by param name.
  // We are generating new params, so we define them in order.
  const credential = `${R2_ACCESS_KEY_ID}/${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const canonicalQuerystring = [
    `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
    `X-Amz-Credential=${encodeURIComponent(credential)}`,
    `X-Amz-Date=${amzDate}`,
    `X-Amz-Expires=${EXPIRATION}`,
    `X-Amz-SignedHeaders=host`
  ].join("&");

  // 3. Canonical Headers
  // Must end with newline
  const canonicalHeaders = `host:${host}\n`;

  // 4. Signed Headers
  const signedHeaders = "host";

  // 5. Payload Hash
  const payloadHash = "UNSIGNED-PAYLOAD";

  const canonicalRequest = [
    METHOD,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");


  // String to Sign
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest)
  ].join("\n");

  // Calculate Signature
  const signingKey = await getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, REGION, SERVICE);
  const signature = await hmacHex(signingKey, stringToSign);

  // Construct Final URL
  const uploadUrl = `${endpoint}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;

  return Response.json({ uploadUrl });
}

// --- Helper Functions for Crypto (Web Crypto API) ---

async function sha256Hex(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return bufferToHex(hashBuffer);
}

async function hmacHex(key, message) {
  const msgBuffer = new TextEncoder().encode(message);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, msgBuffer);
  return bufferToHex(signatureBuffer);
}

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kSecret = new TextEncoder().encode("AWS4" + key);

  const kDate = await sign(kSecret, dateStamp);
  const kRegion = await sign(kDate, regionName);
  const kService = await sign(kRegion, serviceName);
  const kSigning = await sign(kService, "aws4_request");

  return kSigning;
}

async function sign(key, message) {
  const importKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const msgBuffer = new TextEncoder().encode(message);
  return await crypto.subtle.sign("HMAC", importKey, msgBuffer);
}
