/**
 * Cloudflare Pages Function
 * Endpoint: /api/upload
 * 
 * Future implementation will handle R2 PUT operations here.
 */

export async function onRequest(context) {
    const { request } = context;

    if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    // TODO: Parse body (FormData) and upload to R2

    // Placeholder response
    return new Response(JSON.stringify({
        success: true,
        message: "Upload endpoint stub reached. No R2 storage configured yet."
    }), {
        headers: {
            "Content-Type": "application/json"
        }
    });
}
