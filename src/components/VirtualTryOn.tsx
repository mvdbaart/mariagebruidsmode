import { useEffect, useMemo, useState, type FormEvent } from 'react';

type ProductType = 'dress' | 'suit';

interface Props {
  productSlug: string;
  productName: string;
  productImage: string;
  productType: ProductType;
  collectionName?: string | null;
  brand?: string | null;
}

function prettyType(productType: ProductType) {
  return productType === 'suit' ? 'kostuum' : 'jurk';
}

function fileToPreviewUrl(file: File | null) {
  return file ? URL.createObjectURL(file) : '';
}

export default function VirtualTryOn({
  productSlug,
  productName,
  productImage,
  productType,
  collectionName,
  brand,
}: Props) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [revisedPrompt, setRevisedPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);

  const outfitLabel = useMemo(() => prettyType(productType), [productType]);

  useEffect(() => {
    if (!photo) {
      setPreviewUrl('');
      return;
    }

    const nextUrl = fileToPreviewUrl(photo);
    setPreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [photo]);

  function onPhotoChange(file: File | null) {
    setError('');
    setResultUrl('');
    setRevisedPrompt('');
    setPhoto(file);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setResultUrl('');
    setRevisedPrompt('');

    if (!photo) {
      setError('Upload eerst een foto om verder te gaan.');
      return;
    }

    const formData = new FormData();
    formData.append('photo', photo);
    formData.append('product_slug', productSlug);

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/virtual-try-on', {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload?.error ?? 'De try-on kon niet worden gemaakt.');
        return;
      }

      const imageDataUrl = typeof payload?.imageDataUrl === 'string' ? payload.imageDataUrl : '';
      if (!imageDataUrl) {
        setError('De server leverde geen afbeelding terug.');
        return;
      }

      setResultUrl(imageDataUrl);
      setRevisedPrompt(typeof payload?.revisedPrompt === 'string' ? payload.revisedPrompt : '');
    } catch {
      setError('Netwerkfout tijdens het genereren van de preview.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-10 border border-champagne bg-white shadow-soft overflow-hidden">
      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="p-6 sm:p-8 lg:p-10 border-b xl:border-b-0 xl:border-r border-champagne">
          <p className="text-[10px] tracking-[0.3em] uppercase text-blush-deep font-body mb-3">
            Pashok
          </p>
          <h2 className="font-display text-charcoal text-3xl sm:text-4xl leading-tight mb-4">
            Pas deze {outfitLabel}
            <em className="italic font-light text-taupe">virtueel</em>
          </h2>
          <p className="text-sm text-taupe font-light leading-relaxed max-w-2xl mb-6">
            Upload een duidelijke foto van jezelf en laat AI een eerste indruk maken van hoe
            {brand ? ` ${brand}` : ''} {productName} je zou staan. Voor het beste resultaat:
            recht van voren, goed licht, handen zichtbaar en bij voorkeur een foto van boven
            tot onder.
          </p>
          {collectionName && (
            <p className="text-[10px] tracking-[0.2em] uppercase text-taupe/70 font-body mb-6">
              Collectie: {collectionName}
            </p>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            <label
              className={`block border-2 border-dashed p-5 sm:p-6 transition-colors cursor-pointer ${
                isDragActive ? 'border-blush-deep bg-blush-deep/5' : 'border-champagne bg-ivory/30'
              }`}
              onDragEnter={() => setIsDragActive(true)}
              onDragLeave={() => setIsDragActive(false)}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragActive(true);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragActive(false);
                const nextFile = e.dataTransfer.files?.[0] ?? null;
                onPhotoChange(nextFile);
              }}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => onPhotoChange(e.currentTarget.files?.[0] ?? null)}
              />
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-14 h-14 rounded-full border border-champagne bg-white flex items-center justify-center text-blush-deep shrink-0">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] tracking-[0.2em] uppercase text-charcoal font-body mb-1">
                    {photo ? photo.name : 'Kies een foto of sleep hem hierheen'}
                  </p>
                  <p className="text-xs text-taupe leading-relaxed">
                    JPG, PNG of WebP. Gebruik bij voorkeur een recente full-body foto met neutrale
                    houding en voldoende licht.
                  </p>
                </div>
                <span className="inline-flex items-center justify-center px-4 py-2 border border-charcoal text-[10px] tracking-[0.2em] uppercase text-charcoal font-body">
                  Foto kiezen
                </span>
              </div>
            </label>

            {previewUrl && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-champagne bg-ivory overflow-hidden p-2">
                  <img src={previewUrl} alt="Jouw geüploade foto" className="w-full h-72 object-contain" />
                </div>
                <div className="border border-champagne bg-ivory overflow-hidden p-2">
                  <img src={productImage} alt={productName} className="w-full h-72 object-contain" />
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3">
                {error}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isSubmitting || !photo}
                className="btn-premium flex-1 justify-center py-4 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Preview maken...' : 'Pas deze outfit'}
              </button>
              <button
                type="button"
                onClick={() => onPhotoChange(null)}
                className="btn-gold flex-1 justify-center py-4"
              >
                Wis foto
              </button>
            </div>

            <p className="text-[11px] text-taupe leading-relaxed">
              Je foto wordt alleen gebruikt om deze preview te maken en niet permanent opgeslagen.
            </p>
          </form>
        </div>

        <div className="p-6 sm:p-8 lg:p-10 bg-cream">
          <p className="text-[10px] tracking-[0.3em] uppercase text-blush-deep font-body mb-3">
            Resultaat
          </p>
          <div className="border border-champagne bg-white shadow-card overflow-hidden min-h-[28rem] flex items-center justify-center">
            {resultUrl ? (
              <img
                src={resultUrl}
                alt={`AI try-on preview van ${productName}`}
                className="w-full h-full object-contain bg-ivory"
              />
            ) : (
              <div className="p-8 text-center max-w-sm">
                <div className="w-16 h-16 rounded-full border border-champagne bg-ivory/60 mx-auto mb-4 flex items-center justify-center text-blush-deep">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 2a7 7 0 0 0-7 7c0 3.2 2.1 5 3.5 6.8.9 1.2 1.2 2.2 1.5 4.2h4c.3-2 0-3 .9-4.2C15.9 14 18 12.2 18 9a7 7 0 0 0-6-7Z" />
                    <path d="M9.5 21h5" />
                  </svg>
                </div>
                <h3 className="font-display text-charcoal text-2xl mb-2">
                  Jouw preview verschijnt hier
                </h3>
                <p className="text-sm text-taupe font-light leading-relaxed">
                  Na het uploaden maken we een eerste AI-visualisatie van hoe de gekozen outfit je
                  zou kunnen staan.
                </p>
              </div>
            )}
          </div>

          {revisedPrompt && (
            <div className="mt-5 border border-champagne bg-white/80 p-4">
              <p className="text-[10px] tracking-[0.2em] uppercase text-taupe font-body mb-2">
                Gebruikte instructie
              </p>
              <p className="text-xs text-taupe leading-relaxed">{revisedPrompt}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
