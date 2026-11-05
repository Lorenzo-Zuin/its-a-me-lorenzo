/**
 * Transizioni di scena del tavolo.
 * Ogni oggetto ha la sua sequenza: parte dal punto esatto dell'oggetto cliccato,
 * copre tutto lo schermo (raggio = distanza dall'angolo più lontano) e lascia
 * come ultimo fotogramma lo stesso colore della copertura che la pagina nuova
 * mostra all'arrivo (vedi global.css, `html[data-arrivo]`).
 * Si usano solo transform, opacity, clip-path e filter.
 */
import { animate, stagger, type AnimationSequence, type Timeline } from 'motion';
import { longitudine, type Pianeta } from '@/lib/cielo';

export type Scena = 'caffe' | 'cielo' | 'lente' | 'raccoglitore' | 'bacchette' | 'moneta' | 'carte' | 'tastiera';

/** Curva base di tutte le sequenze. */
export const CURVA: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Curva più lenta per ciò che «sfila» mentre lo sfondo ha già coperto lo schermo. */
const PASSAGGIO: [number, number, number, number] = [0.5, 0.05, 0.25, 1];

/** Colore piatto di riserva per la dissolvenza con `prefers-reduced-motion`. */
const COLORE_PIATTO: Partial<Record<Scena, string>> = {
  caffe: '#4a2e1b',
  cielo: '#1a2f66',
  moneta: '#dca62e',
  carte: '#3d6bc2',
  tastiera: '#232741',
};

export interface Contesto {
  /** Lo SVG a tutto schermo in cui si disegna la scena (viewBox in pixel). */
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
  /** Fattore di scala che porta la forma di riferimento a coprire lo schermo. */
  scala: number;
  /** Registra un elemento della pagina di cui ripulire gli stili alla fine. */
  tocca: (el: Element) => void;
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

const gruppo = (c: Contesto, figli: Element[]): SVGGElement => {
  const g = nodo('g', { transform: `translate(${c.cx.toFixed(2)} ${c.cy.toFixed(2)})` }, figli);
  c.svg.appendChild(g);
  return g;
};

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
  const { r0, scala, vh } = c;
  const tazza = nodo('circle', { r: r0 * 1.24, fill: '#ffffff' });
  const bordo = nodo('circle', { r: r0 * 1.24, fill: 'none', stroke: '#dadfea', 'stroke-width': 1.5, 'vector-effect': 'non-scaling-stroke' });
  const superficie = nodo('circle', { r: r0, fill: 'url(#vCaffe)' });
  const onde = [0, 1].map(() => anello(r0 * 0.3, '#ffffff', 2, 0.55));
  const vapori = [-0.55, 0.05, 0.6].map((k) =>
    nodo('circle', { r: r0 * 0.42, cx: k * r0, cy: -r0 * 0.5, fill: '#ffffff', opacity: 0, style: 'filter: blur(10px)' }),
  );
  gruppo(c, [tazza, bordo, superficie, ...onde, ...vapori]);
  c.tocca(c.oggetto);
  const fine = `scale(${scala.toFixed(3)})`;
  const ondaFine = `scale(${(scala * 2.4).toFixed(3)})`;
  return [
    [c.oggetto, { transform: ['scale(1)', 'scale(3.4)'] }, { duration: 0.8, at: 0 }],
    [tazza, { transform: ['scale(1)', fine] }, { duration: 0.8, at: 0 }],
    [bordo, { transform: ['scale(1)', fine] }, { duration: 0.8, at: 0 }],
    [superficie, { transform: ['scale(1)', fine] }, { duration: 0.8, at: 0 }],
    [onde[0], { transform: ['scale(1)', ondaFine], opacity: [1, 1, 0] }, { duration: 0.72, at: 0.06, ease: PASSAGGIO }],
    [onde[1], { transform: ['scale(1)', ondaFine], opacity: [1, 1, 0] }, { duration: 0.72, at: 0.18, ease: PASSAGGIO }],
    ...vapori.map(
      (v, i): AnimationSequence[number] => [
        v,
        { transform: ['translate(0px, 0px) scale(1)', `translate(0px, ${(-vh * 0.45).toFixed(0)}px) scale(2.6)`], opacity: [0, 0.45, 0] },
        { duration: 0.78, at: 0.04 + i * 0.07, ease: PASSAGGIO },
      ],
    ),
  ];
}

