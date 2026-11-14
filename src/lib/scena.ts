/**
 * Transizioni di scena: ogni passaggio di pagina ha una copertura (prima del cambio)
 * e una scoperta (sulla pagina nuova). Lo strato `#scena` resta nel documento tra una
 * pagina e l'altra (vedi Base.astro), quindi la copertura non si interrompe mai.
 */
import { navigate } from 'astro:transitions/client';
import { gsap, riduci } from '@/lib/moto';

export type Tipo = 'caffe' | 'cielo' | 'tasti' | 'carte' | 'moneta' | 'sipario';

interface Punto { x: number; y: number; r: number }
interface Passaggio {
  /** copre lo schermo; la promessa si chiude a schermo coperto */
  copri: () => Promise<void>;
  /** scopre la pagina nuova; la promessa si chiude a schermo libero */
  svela: () => Promise<void>;
}

let occupata = false;
let arrivo: Tipo | null = null;
let sicurezza = 0;

/** Vero mentre una transizione è in corso. */
export const inCorso = (): boolean => occupata;
/** Il tipo di transizione con cui si sta arrivando sulla pagina corrente, se c'è. */
export const arrivoDa = (): Tipo | null => arrivo;
/** Secondi che l'ingresso della pagina deve aspettare perché la scoperta sia già cominciata. */
export function ritardoArrivo(): number {
  switch (arrivo) {
    case 'caffe': return 0.45;
    case 'cielo': return 0.35;
    case 'tasti': return 0.4;
    case 'carte': return 0.35;
    case 'moneta': return 0.3;
    case 'sipario': return 0.3;
    default: return 0;
  }
}

const radice = (): HTMLElement => document.getElementById('scena') as HTMLElement;

function crea<K extends keyof HTMLElementTagNameMap>(tag: K, classe: string, dentro: Element = radice()): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = classe;
  dentro.appendChild(el);
  return el;
}

function svg(markup: string, classe: string, dentro: Element = radice()): SVGSVGElement {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  const el = t.content.firstElementChild as SVGSVGElement;
  el.classList.add(classe);
  dentro.appendChild(el);
  return el;
}

function pulisci() {
  const r = radice();
  if (!r) return;
  gsap.killTweensOf(r.querySelectorAll('*'));
  r.replaceChildren();
  r.classList.remove('scena--attiva');
  r.style.cssText = '';
}

const finito = (a: gsap.core.Animation): Promise<void> => new Promise((ok) => { a.eventCallback('onComplete', () => ok()); });

/** Centro e raggio di un elemento sullo schermo. */
export function puntoDi(el: Element | null | undefined): Punto {
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2, r: 24 };
  const b = el.getBoundingClientRect();
  return { x: b.left + b.width / 2, y: b.top + b.height / 2, r: Math.max(b.width, b.height) / 2 };
}

/** Distanza dal punto all'angolo più lontano dello schermo: il raggio che copre tutto. */
function lontano(p: { x: number; y: number }): number {
  const w = window.innerWidth, h = window.innerHeight;
  return Math.max(Math.hypot(p.x, p.y), Math.hypot(w - p.x, p.y), Math.hypot(p.x, h - p.y), Math.hypot(w - p.x, h - p.y));
}

const cerchio = (el: HTMLElement, r: number, p: { x: number; y: number }) => {
  el.style.clipPath = `circle(${Math.max(0, r).toFixed(1)}px at ${p.x.toFixed(1)}px ${p.y.toFixed(1)}px)`;
};

/* ───────────────────────── caffè → Contatti ───────────────────────── */

