import { useEffect, useState } from 'react';

function oraVenezia(): string {
  return new Date().toLocaleTimeString('it-IT', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Ora di Venezia, aggiornata ogni minuto. */
export default function Orologio() {
  const [ora, setOra] = useState<string>('--:--');
  useEffect(() => {
    setOra(oraVenezia());
    const id = window.setInterval(() => setOra(oraVenezia()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  return <time dateTime={ora}>{ora}</time>;
}
