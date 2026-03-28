import { useState, useEffect } from 'react';

const WISHLIST_KEY = 'mb_wishlist';

interface WishlistItem {
  slug: string;
  name: string;
  image: string;
  url: string;
}

function loadWishlist(): WishlistItem[] {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    setItems(loadWishlist());
    setMounted(true);
  }, []);

  function remove(slug: string) {
    try {
      const updated = items.filter((i) => i.slug !== slug);
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(updated));
      setItems(updated);
    } catch {}
  }

  async function sendEmail() {
    if (!name.trim() || !email.trim()) {
      setError('Vul je naam en e-mailadres in.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Vul een geldig e-mailadres in.');
      return;
    }
    setError('');
    setStatus('sending');
    try {
      const res = await fetch('/api/wishlist/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), items }),
      });
      if (res.ok) {
        setStatus('sent');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Versturen mislukt. Probeer het later opnieuw.');
        setStatus('error');
      }
    } catch {
      setError('Versturen mislukt. Probeer het later opnieuw.');
      setStatus('error');
    }
  }

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div className="text-center py-32 px-6 max-w-lg mx-auto">
        <div className="w-16 h-16 mx-auto mb-8 flex items-center justify-center border border-champagne">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
        <p className="font-display text-charcoal text-2xl mb-4">Je verlanglijst is leeg</p>
        <p className="text-taupe font-light text-sm mb-8 leading-relaxed">
          Blader door onze collectie en klik op het hartje bij jurken die je wil bewaren.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/trouwjurken" className="btn-premium">Bekijk trouwjurken</a>
          <a href="/trouwpakken" className="btn-gold">Bekijk trouwpakken</a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

        {/* Verlanglijst */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <p className="text-[10px] tracking-[0.3em] uppercase text-taupe font-body">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
            <button
              onClick={() => {
                localStorage.setItem(WISHLIST_KEY, JSON.stringify([]));
                setItems([]);
              }}
              className="text-[9px] tracking-[0.2em] uppercase text-taupe/60 hover:text-taupe transition-colors font-body underline"
            >
              Alles verwijderen
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.slug} className="flex gap-5 border border-champagne bg-ivory/40 p-4">
                <a href={item.url} className="shrink-0">
                  <div className="w-24 h-32 bg-linen overflow-hidden">
                    <img
                      src={item.image || '/images/jurkvormen/a-lijn.png'}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </a>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                  <div>
                    <h3 className="font-display text-charcoal text-lg leading-tight mb-1">{item.name}</h3>
                    <a
                      href={item.url}
                      className="text-[9px] tracking-[0.2em] uppercase text-blush-deep font-body hover:underline"
                    >
                      Bekijk product →
                    </a>
                  </div>
                  <button
                    onClick={() => remove(item.slug)}
                    className="self-start text-[9px] tracking-[0.15em] uppercase text-taupe/50 hover:text-taupe transition-colors font-body mt-3"
                  >
                    Verwijderen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* E-mail sectie */}
        <div className="lg:col-span-1">
          <div className="border border-champagne bg-white p-6 space-y-5 sticky top-32">
            {status === 'sent' ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-10 h-10 mx-auto flex items-center justify-center bg-blush-deep/10">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A66352" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="font-display text-charcoal text-xl">Verstuurd!</p>
                <p className="text-taupe font-light text-sm">
                  Je verlanglijst is verstuurd naar <strong>{email}</strong>.
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  className="text-[9px] tracking-[0.2em] uppercase text-taupe/60 hover:text-taupe transition-colors font-body underline"
                >
                  Opnieuw versturen
                </button>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-blush-deep font-body mb-2">Bewaar je lijst</p>
                  <h3 className="font-display text-charcoal text-xl">Stuur naar e-mail</h3>
                </div>
                <p className="text-taupe font-light text-xs leading-relaxed">
                  Stuur je verlanglijst naar jezelf (of je partner) zodat je hem later kunt terugvinden.
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Jouw naam"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-champagne px-4 py-2.5 text-sm font-body text-charcoal placeholder:text-taupe/50 focus:outline-none focus:border-taupe transition-colors"
                  />
                  <input
                    type="email"
                    placeholder="jouw@email.nl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-champagne px-4 py-2.5 text-sm font-body text-charcoal placeholder:text-taupe/50 focus:outline-none focus:border-taupe transition-colors"
                  />
                </div>
                {error && (
                  <p className="text-xs text-red-600 font-body">{error}</p>
                )}
                <button
                  onClick={sendEmail}
                  disabled={status === 'sending'}
                  className="w-full bg-charcoal text-warm-white text-[9px] tracking-[0.25em] uppercase py-3 font-body hover:bg-taupe transition-colors disabled:opacity-50"
                >
                  {status === 'sending' ? 'Versturen…' : 'Stuur verlanglijst'}
                </button>
                <div className="border-t border-champagne pt-4">
                  <a
                    href="/afspraak-maken"
                    className="block text-center text-[9px] tracking-[0.2em] uppercase text-blush-deep font-body hover:underline"
                  >
                    Of maak een pasafspraak →
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