function caffe(p: Punto): Passaggio {
  const tazza = crea('div', 'scena__pieno');
  tazza.style.background = '#ffffff';
  const crema = crea('div', 'scena__pieno');
  crema.style.background = '#c79a6b';
  const liquido = crea('div', 'scena__pieno');
  liquido.style.background = `radial-gradient(circle at ${p.x}px ${p.y}px, #6b4529 0%, #4a2e1b 45%, #2c1a0e 100%)`;
  const lato = lontano(p) * 2;
  const vortice = svg(
    `<svg viewBox="-100 -100 200 200" aria-hidden="true"><g fill="none" stroke-linecap="round">
      <path d="M0 0 C 10 -14 34 -8 30 14 C 26 40 -16 44 -34 20 C -56 -10 -30 -56 12 -58 C 62 -60 88 -8 70 36 C 52 80 -8 92 -50 66" stroke="#e7c9a0" stroke-width="5" opacity=".55"/>
      <path d="M0 0 C -8 12 -30 6 -26 -14 C -22 -36 14 -40 30 -18 C 50 8 26 50 -10 52 C -54 54 -78 8 -62 -32" stroke="#f4e3c8" stroke-width="2.5" opacity=".5"/>
    </g></svg>`,
    'scena__centrato',
    liquido,
  );
  gsap.set(vortice, { left: p.x - lato / 2, top: p.y - lato / 2, width: lato, height: lato, scale: (p.r * 2) / lato, rotation: -40 });
  const tratti = vortice.querySelectorAll('path');
  const fine = lontano(p) * 1.06;
  const stato = { r: p.r };
  const bordo = (v: number) => v + Math.max(5, Math.min(26, v * 0.2));
  const disegna = () => { cerchio(liquido, stato.r, p); cerchio(crema, stato.r + 2, p); cerchio(tazza, bordo(stato.r), p); };
  disegna();

  return {
    copri: () => {
      const tl = gsap.timeline();
      tl.to(stato, { r: p.r * 0.82, duration: 0.14, ease: 'power2.out', onUpdate: disegna })
        .to(stato, { r: fine, duration: 0.74, ease: 'scena', onUpdate: disegna })
        .fromTo(tratti, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.7, ease: 'power2.out', stagger: 0.08 }, 0.1)
        .to(vortice, { scale: 0.62, rotation: 150, duration: 0.86, ease: 'scena' }, 0.1)
        // mentre la pagina nuova si carica il caffè continua a girare piano
        .add(() => { gsap.to(vortice, { rotation: '+=360', duration: 16, ease: 'none', repeat: -1 }); });
      return finito(tl);
    },
    svela: () => {
      // il caffè si beve: il livello scende con un bordo che ondeggia e una riga di crema sopra
      tazza.remove();
      const w = window.innerWidth, h = window.innerHeight;
      const livello = { y: -40, a: 26, t: 0 };
      const N = 28;
      const onda = (el: HTMLElement, base: number, fase: number, amp: number) => {
        let s = '';
        for (let i = 0; i <= N; i++) {
          const x = (i / N) * w;
          const y = base + Math.sin((i / N) * Math.PI * 3.2 + fase) * amp + Math.sin((i / N) * Math.PI * 7 - fase * 1.6) * amp * 0.25;
          s += `${x.toFixed(1)}px ${y.toFixed(1)}px,`;
        }
        el.style.clipPath = `polygon(${s}${w}px ${h + 2}px,0px ${h + 2}px)`;
      };
      const disegnaOnda = () => {
        onda(liquido, livello.y, livello.t, livello.a);
        onda(crema, livello.y - 16, livello.t * 0.8 + 1.4, livello.a * 0.8);
      };
      const tl = gsap.timeline();
      tl.to(tratti, { opacity: 0, duration: 0.5 }, 0)
        .to(livello, { y: h + 60, duration: 1.15, ease: 'power2.inOut', onUpdate: disegnaOnda }, 0)
        .to(livello, { t: 9, duration: 1.15, ease: 'none' }, 0)
        .to(livello, { a: 8, duration: 1.15, ease: 'power1.in' }, 0);
      return finito(tl);
    },
  };
}

/* ───────────────────────── sistema solare → Chi sono ───────────────────────── */

