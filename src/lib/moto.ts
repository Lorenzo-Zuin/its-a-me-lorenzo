/**
 * Base comune delle animazioni: registra i plugin di GSAP una volta sola,
 * definisce le curve del sito e gestisce il ciclo di vita tra una pagina e l'altra.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, SplitText, DrawSVGPlugin, CustomEase);

// Curve del sito. «arrivo»: parte veloce e si posa piano. «caduta»: accelera come un oggetto che cade.
CustomEase.create('arrivo', '0.16, 1, 0.3, 1');
CustomEase.create('scena', '0.76, 0, 0.24, 1');
CustomEase.create('caduta', '0.5, 0, 0.9, 0.4');

gsap.defaults({ ease: 'arrivo', duration: 0.6 });
gsap.config({ nullTargetWarn: false });

export { gsap, ScrollTrigger, SplitText };

export const riduci = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const puntatoreFine = (): boolean => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Attende i caratteri (al massimo `limite` ms): serve prima di dividere un testo in righe. */
export function caratteriPronti(limite = 500): Promise<void> {
  return Promise.race([
    document.fonts.ready.then(() => undefined),
    new Promise<void>((r) => window.setTimeout(r, limite)),
  ]);
}

type Pulizia = () => void;
const pulizie: Pulizia[] = [];

/** Registra cosa disfare quando la pagina cambia (animazioni, ascoltatori, cicli). */
export function allaUscita(fn: Pulizia): void {
  pulizie.push(fn);
}

/**
 * Esegue `fn` in un contesto GSAP legato alla pagina corrente: al cambio pagina
 * tutte le animazioni e gli ScrollTrigger creati dentro `fn` vengono disfatti.
 */
export function inPagina(fn: () => void): void {
  const ctx = gsap.context(fn);
  allaUscita(() => ctx.revert());
}

if (typeof document !== 'undefined') {
  document.addEventListener('astro:before-swap', () => {
    pulizie.splice(0).forEach((fn) => {
      try { fn(); } catch { /* una pulizia fallita non deve fermare le altre */ }
    });
  });
}

/**
 * Titolo che sale riga per riga da dietro una maschera.
 * Restituisce la timeline, così chi chiama la può inserire nella propria sequenza.
 */
export function titoloInRighe(el: Element, opzioni: { ritardo?: number; passo?: number } = {}): gsap.core.Timeline {
  const { ritardo = 0, passo = 0.09 } = opzioni;
  const tl = gsap.timeline({ delay: ritardo });
  const diviso = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'riga' });
  gsap.set(el, { autoAlpha: 1 });
  tl.from(diviso.lines, { yPercent: 108, rotate: 2.5, transformOrigin: '0% 100%', duration: 0.95, stagger: passo });
  // a fine corsa il testo torna intero: così va a capo in modo corretto se la finestra cambia
  tl.eventCallback('onComplete', () => diviso.revert());
  return tl;
}
