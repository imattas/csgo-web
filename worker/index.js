export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // The two large map models are stored as upload-safe parts and streamed
    // back as one GLB request for the browser.
    if (url.pathname.startsWith('/__local-large/')) {
      const assetPath = url.pathname.slice('/__local-large'.length);
      const partCount = { '/models/oasis.glb': 3, '/z/models/oasis_mobile.glb': 2 }[assetPath];
      if (!partCount) return new Response('Not found', { status: 404 });

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for (let part = 1; part <= partCount; part++) {
              const suffix = String(part).padStart(3, '0');
              const partRequest = new Request(new URL(`/csgo${assetPath}.part${suffix}`, request.url));
              const response = await env.ASSETS.fetch(partRequest);
              if (!response.ok || !response.body) throw new Error(`Missing local asset part ${suffix}`);
              const reader = response.body.getReader();
              while (true) {
                const chunk = await reader.read();
                if (chunk.done) break;
                controller.enqueue(chunk.value);
              }
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });
      return new Response(stream, { headers: { 'content-type': 'model/gltf-binary', 'cache-control': 'public, max-age=3600' } });
    }

    return env.ASSETS.fetch(request);
  },
};
