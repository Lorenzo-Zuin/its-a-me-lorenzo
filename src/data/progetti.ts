/**
 * I progetti nel raccoglitore. Ogni voce è una carta.
 * `tessera` decide quanto spazio occupa nella griglia (colonne × righe su 4 colonne);
 * `olografia` è il motivo della lamina al passaggio del mouse;
 * `musica` è l'effetto sul sottofondo quando la carta è sfiorata.
 */
import type { NomeEffetto } from '@/lib/musica';

export type Olografia = 'cosmos' | 'righe' | 'ghiaccio' | 'galassia' | 'pioggia' | 'oro';

export interface Progetto {
  id: string;
  nome: string;
  riga: string;
  tipo: 'app' | 'sito' | 'repository' | 'programma' | 'idea';
  stato: 'in corso' | 'fatto' | 'in arrivo';
  href: string;
  colore: string;
  tessera: '2x2' | '1x1' | '1x2' | '2x1';
  olografia?: Olografia;
  musica: NomeEffetto;
  /** segnaposto finché non c'è una schermata vera */
  schermata?: string;
}

export const progetti: Progetto[] = [
  {
    id: 'bucklet',
    nome: 'Bucklet',
    riga: 'App per le finanze personali e condivise.',
    tipo: 'app',
    stato: 'in corso',
    href: '#',
    colore: 'var(--blu)',
    tessera: '2x2',
    olografia: 'cosmos',
    musica: 'arpeggio',
  },
  {
    id: 'lorenzozuin-com',
    nome: 'lorenzozuin.com',
    riga: 'Questo sito.',
    tipo: 'sito',
    stato: 'in corso',
    href: 'https://github.com/Lorenzo-Zuin/its-a-me-lorenzo',
    colore: 'var(--corallo)',
    tessera: '1x1',
    olografia: 'righe',
    musica: 'filtro',
  },
  {
    id: 'progetto-3',
    nome: '[Progetto 3]',
    riga: '[Una riga su cosa fa.]',
    tipo: 'repository',
    stato: 'fatto',
    href: '#',
    colore: 'var(--verde)',
    tessera: '1x2',
    olografia: 'ghiaccio',
    musica: 'eco',
    schermata: '[SCHERMATA]',
  },
  {
    id: 'progetto-4',
    nome: '[Progetto 4]',
    riga: '[Una riga su cosa fa.]',
    tipo: 'programma',
    stato: 'fatto',
    href: '#',
    colore: 'var(--viola)',
    tessera: '1x1',
    olografia: 'galassia',
    musica: 'ottava',
  },
  {
    id: 'progetto-5',
    nome: '[Progetto 5]',
    riga: '[Una riga su cosa fa.]',
    tipo: 'sito',
    stato: 'in corso',
    href: '#',
    colore: 'var(--carta)',
    tessera: '2x1',
    olografia: 'pioggia',
    musica: 'pad',
  },
  {
    id: 'progetto-6',
    nome: '[Progetto 6]',
    riga: 'In arrivo.',
    tipo: 'idea',
    stato: 'in arrivo',
    href: '#',
    colore: 'var(--carta)',
    tessera: '1x1',
    musica: 'silenzio',
  },
];

export const INDICI: Record<Progetto['tipo'], string> = {
  app: 'B',
  sito: 'S',
  repository: 'R',
  programma: 'P',
  idea: '·',
};
