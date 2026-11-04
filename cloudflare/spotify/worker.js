/**
 * Worker Cloudflare: risponde con il brano in ascolto (o l'ultimo ascoltato) su Spotify.
 * Tiene il refresh token come segreto; il sito interroga solo questo indirizzo, mai Spotify.
 *
 * Variabili (Settings → Variables and Secrets del Worker):
 *   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN (segreti)
 *   ORIGINE_CONSENTITA = https://lorenzozuin.com   (testo)
 */
export default {
  async fetch(request, env) {
    const origine = env.ORIGINE_CONSENTITA ?? '*';
    const intestazioni = {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': origine,
      'cache-control': 'public, max-age=20',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: intestazioni });
    try {
      const token = await accessToken(env);
      let r = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers: { authorization: `Bearer ${token}` } });
      if (r.status === 200) {
        const d = await r.json();
        if (d && d.item) return new Response(JSON.stringify(brano(d.item, d.is_playing, d.progress_ms)), { headers: intestazioni });
      }
      r = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', { headers: { authorization: `Bearer ${token}` } });
      const d = await r.json();
      const ultimo = d && d.items && d.items[0];
      if (!ultimo) return new Response(JSON.stringify({ inAscolto: false, titolo: 'Niente in ascolto', artista: '' }), { headers: intestazioni });
      return new Response(JSON.stringify(brano(ultimo.track, false, 0)), { headers: intestazioni });
    } catch (e) {
      return new Response(JSON.stringify({ inAscolto: false, titolo: 'Niente in ascolto', artista: '' }), { status: 200, headers: intestazioni });
    }
  },
};

function brano(item, inAscolto, progresso) {
  return {
    inAscolto: !!inAscolto,
    titolo: item.name,
    artista: (item.artists || []).map((a) => a.name).join(', '),
    copertina: item.album && item.album.images && item.album.images[2] ? item.album.images[2].url : undefined,
    url: item.external_urls ? item.external_urls.spotify : undefined,
    avanzamento: item.duration_ms ? Math.min(1, (progresso || 0) / item.duration_ms) : 0,
  };
}

async function accessToken(env) {
  const corpo = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: env.SPOTIFY_REFRESH_TOKEN });
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      authorization: 'Basic ' + btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`),
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: corpo,
  });
  if (!r.ok) throw new Error('token');
  const d = await r.json();
  return d.access_token;
}
