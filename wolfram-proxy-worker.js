/**
 * NutriCare — WolframAlpha CORS Proxy (Cloudflare Worker)
 *
 * Deploy steps (no CLI needed):
 *   1. Go to https://workers.cloudflare.com and create a free account.
 *   2. Click "Create Application" → "Create Worker".
 *   3. Replace the default script with this entire file.
 *   4. Click "Deploy".
 *   5. Copy the worker URL shown (e.g. https://nutricare-wolfram.YOUR-NAME.workers.dev)
 *   6. Paste that URL into NutriCare → Profile → WolframAlpha → "Proxy URL".
 *
 * The worker forwards requests to WolframAlpha and adds the CORS header
 * that browsers require. Your App ID travels as a query parameter and is
 * used only to authenticate with WolframAlpha — it is not logged or stored.
 *
 * To restrict to your domain only, set ALLOWED_ORIGIN below.
 */

const ALLOWED_ORIGIN = '*'; // or 'https://rumrunnerpro.github.io'

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const appid = url.searchParams.get('appid');

    if (!query) return json({ error: 'Missing query parameter: q' }, 400);
    if (!appid)  return json({ error: 'Missing query parameter: appid' }, 400);

    const waParams = new URLSearchParams({
      input:  query,
      appid:  appid,
      output: 'json',
      format: 'plaintext',
    });

    let waResp;
    try {
      waResp = await fetch(`https://api.wolframalpha.com/v2/query?${waParams}`);
    } catch (e) {
      return json({ error: 'Failed to reach WolframAlpha', detail: String(e) }, 502);
    }

    const body = await waResp.text();
    return new Response(body, {
      status: waResp.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Cache-Control': 'no-store',
      },
    });
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    },
  });
}
