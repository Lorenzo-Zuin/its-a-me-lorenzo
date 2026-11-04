import { useEffect, useState } from 'react';
import { alterna, attiva, onCambio } from '@/lib/musica';

/** Interruttore della musica di sottofondo, nella testata. Si sincronizza con le bacchette sul tavolo. */
export default function Musica() {
  const [accesa, setAccesa] = useState(false);
  const [dettaglio, setDettaglio] = useState('');

  useEffect(() => {
    setAccesa(attiva());
    const via = onCambio(setAccesa);
    const h = (e: Event) => setDettaglio((e as CustomEvent<string>).detail ?? '');
    window.addEventListener('musica:effetto', h);
    return () => { via(); window.removeEventListener('musica:effetto', h); };
  }, []);

  return (
    <button
      type="button"
      className="musica"
      aria-pressed={accesa}
      onClick={() => void alterna()}
      title={accesa ? 'Spegni la musica' : 'Accendi la musica di sottofondo'}
    >
      <span className={`musica__eq${accesa ? ' musica__eq--on' : ''}`} aria-hidden="true">
        <i /><i /><i /><i />
      </span>
      {accesa ? `MUSICA ON${dettaglio ? ` · ${dettaglio}` : ''}` : 'MUSICA OFF'}
      <style>{`
        .musica{display:inline-flex;align-items:center;gap:10px;padding:8px 14px;border-radius:999px;background:var(--carta);border:0;cursor:pointer;font-family:var(--font-mono);font-size:12px;letter-spacing:.08em;color:var(--inchiostro);box-shadow:0 1px 2px rgba(26,29,43,.08);white-space:nowrap}
        .musica__eq{display:inline-flex;align-items:flex-end;gap:2px;height:12px}
        .musica__eq i{width:3px;height:4px;background:var(--blu);border-radius:2px}
        .musica__eq--on i{animation:eq .9s ease-in-out infinite}
        .musica__eq--on i:nth-child(2){animation-delay:-.3s}.musica__eq--on i:nth-child(3){animation-delay:-.6s}.musica__eq--on i:nth-child(4){animation-delay:-.15s}
        @keyframes eq{0%,100%{height:4px}50%{height:12px}}
      `}</style>
    </button>
  );
}
