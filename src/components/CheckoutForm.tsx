import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

interface Product {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  maten: string[] | null;
  images: string[] | null;
}

interface CheckoutFormProps {
  product: Product;
  stripePublishableKey: string;
}

// Step 1: Contact + order details form
interface OrderDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  size: string;
  paymentType: 'aanbetaling' | 'volledig';
}

function formatEuro(amount: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
}

// Inner form rendered inside <Elements> — has access to stripe + elements hooks
function PaymentForm({
  clientSecret,
  onBack,
}: {
  clientSecret: string;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/bevestiging`,
      },
    });

    // Only reached if redirect didn't happen (e.g. error)
    if (error) {
      setErrorMessage(error.message ?? 'Er is een fout opgetreden bij de betaling.');
    }
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: 'tabs',
          fields: { billingDetails: 'auto' },
        }}
      />

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {errorMessage}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 border border-charcoal/30 text-charcoal py-3 rounded-lg text-sm hover:bg-charcoal/5 transition-colors"
          disabled={isLoading}
        >
          Terug
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || isLoading}
          className="flex-2 flex-grow btn-premium py-3 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Bezig met verwerken…' : 'Betalen'}
        </button>
      </div>
    </form>
  );
}

export default function CheckoutForm({ product, stripePublishableKey }: CheckoutFormProps) {
  const [stripePromise] = useState(() => loadStripe(stripePublishableKey));
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [orderDetails, setOrderDetails] = useState<OrderDetails>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    size: '',
    paymentType: 'aanbetaling',
  });

  const depositAmount = Math.round(product.price * 0.5 * 100) / 100;
  const chargeAmount = orderDetails.paymentType === 'aanbetaling' ? depositAmount : product.price;

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          size: orderDetails.size,
          paymentType: orderDetails.paymentType,
          firstName: orderDetails.firstName,
          lastName: orderDetails.lastName,
          email: orderDetails.email,
          phone: orderDetails.phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? 'Er is een fout opgetreden.');
        return;
      }

      setClientSecret(data.clientSecret);
      setStep('payment');
    } catch {
      setSubmitError('Kan geen verbinding maken. Probeer het opnieuw.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#c9a96e',
      colorBackground: '#ffffff',
      colorText: '#1a1a1a',
      colorDanger: '#df1b41',
      fontFamily: 'Jost, system-ui, sans-serif',
      borderRadius: '6px',
    },
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Order summary */}
      <div className="glass-card p-6 mb-6">
        <p className="ds-eyebrow mb-3">Uw bestelling</p>
        <div className="flex gap-4 items-start">
          {product.images?.[0] && (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-20 h-24 object-cover rounded-md flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display text-lg text-charcoal leading-tight">{product.name}</p>
            {product.brand && <p className="text-sm text-taupe mt-0.5">{product.brand}</p>}
            <p className="text-base font-semibold text-charcoal mt-2">{formatEuro(product.price)}</p>
          </div>
        </div>
      </div>

      {step === 'details' && (
        <form onSubmit={handleDetailsSubmit} className="space-y-5">
          {/* Payment type choice */}
          <div>
            <p className="ds-eyebrow mb-3">Betalingsoptie</p>
            <div className="grid grid-cols-2 gap-3">
              {(['aanbetaling', 'volledig'] as const).map((type) => {
                const label = type === 'aanbetaling'
                  ? `50% aanbetaling\n${formatEuro(depositAmount)}`
                  : `Volledig bedrag\n${formatEuro(product.price)}`;
                const [line1, line2] = label.split('\n');
                return (
                  <label
                    key={type}
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                      orderDetails.paymentType === type
                        ? 'border-gold bg-gold/5'
                        : 'border-linen hover:border-gold/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      value={type}
                      checked={orderDetails.paymentType === type}
                      onChange={(e) => setOrderDetails({ ...orderDetails, paymentType: e.target.value as 'aanbetaling' | 'volledig' })}
                      className="sr-only"
                    />
                    <p className="text-sm font-medium text-charcoal">{line1}</p>
                    <p className="text-base font-bold text-charcoal mt-0.5">{line2}</p>
                  </label>
                );
              })}
            </div>
            {orderDetails.paymentType === 'aanbetaling' && (
              <p className="text-xs text-taupe mt-2">
                De resterende {formatEuro(product.price - depositAmount)} betaalt u bij afhaling.
              </p>
            )}
          </div>

          {/* Size selection */}
          {product.maten && product.maten.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                Maat <span className="text-taupe font-normal">(optioneel)</span>
              </label>
              <select
                value={orderDetails.size}
                onChange={(e) => setOrderDetails({ ...orderDetails, size: e.target.value })}
                className="w-full border border-linen rounded-lg px-3 py-2.5 text-sm text-charcoal bg-white focus:outline-none focus:border-gold"
              >
                <option value="">Kies uw maat</option>
                {product.maten.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {/* Contact details */}
          <div>
            <p className="ds-eyebrow mb-3">Uw gegevens</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Voornaam *</label>
                <input
                  type="text"
                  required
                  value={orderDetails.firstName}
                  onChange={(e) => setOrderDetails({ ...orderDetails, firstName: e.target.value })}
                  className="w-full border border-linen rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Achternaam *</label>
                <input
                  type="text"
                  required
                  value={orderDetails.lastName}
                  onChange={(e) => setOrderDetails({ ...orderDetails, lastName: e.target.value })}
                  className="w-full border border-linen rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-charcoal mb-1.5">E-mailadres *</label>
              <input
                type="email"
                required
                value={orderDetails.email}
                onChange={(e) => setOrderDetails({ ...orderDetails, email: e.target.value })}
                className="w-full border border-linen rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
              />
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-charcoal mb-1.5">Telefoonnummer</label>
              <input
                type="tel"
                value={orderDetails.phone}
                onChange={(e) => setOrderDetails({ ...orderDetails, phone: e.target.value })}
                className="w-full border border-linen rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-premium py-3.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Bezig…' : `Doorgaan naar betaling — ${formatEuro(chargeAmount)}`}
          </button>

          <p className="text-xs text-center text-taupe">
            Veilig betalen via Stripe. Uw gegevens worden versleuteld verwerkt.
          </p>
        </form>
      )}

      {step === 'payment' && clientSecret && (
        <div>
          <div className="mb-5 flex items-center justify-between">
            <p className="ds-eyebrow">Betaling</p>
            <p className="text-base font-bold text-charcoal">{formatEuro(chargeAmount)}</p>
          </div>
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance, locale: 'nl' }}
          >
            <PaymentForm
              clientSecret={clientSecret}
              onBack={() => setStep('details')}
            />
          </Elements>
        </div>
      )}
    </div>
  );
}
