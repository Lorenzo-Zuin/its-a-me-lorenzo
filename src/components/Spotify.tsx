import { useEffect, useState } from 'react';

interface Brano {
  inAscolto: boolean;
  titolo: string;
  artista: string;
  copertina?: string;
  url?: string;
  avanzamento?: number; // 0..1
}

const ENDPOINT = import.meta.env.PUBLIC_SPOTIFY_ENDPOINT as string | undefined;

/** «Ora in ascolto su Spotify», nel piè di pagina. Interroga il Worker ogni 30 s. */
export default function Spotify() {
  const [brano, setBrano] = useState<Brano | null>(null);

  useEffect(() => {
    if (!ENDPOINT) return;
    let vivo = true;
    const leggi = async () => {
      try {
        const r = await fetch(ENDPOINT, { cache: 'no-store' });
        if (!r.ok) throw new Error(String(r.status));
        const dati = (await r.json()) as Brano;
        if (vivo) setBrano(dati);
      } catch {
        if (vivo) setBrano(null);
      }
    };
    void leggi();
    const id = window.setInterval(() => void leggi(), 30_000);
    return () => { vivo = false; window.clearInterval(id); };
  }, []);

  const attivo = !!brano?.inAscolto;
  const titolo = brano?.titolo ?? (ENDPOINT ? 'Niente in ascolto' : '[Titolo del brano]');
  const artista = brano?.artista ?? (ENDPOINT ? '' : '[Artista]');

  return (
    <a className="spotify" href={brano?.url ?? 'https://open.spotify.com'} target="_blank" rel="noreferrer" aria-label={`Su Spotify: ${titolo}${artista ? ', ' + artista : ''}`}>
      {brano?.copertina ? (
        <img className="spotify__copertina" src={brano.copertina} alt="" width={34} height={34} loading="lazy" />
      ) : (
        <span className="spotify__copertina spotify__copertina--vuota" aria-hidden="true" />
      )}
      <span className="spotify__testo">
        <span className={`spotify__stato${attivo ? ' spotify__stato--on' : ''}`}>
          <span className="spotify__eq" aria-hidden="true"><i /><i /><i /><i /><i /></span>
          {attivo ? 'ORA IN ASCOLTO SU SPOTIFY' : 'ULTIMO ASCOLTO SU SPOTIFY'}
        </span>
        <span className="spotify__brano">
          <strong>{titolo}</strong>{artista && <span> · {artista}</span>}
        </span>
        <span className="spotify__barra" aria-hidden="true"><i style={{ width: `${Math.round((brano?.avanzamento ?? 0.38) * 100)}%` }} /></span>
      </span>
      <style>{`
        .spotify{display:flex;align-items:center;gap:12px;min-width:0;text-decoration:none;color:var(--inchiostro)}
        .spotify__copertina{width:34px;height:34px;border-radius:8px;flex-shrink:0;box-shadow:0 8px 18px -8px rgba(26,29,43,.5);object-fit:cover}
        .spotify__copertina--vuota{background:linear-gradient(135deg,var(--blu),var(--viola) 60%,var(--corallo))}
        .spotify__testo{display:flex;align-items:center;gap:14px;min-width:0;flex-wrap:wrap}
        .spotify__stato{font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;color:var(--inchiostro-2);display:inline-flex;align-items:center;gap:8px;white-space:nowrap}
        .spotify__stato--on{color:var(--verde)}
        .spotify__eq{display:inline-flex;align-items:flex-end;gap:2px;height:18px}
        .spotify__eq i{width:3px;height:5px;background:currentColor;border-radius:2px}
        .spotify__stato--on .spotify__eq i{animation:eq2 1.1s ease-in-out infinite}
        .spotify__stato--on .spotify__eq i:nth-child(2){animation-delay:-.4s}.spotify__stato--on .spotify__eq i:nth-child(3){animation-delay:-.7s}.spotify__stato--on .spotify__eq i:nth-child(4){animation-delay:-.2s}.spotify__stato--on .spotify__eq i:nth-child(5){animation-delay:-.9s}
        @keyframes eq2{0%,100%{height:5px}50%{height:18px}}
        .spotify__brano{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .spotify__brano span{font-weight:500;color:var(--inchiostro-2)}
        .spotify__barra{width:140px;height:3px;border-radius:2px;background:var(--linea);position:relative;overflow:hidden}
        .spotify__barra i{position:absolute;left:0;top:0;bottom:0;background:var(--inchiostro);border-radius:2px}
        @media (max-width:480px){.spotify__barra{display:none}}
      `}</style>
    </a>
  );
}