function cielo(p: Punto): Passaggio {
  const w = window.innerWidth, h = window.innerHeight;
  const ghiera = crea('div', 'scena__pieno');
  ghiera.style.background = '#f6f7fb';
  const filo = crea('div', 'scena__pieno');
  filo.style.background = '#f3cc6a';
  const fondo = crea('div', 'scena__pieno');
  fondo.style.background = `radial-gradient(circle at ${p.x}px ${p.y}px, #2f57ae 0%, #1a2f66 55%, #0d1838 100%)`;
  const tela = crea('canvas', 'scena__pieno', fondo);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  tela.width = Math.round(w * dpr);
  tela.height = Math.round(h * dpr);
  const c = tela.getContext('2d')!;
  const fine = lontano(p) * 1.06;
  const k = p.r / 56; // scala tra il disegno sul tavolo e lo schermo
  const orbite = svg(
    `<svg aria-hidden="true"><g fill="none" stroke="#9fc3ff">
      ${[14, 23, 33, 45].map((o) => `<circle cx="${p.x}" cy="${p.y}" r="${o * k}" stroke-width="1" opacity=".5"/>`).join('')}
    </g><circle class="sole" cx="${p.x}" cy="${p.y}" r="${6 * k}" fill="#f3cc6a"/></svg>`,
    'scena__pieno',
    fondo,
  );
  const anelli = Array.from(orbite.querySelectorAll<SVGCircleElement>('g circle'));
  const sole = orbite.querySelector<SVGCircleElement>('.sole')!;

  // stelle: nascono vicino al centro e corrono verso il bordo, sempre più veloci
  interface Stella { a: number; d: number; v: number; s: number }
  const centro = { x: p.x, y: p.y };
  const nuova = (vicino: boolean): Stella => ({
    a: Math.random() * Math.PI * 2,
    d: vicino ? 8 + Math.random() * 60 : Math.random() * fine,
    v: 0.5 + Math.random() * 1.2,
    s: 0.6 + Math.random() * 1.3,
  });
  const stelle: Stella[] = Array.from({ length: Math.round(Math.min(320, (w * h) / 4200)) }, () => nuova(false));
  const corsa = { v: 0 };
  const passo = (_t: number, dt: number) => {
    const f = Math.min(dt, 40) / 16.67;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    c.lineCap = 'round';
    for (const s of stelle) {
      const vel = (0.05 + corsa.v * (2 + s.d * 0.085)) * s.v * f;
      const d0 = s.d;
      s.d += vel;
      if (s.d > fine + 40) { Object.assign(s, nuova(true)); continue; }
      const cs = Math.cos(s.a), sn = Math.sin(s.a);
      const coda = Math.max(0.01, (s.d - d0) * (1 + corsa.v * 2.2));
      const alfa = Math.min(1, 0.35 + s.d / (fine * 0.5));
      c.strokeStyle = `rgba(${s.s > 1.5 ? '243,204,106' : '236,243,255'},${alfa.toFixed(3)})`;
      c.lineWidth = s.s * (0.7 + corsa.v * 0.6);
      c.beginPath();
      c.moveTo(centro.x + cs * (s.d - coda), centro.y + sn * (s.d - coda));
      c.lineTo(centro.x + cs * s.d, centro.y + sn * s.d);
      c.stroke();
    }
  };
  gsap.ticker.add(passo);

  const stato = { r: p.r };
  const disegna = () => { cerchio(fondo, stato.r, p); cerchio(filo, stato.r + Math.max(1.5, Math.min(5, stato.r * 0.03)), p); cerchio(ghiera, stato.r + Math.max(6, Math.min(30, stato.r * 0.16)), p); };
  disegna();

  return {
    copri: () => {
      const tl = gsap.timeline();
      tl.to(stato, { r: p.r * 0.86, duration: 0.14, ease: 'power2.out', onUpdate: disegna })
        .to(stato, { r: fine, duration: 0.76, ease: 'scena', onUpdate: disegna })
        .to(corsa, { v: 1, duration: 0.76, ease: 'power2.in' }, 0.1)
        // le orbite vengono incontro e passano oltre, la più esterna per prima
        .to(anelli, { attr: { r: (i: number) => fine * (1.1 + (3 - i) * 0.25), 'stroke-width': 3 }, opacity: 0, duration: 0.8, ease: 'power3.in', stagger: { each: 0.06, from: 'end' } }, 0.08)
        .to(sole, { attr: { r: 26 * k }, opacity: 0, duration: 0.7, ease: 'power2.in' }, 0.12);
      return finito(tl);
    },
    svela: () => {
      // un foro si apre attorno a Saturno e il cielo si ritira verso i bordi
      ghiera.remove(); filo.remove();
      fondo.style.clipPath = 'none';
      const meta = puntoDi(document.querySelector('.saturno'));
      const foro = { r: 0 };
      const massimo = lontano(meta) * 1.05;
      // attorno al foro la stessa ghiera del disco sul tavolo: fascia chiara e filo d'oro
      const bordo = crea('div', 'scena__ghiera');
      const buca = () => {
        const m = `radial-gradient(circle at ${meta.x.toFixed(1)}px ${meta.y.toFixed(1)}px, transparent ${Math.max(0, foro.r - 1.5).toFixed(1)}px, #000 ${foro.r.toFixed(1)}px)`;
        fondo.style.maskImage = m;
        fondo.style.setProperty('-webkit-mask-image', m);
        const fascia = Math.min(12, foro.r * 0.12);
        const lato = (foro.r + fascia + 2) * 2;
        Object.assign(bordo.style, { left: `${(meta.x - lato / 2).toFixed(1)}px`, top: `${(meta.y - lato / 2).toFixed(1)}px`, width: `${lato.toFixed(1)}px`, height: `${lato.toFixed(1)}px`, boxShadow: `inset 0 0 0 2px #f3cc6a, inset 0 0 0 ${(fascia + 2).toFixed(1)}px #f6f7fb` });
      };
      gsap.to(centro, { x: meta.x, y: meta.y, duration: 0.5, ease: 'power2.out' });
      const tl = gsap.timeline({ onComplete: () => gsap.ticker.remove(passo) });
      tl.to(corsa, { v: 0.12, duration: 0.9, ease: 'power2.out' }, 0)
        .to(foro, { r: massimo, duration: 1.0, ease: 'scena', onUpdate: buca }, 0.08);
      return finito(tl);
    },
  };
}

