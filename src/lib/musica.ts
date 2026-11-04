/**
 * Musica di sottofondo generata nel browser (Web Audio API).
 * Niente file audio: un tappeto di tre voci su un giro di accordi lento,
 * un filtro passa-basso e un'eco. Reagisce alle azioni dell'utente con `effetto`.
 * Parte solo dopo un gesto dell'utente, come richiedono i browser.
 */

export type NomeEffetto = 'arpeggio' | 'filtro' | 'eco' | 'ottava' | 'pad' | 'silenzio' | 'tutto';

type Voce = { osc: OscillatorNode; gain: GainNode; base: number };

const ACCORDI: number[][] = [
  [146.83, 220.0, 369.99], // Re maggiore (Re3, La3, Fa#4)
  [123.47, 185.0, 293.66], // Si minore
  [98.0, 146.83, 246.94],  // Sol maggiore
  [110.0, 164.81, 277.18], // La maggiore
];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let filtro: BiquadFilterNode | null = null;
let eco: DelayNode | null = null;
let ecoRitorno: GainNode | null = null;
let voci: Voce[] = [];
let giro: number | null = null;
let passo = 0;
let accesa = false;

function emetti() {
  window.dispatchEvent(new CustomEvent('musica:cambio', { detail: { accesa } }));
}

export function attiva(): boolean {
  return accesa;
}

export function onCambio(cb: (accesa: boolean) => void): () => void {
  const h = (e: Event) => cb((e as CustomEvent<{ accesa: boolean }>).detail.accesa);
  window.addEventListener('musica:cambio', h);
  return () => window.removeEventListener('musica:cambio', h);
}

function prepara() {
  if (ctx) return;
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = 0;
  filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 900;
  filtro.Q.value = 0.7;
  eco = ctx.createDelay(1.0);
  eco.delayTime.value = 0.42;
  ecoRitorno = ctx.createGain();
  ecoRitorno.gain.value = 0.28;
  const ecoFiltro = ctx.createBiquadFilter();
  ecoFiltro.type = 'lowpass';
  ecoFiltro.frequency.value = 1400;

  filtro.connect(master);
  filtro.connect(eco);
  eco.connect(ecoFiltro);
  ecoFiltro.connect(ecoRitorno);
  ecoRitorno.connect(eco);
  ecoRitorno.connect(master);
  master.connect(ctx.destination);

  const tipi: OscillatorType[] = ['triangle', 'sine', 'sine'];
  voci = ACCORDI[0].map((f, i) => {
    const osc = ctx!.createOscillator();
    osc.type = tipi[i];
    osc.frequency.value = f;
    osc.detune.value = i === 1 ? 4 : i === 2 ? -3 : 0;
    const gain = ctx!.createGain();
    gain.gain.value = i === 0 ? 0.16 : 0.1;
    // respiro lento, diverso per voce
    const lfo = ctx!.createOscillator();
    lfo.frequency.value = 0.07 + i * 0.03;
    const lfoGain = ctx!.createGain();
    lfoGain.gain.value = 0.04;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
    osc.connect(gain);
    gain.connect(filtro!);
    osc.start();
    return { osc, gain, base: f };
  });
}

function cambiaAccordo() {
  if (!ctx) return;
  passo = (passo + 1) % ACCORDI.length;
  const t = ctx.currentTime;
  ACCORDI[passo].forEach((f, i) => {
    const v = voci[i];
    v.base = f;
    v.osc.frequency.cancelScheduledValues(t);
    v.osc.frequency.setTargetAtTime(f, t, 1.2);
  });
}

export async function accendi(): Promise<void> {
  prepara();
  if (!ctx || !master) return;
  if (ctx.state === 'suspended') await ctx.resume();
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.8);
  if (giro === null) giro = window.setInterval(cambiaAccordo, 8000);
  accesa = true;
  emetti();
}

export function spegni(): void {
  if (!ctx || !master) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
  if (giro !== null) { window.clearInterval(giro); giro = null; }
  accesa = false;
  emetti();
  const c = ctx;
  window.setTimeout(() => { if (!accesa && c.state === 'running') void c.suspend(); }, 1500);
}

export async function alterna(): Promise<void> {
  if (accesa) spegni(); else await accendi();
}

/** Colore diverso per ogni carta sfiorata. Si annulla con `effettoFine`. */
export function effetto(nome: NomeEffetto): void {
  if (!accesa || !ctx || !filtro || !ecoRitorno || !master) return;
  const t = ctx.currentTime;
  switch (nome) {
    case 'filtro':
      filtro.frequency.setTargetAtTime(3200, t, 0.25);
      break;
    case 'eco':
      ecoRitorno.gain.setTargetAtTime(0.55, t, 0.2);
      break;
    case 'ottava':
      voci.forEach((v) => v.osc.frequency.setTargetAtTime(v.base * 2, t, 0.3));
      break;
    case 'pad':
      voci.forEach((v, i) => v.gain.gain.setTargetAtTime(i === 0 ? 0.22 : 0.16, t, 0.4));
      filtro.frequency.setTargetAtTime(1600, t, 0.5);
      break;
    case 'silenzio':
      master.gain.setTargetAtTime(0.15, t, 0.3);
      break;
    case 'arpeggio':
      arpeggio();
      break;
    case 'tutto':
      filtro.frequency.setTargetAtTime(2600, t, 0.25);
      ecoRitorno.gain.setTargetAtTime(0.45, t, 0.2);
      arpeggio();
      break;
  }
}

export function effettoFine(): void {
  if (!ctx || !filtro || !ecoRitorno || !master) return;
  const t = ctx.currentTime;
  filtro.frequency.setTargetAtTime(900, t, 0.5);
  ecoRitorno.gain.setTargetAtTime(0.28, t, 0.5);
  voci.forEach((v, i) => {
    v.osc.frequency.setTargetAtTime(v.base, t, 0.4);
    v.gain.gain.setTargetAtTime(i === 0 ? 0.16 : 0.1, t, 0.5);
  });
  if (accesa) master.gain.setTargetAtTime(0.9, t, 0.4);
}

function arpeggio() {
  if (!ctx || !filtro) return;
  const note = ACCORDI[passo].map((f) => f * 2).concat([ACCORDI[passo][0] * 4]);
  note.forEach((f, i) => {
    const t = ctx!.currentTime + i * 0.16;
    const osc = ctx!.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    const g = ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    osc.connect(g);
    g.connect(filtro!);
    osc.start(t);
    osc.stop(t + 0.65);
  });
}

/** Un «tac» breve: carta che si gira, oggetto cliccato. Funziona anche a musica spenta se l'utente ha già interagito. */
export function tac(): void {
  if (!ctx || !master || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1800, t);
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.06);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.25, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.1);
}
