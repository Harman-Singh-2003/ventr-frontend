import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event));
});

async function handleRequest(event) {
  const request = event.request;
  const url = new URL(request.url);

  // API route for token
  if (url.pathname === "/api/mapbox-token") {
    const token = NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "not_set";
    return new Response(
      JSON.stringify({ token }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  // Serve static assets
  try {
    return await getAssetFromKV(event);
  } catch (e) {
    return new Response("Not found", { status: 404 });
  }
}
