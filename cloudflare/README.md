# Cloudflare

## Sito (Cloudflare Pages)

1. Cloudflare → Workers & Pages → Create → Pages → Connect to Git → scegli `Lorenzo-Zuin/its-a-me-lorenzo`.
2. Framework preset: **Astro**. Build command: `npm run build`. Output: `dist`. Node: 22.
3. Variabile d'ambiente (Production): `PUBLIC_SPOTIFY_ENDPOINT` = indirizzo del Worker qui sotto (quando esiste).
4. Custom domains → aggiungi `lorenzozuin.com` (il DNS è già su Cloudflare).

Ogni push su `main` pubblica. Ogni pull request ha un'anteprima con indirizzo proprio.

## Worker «ora in ascolto» (Spotify)

1. Spotify for Developers → Create app. Redirect URI: `http://127.0.0.1:8888/callback`. Segna Client ID e Client Secret.
2. Ottieni una volta sola il refresh token con lo scope `user-read-currently-playing user-read-recently-played`:
   apri nel browser
   `https://accounts.spotify.com/authorize?client_id=CLIENT_ID&response_type=code&redirect_uri=http%3A%2F%2F127.0.0.1%3A8888%2Fcallback&scope=user-read-currently-playing%20user-read-recently-played`
   e copia il `code` dall'indirizzo di ritorno; poi:
   `curl -X POST https://accounts.spotify.com/api/token -u CLIENT_ID:CLIENT_SECRET -d grant_type=authorization_code -d code=CODE -d redirect_uri=http://127.0.0.1:8888/callback`
   La risposta contiene `refresh_token`.
3. Cloudflare → Workers & Pages → Create → Worker → incolla `cloudflare/spotify/worker.js`.
4. Settings → Variables and Secrets: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN` (segreti), `ORIGINE_CONSENTITA` = `https://lorenzozuin.com`.
5. Copia l'indirizzo del Worker in `PUBLIC_SPOTIFY_ENDPOINT` del sito (Pages → Settings → Variables) e rifai il deploy.

Senza il Worker il piè di pagina mostra i segnaposto; non rompe nulla.
