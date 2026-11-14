# its-a-me-lorenzo

Il sito personale di Lorenzo Zuin: lorenzozuin.com.

- **Astro** per le pagine (HTML statico, View Transitions tra le pagine).
- **React** solo per le isole con stato: interruttore musica, orologio, «ora in ascolto».
- **GSAP** (libreria di animazione, con i plugin ScrollTrigger, SplitText, DrawSVG, ScrollTo, CustomEase) per tutto il movimento: ingresso del tavolo, vita degli oggetti, carte del raccoglitore, transizioni di scena.
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
  layouts/        Base.astro (head, testata, piè di pagina, router, strato delle transizioni)
  components/     Tavolo (ingresso, vita e reazioni degli oggetti), TavoloSvg (disegno), Raccoglitore (carte),
                  Testata, Pie, Musica.tsx, Orologio.tsx, Spotify.tsx, Saturno
  data/           progetti.ts: le carte del raccoglitore
  lib/            moto.ts (GSAP: plugin, curve, pulizia al cambio pagina), scena.ts (transizioni di scena),
                  pagina.ts (ingressi comuni, menu, bottoni), musica.ts (audio), cielo.ts (luna e pianeti)
  styles/         global.css: token e regole comuni
cloudflare/       istruzioni di deploy e Worker Spotify
```

## Contenuti da sostituire

Cerca `[` nei file sotto `src/`: ogni testo tra parentesi quadre è un segnaposto (email, LinkedIn, righe su di te, progetti 3–6, schermate).

## Animazioni

- Ogni oggetto del tavolo ha la sua transizione, definita in `src/lib/scena.ts`: caffè → Contatti, sistema solare → Chi sono, tastiera → Esperimenti, carte e monete → Chi sono, lente → raccoglitore. Tutti gli altri collegamenti interni usano il sipario.
- Lo strato `#scena` in `Base.astro` resta nel documento tra una pagina e l'altra (`transition:persist`): la copertura parte sulla pagina vecchia e la scoperta finisce su quella nuova.
- Con `prefers-reduced-motion: reduce` non parte nessuna animazione: le pagine cambiano subito e tutto il contenuto è visibile.