/* ───────────────────────── tastiera → Esperimenti ───────────────────────── */

function tasti(p: Punto, parola: string): Passaggio {
  const w = window.innerWidth, h = window.innerHeight;
  const lato = w < 700 ? 62 : 86;
  const colonne = Math.ceil(w / lato), righe = Math.ceil(h / lato);
  const fondo = crea('div', 'scena__pieno');
  fondo.style.background = '#1b1f36';
  gsap.set(fondo, { autoAlpha: 0 });
  const muro = crea('div', 'scena__muro');
  muro.style.gridTemplateColumns = `repeat(${colonne}, 1fr)`;
  muro.style.gridTemplateRows = `repeat(${righe}, 1fr)`;
  const testo = parola.length <= colonne - 2 ? parola : parola.length > 5 && colonne >= 7 ? 'PROVE' : '';
  const rigaTesto = Math.floor((righe - 1) / 2);
  const inizio = Math.floor((colonne - testo.length) / 2);
  const celle: HTMLElement[] = [];
  const lettere: HTMLElement[] = [];
  for (let i = 0; i < colonne * righe; i++) {
    const cella = crea('div', 'scena__tasto', muro);
    const cappello = crea('span', 'scena__cappello', cella);
    const col = i % colonne, riga = Math.floor(i / colonne);
    if (riga === rigaTesto && col >= inizio && col < inizio + testo.length) {
      cappello.textContent = testo[col - inizio];
      lettere.push(cappello);
    }
    celle.push(cella);
  }
  const origine = Math.min(colonne - 1, Math.max(0, Math.floor(p.x / (w / colonne)))) + Math.min(righe - 1, Math.max(0, Math.floor(p.y / (h / righe)))) * colonne;
  let battitura: gsap.core.Timeline | null = null;

  return {
    copri: () => {
      const tl = gsap.timeline();
      tl.fromTo(celle, { scale: 0, autoAlpha: 0, rotation: -12 }, { scale: 1, autoAlpha: 1, rotation: 0, duration: 0.42, ease: 'back.out(1.7)', stagger: { grid: [righe, colonne], from: origine, amount: 0.5 } })
        .to(fondo, { autoAlpha: 1, duration: 0.3, ease: 'none' }, 0.35);
      // la parola si scrive da sola mentre la pagina nuova si carica
      battitura = gsap.timeline({ delay: 0.62 });
      lettere.forEach((l, i) => {
        battitura!
          .to(l, { y: 5, scale: 0.94, duration: 0.05, ease: 'power2.in' }, i * 0.055)
          .to(l, { y: 0, scale: 1, backgroundColor: i === lettere.length - 1 ? '#d4634a' : '#e8ecf6', color: i === lettere.length - 1 ? '#ffffff' : '#1a1d2b', duration: 0.22, ease: 'back.out(3)' }, i * 0.055 + 0.05);
      });
      return finito(tl);
    },
    svela: async () => {
      if (battitura && battitura.progress() < 1) await finito(battitura);
      const centro = Math.floor(colonne / 2) + rigaTesto * colonne;
      const tl = gsap.timeline({ delay: lettere.length ? 0.18 : 0 });
      tl.to(fondo, { autoAlpha: 0, duration: 0.25, ease: 'none' }, 0.1)
        .to(celle, { scale: 0, rotationX: -70, y: 26, autoAlpha: 0, duration: 0.42, ease: 'power2.in', stagger: { grid: [righe, colonne], from: centro, amount: 0.45 } }, 0);
      return finito(tl);
    },
  };
}

