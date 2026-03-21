import { useState, useCallback, useEffect } from 'react';

type ButtonStyle = 'btn-premium' | 'btn-gold' | 'btn-blush';
type TextAlign = 'left' | 'center' | 'right';
type BgColor = 'ivory' | 'cream' | 'white' | 'charcoal' | 'champagne' | 'blush' | 'gold';

interface HeroButton {
  label: string;
  url: string;
  style: ButtonStyle;
}

interface Block {
  id: string;
  type: 'hero' | 'text' | 'products' | 'cta' | 'image_text';
  settings: Record<string, any>;
}

const BLOCK_TYPES = [
  { type: 'hero', label: 'Hero sectie', icon: '🖼' },
  { type: 'text', label: 'Tekst blok', icon: '📝' },
  { type: 'products', label: 'Producten raster', icon: '👗' },
  { type: 'cta', label: 'Call-to-action', icon: '📣' },
  { type: 'image_text', label: 'Afbeelding + tekst', icon: '↔' },
] as const;

const defaultSettings: Record<string, any> = {
  hero: {
    image_url: '',
    eyebrow: '',
    title: '',
    subtitle: '',
    overlay_opacity: 0.4,
    text_align: 'center',
    buttons: [],
  },
  text: {
    content: '<p>Jouw tekst hier...</p>',
    alignment: 'center',
    background: 'ivory',
  },
  products: {
    eyebrow: 'Onze collectie',
    title: 'Bekijk onze jurken',
    count: 6,
  },
  cta: {
    eyebrow: '',
    title: '',
    subtitle: '',
    button_label: 'Maak een afspraak',
    button_url: '/afspraak-maken',
    button_style: 'btn-gold',
    background: 'charcoal',
  },
  image_text: {
    image_url: '',
    eyebrow: '',
    title: '',
    content: '<p>Jouw tekst hier...</p>',
    image_side: 'left',
    button_label: '',
    button_url: '',
    button_style: 'btn-premium',
  },
};

function generateId() {
  return `block_${Math.random().toString(36).slice(2, 10)}`;
}

// ── Block editors ──────────────────────────────────────────────────────────────

