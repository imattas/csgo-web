const PASSCODE = "156200";
const COOKIE_NAME = "web_dashers_access";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

const encoder = new TextEncoder();

async function signature(value) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(PASSCODE),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hasAccess(request) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;

  const [issuedAt, provided] = decodeURIComponent(match[1]).split(".");
  const timestamp = Number(issuedAt);
  if (!Number.isFinite(timestamp) || Date.now() - timestamp > SESSION_SECONDS * 1000) return false;
  return provided === await signature(issuedAt);
}

function gatePage(error = "", nextPath = "/") {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Web Dashers | Locked</title>
<style>
  *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#0b101b;color:#f4f7fb;font:16px system-ui,sans-serif}
  main{width:min(420px,100%);padding:36px;border:1px solid #29364d;border-radius:20px;background:#121928;box-shadow:0 24px 80px #0008}h1{margin:0 0 10px;font-size:2rem}p{color:#9ca8bb;line-height:1.5}label{display:block;margin:25px 0 8px;color:#cbd6e6;font-size:.85rem;font-weight:700}input{width:100%;padding:13px 14px;border:1px solid #3a4964;border-radius:10px;background:#0c1220;color:white;font-size:1.1rem;letter-spacing:.18em}button{width:100%;margin-top:14px;padding:13px;border:0;border-radius:10px;background:#7dceff;color:#08111e;font-weight:800;font-size:1rem;cursor:pointer}.error{min-height:1.4em;color:#ff8e8e}
</style></head><body><main><h1>Web Dashers is locked</h1><p>Enter the passcode to access the launcher and both games.</p><form method="post" action="/__unlock"><label for="code">Passcode</label><input id="code" name="code" type="password" inputmode="numeric" autocomplete="current-password" required autofocus><input type="hidden" name="next" value="${escapeHtml(nextPath)}"><button>Unlock site</button><p class="error">${error}</p></form></main></body></html>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/__unlock" && request.method === "POST") {
      const form = await request.formData();
      if (form.get("code") !== PASSCODE) {
        return new Response(gatePage("That passcode is not correct.", String(form.get("next") || "/")), { status: 401, headers: { "content-type": "text/html; charset=UTF-8", "cache-control": "no-store" } });
      }

      const issuedAt = String(Date.now());
      const token = `${issuedAt}.${await signature(issuedAt)}`;
      const next = String(form.get("next") || "/");
      const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/";
      return new Response(null, { status: 302, headers: { "location": destination, "set-cookie": `${COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${SESSION_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`, "cache-control": "no-store" } });
    }

    if (!(await hasAccess(request))) {
      return new Response(gatePage("", url.pathname), { status: 401, headers: { "content-type": "text/html; charset=UTF-8", "cache-control": "no-store" } });
    }

    if (url.pathname.startsWith("/__local-large/")) {
      const assetPath = url.pathname.slice("/__local-large".length);
      const partCount = { "/models/oasis.glb": 3, "/z/models/oasis_mobile.glb": 2 }[assetPath];
      if (!partCount) return new Response("Not found", { status: 404 });

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for (let part = 1; part <= partCount; part++) {
              const suffix = String(part).padStart(3, "0");
              const partRequest = new Request(new URL(`/csgo/_external/assets.clutcher.io${assetPath}.part${suffix}`, request.url));
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
      return new Response(stream, { headers: { "content-type": "model/gltf-binary", "cache-control": "private, max-age=3600" } });
    }

    return env.ASSETS.fetch(request);
  },
};
