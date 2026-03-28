import { useState, useMemo } from 'react';
import { PASVORM, HALS, MOUW, MATERIALEN, CATEGORIEEN, SUIT_KLEUREN, SUIT_MATEN, SUIT_CATEGORIEEN } from '../lib/productAttributes';

interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  price_range: string | null;
  sale_price: string | null;
  features: string[] | null;
  images: string[] | null;
  collection_id: string | null;
  pasvorm: string | null;
  hals: string | null;
  mouw: string | null;
  materialen: string[] | null;
  kleur: string[] | null;
  categorieen: string[] | null;
  in_stock: boolean | null;
}

interface Collection {
  id: string;
  title: string;
  slug: string;
}

interface Props {
  products: Product[];
  collections: Collection[];
  fallbackImage: string;
  mode?: 'dress' | 'suit';
}


function CheckItem({
  label,
  checked,
  onChange,
  count,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  count?: number;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer group py-1.5">
      <span className="flex items-center gap-3">
        <span
          className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center transition-colors ${
            checked ? 'border-charcoal bg-charcoal' : 'border-champagne group-hover:border-taupe bg-white'
          }`}
        >
          {checked && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
              <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span
          className={`text-[11px] tracking-[0.08em] uppercase font-body transition-colors ${
            checked ? 'text-charcoal' : 'text-taupe group-hover:text-charcoal'
          }`}
        >
          {label}
        </span>
      </span>
      {count !== undefined && (
        <span className="text-[10px] font-body text-taupe/60">{count}</span>
      )}
    </label>
  );
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-champagne py-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full mb-3 group"
      >
        <span className="text-[10px] tracking-[0.3em] uppercase font-body text-charcoal">{title}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
          className={`text-taupe transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

export default function ProductFilter({ products, collections, fallbackImage, mode = 'dress' }: Props) {
  const isSuit = mode === 'suit';
  const [search, setSearch] = useState('');
  const [activePasvorm, setActivePasvorm]     = useState<Set<string>>(new Set());
  const [activeHals, setActiveHals]           = useState<Set<string>>(new Set());
  const [activeMouw, setActiveMouw]           = useState<Set<string>>(new Set());
  const [activeMat, setActiveMat]             = useState<Set<string>>(new Set());
  const [activeCateg, setActiveCateg]         = useState<Set<string>>(new Set());
  const [activeBrands, setActiveBrands]       = useState<Set<string>>(new Set());
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const brands = useMemo(() => {
    const seen = new Set<string>();
    for (const p of products) { if (p.brand) seen.add(p.brand); }
    return Array.from(seen).sort();
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCollection && p.collection_id !== activeCollection) return false;
      if (activeBrands.size > 0 && (!p.brand || !activeBrands.has(p.brand))) return false;
      if (activePasvorm.size > 0 && (!p.pasvorm || !activePasvorm.has(p.pasvorm))) return false;
      if (activeHals.size > 0 && (!p.hals || !activeHals.has(p.hals))) return false;
      if (activeMouw.size > 0 && (!p.mouw || !activeMouw.has(p.mouw))) return false;
      if (activeMat.size > 0) {
        if (isSuit) {
          // In suit mode, activeMat holds color keys
          const kleuren = p.kleur ?? [];
          if (!Array.from(activeMat).some((k) => kleuren.includes(k))) return false;
        } else {
          const mats = p.materialen ?? [];
          if (!Array.from(activeMat).some((m) => mats.includes(m))) return false;
        }
      }
      if (isSuit && activeMouw.size > 0) {
        // In suit mode, activeMouw holds size values
        const maten = p.maten ?? [];
        if (!Array.from(activeMouw).some((m) => maten.includes(m))) return false;
      }
      if (activeCateg.size > 0) {
        const cats = p.categorieen ?? [];
        if (!Array.from(activeCateg).some((c) => cats.includes(c))) return false;
      }
      if (q && !p.name.toLowerCase().includes(q) && !(p.brand ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, search, activeBrands, activePasvorm, activeHals, activeMouw, activeMat, activeCateg, activeCollection]);

  function toggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) {
    setter((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }

  function clearAll() {
    setSearch(''); setActivePasvorm(new Set()); setActiveHals(new Set()); setActiveMouw(new Set());
    setActiveMat(new Set()); setActiveCateg(new Set()); setActiveBrands(new Set()); setActiveCollection(null);
  }

  const activeFilterCount = activePasvorm.size + activeHals.size + activeMouw.size + activeMat.size +
    activeCateg.size + activeBrands.size + (activeCollection ? 1 : 0) + (search ? 1 : 0);
  const hasFilters = activeFilterCount > 0;

  const sidebar = (
    <aside className="w-64 flex-shrink-0">
      {hasFilters && (
        <button onClick={clearAll} className="mb-4 text-[10px] tracking-[0.2em] uppercase font-body text-taupe underline underline-offset-4 hover:text-charcoal transition-colors">
          Wis filters ({activeFilterCount})
        </button>
      )}

      {!isSuit && (
        <SidebarSection title="Pasvorm">
          {PASVORM.map(({ key, label }) => (
            <CheckItem key={key} label={label} checked={activePasvorm.has(key)} onChange={() => toggle(setActivePasvorm, key)} />
          ))}
        </SidebarSection>
      )}

      <SidebarSection title="Categorie">
        {(isSuit ? SUIT_CATEGORIEEN : CATEGORIEEN).map(({ key, label }) => (
          <CheckItem key={key} label={label} checked={activeCateg.has(key)} onChange={() => toggle(setActiveCateg, key)} />
        ))}
      </SidebarSection>

      <SidebarSection title={isSuit ? 'Kleur' : 'Materiaal'}>
        {isSuit
          ? SUIT_KLEUREN.map(({ key, label }) => (
              <CheckItem key={key} label={label} checked={activeMat.has(key)} onChange={() => toggle(setActiveMat, key)} />
            ))
          : MATERIALEN.map(({ key, label }) => (
              <CheckItem key={key} label={label} checked={activeMat.has(key)} onChange={() => toggle(setActiveMat, key)} />
            ))
        }
      </SidebarSection>

      {isSuit && (
        <SidebarSection title="Maat">
          {SUIT_MATEN.map((maat) => (
            <CheckItem key={maat} label={maat} checked={activeMouw.has(maat)} onChange={() => toggle(setActiveMouw, maat)} />
          ))}
        </SidebarSection>
      )}

      {!isSuit && (
        <>
          <SidebarSection title="Halslijn">
            {HALS.map(({ key, label }) => (
              <CheckItem key={key} label={label} checked={activeHals.has(key)} onChange={() => toggle(setActiveHals, key)} />
            ))}
          </SidebarSection>

          <SidebarSection title="Mouw">
            {MOUW.map(({ key, label }) => (
              <CheckItem key={key} label={label} checked={activeMouw.has(key)} onChange={() => toggle(setActiveMouw, key)} />
            ))}
          </SidebarSection>
        </>
      )}

      {brands.length > 1 && (
        <SidebarSection title="Merk">
          {brands.map((brand) => (
            <CheckItem key={brand} label={brand} checked={activeBrands.has(brand)} onChange={() => toggle(setActiveBrands, brand)} />
          ))}
        </SidebarSection>
      )}

      {collections.length > 0 && (
        <SidebarSection title="Collectie">
          <CheckItem label="Alle jurken" checked={activeCollection === null} onChange={() => setActiveCollection(null)} />
          {collections.map((col) => (
            <CheckItem key={col.id} label={col.title} checked={activeCollection === col.id}
              onChange={() => setActiveCollection(activeCollection === col.id ? null : col.id)} />
          ))}
        </SidebarSection>
      )}
    </aside>
  );

  return (
    <section className="py-16 bg-ivory">
      <div className="container mx-auto px-6">

        {/* Mobile filter toggle */}
        <div className="lg:hidden mb-6 flex items-center gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase font-body border border-champagne px-5 py-3 text-charcoal hover:border-charcoal transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="20" y2="12" />
              <line x1="12" y1="18" x2="20" y2="18" />
            </svg>
            Filteren
            {activeFilterCount > 0 && (
              <span className="bg-charcoal text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
          {hasFilters && (
            <button onClick={clearAll} className="text-[10px] tracking-[0.15em] uppercase font-body text-taupe underline underline-offset-4">
              Wis filters
            </button>
          )}
        </div>

        {/* Mobile sidebar drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="absolute inset-0 bg-charcoal/40" onClick={() => setMobileOpen(false)} />
            <div className="relative bg-ivory w-72 h-full overflow-y-auto p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] tracking-[0.3em] uppercase font-body text-charcoal">Filters</span>
                <button onClick={() => setMobileOpen(false)} aria-label="Sluit filters">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              {sidebar}
              <button
                onClick={() => setMobileOpen(false)}
                className="mt-6 w-full bg-charcoal text-white text-[11px] tracking-[0.2em] uppercase font-body py-3 hover:bg-taupe transition-colors"
              >
                {filtered.length} jurken tonen
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-12">
          {/* Desktop sidebar */}
          <div className="hidden lg:block">{sidebar}</div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Search */}
            <div className="mb-8 max-w-sm relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 text-taupe pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoek op naam of merk…"
                className="w-full pl-10 pr-4 py-3 bg-white border border-champagne text-charcoal text-sm font-body placeholder:text-taupe/60 focus:outline-none focus:border-taupe transition-colors"
              />
            </div>

            {/* Result count */}
            <p className="text-[11px] tracking-[0.1em] uppercase text-taupe font-body mb-6">
              {hasFilters
                ? `${filtered.length} van ${products.length} jurken`
                : `${products.length} jurken`}
            </p>

            {/* Product grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((prod, index) => {
                const img = prod.images?.[0];
                const displayImg = img && img.length > 0 ? img : fallbackImage;
                const animClass =
                  index % 3 === 0 ? 'animate-pan-right' : index % 3 === 1 ? 'animate-pan-left' : 'animate-zoom';

                return (
                  <div key={prod.id} className="group product-card relative overflow-hidden">
                    <a href={`/product/${prod.slug}`} className="block relative aspect-[3/4] overflow-hidden">
                      <div className="w-full h-full bg-linen relative overflow-hidden">
                        <img
                          src={displayImg}
                          alt={prod.name}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = fallbackImage;
                          }}
                          className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${animClass}`}
                          loading="lazy"
                        />

                        <div className="absolute inset-0 bg-charcoal/20 md:bg-charcoal/0 md:group-hover:bg-charcoal/20 transition-all duration-500 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100">
                          <span className="bg-warm-white text-charcoal px-5 py-2.5 text-[11px] tracking-[0.15em] uppercase font-body font-medium">
                            Bekijk product
                          </span>
                        </div>

                        {prod.brand && (
                          <div className="absolute top-4 left-4 bg-charcoal/80 text-warm-white text-[9px] tracking-[0.15em] uppercase font-body px-2 py-1">
                            {prod.brand}
                          </div>
                        )}
                      </div>
                    </a>

                    <div className="p-5 border-t border-champagne">
                      <h3 className="font-display font-normal text-charcoal text-lg leading-tight">{prod.name}</h3>
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div className="col-span-full py-24 text-center">
                  <p className="font-italic italic text-taupe-light text-lg mb-6">
                    Geen jurken gevonden voor deze zoekopdracht.
                  </p>
                  <button
                    onClick={clearAll}
                    className="text-[11px] tracking-[0.15em] uppercase font-body text-taupe underline underline-offset-4 hover:text-charcoal transition-colors"
                  >
                    Alle jurken tonen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
