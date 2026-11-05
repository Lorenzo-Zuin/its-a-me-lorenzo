# its-a-me-lorenzo

Il sito personale di Lorenzo Zuin: lorenzozuin.com.

- **Astro** per le pagine (HTML statico, View Transitions tra le pagine).
- **React** solo per le isole con stato: interruttore musica, orologio, «ora in ascolto».
- **Motion** per le transizioni di scena: ogni oggetto del tavolo ha la sua sequenza (`src/lib/viaggio.ts`), parte dal punto cliccato, copre lo schermo e lascia alla pagina nuova una copertura dello stesso colore (`html[data-arrivo]` in `global.css`).
- **Web Audio API** per la musica di sottofondo generata nel browser (`src/lib/musica.ts`), senza file audio.

## Comandi

```
npm install
npm run dev        # http://localhost:4321
npm run build      # produce dist/
npm run preview    # serve dist/
npm run check      # controllo dei tipi
```

## Struttura

```
src/
  pages/          index, chi-sono, contatti, esperimenti, collezione
  layouts/        Base.astro (head, testata, piè di pagina, router)
  components/     Tavolo (scena, didascalia, avvio delle transizioni), TavoloSvg (disegno), Raccoglitore (carte),
                  Testata, Pie, Musica.tsx, Orologio.tsx, Spotify.tsx, Saturno
  data/           progetti.ts: le carte del raccoglitore
  lib/            musica.ts (audio), cielo.ts (luna e pianeti), viaggio.ts (le otto transizioni di scena)
  styles/         global.css: token e regole comuni
cloudflare/       istruzioni di deploy e Worker Spotify
```

## Contenuti da sostituire

Cerca `[` nei file sotto `src/`: ogni testo tra parentesi quadre è un segnaposto (email, LinkedIn, righe su di te, progetti 3–6, schermate).