/* ------------------------------------------------------------------ */
/* Sistema solare: si entra nel cielo attraversando le orbite.         */
/* ------------------------------------------------------------------ */
const ORBITE: { nome: Pianeta; raggio: number; dim: number; colore: string }[] = [
  { nome: 'mercurio', raggio: 14 / 56, dim: 1.8 / 56, colore: '#C9D1E3' },
  { nome: 'venere', raggio: 23 / 56, dim: 2.6 / 56, colore: '#F3CC6A' },
  { nome: 'terra', raggio: 33 / 56, dim: 3 / 56, colore: '#5B9BE6' },
  { nome: 'marte', raggio: 45 / 56, dim: 2.2 / 56, colore: '#D4634A' },
];

function cielo(c: Contesto): AnimationSequence {
  const { r0, scala, lontano } = c;
  const fondo = nodo('circle', { r: r0, fill: 'url(#vCielo)' });
  const sole = nodo('circle', { r: Math.max(3, r0 * (6 / 56)), fill: '#F3CC6A' });
  const alone = nodo('circle', { r: Math.max(5, r0 * (9 / 56)), fill: '#F3CC6A', opacity: 0.25 });
  const orbite = ORBITE.map((o) => anello(o.raggio * r0, '#9FC3FF', 1.2, 0.55));
  const pianeti = ORBITE.map((o) => nodo('circle', { r: Math.max(2.5, o.dim * r0), fill: o.colore }));
  const caso = casuale(7);
  const stelle = Array.from({ length: 30 }, () => {
    const a = caso() * Math.PI * 2;
    const d = (0.25 + caso() * 0.7) * r0;
    const s = nodo('circle', { r: 1.1 + caso() * 1.4, fill: caso() > 0.5 ? '#F3CC6A' : '#ffffff', opacity: 0 });
    return { s, x: Math.cos(a) * d, y: Math.sin(a) * d, ritardo: caso() * 0.22 };
  });
  gruppo(c, [fondo, ...stelle.map((s) => s.s), ...orbite, ...pianeti, alone, sole]);
  c.tocca(c.oggetto);

  const seq: AnimationSequence = [
    [c.oggetto, { transform: ['scale(1)', 'scale(1.9)'], opacity: [1, 0] }, { duration: 0.45, at: 0 }],
    [fondo, { transform: ['scale(1)', `scale(${scala.toFixed(3)})`] }, { duration: 0.6, at: 0 }],
    [alone, { transform: ['scale(1)', 'scale(3)'], opacity: [0.25, 0] }, { duration: 0.4, at: 0 }],
    [sole, { transform: ['scale(1)', 'scale(2.4)'], opacity: [1, 1, 0] }, { duration: 0.45, at: 0 }],
  ];
  // Le orbite si allargano oltre lo schermo una dopo l'altra, dalla più esterna alla più interna.
  ORBITE.forEach((o, i) => {
    const ordine = ORBITE.length - 1 - i;
    const at = 0.04 + ordine * 0.07;
    const rho = o.raggio * r0;
    seq.push([orbite[i], { transform: ['scale(1)', `scale(${((lontano * 1.25) / rho).toFixed(3)})`], opacity: [0.9, 0.9, 0] }, { duration: 0.76, at, ease: PASSAGGIO }]);
    const angolo = (-longitudine(o.nome) * Math.PI) / 180;
    const x = Math.cos(angolo) * rho;
    const y = Math.sin(angolo) * rho;
    const k = (lontano * 1.45) / rho;
    seq.push([
      pianeti[i],
      {
        transform: [`translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(1)`, `translate(${(x * k).toFixed(1)}px, ${(y * k).toFixed(1)}px) scale(3.5)`],
        opacity: [1, 1, 0],
      },
      { duration: 0.76, at, ease: PASSAGGIO },
    ]);
  });
  // Le stelle scorrono verso l'esterno, restando dentro il disco.
  for (const st of stelle) {
    seq.push([
      st.s,
      {
        transform: [`translate(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px) scale(0.6)`, `translate(${(st.x * scala * 0.9).toFixed(1)}px, ${(st.y * scala * 0.9).toFixed(1)}px) scale(2)`],
        opacity: [0, 1, 1, 0],
      },
      { duration: 0.7, at: 0.08 + st.ritardo, ease: PASSAGGIO },
    ]);
  }
  return seq;
}

