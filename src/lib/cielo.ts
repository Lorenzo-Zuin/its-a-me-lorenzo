/** Calcoli astronomici semplici, abbastanza precisi per una decorazione onesta. */

const MESE_SINODICO = 29.530588853;
const LUNA_NUOVA_RIFERIMENTO = Date.UTC(2000, 0, 6, 18, 14);

/** Fase lunare tra 0 (nuova) e 1, con 0,5 = piena. */
export function faseLunare(data = new Date()): number {
  const giorni = (data.getTime() - LUNA_NUOVA_RIFERIMENTO) / 86_400_000;
  return ((giorni / MESE_SINODICO) % 1 + 1) % 1;
}

export function nomeFaseLunare(fase: number): string {
  if (fase < 0.03 || fase > 0.97) return 'nuova';
  if (fase < 0.22) return 'crescente';
  if (fase < 0.28) return 'primo quarto';
  if (fase < 0.47) return 'gibbosa crescente';
  if (fase < 0.53) return 'piena';
  if (fase < 0.72) return 'gibbosa calante';
  if (fase < 0.78) return 'ultimo quarto';
  return 'calante';
}

/** Longitudini medie eliocentriche (gradi) dei pianeti interni, riferite a J2000. */
const PIANETI = {
  mercurio: { l0: 252.25, n: 4.09234 },
  venere: { l0: 181.98, n: 1.60213 },
  terra: { l0: 100.46, n: 0.98561 },
  marte: { l0: 355.45, n: 0.52403 },
} as const;

export type Pianeta = keyof typeof PIANETI;

export function longitudine(pianeta: Pianeta, data = new Date()): number {
  const d = (data.getTime() - Date.UTC(2000, 0, 1, 12)) / 86_400_000;
  const { l0, n } = PIANETI[pianeta];
  return (((l0 + n * d) % 360) + 360) % 360;
}
