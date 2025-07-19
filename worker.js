import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle the token API route
    if (url.pathname === "/api/mapbox-token") {
      return new Response(
        JSON.stringify({ token: env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Handle static assets
    try {
      return await getAssetFromKV({ request }, env);
    } catch (e) {
      return new Response("Not found", { status: 404 });
    }
  },
};