/* ------------------------------------------------------------------ */
/* Lente: ci si avvicina, il raccoglitore si mette a fuoco.            */
/* ------------------------------------------------------------------ */
function lente(c: Contesto): AnimationSequence {
  const { r0, scala } = c;
  const vetro = nodo('circle', { r: r0, fill: 'url(#vVetro)' });
  const anelloScuro = anello(r0, '#1a1d2b', 14);
  const anelloOro = anello(r0 * 1.08, '#F3CC6A', 3);
  const riflesso = nodo('path', {
    d: `M ${-r0 * 0.5} ${-r0 * 0.45} q ${r0 * 0.18} ${-r0 * 0.3} ${r0 * 0.55} ${-r0 * 0.35}`,
    fill: 'none',
    stroke: '#ffffff',
    'stroke-opacity': 0.85,
    'stroke-width': 3,
    'stroke-linecap': 'round',
    'vector-effect': 'non-scaling-stroke',
  });
  gruppo(c, [vetro, anelloScuro, anelloOro, riflesso]);
  c.tocca(c.oggetto);
  const fine = `scale(${(scala * 1.05).toFixed(3)})`;
  const seq: AnimationSequence = [
    [c.oggetto, { transform: ['scale(1)', 'scale(1.5)'], opacity: [1, 0] }, { duration: 0.45, at: 0 }],
    [vetro, { transform: ['scale(1)', fine], opacity: [0.95, 0.95, 0] }, { duration: 0.8, at: 0 }],
    [anelloScuro, { transform: ['scale(1)', fine], opacity: [1, 1, 0] }, { duration: 0.8, at: 0 }],
    [anelloOro, { transform: ['scale(1)', fine], opacity: [1, 1, 0] }, { duration: 0.8, at: 0 }],
    [riflesso, { transform: ['scale(1)', fine], opacity: [1, 0] }, { duration: 0.5, at: 0 }],
  ];
  const collezione = document.querySelector<HTMLElement>('#collezione');
  if (collezione) {
    c.tocca(collezione);
    seq.push([collezione, { filter: ['blur(4px)', 'blur(0px)'], transform: ['scale(1.06)', 'scale(1)'] }, { duration: 0.8, at: 0.08 }]);
  }
  return seq;
}