/* ───────────────────────── carte → Chi sono ───────────────────────── */

function carte(p: Punto): Passaggio {
  const w = window.innerWidth, h = window.innerHeight;
  const n = w < 700 ? 4 : 7;
  const larghezza = w / n;
  const mazzo: HTMLElement[] = [];
  for (let i = 0; i < n; i++) {
    const carta = crea('div', 'scena__carta');
    crea('span', 'scena__carta-cornice', carta);
    crea('span', 'scena__carta-seme', carta);
    Object.assign(carta.style, { left: `${i * larghezza - 1}px`, width: `${larghezza + 2}px` });
    mazzo.push(carta);
  }
  const scala = Math.max(0.05, (p.r * 1.4) / h);
  return {
    copri: () => {
      const tl = gsap.timeline();
      tl.fromTo(
        mazzo,
        { x: (i: number) => p.x - (i * larghezza + larghezza / 2), y: p.y - h / 2, scale: scala, rotation: (i: number) => -30 + i * 14, autoAlpha: 1 },
        { x: 0, y: 0, scale: 1, rotation: 0, duration: 0.72, ease: 'power3.inOut', stagger: { each: 0.055, from: 'center' } },
      );
      return finito(tl);
    },
    svela: () => {
      const tl = gsap.timeline();
      tl.to(mazzo, { rotationY: 92, transformPerspective: 1400, duration: 0.5, ease: 'power2.in', stagger: { each: 0.06, from: 'start' } })
        .set(mazzo, { autoAlpha: 0 });
      return finito(tl);
    },
  };
}

/* ───────────────────────── moneta → Chi sono ───────────────────────── */

