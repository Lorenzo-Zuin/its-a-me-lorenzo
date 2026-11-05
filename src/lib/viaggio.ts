/**
 * Transizioni di scena del tavolo.
 *
 * Le scene che portano a un'altra pagina durano 1,2 s dal click a `navigate()` e hanno tre tempi:
 * 0–0,2 s l'oggetto reagisce (una molla sull'oggetto vero dello SVG); 0,2–0,9 s il viaggio, con la
 * copertura che arriva a tutto schermo verso 0,9 s su una curva lenta in partenza; 0,9–1,2 s i dettagli
 * svaniscono e l'ultimo fotogramma è esattamente la copertura che la pagina nuova mostra all'arrivo
 * (stesso colore, stesso centro e raggio del gradiente: vedi global.css, `html[data-arrivo]`).
 *
 * Le coperture crescono con `clip-path` su strati HTML a tutto schermo: le trame (dorso delle carte,
 * tasti, stelle) restano della loro misura. Si animano solo transform, opacity, clip-path e filter.
 */
import { animate, stagger, type AnimationSequence, type Timeline } from 'motion';
import { longitudine, type Pianeta } from '@/lib/cielo';

export type Scena = 'caffe' | 'cielo' | 'lente' | 'raccoglitore' | 'bacchette' | 'moneta' | 'carte' | 'tastiera';
type Segmento = AnimationSequence[number];
type Bezier = [number, number, number, number];

/** Curva base del sito (arrivi). */
export const CURVA: Bezier = [0.16, 1, 0.3, 1];

/** Curva del viaggio: parte lenta, così si vede l'oggetto che se ne va, e rallenta all'arrivo. */
export const CURVA_VIAGGIO: Bezier = [0.65, 0, 0.35, 1];

/** Curva delle coperture: parte subito (a 0,3 s la copertura è già avviata) e arriva morbida a tutto schermo. */
const CURVA_COPERTURA: Bezier = [0.5, 0, 0.3, 1];

/** Curva più lenta per ciò che «sfila» mentre lo sfondo copre lo schermo. */
const PASSAGGIO: Bezier = [0.5, 0.05, 0.25, 1];

/** La reazione dell'oggetto al click. */
const MOLLA = { type: 'spring', stiffness: 320, damping: 16 } as const;

/** Durata di ogni scena, in secondi (le bacchette seguono i loro cerchi). */
const DURATA: Record<Scena, number> = {
  caffe: 1.2,
  cielo: 1.2,
  moneta: 1.2,
  carte: 1.2,
  tastiera: 1.2,
  lente: 1.0,
  raccoglitore: 1.0,
  bacchette: 0,
};

/** Colore piatto di riserva per la dissolvenza con `prefers-reduced-motion`. */
const COLORE_PIATTO: Partial<Record<Scena, string>> = {
  caffe: '#4a2e1b',
  cielo: '#1a2f66',
  moneta: '#dca62e',
  carte: '#3d6bc2',
  tastiera: '#232741',
};

/** Margine oltre lo schermo degli strati con gli angoli arrotondati: a tutto schermo gli angoli restano fuori. */
const MARGINE = 24;

export interface Contesto {
  /** Il contenitore a tutto schermo della scena (`[data-viaggio]`). */
  radice: HTMLElement;
  /** Lo SVG a tutto schermo per gli anelli sottili (viewBox in pixel). */
  svg: SVGSVGElement;
  /** L'oggetto cliccato (`<a data-oggetto>`). */
  oggetto: SVGElement;
  /** La forma di riferimento dell'oggetto (tazza, cielo, anello...). */
  forma: DOMRect;
  cx: number;
  cy: number;
  /** Raggio della forma di riferimento, in pixel. */
  r0: number;
  vw: number;
  vh: number;
  /** Distanza dal centro all'angolo più lontano dello schermo. */
  lontano: number;
  /** Raggio del gradiente della copertura all'arrivo (copre lo schermo con un po' di margine). */
  raggio: number;
  /** Punto del click, se c'è stato un puntatore. */
  punto: { x: number; y: number } | null;
  /** Registra un elemento della pagina di cui ripulire gli stili alla fine. */
  tocca: (el: Element) => void;
  /** Esegue `azione` dopo `secondi` (annullata se la scena viene ripulita prima). */
  dopo: (secondi: number, azione: () => void) => void;
  /** Impedisce lo scorrimento orizzontale finché la scena è aperta (per ciò che si ingrandisce oltre lo schermo). */
  blocca: () => void;
  /** Vero se la musica è accesa (serve alle bacchette). */
  musica: boolean;
}

const NS = 'http://www.w3.org/2000/svg';

function nodo<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributi: Record<string, string | number> = {},
  figli: Element[] = [],
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attributi)) el.setAttribute(k, String(v));
  for (const f of figli) el.appendChild(f);
  return el;
}

/** Cerchio con tratto a spessore costante, anche se scalato. */
function anello(r: number, stroke: string, larghezza: number, opacita = 1): SVGCircleElement {
  return nodo('circle', {
    r,
    fill: 'none',
    stroke,
    'stroke-width': larghezza,
    'stroke-opacity': opacita,
    'vector-effect': 'non-scaling-stroke',
  });
}

/** Gruppo SVG centrato in (x, y): i figli si scalano attorno a quel punto. */
function gruppo(c: Contesto, figli: Element[], x = c.cx, y = c.cy): SVGGElement {
  const g = nodo('g', { transform: `translate(${x.toFixed(2)} ${y.toFixed(2)})` }, figli);
  c.svg.appendChild(g);
  return g;
}

/** Un `div` con lo stile dato, appeso a `genitore`. */
function blocco(genitore: HTMLElement, stile: string, testo = ''): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = stile;
  if (testo) el.textContent = testo;
  genitore.appendChild(el);
  return el;
}

/** Strato a tutto schermo. */
const strato = (c: Contesto, stile: string) => blocco(c.radice, `position:absolute;inset:0;${stile}`);