/* ------------------------------------------------------------------ */
/* Raccoglitore: le carte escono dalle tasche e scendono al loro posto. */
/* ------------------------------------------------------------------ */
function raccoglitore(c: Contesto): AnimationSequence {
  const { vh } = c;
  const seq: AnimationSequence = [];
  const tasche = Array.from(c.oggetto.querySelectorAll<SVGRectElement>('.tasca'));
  const strato = nodo('g');
  c.svg.appendChild(strato);
  tasche.forEach((t, i) => {
    const r = t.getBoundingClientRect();
    const carta = nodo('rect', { x: r.left, y: r.top, width: r.width, height: r.height, rx: 3, fill: t.getAttribute('fill') ?? '#3D6BC2', style: 'transform-box: fill-box; transform-origin: center' });
    strato.appendChild(carta);
    const dx = (r.left + r.width / 2 - c.cx) * 1.6;
    const dy = vh - r.top + 80;
    const rot = (i % 2 === 0 ? -1 : 1) * (6 + (i % 3) * 4);
    seq.push([
      carta,
      { transform: ['translate(0px, 0px) rotate(0deg) scale(1)', `translate(${dx.toFixed(0)}px, ${dy.toFixed(0)}px) rotate(${rot}deg) scale(2.4)`], opacity: [1, 1, 0] },
      { duration: 0.75, at: 0.02 + i * 0.035, ease: PASSAGGIO },
    ]);
  });
  c.tocca(c.oggetto);
  seq.push([c.oggetto, { transform: ['scale(1)', 'scale(1.06)', 'scale(1)'] }, { duration: 0.55, at: 0 }]);
  const carte = Array.from(document.querySelectorAll<HTMLElement>('#collezione .carta'));
  if (carte.length) {
    carte.forEach((el) => c.tocca(el));
    seq.push([
      carte,
      { opacity: [0, 1], transform: ['translateY(32px) scale(0.96)', 'translateY(0px) scale(1)'] },
      { duration: 0.6, at: 0.2, delay: stagger(0.045) },
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
  const seq: AnimationSequence = [];
  punte.forEach((p, i) => {
    const r = p.getBoundingClientRect();
    const g = nodo('g', { transform: `translate(${(r.left + r.width / 2).toFixed(1)} ${(r.top + r.height / 2).toFixed(1)})` });
    const cerchi = [0, 1, 2].map(() => anello(5, colore, 2.5, 0.95));
    cerchi.forEach((k) => g.appendChild(k));
    c.svg.appendChild(g);
    cerchi.forEach((k, j) => {
      seq.push([k, { transform: ['scale(1)', `scale(${9 + j * 4})`], opacity: [0.95, 0.8, 0] }, { duration: 0.7, at: i * 0.06 + j * 0.1, ease: PASSAGGIO }]);
    });
  });
  c.tocca(c.oggetto);
  seq.push([c.oggetto, { transform: ['rotate(0deg)', 'rotate(-5deg)', 'rotate(0deg)'] }, { duration: 0.4, at: 0, ease: ['easeOut', [0.34, 1.56, 0.64, 1]] }]);
  return seq;
}

/* ------------------------------------------------------------------ */
/* Moneta: la moneta d'oro si gira in aria e viene verso la camera.    */
/* ------------------------------------------------------------------ */
function moneta(c: Contesto): AnimationSequence {
  const { r0, scala } = c;
  const disco = nodo('circle', { r: r0, fill: 'url(#vOro)' });
  const cerchio = anello(r0 * 0.75, '#9A6E14', 1.4, 0.9);
  const centro = anello(r0 * 0.43, '#9A6E14', 1.6, 0.6);
  // Il gruppo esterno posiziona, quello interno si anima: la trasformazione CSS sostituirebbe l'attributo.
  const g = nodo('g', {}, [disco, cerchio, centro]);
  gruppo(c, [g]);
  c.tocca(c.oggetto);
  // Scala crescente e, intanto, due giri su se stessa (scaleX).
  const passi = [1, 3, 7, 14, 30, scala];
  const giro = [1, 0.14, 1, 0.14, 1, 1];
  const fotogrammi = passi.map((s, i) => `scale(${(s * giro[i]).toFixed(3)}, ${s.toFixed(3)})`);
  return [
    [c.oggetto, { transform: ['scale(1)', 'scale(1.6)'], opacity: [1, 0] }, { duration: 0.5, at: 0 }],
    [g, { transform: fotogrammi }, { duration: 0.85, at: 0, times: [0, 0.16, 0.32, 0.48, 0.64, 1], ease: ['easeIn', 'easeOut', 'easeIn', 'easeOut', CURVA] }],
    [cerchio, { opacity: [0.9, 0.9, 0] }, { duration: 0.85, at: 0 }],
    [centro, { opacity: [0.6, 0.6, 0] }, { duration: 0.85, at: 0 }],
  ];
}

/* ------------------------------------------------------------------ */
/* Mazzo di carte: le carte sfilano, l'ultima si gira e riempie lo schermo. */
/* ------------------------------------------------------------------ */
function carte(c: Contesto): AnimationSequence {
  const { forma, lontano } = c;
  const w = forma.width;
  const h = forma.height;
  const k = w / 52;
  const rettangolo = (fill: string, extra: Record<string, string | number> = {}) =>
    nodo('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 4 * k, fill, ...extra });
  const cornice = () =>
    nodo('rect', { x: -w / 2 + 5 * k, y: -h / 2 + 5 * k, width: w - 10 * k, height: h - 10 * k, rx: 3 * k, fill: 'none', stroke: '#F3CC6A', 'stroke-width': 1.2, 'vector-effect': 'non-scaling-stroke' });
  const rombo = (fill: string) => nodo('path', { d: `M0 ${-14 * k} L${8 * k} 0 L0 ${14 * k} L${-8 * k} 0 Z`, fill });

  const sfondo = [0, 1, 2, 3].map(() => {
    const g = nodo('g', {}, [rettangolo('#3D6BC2'), cornice(), rombo('#F3CC6A')]);
    return g;
  });
  const fronte = nodo('g', {}, [rettangolo('#ffffff'), nodo('rect', { x: -w / 2 + 5 * k, y: -h / 2 + 5 * k, width: w - 10 * k, height: h - 10 * k, rx: 3 * k, fill: 'none', stroke: '#C9CFDC', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }), rombo('#D4634A')]);
  const retroCornice = cornice();
  const retroRombo = rombo('#F3CC6A');
  const retro = nodo('g', { style: 'transform: scale(0, 1)' }, [rettangolo('#3D6BC2'), retroCornice, retroRombo]);
  const carta = nodo('g', {}, [retro, fronte]);
  gruppo(c, [...sfondo, carta]);
  c.tocca(c.oggetto);

  // Il lato corto, scalato, deve superare l'angolo più lontano.
  const S = (lontano * 1.08) / (Math.min(w, h) / 2);
  const seq: AnimationSequence = [
    [c.oggetto, { opacity: [1, 0] }, { duration: 0.3, at: 0.05 }],
    [carta, { transform: ['rotate(-4deg) scale(1)', `rotate(0deg) scale(${S.toFixed(3)})`] }, { duration: 0.85, at: 0 }],
    [fronte, { transform: ['scale(1, 1)', 'scale(0, 1)'] }, { duration: 0.3, at: 0, ease: 'easeIn' }],
    [retro, { transform: ['scale(0, 1)', 'scale(1, 1)'] }, { duration: 0.32, at: 0.3, ease: 'easeOut' }],
    [[retroCornice, retroRombo], { opacity: [1, 1, 0] }, { duration: 0.5, at: 0.35 }],
  ];
  const angoli = [-34, -14, 12, 30];
  sfondo.forEach((g, i) => {
    seq.push([
      g,
      { transform: ['rotate(0deg) translate(0px, 0px) scale(1)', `rotate(${angoli[i]}deg) translate(0px, ${(-h * 1.6).toFixed(0)}px) scale(2.6)`], opacity: [1, 1, 0] },
      { duration: 0.6, at: 0.02 + i * 0.045, ease: PASSAGGIO },
    ]);
  });
  return seq;
}

/* ------------------------------------------------------------------ */
/* Tastiera: un'onda di tasti si accende e il corpo riempie lo schermo. */
/* ------------------------------------------------------------------ */
function tastiera(c: Contesto): AnimationSequence {
  const { forma, lontano } = c;
  const w = forma.width * 0.96;
  const h = forma.height * 0.9;
  const corpo = nodo('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: h * 0.07, fill: '#232741' });
  const righe = 4;
  const colonne = 12;
  const passoX = w / (colonne + 1);
  const passoY = h / (righe + 1);
  const tasti: SVGRectElement[] = [];
  for (let r = 0; r < righe; r++) {
    for (let k = 0; k < colonne; k++) {
      const t = nodo('rect', {
        x: -w / 2 + passoX * (k + 0.6) + r * passoX * 0.18,
        y: -h / 2 + passoY * (r + 0.6),
        width: passoX * 0.78,
        height: passoY * 0.72,
        rx: passoX * 0.12,
        fill: '#C9D1E3',
        opacity: 0,
        'data-col': k,
      });
      tasti.push(t);
    }
  }
  const g = nodo('g', {}, [corpo, ...tasti]);
  gruppo(c, [g]);
  c.tocca(c.oggetto);
  const S = (lontano * 1.08) / (Math.min(w, h) / 2);
  const seq: AnimationSequence = [
    [c.oggetto, { opacity: [1, 0] }, { duration: 0.3, at: 0.1 }],
    [g, { transform: ['rotate(-4deg) scale(1)', `rotate(0deg) scale(${S.toFixed(3)})`] }, { duration: 0.85, at: 0 }],
  ];
  tasti.forEach((t) => {
    const col = Number(t.dataset.col);
    seq.push([t, { opacity: [0, 0.9, 0] }, { duration: 0.32, at: col * 0.03, ease: 'easeOut' }]);
  });
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

export interface Viaggio {
  linea: Timeline;
  /** Rimuove la scena e ripulisce gli stili della pagina. */
  pulisci: () => void;
}

/**
 * Avvia la scena `scena` dall'elemento `forma` (la forma di riferimento dentro `oggetto`).
 * Con `ridotto` la scena è una dissolvenza di 0,25 s verso il colore di arrivo.
 */
export function avviaViaggio(opzioni: {
  scena: Scena;
  svg: SVGSVGElement;
  oggetto: SVGElement;
  forma: Element;
  ridotto: boolean;
  musica: boolean;
}): Viaggio {
  const { scena, svg, oggetto, forma, ridotto, musica } = opzioni;
  const cornice = svg.getBoundingClientRect();
  const vw = cornice.width;
  const vh = cornice.height;
  svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  const r = forma.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const r0 = Math.max(4, Math.max(r.width, r.height) / 2);
  const lontano = Math.max(Math.hypot(cx, cy), Math.hypot(vw - cx, cy), Math.hypot(cx, vh - cy), Math.hypot(vw - cx, vh - cy));
  const scala = (lontano * 1.08) / r0;
  const toccati = new Set<Element>();
  const c: Contesto = { svg, oggetto, forma: r, cx, cy, r0, vw, vh, lontano, scala, tocca: (el) => toccati.add(el), musica };

  if (NAVIGA[scena]) {
    sessionStorage.setItem('arrivo', scena);
    sessionStorage.setItem('arrivo-x', `${((cx / vw) * 100).toFixed(2)}%`);
    sessionStorage.setItem('arrivo-y', `${((cy / vh) * 100).toFixed(2)}%`);
    sessionStorage.setItem('arrivo-r', `${(r0 * scala).toFixed(0)}px`);
  }

  let sequenza: AnimationSequence;
  if (ridotto) {
    const velo = nodo('rect', { x: 0, y: 0, width: vw, height: vh, fill: COLORE_PIATTO[scena] ?? '#ffffff', opacity: 0 });
    svg.appendChild(velo);
    sequenza = NAVIGA[scena] ? [[velo, { opacity: [0, 1] }, { duration: 0.25, ease: 'linear' }]] : [[velo, { opacity: [0, 0] }, { duration: 0.01 }]];
  } else {
    sequenza = SCENE[scena](c);
  }
  const linea = animate(sequenza, { defaultTransition: { ease: CURVA } });
  const pulisci = () => {
    linea.cancel();
    svg.replaceChildren(...Array.from(svg.children).filter((n) => n.tagName.toLowerCase() === 'defs'));
    for (const el of toccati) {
      if (el instanceof HTMLElement || el instanceof SVGElement) {
        el.style.transform = '';
        el.style.opacity = '';
        el.style.filter = '';
      }
    }
  };
  return { linea, pulisci };
}
