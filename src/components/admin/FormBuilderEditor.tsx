import { useState, useCallback } from 'react';
import type { FieldDefinition, FieldType } from '../../lib/forms';
import { slugify } from '../../lib/forms';

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Tekst',
  email: 'E-mail',
  tel: 'Telefoon',
  textarea: 'Tekstblok',
  select: 'Keuzelijst',
  checkbox: 'Selectievakjes',
  radio: 'Keuzerondjes',
  date: 'Datum',
};

const FIELD_TYPES: FieldType[] = ['text', 'email', 'tel', 'textarea', 'select', 'checkbox', 'radio', 'date'];

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

interface Props {
  initialName?: string;
  initialSlug?: string;
  initialDescription?: string;
  initialFields?: FieldDefinition[];
  formId?: string;
  isEdit?: boolean;
}

export default function FormBuilderEditor({
  initialName = '',
  initialSlug = '',
  initialDescription = '',
  initialFields = [],
  formId,
  isEdit = false,
}: Props) {
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [slugManual, setSlugManual] = useState(isEdit);
  const [description, setDescription] = useState(initialDescription);
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<FieldDefinition[]>(initialFields);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline field edit state
  const [editLabel, setEditLabel] = useState('');
  const [editType, setEditType] = useState<FieldType>('text');
  const [editPlaceholder, setEditPlaceholder] = useState('');
  const [editRequired, setEditRequired] = useState(false);
  const [editOptions, setEditOptions] = useState('');

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugManual) setSlug(slugify(value));
  };

  const startAdd = () => {
    const id = generateId();
    setEditingId(`__new__${id}`);
    setEditLabel('');
    setEditType('text');
    setEditPlaceholder('');
    setEditRequired(false);
    setEditOptions('');
  };

  const startEdit = (field: FieldDefinition) => {
    setEditingId(field.id);
    setEditLabel(field.label);
    setEditType(field.type);
    setEditPlaceholder(field.placeholder ?? '');
    setEditRequired(field.required);
    setEditOptions(field.options?.join('\n') ?? '');
  };

  const cancelEdit = () => setEditingId(null);

  const saveField = () => {
    if (!editLabel.trim()) return;
    const options = needsOptions(editType)
      ? editOptions.split('\n').map(o => o.trim()).filter(Boolean)
      : undefined;

    if (editingId?.startsWith('__new__')) {
      const newField: FieldDefinition = {
        id: editingId.replace('__new__', ''),
        type: editType,
        label: editLabel.trim(),
        placeholder: editPlaceholder.trim() || undefined,
        required: editRequired,
        options,
      };
      setFields(prev => [...prev, newField]);
    } else {
      setFields(prev => prev.map(f =>
        f.id === editingId
          ? { ...f, type: editType, label: editLabel.trim(), placeholder: editPlaceholder.trim() || undefined, required: editRequired, options }
          : f
      ));
    }
    setEditingId(null);
  };

  const removeField = (id: string) => setFields(prev => prev.filter(f => f.id !== id));

  const moveUp = (index: number) => {
    if (index === 0) return;
    setFields(prev => { const a = [...prev]; [a[index - 1], a[index]] = [a[index], a[index - 1]]; return a; });
  };

  const moveDown = (index: number) => {
    setFields(prev => {
      if (index >= prev.length - 1) return prev;
      const a = [...prev]; [a[index], a[index + 1]] = [a[index + 1], a[index]]; return a;
    });
  };

  const needsOptions = (type: FieldType) => ['select', 'checkbox', 'radio'].includes(type);

  const handleSave = useCallback(async () => {
    setError(null);
    if (!name.trim()) { setError('Naam is verplicht.'); return; }
    if (!slug.trim()) { setError('Slug is verplicht.'); return; }

    setSaving(true);
    try {
      const url = isEdit ? `/api/admin/forms/${formId}` : '/api/admin/forms';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, slug, description, fields, is_active: isActive }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Opslaan mislukt.'); return; }
      window.location.href = '/admin/formulieren';
    } catch {
      setError('Netwerkfout. Probeer opnieuw.');
    } finally {
      setSaving(false);
    }
  }, [name, slug, description, fields, isActive, isEdit, formId]);

  return (
    <div className="space-y-10">
      {/* Form metadata */}
      <div className="bg-white border border-[var(--color-champagne)] p-8 shadow-soft space-y-6">
        <h2 className="font-display text-charcoal text-xl italic">Formulier instellingen</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-taupe font-body mb-2">Naam *</label>
            <input
              type="text"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Bijv. Contactformulier"
              className="w-full border-0 border-b border-[var(--color-champagne)] bg-transparent py-2 text-sm font-body text-charcoal focus:outline-none focus:border-[var(--color-blush-deep)] transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-taupe font-body mb-2">
              Slug *
              <button
                type="button"
                onClick={() => setSlugManual(true)}
                className="ml-2 text-[9px] text-blush-deep underline normal-case tracking-normal"
              >
                {slugManual ? 'handmatig' : 'automatisch — klik om te wijzigen'}
              </button>
            </label>
            <input
              type="text"
              value={slug}
              onChange={e => { setSlugManual(true); setSlug(e.target.value); }}
              placeholder="contactformulier"
              className="w-full border-0 border-b border-[var(--color-champagne)] bg-transparent py-2 text-sm font-body text-charcoal focus:outline-none focus:border-[var(--color-blush-deep)] transition-colors font-mono"
            />
            {slug && (
              <p className="text-[9px] text-taupe font-body mt-1">Embed via slug: <code>{slug}</code></p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[10px] tracking-[0.2em] uppercase text-taupe font-body mb-2">Omschrijving</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optionele introductietekst boven het formulier..."
            rows={3}
            className="w-full border border-[var(--color-champagne)] bg-transparent p-3 text-sm font-body text-charcoal focus:outline-none focus:border-[var(--color-blush-deep)] transition-colors resize-none"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
            className="w-4 h-4 accent-[var(--color-blush-deep)]"
          />
          <span className="text-sm font-body text-charcoal">Formulier actief (zichtbaar voor bezoekers)</span>
        </label>
      </div>

      {/* Fields */}
      <div className="bg-white border border-[var(--color-champagne)] p-8 shadow-soft">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-charcoal text-xl italic">Velden</h2>
          <span className="text-[10px] tracking-widest uppercase font-body text-taupe">{fields.length} {fields.length === 1 ? 'veld' : 'velden'}</span>
        </div>

        {fields.length === 0 && (
          <p className="text-sm font-body text-taupe italic text-center py-8 border border-dashed border-[var(--color-champagne)]">
            Nog geen velden. Voeg hieronder een veld toe.
          </p>
        )}

        <div className="space-y-3 mb-6">
          {fields.map((field, index) => (
            <div key={field.id}>
              {editingId === field.id ? (
                <FieldEditor
                  label={editLabel} setLabel={setEditLabel}
                  type={editType} setType={setEditType}
                  placeholder={editPlaceholder} setPlaceholder={setEditPlaceholder}
                  required={editRequired} setRequired={setEditRequired}
                  options={editOptions} setOptions={setEditOptions}
                  onSave={saveField} onCancel={cancelEdit}
                  needsOptions={needsOptions}
                />
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 border border-[var(--color-champagne)] bg-[#faf9f7] group">
                  <span className="text-[9px] tracking-widest uppercase font-body text-taupe w-20 shrink-0">{FIELD_TYPE_LABELS[field.type]}</span>
                  <span className="text-sm font-body text-charcoal flex-1 truncate">
                    {field.label}
                    {field.required && <span className="ml-1 text-blush-deep">*</span>}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => moveUp(index)} disabled={index === 0} className="px-2 py-1 text-xs text-taupe hover:text-charcoal disabled:opacity-20">↑</button>
                    <button type="button" onClick={() => moveDown(index)} disabled={index === fields.length - 1} className="px-2 py-1 text-xs text-taupe hover:text-charcoal disabled:opacity-20">↓</button>
                    <button type="button" onClick={() => startEdit(field)} className="px-3 py-1 text-[9px] uppercase tracking-wider font-body text-taupe hover:text-charcoal">Bewerk</button>
                    <button type="button" onClick={() => removeField(field.id)} className="px-3 py-1 text-[9px] uppercase tracking-wider font-body text-red-400 hover:text-red-600">✕</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {editingId?.startsWith('__new__') ? (
          <FieldEditor
            label={editLabel} setLabel={setEditLabel}
            type={editType} setType={setEditType}
            placeholder={editPlaceholder} setPlaceholder={setEditPlaceholder}
            required={editRequired} setRequired={setEditRequired}
            options={editOptions} setOptions={setEditOptions}
            onSave={saveField} onCancel={cancelEdit}
            needsOptions={needsOptions}
          />
        ) : (
          <button
            type="button"
            onClick={startAdd}
            className="w-full border border-dashed border-[var(--color-champagne)] py-3 text-[10px] tracking-widest uppercase font-body text-taupe hover:border-[var(--color-blush-deep)] hover:text-blush-deep transition-colors"
          >
            + Veld toevoegen
          </button>
        )}
      </div>

      {/* Save */}
      {error && (
        <div className="bg-red-50 border border-red-200 px-4 py-3 text-sm font-body text-red-700">{error}</div>
      )}

      <div className="flex gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-charcoal text-white px-10 py-3 text-[10px] tracking-widest uppercase font-body font-medium hover:bg-taupe transition-colors disabled:opacity-50"
        >
          {saving ? 'Opslaan...' : (isEdit ? 'Formulier bijwerken' : 'Formulier aanmaken')}
        </button>
        <a
          href="/admin/formulieren"
          className="border border-[var(--color-champagne)] px-8 py-3 text-[10px] tracking-widest uppercase font-body text-taupe hover:border-charcoal hover:text-charcoal transition-colors"
        >
          Annuleren
        </a>
      </div>
    </div>
  );
}

interface FieldEditorProps {
  label: string; setLabel: (v: string) => void;
  type: FieldType; setType: (v: FieldType) => void;
  placeholder: string; setPlaceholder: (v: string) => void;
  required: boolean; setRequired: (v: boolean) => void;
  options: string; setOptions: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  needsOptions: (type: FieldType) => boolean;
}

function FieldEditor({ label, setLabel, type, setType, placeholder, setPlaceholder, required, setRequired, options, setOptions, onSave, onCancel, needsOptions }: FieldEditorProps) {
  return (
    <div className="border border-[var(--color-blush-deep)] bg-white p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[9px] tracking-[0.2em] uppercase text-taupe font-body mb-1">Veldtype</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as FieldType)}
            className="w-full border border-[var(--color-champagne)] bg-white px-3 py-2 text-sm font-body text-charcoal focus:outline-none focus:border-[var(--color-blush-deep)]"
          >
            {FIELD_TYPES.map(t => (
              <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[9px] tracking-[0.2em] uppercase text-taupe font-body mb-1">Label *</label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Bijv. Uw naam"
            autoFocus
            className="w-full border-0 border-b border-[var(--color-champagne)] bg-transparent py-2 text-sm font-body text-charcoal focus:outline-none focus:border-[var(--color-blush-deep)] transition-colors"
          />
        </div>
      </div>

      {type !== 'checkbox' && type !== 'radio' && type !== 'select' && type !== 'date' && (
        <div>
          <label className="block text-[9px] tracking-[0.2em] uppercase text-taupe font-body mb-1">Plaatshouder</label>
          <input
            type="text"
            value={placeholder}
            onChange={e => setPlaceholder(e.target.value)}
            placeholder="Optionele hint voor de invuller..."
            className="w-full border-0 border-b border-[var(--color-champagne)] bg-transparent py-2 text-sm font-body text-charcoal focus:outline-none focus:border-[var(--color-blush-deep)] transition-colors"
          />
        </div>
      )}

      {needsOptions(type) && (
        <div>
          <label className="block text-[9px] tracking-[0.2em] uppercase text-taupe font-body mb-1">Opties (één per regel)</label>
          <textarea
            value={options}
            onChange={e => setOptions(e.target.value)}
            placeholder={'Optie 1\nOptie 2\nOptie 3'}
            rows={4}
            className="w-full border border-[var(--color-champagne)] bg-transparent p-3 text-sm font-body text-charcoal focus:outline-none focus:border-[var(--color-blush-deep)] resize-none"
          />
        </div>
      )}

      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={required}
          onChange={e => setRequired(e.target.checked)}
          className="w-4 h-4 accent-[var(--color-blush-deep)]"
        />
        <span className="text-sm font-body text-charcoal">Verplicht veld</span>
      </label>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onSave}
          disabled={!label.trim()}
          className="bg-charcoal text-white px-6 py-2 text-[9px] tracking-widest uppercase font-body hover:bg-taupe transition-colors disabled:opacity-40"
        >
          Veld opslaan
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-[var(--color-champagne)] px-5 py-2 text-[9px] tracking-widest uppercase font-body text-taupe hover:text-charcoal transition-colors"
        >
          Annuleren
        </button>
      </div>
    </div>
  );
}