/** Strato che esce dallo schermo di `MARGINE` su ogni lato: per le coperture con gli angoli arrotondati. */
const stratoLargo = (c: Contesto, stile: string) => blocco(c.radice, `position:absolute;inset:${-MARGINE}px;${stile}`);

const px = (n: number) => `${n.toFixed(1)}px`;
const cerchio = (r: number, x: number, y: number) => `circle(${px(r)} at ${px(x)} ${px(y)})`;

/** Rettangolo dello schermo (coordinate della finestra) come `inset()` di uno strato largo. */
function riquadro(c: Contesto, r: { left: number; top: number; right: number; bottom: number }, tondo: number): string {
  const alto = r.top + MARGINE;
  const destra = c.vw + MARGINE - r.right;
  const basso = c.vh + MARGINE - r.bottom;
  const sinistra = r.left + MARGINE;
  return `inset(${px(alto)} ${px(destra)} ${px(basso)} ${px(sinistra)} round ${px(tondo)})`;
}

/** Il rettangolo che copre tutto lo strato largo. */
const pieno = (tondo: number) => `inset(0px 0px 0px 0px round ${px(tondo)})`;

/** Gradiente radiale della copertura all'arrivo, centrato sull'oggetto (stessi colori di global.css). */
function gradiente(c: Contesto, colori: string, x = c.cx, y = c.cy): string {
  return `radial-gradient(circle ${c.raggio}px at ${px(x)} ${px(y)}, ${colori})`;
}
const CAFFE = '#6b4529 0%, #4a2e1b 45%, #2c1a0e 100%';
const NOTTE = '#2b54ac 0%, #1a2f66 70%, #0f1c40 100%';
const ORO = '#f3cc6a 0%, #dca62e 55%, #b9861f 100%';

/** L'oggetto vero dello SVG reagisce con una molla, partendo da dove si trova (anche sollevato dal mouse). */
function reazione(c: Contesto, verso: string, at = 0): Segmento {
  c.tocca(c.oggetto);
  const da = getComputedStyle(c.oggetto).transform;
  return [c.oggetto, { transform: [da === 'none' ? 'none' : da, verso] }, { ...MOLLA, at }];
}

/**
 * La reazione delle scene che cambiano pagina: si solleva di 6 px sullo schermo e cresce del 14 %
 * (la molla va anche oltre). Il sollevamento è in unità dello SVG, che sul telefono è disegnato più piccolo.
 */
function salto(c: Contesto): string {
  const disegno = c.oggetto.ownerSVGElement;
  const larghezza = disegno?.viewBox.baseVal.width || 1;
  const k = disegno ? disegno.getBoundingClientRect().width / larghezza : 1;
  return `translateY(${px(-6 / (k || 1))}) scale(1.14)`;
}

/** Rende visibile `el` all'istante `at` (prima è nascosto). */
const appare = (el: Element, at: number): Segmento => [el, { opacity: [0, 1] }, { at, duration: 0.01, ease: 'linear' }];

