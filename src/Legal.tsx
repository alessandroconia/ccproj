import { useEffect, useState } from "react";

type Section = { heading: string; todo: string };
type Page = { title: string; intro: string; sections: Section[] };

// DRAFT CONTENT. Every "DA COMPILARE" entry must be completed (ideally reviewed by a
// lawyer or consultant) before the shop accepts real payments.
const PAGES: Record<string, Page> = {
  "note-legali": {
    title: "Note legali",
    intro: "Informazioni sul venditore.",
    sections: [
      { heading: "Ragione sociale / nome e cognome", todo: "Inserire i dati del venditore." },
      { heading: "Sede legale / indirizzo", todo: "Inserire indirizzo completo." },
      { heading: "Partita IVA e codice fiscale", todo: "Inserire P.IVA e C.F." },
      { heading: "Registro imprese / REA (se applicabile)", todo: "Inserire i dati di iscrizione." },
      { heading: "Contatti", todo: "Inserire e-mail (e PEC, se presente) e telefono." },
    ],
  },
  privacy: {
    title: "Informativa sulla privacy",
    intro: "Come vengono trattati i dati personali di chi visita questo sito.",
    sections: [
      { heading: "Titolare del trattamento", todo: "Inserire identità e contatti del titolare." },
      {
        heading: "Dati trattati e finalità",
        todo: "Descrivere i dati trattati (es. indirizzo IP nei log dei server, dati dell'ordine) e le relative finalità e basi giuridiche.",
      },
      {
        heading: "Destinatari e fornitori",
        todo: "Il sito è ospitato su GitHub Pages e legge il catalogo da Supabase; il pagamento avviene tramite PayPal. Indicare ruolo, sede e garanzie per eventuali trasferimenti extra-UE di ciascun fornitore.",
      },
      { heading: "Tempi di conservazione", todo: "Indicare i periodi di conservazione." },
      { heading: "Diritti dell'interessato", todo: "Elencare i diritti e come esercitarli." },
      { heading: "Cookie", todo: "Descrivere l'uso di cookie e tecnologie simili (al momento il sito non ne imposta)." },
    ],
  },
  termini: {
    title: "Termini e condizioni di vendita",
    intro: "Condizioni che regolano gli acquisti effettuati su questo sito.",
    sections: [
      { heading: "Prodotti e disponibilità", todo: "Descrivere come viene gestita la disponibilità e cosa accade se un articolo si esaurisce." },
      { heading: "Prezzi e pagamento", todo: "Indicare valuta, imposte incluse/escluse e metodi di pagamento accettati." },
      { heading: "Consegna", todo: "Indicare modalità e tempi di consegna e gli eventuali costi." },
      { heading: "Diritto di recesso", todo: "Descrivere condizioni, termini ed eccezioni, e inserire il modulo tipo di recesso." },
      { heading: "Garanzia legale e assistenza", todo: "Indicare la garanzia legale di conformità e come contattare l'assistenza." },
      { heading: "Reclami e risoluzione delle controversie", todo: "Indicare i riferimenti per reclami e per la risoluzione extragiudiziale." },
      { heading: "Legge applicabile e foro competente", todo: "Completare." },
    ],
  },
};

export const LEGAL_LINKS = [
  { route: "note-legali", label: "Note legali" },
  { route: "privacy", label: "Privacy" },
  { route: "termini", label: "Termini di vendita" },
];

const ROUTE_PREFIX = "#/";
export const INFO_ROUTE = "informazioni";

function currentRoute(): string | null {
  const hash = window.location.hash;
  if (!hash.startsWith(ROUTE_PREFIX)) return null;
  const route = hash.slice(ROUTE_PREFIX.length);
  if (route === INFO_ROUTE) return route;
  return Object.prototype.hasOwnProperty.call(PAGES, route) ? route : null;
}

/** Returns the active legal page route (or null for the shop), following hash changes. */
export function useLegalRoute(): string | null {
  const [route, setRoute] = useState(currentRoute);
  useEffect(() => {
    const onChange = () => {
      setRoute(currentRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function InfoPage() {
  return (
    <main className="legal">
      <a className="legal-back" href="#shop">
        ← Torna al negozio
      </a>
      <h1>Informazioni</h1>
      <p className="info-text">
        ccproj non è un e-commerce: è un progetto pensato per un piccolo gruppo di persone, per
        facilitare in modo semplice e interattivo l'incontro tra domanda e offerta.
      </p>
    </main>
  );
}

export function LegalPage({ route }: { route: string }) {
  const page = PAGES[route];
  return (
    <main className="legal">
      <a className="legal-back" href="#shop">
        ← Torna al negozio
      </a>
      <h1>{page.title}</h1>
      <p className="legal-draft" role="note">
        Bozza: i testi qui sotto vanno completati prima di accettare pagamenti reali.
      </p>
      <p className="intro-copy">{page.intro}</p>
      {page.sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          <p>[DA COMPILARE: {section.todo}]</p>
        </section>
      ))}
    </main>
  );
}