function moneta(p: Punto): Passaggio {
  const oro = crea('div', 'scena__pieno scena__oro');
  const lato = lontano(p) * 2;
  const conio = svg(
    `<svg viewBox="-100 -100 200 200" aria-hidden="true"><g fill="none">
      <circle r="92" stroke="#9a6e14" stroke-width="1.6" opacity=".7"/>
      <circle r="86" stroke="#fff1c2" stroke-width="1.2" stroke-dasharray="1.5 3" opacity=".8"/>
      <circle r="58" stroke="#9a6e14" stroke-width="2.4" opacity=".55"/>
      <circle r="52" stroke="#fff1c2" stroke-width=".8" opacity=".6"/>
      <path d="M0 -34 L10 -10 L36 -10 L15 6 L23 32 L0 16 L-23 32 L-15 6 L-36 -10 L-10 -10 Z" stroke="#9a6e14" stroke-width="2.4" stroke-linejoin="round" opacity=".6"/>
    </g></svg>`,
    'scena__centrato',
    oro,
  );
  gsap.set(conio, { left: p.x - lato / 2, top: p.y - lato / 2, width: lato, height: lato, scale: (p.r * 2) / lato });
  const fine = lontano(p) * 1.06;
  const stato = { r: p.r };
  const centro = { x: p.x, y: p.y };
  const disegna = () => cerchio(oro, stato.r, centro);
  disegna();
  return {
    copri: () => {
      const tl = gsap.timeline();
      tl.to(stato, { r: p.r * 0.8, duration: 0.14, ease: 'power2.out', onUpdate: disegna })
        .to(stato, { r: fine, duration: 0.74, ease: 'scena', onUpdate: disegna })
        .to(conio, { scale: 0.9, rotation: 200, duration: 0.86, ease: 'scena' }, 0.1);
      return finito(tl);
    },
    svela: () => {
      // lo schermo d'oro si richiude in una moneta al centro, che viene lanciata in aria
      const w = window.innerWidth, h = window.innerHeight;
      const meta = { x: w / 2, y: h / 2 };
      const raggio = Math.min(64, w * 0.14);
      gsap.set(conio, { left: meta.x - lato / 2, top: meta.y - lato / 2, rotation: 0, scale: 0.9 });
      centro.x = meta.x; centro.y = meta.y;
      stato.r = lontano(meta) * 1.06;
      const tl = gsap.timeline();
      tl.to(stato, { r: raggio, duration: 0.65, ease: 'scena', onUpdate: disegna }, 0)
        .to(conio, { scale: (raggio * 2) / lato, rotation: -180, duration: 0.65, ease: 'scena' }, 0)
        .add(() => {
          // da qui è un disco vero: si può ruotare nello spazio
          oro.style.clipPath = 'none';
          Object.assign(oro.style, { inset: 'auto', left: `${meta.x - raggio}px`, top: `${meta.y - raggio}px`, width: `${raggio * 2}px`, height: `${raggio * 2}px`, borderRadius: '50%' });
          gsap.set(conio, { left: 0, top: 0, width: raggio * 2, height: raggio * 2, scale: 1, rotation: 0 });
        })
        .to(oro, { y: -h * 0.36, rotationX: 720, transformPerspective: 700, duration: 0.42, ease: 'power2.out' })
        .to(oro, { y: h * 0.75, rotationX: 1440, scale: 0.7, duration: 0.42, ease: 'power2.in' });
      return finito(tl);
    },
  };
}

/* ───────────────────────── sipario: tutti gli altri collegamenti ───────────────────────── */

