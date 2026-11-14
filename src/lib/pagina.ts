/**
 * Ingressi e piccoli movimenti comuni a tutte le pagine:
 * testata, titoli, schede, bottoni magnetici, pillola del menu.
 */
import { gsap, ScrollTrigger, riduci, puntatoreFine, caratteriPronti, inPagina, allaUscita, titoloInRighe } from '@/lib/moto';
import { ritardoArrivo } from '@/lib/scena';

let primaVolta = true;

/** La testata scende solo al primo caricamento: nei cambi pagina è coperta dalla transizione. */
function testata(ritardo: number) {
  const pezzi = gsap.utils.toArray<HTMLElement>('.testata__logo, .testata__nav a, .testata__strumenti > *');
  if (!pezzi.length) return;
  if (!primaVolta) { gsap.set(pezzi, { autoAlpha: 1 }); return; }
  gsap.fromTo(pezzi, { y: -18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.045, delay: ritardo, clearProps: 'transform' });
}

/** La pillola segue il puntatore tra le voci del menu e torna sulla pagina corrente. */
function pillola() {
  const nav = document.querySelector<HTMLElement>('.testata__nav');
  if (!nav) return;
  const pill = document.createElement('span');
  pill.className = 'testata__pillola';
  nav.prepend(pill);
  const corrente = nav.querySelector<HTMLElement>('a[aria-current="page"]');
  let visibile = false;
  const su = (a: HTMLElement | null) => {
    if (!a) { visibile = false; gsap.to(pill, { autoAlpha: 0, scale: 0.9, duration: 0.3, overwrite: 'auto' }); return; }
    const v = { x: a.offsetLeft, y: a.offsetTop, width: a.offsetWidth, height: a.offsetHeight };
    if (!visibile) { gsap.set(pill, v); gsap.fromTo(pill, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: 0.35, overwrite: 'auto' }); }
    else gsap.to(pill, { ...v, autoAlpha: 1, scale: 1, duration: 0.5, ease: 'arrivo', overwrite: 'auto' });
    visibile = true;
  };
  su(corrente);
  nav.querySelectorAll<HTMLElement>('a').forEach((a) => {
    a.addEventListener('pointerenter', () => su(a));
    a.addEventListener('focus', () => su(a));
    a.addEventListener('blur', () => su(corrente));
  });
  nav.addEventListener('pointerleave', () => su(corrente));
  const rimisura = () => { if (visibile && corrente) gsap.set(pill, { x: corrente.offsetLeft, y: corrente.offsetTop, width: corrente.offsetWidth, height: corrente.offsetHeight }); };
  window.addEventListener('resize', rimisura);
  allaUscita(() => window.removeEventListener('resize', rimisura));
}

/** I bottoni si lasciano attirare dal puntatore e tornano al loro posto con un rimbalzo. */
function magneti() {
  if (!puntatoreFine()) return;
  gsap.utils.toArray<HTMLElement>('.bottone, .testata__logo').forEach((b) => {
    const x = gsap.quickTo(b, 'x', { duration: 0.35, ease: 'power3.out' });
    const y = gsap.quickTo(b, 'y', { duration: 0.35, ease: 'power3.out' });
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * 0.28);
      y((e.clientY - (r.top + r.height / 2)) * 0.4);
    });
    b.addEventListener('pointerleave', () => {
      gsap.to(b, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.38)', overwrite: true });
    });
    b.addEventListener('pointerdown', () => gsap.to(b, { scale: 0.95, duration: 0.12, ease: 'power2.out' }));
    const su = () => gsap.to(b, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    b.addEventListener('pointerup', su);
    b.addEventListener('pointerleave', su);
  });
}

/** Testa della pagina: il titolo sale riga per riga, il resto lo segue. */
function testa(ritardo: number) {
  gsap.utils.toArray<HTMLElement>('[data-entra-figli="testa"]').forEach((blocco) => {
    let t = ritardo;
    Array.from(blocco.children).forEach((figlio) => {
      if (figlio.hasAttribute('data-entra-propria')) { gsap.set(figlio, { autoAlpha: 1 }); return; }
      if (figlio.matches('h1, h2')) { titoloInRighe(figlio, { ritardo: t }); t += 0.16; }
      else { gsap.fromTo(figlio, { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, delay: t, clearProps: 'transform' }); t += 0.08; }
    });
  });
}

/** Elenchi e griglie: i figli entrano uno dopo l'altro quando arrivano in vista. */
function gruppi(ritardo: number) {
  gsap.utils.toArray<HTMLElement>('[data-entra-figli=""]').forEach((gruppo) => {
    const figli = Array.from(gruppo.children) as HTMLElement[];
    gsap.set(figli, { autoAlpha: 0, y: 44, rotationX: -14, transformPerspective: 900, transformOrigin: '50% 100%' });
    ScrollTrigger.create({
      trigger: gruppo,
      start: 'top 88%',
      once: true,
      onEnter: () => gsap.to(figli, { autoAlpha: 1, y: 0, rotationX: 0, duration: 0.95, stagger: 0.08, delay: ritardo + 0.25, clearProps: 'transform' }),
    });
  });
  // arrivo con un'ancora (per esempio /chi-sono#collezioni): la scheda di destinazione si fa notare
  const meta = location.hash ? document.querySelector<HTMLElement>(location.hash) : null;
  if (meta?.classList.contains('scheda')) {
    gsap.fromTo(meta, { boxShadow: '0 0 0 0 rgba(61,107,194,0.55), 0 1px 2px rgba(26,29,43,0.06)' }, { boxShadow: '0 0 0 14px rgba(61,107,194,0), 0 1px 2px rgba(26,29,43,0.06)', duration: 1.1, ease: 'power2.out', repeat: 1, delay: ritardo + 1.1, clearProps: 'boxShadow' });
  }
}

async function ingresso() {
  if (riduci()) { primaVolta = false; return; }
  const ritardo = ritardoArrivo();
  if (primaVolta) await caratteriPronti();
  inPagina(() => {
    testata(primaVolta ? 0.05 : 0);
    testa(ritardo + (primaVolta ? 0.15 : 0));
    gruppi(ritardo);
  });
  pillola();
  magneti();
  primaVolta = false;
  (window as unknown as { motoPronto?: boolean }).motoPronto = true;
}

let avviata = false;
export function avviaPagina(): void {
  if (avviata) return;
  avviata = true;
  document.addEventListener('astro:page-load', () => void ingresso());
}