function HeroEditor({ settings, onChange }: { settings: any; onChange: (s: any) => void }) {
  const updateButton = (index: number, key: string, value: string) => {
    const buttons = [...(settings.buttons || [])];
    buttons[index] = { ...buttons[index], [key]: value };
    onChange({ ...settings, buttons });
  };
  const addButton = () => {
    const buttons = [...(settings.buttons || []), { label: 'Klik hier', url: '/', style: 'btn-premium' }];
    onChange({ ...settings, buttons });
  };
  const removeButton = (index: number) => {
    const buttons = (settings.buttons || []).filter((_: any, i: number) => i !== index);
    onChange({ ...settings, buttons });
  };

  return (
    <div className="space-y-4">
      <Field label="Achtergrondafbeelding URL">
        <input type="text" value={settings.image_url || ''} placeholder="https://..." onChange={e => onChange({ ...settings, image_url: e.target.value })} className="field-input" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Eyebrow tekst">
          <input type="text" value={settings.eyebrow || ''} onChange={e => onChange({ ...settings, eyebrow: e.target.value })} className="field-input" />
        </Field>
        <Field label="Tekst uitlijning">
          <select value={settings.text_align || 'center'} onChange={e => onChange({ ...settings, text_align: e.target.value })} className="field-input">
            <option value="left">Links</option>
            <option value="center">Gecentreerd</option>
            <option value="right">Rechts</option>
          </select>
        </Field>
      </div>
      <Field label="Hoofdtitel">
        <input type="text" value={settings.title || ''} onChange={e => onChange({ ...settings, title: e.target.value })} className="field-input" />
      </Field>
      <Field label="Ondertitel">
        <textarea value={settings.subtitle || ''} rows={2} onChange={e => onChange({ ...settings, subtitle: e.target.value })} className="field-input resize-none" />
      </Field>
      <Field label={`Overlay dekking: ${Math.round((settings.overlay_opacity || 0.4) * 100)}%`}>
        <input type="range" min="0" max="1" step="0.05" value={settings.overlay_opacity || 0.4} onChange={e => onChange({ ...settings, overlay_opacity: parseFloat(e.target.value) })} className="w-full" />
      </Field>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="field-label">Knoppen</span>
          <button onClick={addButton} className="text-[10px] tracking-[0.15em] uppercase text-blush-deep hover:text-charcoal transition-colors">+ Knop toevoegen</button>
        </div>
        {(settings.buttons || []).map((btn: HeroButton, i: number) => (
          <div key={i} className="flex gap-2 mb-2 items-center">
            <input type="text" value={btn.label} placeholder="Label" onChange={e => updateButton(i, 'label', e.target.value)} className="field-input flex-1" />
            <input type="text" value={btn.url} placeholder="/url" onChange={e => updateButton(i, 'url', e.target.value)} className="field-input flex-1" />
            <select value={btn.style} onChange={e => updateButton(i, 'style', e.target.value)} className="field-input w-36">
              <option value="btn-premium">Donker</option>
              <option value="btn-gold">Goud</option>
              <option value="btn-blush">Roze</option>
            </select>
            <button onClick={() => removeButton(i)} className="text-red-400 hover:text-red-600 text-sm px-2">×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TextEditor({ settings, onChange }: { settings: any; onChange: (s: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Uitlijning">
          <select value={settings.alignment || 'center'} onChange={e => onChange({ ...settings, alignment: e.target.value })} className="field-input">
            <option value="left">Links</option>
            <option value="center">Gecentreerd</option>
            <option value="right">Rechts</option>
          </select>
        </Field>
        <Field label="Achtergrond">
          <select value={settings.background || 'ivory'} onChange={e => onChange({ ...settings, background: e.target.value })} className="field-input">
            <option value="ivory">Ivory</option>
            <option value="cream">Cream</option>
            <option value="white">Wit</option>
            <option value="champagne">Champagne</option>
            <option value="charcoal">Donker</option>
          </select>
        </Field>
      </div>
      <Field label="HTML inhoud">
        <textarea value={settings.content || ''} rows={6} onChange={e => onChange({ ...settings, content: e.target.value })} className="field-input resize-y font-mono text-xs" />
      </Field>
    </div>
  );
}

function ProductsEditor({ settings, onChange }: { settings: any; onChange: (s: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Eyebrow">
          <input type="text" value={settings.eyebrow || ''} onChange={e => onChange({ ...settings, eyebrow: e.target.value })} className="field-input" />
        </Field>
        <Field label="Titel">
          <input type="text" value={settings.title || ''} onChange={e => onChange({ ...settings, title: e.target.value })} className="field-input" />
        </Field>
      </div>
      <Field label={`Aantal producten: ${settings.count || 6}`}>
        <input type="range" min="2" max="12" step="2" value={settings.count || 6} onChange={e => onChange({ ...settings, count: parseInt(e.target.value) })} className="w-full" />
      </Field>
    </div>
  );
}

function CtaEditor({ settings, onChange }: { settings: any; onChange: (s: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Eyebrow">
          <input type="text" value={settings.eyebrow || ''} onChange={e => onChange({ ...settings, eyebrow: e.target.value })} className="field-input" />
        </Field>
        <Field label="Achtergrond">
          <select value={settings.background || 'charcoal'} onChange={e => onChange({ ...settings, background: e.target.value })} className="field-input">
            <option value="charcoal">Donker</option>
            <option value="ivory">Ivory</option>
            <option value="cream">Cream</option>
            <option value="champagne">Champagne</option>
            <option value="blush">Blush</option>
            <option value="gold">Goud</option>
          </select>
        </Field>
      </div>
      <Field label="Titel">
        <input type="text" value={settings.title || ''} onChange={e => onChange({ ...settings, title: e.target.value })} className="field-input" />
      </Field>
      <Field label="Ondertitel">
        <textarea value={settings.subtitle || ''} rows={2} onChange={e => onChange({ ...settings, subtitle: e.target.value })} className="field-input resize-none" />
      </Field>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Knoptekst">
          <input type="text" value={settings.button_label || ''} onChange={e => onChange({ ...settings, button_label: e.target.value })} className="field-input" />
        </Field>
        <Field label="Knop URL">
          <input type="text" value={settings.button_url || ''} onChange={e => onChange({ ...settings, button_url: e.target.value })} className="field-input" />
        </Field>
        <Field label="Knopstijl">
          <select value={settings.button_style || 'btn-gold'} onChange={e => onChange({ ...settings, button_style: e.target.value })} className="field-input">
            <option value="btn-premium">Donker</option>
            <option value="btn-gold">Goud</option>
            <option value="btn-blush">Roze</option>
          </select>
        </Field>
      </div>
    </div>
  );
}

function ImageTextEditor({ settings, onChange }: { settings: any; onChange: (s: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Afbeeldings URL">
          <input type="text" value={settings.image_url || ''} placeholder="https://..." onChange={e => onChange({ ...settings, image_url: e.target.value })} className="field-input" />
        </Field>
        <Field label="Afbeelding aan">
          <select value={settings.image_side || 'left'} onChange={e => onChange({ ...settings, image_side: e.target.value })} className="field-input">
            <option value="left">Links</option>
            <option value="right">Rechts</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Eyebrow">
          <input type="text" value={settings.eyebrow || ''} onChange={e => onChange({ ...settings, eyebrow: e.target.value })} className="field-input" />
        </Field>
        <Field label="Titel">
          <input type="text" value={settings.title || ''} onChange={e => onChange({ ...settings, title: e.target.value })} className="field-input" />
        </Field>
      </div>
      <Field label="Tekst (HTML)">
        <textarea value={settings.content || ''} rows={4} onChange={e => onChange({ ...settings, content: e.target.value })} className="field-input resize-y font-mono text-xs" />
      </Field>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Knoptekst">
          <input type="text" value={settings.button_label || ''} onChange={e => onChange({ ...settings, button_label: e.target.value })} className="field-input" />
        </Field>
        <Field label="Knop URL">
          <input type="text" value={settings.button_url || ''} onChange={e => onChange({ ...settings, button_url: e.target.value })} className="field-input" />
        </Field>
        <Field label="Knopstijl">
          <select value={settings.button_style || 'btn-premium'} onChange={e => onChange({ ...settings, button_style: e.target.value })} className="field-input">
            <option value="btn-premium">Donker</option>
            <option value="btn-gold">Goud</option>
            <option value="btn-blush">Roze</option>
          </select>
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

// ── Main editor component ──────────────────────────────────────────────────────

interface Props {
  variantId: string;
  pageId: string;
  initialBlocks: Block[];
}

export default function LandingPageVariantEditor({ variantId, pageId, initialBlocks }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addBlock = (type: Block['type']) => {
    const newBlock: Block = { id: generateId(), type, settings: { ...defaultSettings[type] } };
    setBlocks(prev => [...prev, newBlock]);
    setExpanded(prev => new Set(prev).add(newBlock.id));
    setShowAddMenu(false);
  };

  const removeBlock = (id: string) => {
    if (!confirm('Blok verwijderen?')) return;
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const updateBlock = useCallback((id: string, settings: any) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, settings } : b));
  }, []);

  const moveBlock = (from: number, to: number) => {
    if (from === to) return;
    setBlocks(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const saveBlocks = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/landing-pages/${pageId}/variants/${variantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  const blockLabel = (type: string) => BLOCK_TYPES.find(b => b.type === type)?.label || type;
  const blockIcon = (type: string) => BLOCK_TYPES.find(b => b.type === type)?.icon || '□';

  return (
    <div>
      <style>{`
        .field-label { display: block; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #5E534D; font-family: var(--font-body, sans-serif); margin-bottom: 6px; }
        .field-input { width: 100%; border: 1px solid #E8DDD0; padding: 8px 12px; font-family: var(--font-body, sans-serif); color: #2C2A28; font-size: 13px; background: #FAF7F4; outline: none; }
        .field-input:focus { border-color: #A66352; }
      `}</style>

      {/* Block list */}
      <div className="space-y-3 mb-4">
        {blocks.length === 0 && (
          <div className="border-2 border-dashed border-champagne p-8 text-center">
            <p style={{ fontFamily: 'var(--font-body, sans-serif)', color: '#5E534D', fontSize: 13 }}>
              Nog geen blokken. Voeg je eerste blok toe.
            </p>
          </div>
        )}

        {blocks.map((block, index) => (
          <div
            key={block.id}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={e => { e.preventDefault(); setDragOverIndex(index); }}
            onDrop={() => { if (dragIndex !== null) moveBlock(dragIndex, index); setDragIndex(null); setDragOverIndex(null); }}
            onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
            style={{
              border: dragOverIndex === index ? '2px solid #A66352' : '1px solid #E8DDD0',
              background: 'white',
              opacity: dragIndex === index ? 0.5 : 1,
              cursor: 'grab',
            }}
          >
            {/* Block header */}
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F3EDE6', cursor: 'pointer' }}
              onClick={() => toggleExpand(block.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>{blockIcon(block.type)}</span>
                <span style={{ fontFamily: 'var(--font-body, sans-serif)', color: '#2C2A28', fontSize: 13, fontWeight: 500 }}>
                  {blockLabel(block.type)}
                </span>
                {block.settings.title && (
                  <span style={{ fontFamily: 'var(--font-body, sans-serif)', color: '#5E534D', fontSize: 11 }}>
                    — {String(block.settings.title).slice(0, 40)}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button
                  onClick={e => { e.stopPropagation(); moveBlock(index, Math.max(0, index - 1)); }}
                  disabled={index === 0}
                  style={{ fontSize: 11, color: '#5E534D', opacity: index === 0 ? 0.3 : 1, background: 'none', border: 'none', cursor: 'pointer' }}
                  title="Omhoog"
                >▲</button>
                <button
                  onClick={e => { e.stopPropagation(); moveBlock(index, Math.min(blocks.length - 1, index + 1)); }}
                  disabled={index === blocks.length - 1}
                  style={{ fontSize: 11, color: '#5E534D', opacity: index === blocks.length - 1 ? 0.3 : 1, background: 'none', border: 'none', cursor: 'pointer' }}
                  title="Omlaag"
                >▼</button>
                <button
                  onClick={e => { e.stopPropagation(); removeBlock(block.id); }}
                  style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                  title="Verwijder blok"
                >✕</button>
                <span style={{ fontSize: 11, color: '#5E534D' }}>{expanded.has(block.id) ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* Block settings */}
            {expanded.has(block.id) && (
              <div style={{ padding: 20 }}>
                {block.type === 'hero' && <HeroEditor settings={block.settings} onChange={s => updateBlock(block.id, s)} />}
                {block.type === 'text' && <TextEditor settings={block.settings} onChange={s => updateBlock(block.id, s)} />}
                {block.type === 'products' && <ProductsEditor settings={block.settings} onChange={s => updateBlock(block.id, s)} />}
                {block.type === 'cta' && <CtaEditor settings={block.settings} onChange={s => updateBlock(block.id, s)} />}
                {block.type === 'image_text' && <ImageTextEditor settings={block.settings} onChange={s => updateBlock(block.id, s)} />}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Add block dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAddMenu(v => !v)}
            style={{ border: '1px solid #C9A96E', padding: '8px 16px', fontFamily: 'var(--font-body, sans-serif)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C9A96E', background: 'transparent', cursor: 'pointer' }}
          >
            + Blok toevoegen
          </button>
          {showAddMenu && (
            <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, background: 'white', border: '1px solid #E8DDD0', minWidth: 200, marginTop: 4, boxShadow: '0 8px 40px rgba(44,42,40,.10)' }}>
              {BLOCK_TYPES.map(bt => (
                <button
                  key={bt.type}
                  onClick={() => addBlock(bt.type)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', fontFamily: 'var(--font-body, sans-serif)', fontSize: 13, color: '#2C2A28', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F3EDE6')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span>{bt.icon}</span>
                  <span>{bt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={saveBlocks}
          disabled={saving}
          style={{
            padding: '8px 20px',
            fontFamily: 'var(--font-body, sans-serif)',
            fontSize: 10,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            background: saved ? '#2C2A28' : '#2C2A28',
            color: 'white',
            border: 'none',
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Opslaan...' : saved ? 'Opgeslagen ✓' : 'Blokken opslaan'}
        </button>

        {blocks.length > 0 && (
          <span style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: 11, color: '#5E534D' }}>
            {blocks.length} blok{blocks.length !== 1 ? 'ken' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