function sipario(versoCasa: boolean): Passaggio {
  const colori = versoCasa ? ['#e8b33c', '#2a6652'] : ['#d4634a', '#1a1d2b'];
  const tela = svg(
    `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path fill="${colori[0]}"/><path fill="${colori[1]}"/></svg>`,
    'scena__pieno',
  );
  const [dietro, davanti] = Array.from(tela.querySelectorAll('path'));
  const sale = (pa: SVGPathElement, s: { bordo: number; curva: number }) =>
    pa.setAttribute('d', `M0 ${s.bordo.toFixed(2)} Q50 ${s.curva.toFixed(2)} 100 ${s.bordo.toFixed(2)} L100 101 L0 101 Z`);
  const esce = (pa: SVGPathElement, s: { bordo: number; curva: number }) =>
    pa.setAttribute('d', `M0 -1 L100 -1 L100 ${s.bordo.toFixed(2)} Q50 ${s.curva.toFixed(2)} 0 ${s.bordo.toFixed(2)} Z`);
  const a = { bordo: 101, curva: 101 }, b = { bordo: 101, curva: 101 };
  sale(dietro, a); sale(davanti, b);
  return {
    copri: () => {
      const tl = gsap.timeline();
      tl.to(a, { curva: -30, duration: 0.5, ease: 'power2.in', onUpdate: () => sale(dietro, a) }, 0)
        .to(a, { bordo: -1, duration: 0.5, ease: 'power2.in' }, 0.08)
        .to(b, { curva: -30, duration: 0.5, ease: 'power2.in', onUpdate: () => sale(davanti, b) }, 0.1)
        .to(b, { bordo: -1, duration: 0.5, ease: 'power2.in' }, 0.18);
      return finito(tl);
    },
    svela: () => {
      const c1 = { bordo: 101, curva: 101 }, c2 = { bordo: 101, curva: 101 };
      esce(dietro, c1); esce(davanti, c2);
      const tl = gsap.timeline();
      tl.to(c2, { bordo: -1, duration: 0.55, ease: 'power2.out', onUpdate: () => esce(davanti, c2) }, 0)
        .to(c2, { curva: -1, duration: 0.55, ease: 'power3.out' }, 0.1)
        .to(c1, { bordo: -1, duration: 0.55, ease: 'power2.out', onUpdate: () => esce(dietro, c1) }, 0.1)
        .to(c1, { curva: -1, duration: 0.55, ease: 'power3.out' }, 0.2);
      return finito(tl);
    },
  };
}

/* ───────────────────────── regia ───────────────────────── */

let attuale: Passaggio | null = null;

/** Va a `href` con la transizione `tipo`, partendo dall'elemento `origine`. */
export async function vai(tipo: Tipo, href: string, origine?: Element | null): Promise<void> {
  if (occupata) return;
  if (riduci() || !radice()) { await navigate(href); return; }
  occupata = true;
  pulisci();
  radice().classList.add('scena--attiva');
  const p = puntoDi(origine);
  const url = new URL(href, location.href);
  switch (tipo) {
    case 'caffe': attuale = caffe(p); break;
    case 'cielo': attuale = cielo(p); break;
    case 'tasti': attuale = tasti(p, 'ESPERIMENTI'); break;
    case 'carte': attuale = carte(p); break;
    case 'moneta': attuale = moneta(p); break;
    default: attuale = sipario(url.pathname === '/');
  }
  // se qualcosa va storto la copertura non deve restare sullo schermo
  window.clearTimeout(sicurezza);
  sicurezza = window.setTimeout(() => { pulisci(); occupata = false; arrivo = null; attuale = null; }, 6000);
  await attuale.copri();
  arrivo = tipo;
  await navigate(href);
}

async function allArrivo() {
  if (!attuale) return;
  const passaggio = attuale;
  attuale = null;
  // un fotogramma di attesa: la pagina nuova deve essere già disposta prima di scoprirla
  await new Promise<void>((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok())));
  await passaggio.svela();
  window.clearTimeout(sicurezza);
  pulisci();
  occupata = false;
  arrivo = null;
}

/**
 * La lente: resta sulla stessa pagina. Sale verso chi guarda fino a coprire lo schermo,
 * `sotto` cambia ciò che c'è dietro (lo scorrimento), poi il vetro mette a fuoco.
 */
