import { useState } from 'react';

interface Question {
  id: string;
  vraag: string;
  opties: { label: string; value: string; emoji: string }[];
}

const questions: Question[] = [
  {
    id: 'sfeer',
    vraag: 'Welke sfeer past het beste bij jouw bruiloft?',
    opties: [
      { label: 'Klassiek & tijdloos', value: 'klassiek', emoji: '✦' },
      { label: 'Romantisch & sprookjesachtig', value: 'romantisch', emoji: '✿' },
      { label: 'Modern & minimalistisch', value: 'modern', emoji: '◆' },
      { label: 'Bohemian & vrij', value: 'boho', emoji: '❋' },
    ],
  },
  {
    id: 'lichaam',
    vraag: 'Welk deel van je lichaam wil je het liefst benadrukken?',
    opties: [
      { label: 'Mijn taille', value: 'taille', emoji: '⬡' },
      { label: 'Mijn curves', value: 'curves', emoji: '◈' },
      { label: 'Mijn décolleté', value: 'decollete', emoji: '◇' },
      { label: 'Ik wil me gewoon comfortabel voelen', value: 'comfort', emoji: '○' },
    ],
  },
  {
    id: 'rok',
    vraag: 'Hoe zie jij de rok van je jurk?',
    opties: [
      { label: 'Vol en wuivend', value: 'vol', emoji: '❂' },
      { label: 'Strak en figuurvolgend', value: 'strak', emoji: '|' },
      { label: 'Licht uitlopend', value: 'licht', emoji: '△' },
      { label: 'Luchtig en vloeiend', value: 'vloeiend', emoji: '≈' },
    ],
  },
  {
    id: 'sleep',
    vraag: 'Wil je een sleep?',
    opties: [
      { label: 'Ja, lang en dramatisch', value: 'lang', emoji: '⟶' },
      { label: 'Een korte sleep', value: 'kort', emoji: '→' },
      { label: 'Geen sleep graag', value: 'geen', emoji: '○' },
      { label: 'Weet ik nog niet', value: 'nvt', emoji: '?' },
    ],
  },
  {
    id: 'budget',
    vraag: 'Wat is je globale budget voor de jurk?',
    opties: [
      { label: 'Tot € 1.000', value: 'laag', emoji: '€' },
      { label: '€ 1.000 – € 2.000', value: 'midden', emoji: '€€' },
      { label: '€ 2.000 – € 3.500', value: 'hoog', emoji: '€€€' },
      { label: 'Budget is geen beperking', value: 'geen', emoji: '✦' },
    ],
  },
];

interface Aanbeveling {
  silhouet: string;
  slug: string;
  reden: string;
}

function getAanbeveling(antwoorden: Record<string, string>): Aanbeveling[] {
  const results: Aanbeveling[] = [];

  const { sfeer, lichaam, rok } = antwoorden;

  // Primaire aanbeveling
  if (rok === 'vol' || sfeer === 'romantisch') {
    results.push({
      silhouet: 'Prinses',
      slug: 'prinses',
      reden: 'De volle rok en het sprookjesachtige gevoel passen perfect bij jouw antwoorden.',
    });
  } else if (rok === 'strak' || lichaam === 'curves') {
    results.push({
      silhouet: 'Zeemeermin',
      slug: 'zeemeermin',
      reden: 'Een figuurvolgend silhouet dat jouw curves mooi laat zien en een sterke uitstraling geeft.',
    });
  } else if (sfeer === 'modern' || lichaam === 'decollete') {
    results.push({
      silhouet: 'Stijl (Sheath)',
      slug: 'stijl',
      reden: 'Strak, modern en zelfverzekerd — dit silhouet past bij jouw voorkeur voor een clean look.',
    });
  } else if (sfeer === 'boho' || rok === 'vloeiend') {
    results.push({
      silhouet: 'Empire',
      slug: 'empire',
      reden: 'Vloeiende stoffen en een romantische snit passen bij jouw bohemian of vrije stijl.',
    });
  } else {
    results.push({
      silhouet: 'A-lijn',
      slug: 'a-lijn',
      reden: 'De klassieke A-lijn is universeel flatterend en past bij vrijwel elke stijl en elk figuur.',
    });
  }

  // Alternatief
  if (lichaam === 'taille') {
    const alt = { silhouet: 'A-lijn', slug: 'a-lijn', reden: 'De A-lijn accentueert de taille prachtig en is tijdloos elegant.' };
    if (results[0].slug !== 'a-lijn') results.push(alt);
  } else if (rok === 'licht') {
    const alt = { silhouet: 'Ballerina', slug: 'ballerina', reden: 'De ballerinajurk heeft een luchtige, uitlopende rok — perfect voor een zomerse of romantische bruiloft.' };
    if (results[0].slug !== 'ballerina') results.push(alt);
  } else if (sfeer === 'klassiek') {
    const alt = { silhouet: 'Trumpet', slug: 'trumpet', reden: 'De trumpetjurk combineert elegantie met een dramatisch onderstuk — een klassieke maar gedurfde keuze.' };
    if (results[0].slug !== 'trumpet') results.push(alt);
  }

  return results.slice(0, 2);
}

