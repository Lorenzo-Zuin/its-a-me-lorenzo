# its-a-me-lorenzo

Sito personale lorenzozuin.com: Astro 7, React solo per le isole con stato, Motion per le transizioni di scena. Tutto in italiano.

## Verification commands
- Lint: none
- Type check: `npm run check`
- Build: `npm run build`
- Test: none
- Targeted check: `npm run check`
- Forbidden to the verifier: `npm run dev`, `npm run preview`, `git push`

## Generated folders
`node_modules/`, `dist/`, `.astro/`

## Orchestration
- Log: `.claude/orchestra/log.md`
- Work folder: `.claude/orchestra/lavori/<branch>/` (`<branch>` è il nome del branch git con `/` sostituito da `-`; la cartella `lavori/` non è versionata)
- Run the app: `npm run build ; npx astro preview --port 4321` (http://localhost:4321); Playwright è installato (`require('playwright')`, Chromium pronto)
- Shared resources: la porta 4321 (un solo server alla volta); il branch git (un solo agente scrive alla volta)
- Destructive commands never to run: `git push --force`, `git reset --hard`, `rm -rf`
- Brief rules: italiano nei commenti, nei testi e nei commit; niente parole ibride italiano-inglese (il termine inglese resta intero); nei comandi proposti all'utente `;` e mai `&&`; niente `as any`; ogni cosa pubblicata va vista a schermo (Playwright, fotogrammi a 1280×800 e 390×844); nelle transizioni di scena solo `transform`, `opacity`, `clip-path`, `filter`