export async function lente(origine: Element | null, sotto: () => void): Promise<void> {
  if (occupata) return;
  if (riduci() || !radice()) { sotto(); return; }
  occupata = true;
  pulisci();
  const r = radice();
  r.classList.add('scena--attiva');
  const p = puntoDi(origine);
  const w = window.innerWidth, h = window.innerHeight;
  const vetro = crea('div', 'scena__vetro');
  const bordo = Math.max(3, p.r * 0.14);
  Object.assign(vetro.style, { left: `${p.x - p.r - bordo}px`, top: `${p.y - p.r - bordo}px`, width: `${(p.r + bordo) * 2}px`, height: `${(p.r + bordo) * 2}px`, borderWidth: `${bordo}px` });
  const velo = crea('div', 'scena__pieno scena__velo');
  gsap.set(velo, { autoAlpha: 0 });
  const meta = { x: w / 2, y: h / 2 };
  const scala = (lontano(meta) * 1.12) / p.r;
  const fuoco = { b: 0 };
  const sfoca = (el: HTMLElement) => () => {
    const v = `blur(${fuoco.b.toFixed(2)}px) saturate(${(1 + fuoco.b * 0.03).toFixed(2)})`;
    el.style.backdropFilter = v;
    el.style.setProperty('-webkit-backdrop-filter', v);
  };
  // la lente del tavolo sparisce: è «questa» che si sta alzando
  const vera = origine?.closest('[data-oggetto]') ?? null;
  if (vera) gsap.set(vera, { autoAlpha: 0 });
  const tl = gsap.timeline();
  tl.to(vetro, { scale: 0.9, duration: 0.14, ease: 'power2.out' })
    .to(vetro, { x: meta.x - p.x, y: meta.y - p.y, duration: 0.8, ease: 'scena' }, 0.14)
    .to(vetro, { scale: scala, duration: 0.8, ease: 'power3.in' }, 0.14)
    .to(fuoco, { b: 14, duration: 0.7, ease: 'power2.in', onUpdate: sfoca(vetro) }, 0.2)
    .to(velo, { autoAlpha: 1, duration: 0.25, ease: 'none', onStart: () => { fuoco.b = 14; sfoca(velo)(); } }, 0.69);
  await finito(tl);
  vetro.remove();
  sotto();
  await new Promise<void>((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok())));
  const tl2 = gsap.timeline();
  tl2.to(fuoco, { b: 0, duration: 0.75, ease: 'power2.out', onUpdate: sfoca(velo) }, 0)
    .to(velo, { backgroundColor: 'rgba(191, 217, 247, 0)', duration: 0.75, ease: 'power2.out' }, 0);
  await finito(tl2);
  if (vera) gsap.fromTo(vera, { autoAlpha: 0, scale: 1.25, y: -20, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.7, ease: 'back.out(1.6)' });
  pulisci();
  occupata = false;
}

/** Collegamenti interni: tutti passano dal sipario, tranne quelli che hanno una scena propria. */
function alClic(e: MouseEvent) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | SVGAElement | null;
  if (!a || a.closest('[data-oggetto]') || a.hasAttribute('download') || a.getAttribute('target') === '_blank') return;
  const grezzo = a instanceof SVGAElement ? a.href.baseVal : a.getAttribute('href') ?? '';
  if (!grezzo || grezzo === '#') return;
  const url = new URL(grezzo, location.href);
  if (url.origin !== location.origin) return;
  if (url.pathname === location.pathname) {
    // stessa pagina: scorrimento morbido fino all'ancora
    const meta = url.hash ? document.querySelector(url.hash) : null;
    if (!meta) return;
    e.preventDefault();
    scorriA(meta);
    history.replaceState(history.state, '', url.hash);
    return;
  }
  e.preventDefault();
  void vai('sipario', url.pathname + url.search + url.hash, a);
}

/** Scorre fino all'elemento con una curva lenta in partenza e in arrivo. */
export function scorriA(meta: Element, durata = 1.1): void {
  const y = meta.getBoundingClientRect().top + window.scrollY - 12;
  if (riduci()) { window.scrollTo(0, y); return; }
  const distanza = Math.abs(y - window.scrollY);
  gsap.to(window, { scrollTo: { y, autoKill: true }, duration: Math.min(durata, 0.5 + distanza / 1800), ease: 'scena', overwrite: true });
}

let avviata = false;
/** Da chiamare una volta: collega la regia ai clic e agli arrivi di pagina. */
export function avviaScena(): void {
  if (avviata) return;
  avviata = true;
  document.addEventListener('click', alClic, true);
  document.addEventListener('astro:page-load', () => void allArrivo());
}