/** Numeri pseudo-casuali ripetibili: le stelle cadono sempre allo stesso posto. */
function casuale(seme: number): () => number {
  let s = seme >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Caffè: ci si tuffa nella tazza.                                     */
/* ------------------------------------------------------------------ */
function caffe(c: Contesto): AnimationSequence {
  const { cx, cy, r0, lontano, vh } = c;
  const seq: Segmento[] = [reazione(c, `${salto(c)} rotate(-3deg)`)];
  const parte = 0.12;
  const corsa = { at: parte, duration: 0.9 - parte, ease: CURVA_COPERTURA };

  // Tutto il tavolo si ingrandisce verso la tazza.
  const tavolo = c.oggetto.closest('svg');
  if (tavolo) {
    const t = tavolo.getBoundingClientRect();
    c.tocca(tavolo);
    c.blocca();
    tavolo.style.transformOrigin = `${px(cx - t.left)} ${px(cy - t.top)}`;
    // L'ombra del tavolo si toglie quando parte lo zoom: un filtro ingrandito 4,5 volte costa troppo a ogni fotogramma
    // (e animarlo con la sequenza lo terrebbe attivo per tutta la scena).
    c.dopo(parte, () => { tavolo.style.filter = 'none'; });
    seq.push([tavolo, { transform: ['scale(1)', 'scale(4.5)'] }, corsa]);
  }

  // Il bordo bianco della tazza corre davanti al caffè, poi il caffè riempie lo schermo.
  // Si parte dalla tazza già sollevata dalla molla (circa 1,15 volte).
  const r1 = r0 * 1.15;
  const bordo = strato(c, 'background:#ffffff;opacity:0');
  const superficie = strato(c, `background:${gradiente(c, CAFFE)};opacity:0`);
  seq.push(
    appare(bordo, parte),
    appare(superficie, parte),
    [bordo, { clipPath: [cerchio(r1 * 1.2, cx, cy), cerchio(lontano * 1.4, cx, cy)] }, corsa],
    [superficie, { clipPath: [cerchio(r1, cx, cy), cerchio(c.raggio, cx, cy)] }, corsa],
  );

  // Vapore: tre nuvole sfocate che salgono ondeggiando.
  const lato = Math.max(18, r0 * 1.3);
  const salita = vh * 0.42;
  [-0.6, 0.05, 0.65].forEach((k, i) => {
    const v = blocco(
      c.radice,
      `position:absolute;left:${px(cx + k * r0 - lato / 2)};top:${px(cy - r0 * 0.9 - lato / 2)};width:${px(lato)};height:${px(lato)};` +
        'border-radius:50%;background:radial-gradient(circle, rgba(255,255,255,.95) 0%, rgba(255,255,255,0) 70%);filter:blur(5px);opacity:0',
    );
    const dondolo = (i % 2 === 0 ? 1 : -1) * r0 * 0.6;
    const passi = [0, 0.2, 0.4, 0.6, 0.8, 1];
    const at = 0.3 + i * 0.06;
    seq.push([
      v,
      {
        transform: passi.map((p, j) => `translate(${px(j % 2 ? dondolo : -dondolo * 0.4)}, ${px(-salita * p)}) scale(${(1 + p * 1.4).toFixed(2)})`),
        opacity: [0, 0.75, 0.6, 0.4, 0.2, 0],
      },
      { at, duration: 1.05 - at, ease: 'easeInOut' },
    ]);
  });

  // Tre onde concentriche, più lente della copertura.
  const onde = [0.35, 0.5, 0.65].map((at) => {
    const o = anello(r0 * 0.5, '#ffffff', 2, 0.45);
    gruppo(c, [o]);
    return { o, at };
  });
  for (const { o, at } of onde) {
    const fine = (lontano * 0.6) / (r0 * 0.5);
    seq.push([o, { transform: ['scale(1)', `scale(${fine.toFixed(3)})`], opacity: [1, 1, 0] }, { at, duration: 1.15 - at, ease: PASSAGGIO }]);
  }
  return seq;
}

/* ------------------------------------------------------------------ */
/* Sistema solare: il cielo si apre come uno schermo di cinema, poi il volo tra le stelle. */
/* ------------------------------------------------------------------ */
const ORBITE: { nome: Pianeta; dim: number; colore: string }[] = [
  { nome: 'mercurio', dim: 10, colore: '#C9D1E3' },
  { nome: 'venere', dim: 13, colore: '#F3CC6A' },
  { nome: 'terra', dim: 14, colore: '#5B9BE6' },
  { nome: 'marte', dim: 11, colore: '#D4634A' },
];

function cielo(c: Contesto): AnimationSequence {
  const { cx, cy, r0, vw, vh, lontano } = c;
  const seq: Segmento[] = [reazione(c, salto(c))];

  // Lo schermo di cinema: una banda di 24 px all'altezza del cielo, con il sole già dentro, che si apre in verticale.
  const notte = strato(c, `background:${gradiente(c, NOTTE)};opacity:0`);
  const chiuso = `inset(${px(cy - 12)} 0px ${px(vh - cy - 12)} 0px)`;
  const apertura = { at: 0.12, duration: 0.58, ease: CURVA_COPERTURA };
  seq.push(appare(notte, 0.12), [notte, { clipPath: [chiuso, 'inset(0.0px 0px 0.0px 0px)'] }, apertura]);
  // I due bordi della banda, linee sottili che corrono verso l'alto e verso il basso.
  for (const verso of [-1, 1]) {
    const linea = blocco(c.radice, `position:absolute;left:0;right:0;top:${px(cy)};height:1px;background:#9FC3FF;opacity:0`);
    const meta = verso < 0 ? -cy : vh - cy;
    seq.push(
      [linea, { transform: [`translateY(${px(verso * 12)})`, `translateY(${px(meta)})`] }, apertura],
      [linea, { opacity: [0, 0.9, 0.9, 0] }, { at: 0.12, duration: 0.58, ease: 'linear' }],
    );
  }

  // Il sole si allontana.
  const sole = Math.max(22, r0 * 0.5);
  const astro = blocco(
    notte,
    `position:absolute;left:${px(cx - sole)};top:${px(cy - sole)};width:${px(sole * 2)};height:${px(sole * 2)};border-radius:50%;` +
      'background:radial-gradient(circle, #fff6d8 0%, #f3cc6a 30%, rgba(243,204,106,.35) 45%, rgba(243,204,106,0) 70%)',
  );
  seq.push([astro, { transform: ['scale(1)', 'scale(0.15)'], opacity: [1, 0] }, { at: 0.3, duration: 0.6, ease: CURVA_VIAGGIO }]);

  // Le stelle: tre profondità, dal punto di fuga verso i bordi.
  const caso = casuale(11);
  const profondita = [
    { n: 30, lato: 1.5, velocita: 1 },
    { n: 20, lato: 2, velocita: 2 },
    { n: 12, lato: 3, velocita: 3 },
  ];
  for (const p of profondita) {
    for (let i = 0; i < p.n; i++) {
      const a = caso() * Math.PI * 2;
      const d0 = 12 + caso() * lontano * 0.18;
      const d1 = d0 + lontano * 0.32 * p.velocita;
      const at = 0.3 + caso() * 0.4;
      const colore = caso() > 0.78 ? '#F3CC6A' : '#ffffff';
      // Più è vicina, più è lunga la scia: la stella è un trattino orientato lungo la sua direzione.
      const lungo = p.lato * (2 + 2 * p.velocita);
      const s = blocco(
        notte,
        `position:absolute;left:${px(cx)};top:${px(cy - p.lato / 2)};width:${px(lungo)};height:${px(p.lato)};border-radius:${px(p.lato)};` +
          `background:linear-gradient(90deg, rgba(255,255,255,0), ${colore});opacity:0;transform-origin:0 50%`,
      );
      const gradi = ((a * 180) / Math.PI).toFixed(1);
      const scia = (1 + 0.5 * p.velocita).toFixed(2);
      seq.push([
        s,
        {
          transform: [
            `translate(${px(Math.cos(a) * d0)}, ${px(Math.sin(a) * d0)}) rotate(${gradi}deg) scaleX(1)`,
            `translate(${px(Math.cos(a) * d1)}, ${px(Math.sin(a) * d1)}) rotate(${gradi}deg) scaleX(${scia})`,
          ],
          opacity: [0, 1, 1, 0],
        },
        { at, duration: Math.min(0.75, 1.15 - at), ease: 'easeIn' },
      ]);
    }
  }

  // Le orbite, ellissi inclinate che passano la camera una dopo l'altra; i pianeti ci viaggiano sopra.
  const spazio = blocco(notte, `position:absolute;inset:0;perspective:900px;perspective-origin:${px(cx)} ${px(cy)}`);
  ORBITE.forEach((o, i) => {
    const raggioFinale = Math.max(vw, vh) * (0.9 + 0.3 * i);
    const d = (raggioFinale * 2) / 5;
    const orbita = blocco(
      spazio,
      `position:absolute;left:${px(cx - d / 2)};top:${px(cy - d / 2)};width:${px(d)};height:${px(d)};border-radius:50%;` +
        'border:1.5px solid #9FC3FF;opacity:0',
    );
    // Il pianeta sta sull'ellisse vista di sbieco (l'orbita inclinata di 62°) e ne segue la crescita, sfocandosi.
    const angolo = (-longitudine(o.nome) * Math.PI) / 180;
    const sullOrbita = (k: number) => `translate(${px((Math.cos(angolo) * d * k) / 2)}, ${px((Math.sin(angolo) * d * k * Math.cos((62 * Math.PI) / 180)) / 2)})`;
    const pianeta = blocco(
      notte,
      `position:absolute;left:${px(cx - o.dim / 2)};top:${px(cy - o.dim / 2)};width:${o.dim}px;height:${o.dim}px;border-radius:50%;` +
        `background:radial-gradient(circle at 35% 35%, #ffffff 0%, ${o.colore} 45%);box-shadow:0 0 14px ${o.colore};opacity:0`,
    );
    const at = 0.3 + i * 0.08;
    const durata = Math.min(0.62, 1.15 - at);
    seq.push(
      [orbita, { transform: ['rotateX(62deg) scale(0.3)', 'rotateX(62deg) scale(5)'], opacity: [0, 0.8, 0] }, { at, duration: durata, ease: 'easeIn' }],
      [
        pianeta,
        { transform: [`${sullOrbita(0.3)} scale(1)`, `${sullOrbita(5)} scale(2.5)`], filter: ['blur(0px)', 'blur(3px)'], opacity: [0, 1, 1, 0] },
        { at, duration: durata, ease: 'easeIn' },
      ],
    );
  });
  return seq;
}

/* ------------------------------------------------------------------ */
/* Lente: l'anello inquadra lo schermo e il raccoglitore si mette a fuoco. */
/* ------------------------------------------------------------------ */
function lente(c: Contesto): AnimationSequence {
  const { cx, cy, r0, lontano } = c;
  const seq: Segmento[] = [reazione(c, 'translateY(-4px) scale(1.08)')];
  const r1 = r0 * 1.08;
  const fine = lontano * 1.05;

  const vetro = strato(c, `background:radial-gradient(circle ${px(fine)} at ${px(cx)} ${px(cy)}, rgba(255,255,255,.35) 0%, rgba(127,176,232,.15) 100%);opacity:0`);
  const riflesso = blocco(vetro, 'position:absolute;inset:0;background:linear-gradient(115deg, rgba(255,255,255,0) 38%, rgba(255,255,255,1) 50%, rgba(255,255,255,0) 62%)');
  const scuro = anello(r1, '#1a1d2b', 14);
  const oro = anello(r1 * 1.04, '#F3CC6A', 3);
  const cornice = gruppo(c, [scuro, oro]);
  cornice.setAttribute('opacity', '0');
  const crescita = { at: 0.15, duration: 0.8, ease: CURVA_VIAGGIO };
  const scala = `scale(${(fine / r1).toFixed(3)})`;
  seq.push(
    appare(vetro, 0.15),
    appare(cornice, 0.15),
    [vetro, { clipPath: [cerchio(r1, cx, cy), cerchio(fine, cx, cy)] }, crescita],
    [scuro, { transform: ['scale(1)', scala] }, crescita],
    [oro, { transform: ['scale(1)', scala] }, crescita],
    [riflesso, { transform: ['translateX(-40%)', 'translateX(40%)'], opacity: [0.35, 0] }, { at: 0.2, duration: 0.75, ease: CURVA_VIAGGIO }],
    [[vetro, scuro, oro], { opacity: [1, 0] }, { at: 0.75, duration: 0.25, ease: 'easeIn' }],
  );

  const collezione = document.querySelector<HTMLElement>('#collezione');
  if (collezione) {
    c.tocca(collezione);
    seq.push([collezione, { transform: ['scale(1.1)', 'scale(1)'], filter: ['blur(6px)', 'blur(0px)'] }, { at: 0.1, duration: 0.9, ease: CURVA_VIAGGIO }]);
  }
  return seq;
}

/* ------------------------------------------------------------------ */
/* Raccoglitore: le carte escono dalle tasche e volano al raccoglitore vero. */
/* ------------------------------------------------------------------ */
function raccoglitore(c: Contesto): AnimationSequence {
  const seq: Segmento[] = [reazione(c, 'translateY(-4px) scale(1.04)')];
  const vere = Array.from(document.querySelectorAll<HTMLElement>('#collezione .carta'));
  const meta = document.querySelector<HTMLElement>('#collezione');
  // Lo stesso scorrimento di Tavolo.astro: la pagina sale di `salita` pixel.
  const massimo = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
  const salita = meta ? Math.max(0, Math.min(meta.getBoundingClientRect().top - 24, massimo)) : 0;

  const tasche = Array.from(c.oggetto.querySelectorAll<SVGGraphicsElement>('.tasca'));
  tasche.forEach((t, i) => {
    const r = t.getBoundingClientRect();
    const carta = blocco(
      c.radice,
      `position:absolute;left:${px(r.left)};top:${px(r.top)};width:${px(r.width)};height:${px(r.height)};border-radius:3px;` +
        `background:${t.getAttribute('fill') ?? '#3D6BC2'};box-shadow:0 6px 14px rgba(26,29,43,.25)`,
    );
    c.tocca(t);
    const arrivo = vere.length ? vere[i % vere.length].getBoundingClientRect() : null;
    const dx = arrivo ? arrivo.left + arrivo.width / 2 - (r.left + r.width / 2) : 0;
    const dy = arrivo ? arrivo.top + arrivo.height / 2 - salita - (r.top + r.height / 2) : c.vh;
    const su = 110 + (i % 3) * 30;
    const giro = (i % 2 === 0 ? -1 : 1) * 12;
    const at = 0.12 + i * 0.04;
    seq.push(
      [t, { opacity: [1, 0] }, { at, duration: 0.01, ease: 'linear' }],
      [
        carta,
        {
          transform: [
            'translate(0px, 0px) rotate(0deg) scale(1)',
            `translate(${px(dx * 0.45)}, ${px(dy * 0.45 - su)}) rotate(${giro}deg) scale(1.6)`,
            `translate(${px(dx)}, ${px(dy)}) rotate(0deg) scale(2.2)`,
          ],
          opacity: [1, 1, 0],
        },
        { at, duration: Math.min(0.5, 0.95 - at), ease: ['easeOut', 'easeIn'] },
      ],
    );
  });

  if (vere.length) {
    vere.forEach((el) => c.tocca(el));
    seq.push([
      vere,
      { opacity: [0, 1], transform: ['rotateX(-25deg) translateY(30px)', 'rotateX(0deg) translateY(0px)'] },
      { at: 0.3, duration: 0.45, delay: stagger(0.035), ease: CURVA },
    ]);
  }
  return seq;
}

/* ------------------------------------------------------------------ */
/* Bacchette: un colpo, e dalle punte partono i cerchi del suono.      */
/* ------------------------------------------------------------------ */
function bacchette(c: Contesto): AnimationSequence {
  const colore = c.musica ? '#E8B33C' : '#9FA8BF';
  const punte = Array.from(c.oggetto.querySelectorAll<SVGElement>('[data-punta]'));
  const seq: Segmento[] = [];
  punte.forEach((p, i) => {
    const r = p.getBoundingClientRect();
    const cerchi = [0, 1, 2].map(() => anello(5, colore, 2.5, 0.95));
    gruppo(c, cerchi, r.left + r.width / 2, r.top + r.height / 2);
    cerchi.forEach((k, j) => {
      seq.push([k, { transform: ['scale(1)', `scale(${9 + j * 4})`], opacity: [0.95, 0.8, 0] }, { duration: 0.7, at: i * 0.06 + j * 0.1, ease: PASSAGGIO }]);
    });
  });
  c.tocca(c.oggetto);
  seq.push([c.oggetto, { transform: ['rotate(0deg)', 'rotate(-5deg)', 'rotate(0deg)'] }, { duration: 0.4, at: 0, ease: ['easeOut', [0.34, 1.56, 0.64, 1]] }]);
  return seq;
}

/* ------------------------------------------------------------------ */
/* Moneta: lanciata in aria con un giro vero, ricade verso la camera.  */
/* ------------------------------------------------------------------ */
function moneta(c: Contesto): AnimationSequence {
  const { cx, cy, r0 } = c;
  // La moneta vera sparisce: al suo posto c'è quella che vola.
  const vera = c.oggetto.querySelector('[data-moneta]')?.parentElement;
  const seq: Segmento[] = [];
  if (vera) {
    c.tocca(vera);
    seq.push([vera, { opacity: [0, 0] }, { at: 0, duration: 0.01 }]);
  }
  const lato = r0 * 2;
  const ombra = blocco(c.radice, `position:absolute;left:${px(cx - r0)};top:${px(cy - r0 * 0.35 + r0 * 0.9)};width:${px(lato)};height:${px(r0 * 0.7)};border-radius:50%;background:rgba(10,14,24,.4);filter:blur(3px)`);
  const volo = blocco(c.radice, `position:absolute;left:${px(cx - r0)};top:${px(cy - r0)};width:${px(lato)};height:${px(lato)}`);
  const caduta = blocco(volo, 'position:absolute;inset:0;perspective:800px');
  const giro = blocco(caduta, 'position:absolute;inset:0;transform-style:preserve-3d');
  // Il gradiente ha il raggio della moneta: scalata di `raggio / r0` coincide con la copertura all'arrivo.
  const faccia = `position:absolute;inset:0;border-radius:50%;backface-visibility:hidden;background:radial-gradient(circle ${px(r0)} at 50% 50%, ${ORO})`;
  const fronte = blocco(giro, faccia);
  const cerchio = blocco(fronte, `position:absolute;inset:20%;border-radius:50%;border:${px(Math.max(1, r0 * 0.09))} solid #9a6e14`);
  const retro = blocco(giro, `${faccia};transform:rotateY(180deg)`);
  const stella = blocco(retro, 'position:absolute;inset:28%;background:#9a6e14;clip-path:polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)');

  // Nel lancio la moneta sale e si avvicina (scala 2,8 in cima, faccia leggibile) e atterra a 3 volte;
  // la caduta completa la scala fino a `raggio / r0`.
  const atterra = 3;
  const S = c.raggio / r0 / atterra;
  const lancio = { at: 0, duration: 0.55 };
  seq.push(
    [
      volo,
      { transform: ['translateY(0px) scale(1)', 'translateY(-140px) scale(2.8)', `translateY(0px) scale(${atterra})`] },
      { ...lancio, times: [0, 0.45, 1], ease: ['easeOut', 'easeIn'] },
    ],
    [giro, { transform: ['rotateY(0deg)', 'rotateY(720deg)'] }, { ...lancio, ease: [0.3, 0.1, 0.4, 1] }],
    [ombra, { transform: ['scale(1)', 'scale(0.5)', 'scale(1)'], opacity: [1, 0.35, 1] }, { ...lancio, times: [0, 0.45, 1], ease: ['easeOut', 'easeIn'] }],
    [ombra, { opacity: [1, 0] }, { at: 0.55, duration: 0.15 }],
    [caduta, { transform: ['scale(1)', `scale(${S.toFixed(3)})`] }, { at: 0.5, duration: 0.45, ease: CURVA_VIAGGIO }],
    [[cerchio, stella], { opacity: [1, 0] }, { at: 0.8, duration: 0.2, ease: 'linear' }],
  );
  return seq;
}

/* ------------------------------------------------------------------ */
/* Mazzo di carte: un ventaglio, poi la carta in cima si gira e il suo dorso riempie lo schermo. */
/* ------------------------------------------------------------------ */
const VALORI = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3'];
const SEMI = ['♥', '♠', '♦', '♣'];
const ROSSO = '#D4634A';
const NERO = '#1A1D2B';
/** Dorso delle carte: rombi di 10 px, bianco al 12 % sul blu. */
const DORSO =
  'linear-gradient(45deg, transparent 45%, rgba(255,255,255,.12) 45%, rgba(255,255,255,.12) 55%, transparent 55%),' +
  'linear-gradient(-45deg, transparent 45%, rgba(255,255,255,.12) 45%, rgba(255,255,255,.12) 55%, transparent 55%) #3d6bc2';

function carte(c: Contesto): AnimationSequence {
  const { forma, vw } = c;
  const w = forma.width;
  const h = forma.height;
  const cx = forma.left + w / 2;
  const cy = forma.top + h / 2;
  const k = w / 52;
  const seq: Segmento[] = [];

  // Il ventaglio: dodici carte escono dal mazzo ruotando attorno al suo bordo basso, poi ricadono
  // (sotto la copertura: il pannello che si allarga le nasconde).
  const vicino = Math.min(1, vw / 800);
  for (let i = 0; i < 12; i++) {
    const seme = SEMI[i % 4];
    const colore = i % 2 === 0 ? ROSSO : NERO;
    const el = blocco(
      c.radice,
      `position:absolute;left:${px(cx - w / 2)};top:${px(cy - h / 2)};width:${px(w)};height:${px(h)};border-radius:${px(4 * k)};` +
        `background:#fff;box-shadow:0 4px 12px rgba(26,29,43,.3);transform-origin:50% 100%;opacity:0;color:${colore};font-family:Urbanist,system-ui,sans-serif;font-weight:900`,
    );
    blocco(el, `position:absolute;left:${px(4 * k)};top:${px(2 * k)};font-size:${px(11 * k)};line-height:1.1;text-align:center;white-space:pre`, `${VALORI[i]}\n${seme}\uFE0E`);
    blocco(el, `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:${px(24 * k)}`, `${seme}\uFE0E`);
    const a = i * 13 - 72;
    const d = (140 + ((i * 37) % 101)) * vicino;
    const at = i * 0.025;
    const durata = 0.9 - at;
    seq.push(
      [
        el,
        { transform: ['rotate(0deg) translateY(0px)', `rotate(${a}deg) translateY(${px(-d)})`, `rotate(${a}deg) translateY(${px(-d)})`, `rotate(${(a * 0.4).toFixed(1)}deg) translateY(${px(-d * 0.15)})`] },
        { at, duration: durata, times: [0, (0.45 - at) / durata, (0.5 - at) / durata, 1], ease: ['easeOut', 'linear', 'easeIn'] },
      ],
      [el, { opacity: [0, 1] }, { at, duration: 0.05, ease: 'linear' }],
      [el, { opacity: [1, 0] }, { at: 0.5, duration: 0.3, ease: 'easeIn' }],
    );
  }

  // La copertura: il dorso a tutto schermo, con la cornice d'oro disegnata da un secondo strato.
  // La carta girata è la protagonista: cresce di 4 volte (3 sul telefono) e resta dentro lo schermo;
  // la copertura parte dal suo rettangolo a quella misura, così il pannello la continua.
  const F = vw < 700 ? 3 : 4;
  const W = w * F;
  const H = h * F;
  const bordo = 12;
  const fx = Math.min(Math.max(cx, W / 2 + bordo), vw - W / 2 - bordo);
  const fy = Math.min(Math.max(cy, H / 2 + bordo), c.vh - H / 2 - bordo);
  const carta0 = { left: fx - W / 2, top: fy - H / 2, right: fx + W / 2, bottom: fy + H / 2 };
  const dentro = (n: number) => ({ left: carta0.left + n, top: carta0.top + n, right: carta0.right - n, bottom: carta0.bottom - n });
  const trama = `background:${DORSO};background-size:10px 10px;background-position:${px(carta0.left + MARGINE)} ${px(carta0.top + MARGINE)};opacity:0`;
  const dorso = stratoLargo(c, trama);
  const filo = stratoLargo(c, 'background:#F3CC6A;opacity:0');
  const interno = stratoLargo(c, trama);
  const espande = { at: 0.6, duration: 0.4, ease: CURVA_VIAGGIO };
  seq.push(
    appare(dorso, 0.6),
    appare(filo, 0.6),
    appare(interno, 0.6),
    [dorso, { clipPath: [riquadro(c, carta0, 14), pieno(14)] }, espande],
    [filo, { clipPath: [riquadro(c, dentro(10), 6), riquadro(c, { left: 10 - MARGINE, top: 10 - MARGINE, right: c.vw - 10 + MARGINE, bottom: c.vh - 10 + MARGINE }, 6)] }, espande],
    [interno, { clipPath: [riquadro(c, dentro(12), 4), riquadro(c, { left: 12 - MARGINE, top: 12 - MARGINE, right: c.vw - 12 + MARGINE, bottom: c.vh - 12 + MARGINE }, 4)] }, espande],
  );

  // La carta in cima: disegnata già grande (F volte) e scalata di 1/F sul mazzo, così il dorso arriva a misura vera.
  const tavolo3d = blocco(c.radice, `position:absolute;left:${px(carta0.left)};top:${px(carta0.top)};width:${px(W)};height:${px(H)};perspective:900px`);
  const sulMazzo = `translate(${px(cx - fx)}, ${px(cy - fy)}) scale(${(1 / F).toFixed(4)})`;
  const carta = blocco(tavolo3d, `position:absolute;inset:0;transform-style:preserve-3d;transform:${sulMazzo} rotateY(0deg)`);
  const fronte = blocco(
    carta,
    `position:absolute;inset:0;border-radius:${px(4 * k * F)};background:#fff;backface-visibility:hidden;box-shadow:0 10px 30px rgba(26,29,43,.35);` +
      `color:${ROSSO};font-family:Urbanist,system-ui,sans-serif;font-weight:900`,
  );
  blocco(fronte, `position:absolute;left:${px(8 * k * F)};top:${px(5 * k * F)};font-size:${px(11 * k * F)}`, 'A');
  blocco(fronte, `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:${px(26 * k * F)}`, '♦\uFE0E');
  const retro = blocco(carta, `position:absolute;inset:0;border-radius:14px;background:${DORSO};background-size:10px 10px;backface-visibility:hidden;transform:rotateY(180deg)`);
  blocco(retro, 'position:absolute;inset:10px;border:2px solid #F3CC6A;border-radius:6px');
  seq.push(
    [carta, { transform: [`${sulMazzo} rotateY(0deg)`, 'translate(0.0px, 0.0px) scale(1) rotateY(180deg)'] }, { at: 0.12, duration: 0.48, ease: CURVA_VIAGGIO }],
    // L'opacità va sul contenitore: su un elemento `preserve-3d` appiattirebbe la carta e il dorso non si vedrebbe.
    // Dal 0,6 s sotto la carta c'è il pannello identico: la carta può sparire.
    [tavolo3d, { opacity: [1, 0] }, { at: 0.62, duration: 0.1, ease: 'linear' }],
  );

  // Gli ultimi due decimi: la trama svanisce nel blu piatto dell'arrivo.
  const piatto = strato(c, 'background:#3d6bc2;opacity:0');
  seq.push([piatto, { opacity: [0, 1] }, { at: 1.0, duration: 0.2, ease: 'linear' }]);
  return seq;
}

/* ------------------------------------------------------------------ */
/* Tastiera: un pannello scuro si apre dalla tastiera, pieno di tasti a misura vera. */
/* ------------------------------------------------------------------ */
function tastiera(c: Contesto): AnimationSequence {
  const { forma, vw, vh } = c;
  const seq: Segmento[] = [reazione(c, salto(c))];
  const piccolo = vw < 700;
  const kw = piccolo ? 40 : 56;
  const kh = piccolo ? 36 : 48;
  const passoX = kw + 8;
  const passoY = kh + 8;
  const sfalsa = [0, 0.5, 0.75, 0.25].map((f) => f * passoX);

  // Una piastrella di quattro file sfalsate, ripetuta: i tasti restano della loro misura.
  const tasti = sfalsa
    .map((o, r) =>
      [o, o - passoX]
        .map((x) => `<rect x="${x}" y="${r * passoY}" width="${kw}" height="${kh}" rx="6" fill="#3a4060"/><rect x="${x}" y="${r * passoY + 1}" width="${kw}" height="${kh - 1}" rx="6" fill="#2e3350"/>`)
        .join(''),
    )
    .join('');
  const piastrella = `<svg xmlns="${NS}" width="${passoX}" height="${passoY * 4}">${tasti}</svg>`;
  const punto = c.punto ?? { x: c.cx, y: c.cy };
  // Il tasto (fila 0, colonna 0) è centrato sul punto del click.
  const x0 = punto.x - kw / 2;
  const y0 = punto.y - kh / 2;

  const pannello = stratoLargo(c, 'background:#232741;opacity:0');
  const griglia = blocco(
    pannello,
    `position:absolute;inset:0;background-image:url("data:image/svg+xml,${encodeURIComponent(piastrella)}");` +
      `background-size:${passoX}px ${passoY * 4}px;background-position:${px(x0 + MARGINE)} ${px(y0 + MARGINE)}`,
  );
  // Il pannello parte dalla tastiera già cresciuta dalla molla (1,1 volte attorno al suo centro).
  const fx = (forma.width * 0.1) / 2;
  const fy = (forma.height * 0.1) / 2;
  const partenza = { left: forma.left - fx, top: forma.top - fy, right: forma.right + fx, bottom: forma.bottom + fy };
  seq.push(
    appare(pannello, 0.1),
    [pannello, { clipPath: [riquadro(c, partenza, 16), pieno(16)] }, { at: 0.1, duration: 0.7, ease: CURVA_COPERTURA }],
    [griglia, { opacity: [1, 0] }, { at: 0.85, duration: 0.3, ease: 'linear' }],
  );

  // L'onda: i tasti si accendono allontanandosi dal click (1200 px al secondo).
  const caso = casuale(5);
  const candidati: { x: number; y: number; d: number; scelta: number }[] = [];
  const righe = Math.ceil(Math.max(punto.y, vh - punto.y) / passoY) + 1;
  const colonne = Math.ceil(Math.max(punto.x, vw - punto.x) / passoX) + 1;
  for (let r = -righe; r <= righe; r++) {
    const o = sfalsa[((r % 4) + 4) % 4];
    for (let j = -colonne; j <= colonne; j++) {
      const x = x0 + o + j * passoX;
      const y = y0 + r * passoY;
      if (x + kw < 0 || y + kh < 0 || x > vw || y > vh) continue;
      const d = Math.hypot(x + kw / 2 - punto.x, y + kh / 2 - punto.y);
      if (d > 540) continue;
      candidati.push({ x, y, d, scelta: caso() });
    }
  }
  const accesi = candidati
    .filter((t) => t.scelta < (t.d < 70 ? 1 : 0.2 + 0.8 * (1 - t.d / 540) ** 1.5))
    .sort((a, b) => a.d - b.d)
    .slice(0, 64);
  for (const t of accesi) {
    const tasto = blocco(
      pannello,
      `position:absolute;left:${px(t.x + MARGINE)};top:${px(t.y + MARGINE)};width:${kw}px;height:${kh}px;border-radius:6px;background:#c9d1e3;` +
        'box-shadow:0 0 14px rgba(201,209,227,.55);opacity:0',
    );
    seq.push([tasto, { opacity: [0, 0.9, 0] }, { at: 0.12 + t.d / 1200, duration: 0.35, ease: 'easeOut' }]);
  }

  // Il cursore lampeggia al centro.
  const cursore = blocco(
    pannello,
    `position:absolute;left:${px(vw / 2 + MARGINE - 12)};top:${px(vh / 2 + MARGINE - 28)};font:500 40px/1 var(--font-mono);color:#c9d1e3;opacity:0`,
    '_',
  );
  seq.push([cursore, { opacity: [0, 1, 1, 0, 0, 1, 1, 0] }, { at: 0.7, duration: 0.45, ease: 'linear' }]);
  return seq;
}

const SCENE: Record<Scena, (c: Contesto) => AnimationSequence> = { caffe, cielo, lente, raccoglitore, bacchette, moneta, carte, tastiera };

/** Scene che portano a un'altra pagina e lasciano una copertura all'arrivo. */
export const NAVIGA: Record<Scena, boolean> = {
  caffe: true,
  cielo: true,
  moneta: true,
  carte: true,
  tastiera: true,
  lente: false,
  raccoglitore: false,
  bacchette: false,
};

/** Numero dell'ultima scena avviata: una pulizia in ritardo non tocca una scena più nuova. */
let generazione = 0;

/** Chiavi di `sessionStorage` lette da Base.astro all'arrivo. */
export const CHIAVI_ARRIVO = ['arrivo', 'arrivo-x', 'arrivo-y', 'arrivo-r'] as const;

export interface Viaggio {
  linea: Timeline;
  /** Rimuove la scena e ripulisce gli stili della pagina. */
  pulisci: () => void;
  /** Salva in `sessionStorage` la copertura che la pagina nuova deve mostrare (subito prima di `navigate()`). */
  segnaArrivo: () => void;
}

/**
 * Avvia la scena `scena` dall'elemento `forma` (la forma di riferimento dentro `oggetto`).
 * Con `ridotto` la scena è una dissolvenza di 0,25 s verso il colore di arrivo.
 */
export function avviaViaggio(opzioni: {
  scena: Scena;
  radice: HTMLElement;
  svg: SVGSVGElement;
  oggetto: SVGElement;
  forma: Element;
  punto: { x: number; y: number } | null;
  ridotto: boolean;
  musica: boolean;
}): Viaggio {
  const { scena, radice, svg, oggetto, forma, punto, ridotto, musica } = opzioni;
  const cornice = radice.getBoundingClientRect();
  const vw = cornice.width;
  const vh = cornice.height;
  svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  const r = forma.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const r0 = Math.max(4, Math.max(r.width, r.height) / 2);
  const lontano = Math.max(Math.hypot(cx, cy), Math.hypot(vw - cx, cy), Math.hypot(cx, vh - cy), Math.hypot(vw - cx, vh - cy));
  const raggio = Math.round(lontano * 1.08);
  const toccati = new Set<Element>();
  const mia = ++generazione;
  let bloccato = false;
  const attese: number[] = [];
  const c: Contesto = {
    radice,
    svg,
    oggetto,
    forma: r,
    cx,
    cy,
    r0,
    vw,
    vh,
    lontano,
    raggio,
    punto,
    tocca: (el) => toccati.add(el),
    dopo: (secondi, azione) => { attese.push(window.setTimeout(azione, secondi * 1000)); },
    blocca: () => {
      bloccato = true;
      document.documentElement.style.overflowX = 'hidden';
    },
    musica,
  };

  let sequenza: Segmento[];
  if (ridotto) {
    const velo = nodo('rect', { x: 0, y: 0, width: vw, height: vh, fill: COLORE_PIATTO[scena] ?? '#ffffff', opacity: 0 });
    svg.appendChild(velo);
    // Dissolvenza di 0,25 s, poi 0,05 s fermi a colore pieno: l'ultimo fotogramma mostrato prima dello scambio è già pieno.
    sequenza = NAVIGA[scena]
      ? [
          [velo, { opacity: [0, 1] }, { duration: 0.25, ease: 'linear' }],
          [svg, { opacity: [1, 1] }, { at: 0, duration: 0.3, ease: 'linear' }],
        ]
      : [[velo, { opacity: [0, 0] }, { duration: 0.01 }]];
  } else {
    sequenza = [...SCENE[scena](c)];
    // La linea dura esattamente quanto la scena: alla fine parte `navigate()`.
    if (DURATA[scena]) sequenza.push([svg, { opacity: [1, 1] }, { at: 0, duration: DURATA[scena], ease: 'linear' }]);
  }
  const linea = animate(sequenza, { defaultTransition: { ease: CURVA } });

  const ripristina = () => {
    for (const el of toccati) {
      if (el instanceof HTMLElement || el instanceof SVGElement) {
        el.style.transform = '';
        el.style.opacity = '';
        el.style.filter = '';
        el.style.transformOrigin = '';
        if (el.getAttribute('style') === '') el.removeAttribute('style');
      }
    }
  };
  const pulisci = () => {
    linea.cancel();
    attese.forEach((a) => window.clearTimeout(a));
    for (const figlio of Array.from(radice.children)) if (figlio !== svg) figlio.remove();
    svg.replaceChildren();
    svg.style.opacity = '';
    ripristina();
    // Motion scrive il valore finale delle animazioni guidate da JS (gli elementi SVG) al fotogramma
    // dopo la fine: si ripulisce ancora due fotogrammi più tardi, se nel frattempo non è partita un'altra scena.
    requestAnimationFrame(() => requestAnimationFrame(() => { if (generazione === mia) ripristina(); }));
    if (bloccato) document.documentElement.style.overflowX = '';
  };

  const segnaArrivo = () => {
    if (!NAVIGA[scena]) return;
    sessionStorage.setItem('arrivo', scena);
    sessionStorage.setItem('arrivo-x', `${((cx / vw) * 100).toFixed(2)}%`);
    sessionStorage.setItem('arrivo-y', `${((cy / vh) * 100).toFixed(2)}%`);
    sessionStorage.setItem('arrivo-r', `${raggio}px`);
  };

  return { linea, pulisci, segnaArrivo };
}