export default function StyleQuiz() {
  const [stap, setStap] = useState(0);
  const [antwoorden, setAntwoorden] = useState<Record<string, string>>({});
  const [klaar, setKlaar] = useState(false);

  const vraag = questions[stap];
  const progress = Math.round(((stap) / questions.length) * 100);

  function kiesOptie(value: string) {
    const nieuw = { ...antwoorden, [vraag.id]: value };
    setAntwoorden(nieuw);
    if (stap < questions.length - 1) {
      setTimeout(() => setStap(stap + 1), 200);
    } else {
      setTimeout(() => setKlaar(true), 200);
    }
  }

  function opnieuw() {
    setAntwoorden({});
    setStap(0);
    setKlaar(false);
  }

  const aanbevelingen = klaar ? getAanbeveling(antwoorden) : [];

  if (klaar) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[10px] tracking-[0.4em] uppercase text-blush-deep font-body mb-4">Jouw resultaat</p>
          <h2 className="font-display text-charcoal text-4xl mb-4">
            Jouw perfecte <em className="italic font-light text-taupe">silhouet</em>
          </h2>
          <p className="text-taupe font-light text-sm leading-relaxed">
            Op basis van jouw antwoorden raden wij het volgende aan:
          </p>
        </div>

        <div className="space-y-6 mb-12">
          {aanbevelingen.map((a, i) => (
            <div key={a.slug} className={`border p-8 ${i === 0 ? 'border-blush-deep bg-blush-deep/5' : 'border-champagne bg-ivory/40'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {i === 0 && (
                    <p className="text-[9px] tracking-[0.3em] uppercase text-blush-deep font-body mb-2">Beste match</p>
                  )}
                  {i === 1 && (
                    <p className="text-[9px] tracking-[0.3em] uppercase text-taupe/60 font-body mb-2">Alternatief</p>
                  )}
                  <h3 className="font-display text-charcoal text-2xl mb-3">{a.silhouet}</h3>
                  <p className="text-taupe font-light text-sm leading-relaxed">{a.reden}</p>
                </div>
              </div>
              <div className="mt-6">
                <a
                  href={`/trouwjurken/${a.slug}`}
                  className="inline-block border border-charcoal text-charcoal text-[9px] tracking-[0.25em] uppercase px-6 py-2.5 hover:bg-charcoal hover:text-warm-white transition-all font-body"
                >
                  Bekijk {a.silhouet} jurken →
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center space-y-4">
          <p className="text-taupe font-light text-sm">
            Wil je ook andere silhouetten verkennen?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/trouwjurken/vormen" className="btn-gold">Alle silhouetten bekijken</a>
            <a href="/afspraak-maken" className="btn-premium">Afspraak inplannen</a>
          </div>
          <button
            onClick={opnieuw}
            className="block mx-auto text-[9px] tracking-[0.2em] uppercase text-taupe/60 hover:text-taupe transition-colors font-body mt-4"
          >
            Quiz opnieuw doen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Voortgangsbalk */}
      <div className="mb-10">
        <div className="flex justify-between text-[9px] tracking-[0.2em] uppercase text-taupe/60 font-body mb-3">
          <span>Vraag {stap + 1} van {questions.length}</span>
          <span>{progress}% compleet</span>
        </div>
        <div className="h-0.5 bg-champagne">
          <div
            className="h-full bg-blush-deep transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Vraag */}
      <div className="text-center mb-10">
        <h2 className="font-display text-charcoal text-3xl leading-snug">{vraag.vraag}</h2>
      </div>

      {/* Opties */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {vraag.opties.map((optie) => {
          const gekozen = antwoorden[vraag.id] === optie.value;
          return (
            <button
              key={optie.value}
              onClick={() => kiesOptie(optie.value)}
              className={`group border p-6 text-left transition-all duration-200 ${
                gekozen
                  ? 'border-blush-deep bg-blush-deep/5'
                  : 'border-champagne bg-white hover:border-blush-deep hover:bg-ivory'
              }`}
            >
              <span className="block text-2xl text-blush-deep/60 mb-3 font-body">{optie.emoji}</span>
              <span className="font-display text-charcoal text-lg group-hover:text-blush-deep transition-colors">
                {optie.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Vorige stap */}
      {stap > 0 && (
        <button
          onClick={() => setStap(stap - 1)}
          className="mt-8 block mx-auto text-[9px] tracking-[0.2em] uppercase text-taupe/60 hover:text-taupe transition-colors font-body"
        >
          ← Vorige vraag
        </button>
      )}
    </div>
  );
}
