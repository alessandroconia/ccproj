// UI pieces shared by the Negozio and Preordini pages (kept out of App.tsx to avoid circular imports).

// Moment the page was loaded; a reload is the sync, so this is the "last synced" time.
const LOADED_AT = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

// Placeholder until the real PayPal URL is set via the VITE_CHECKOUT_URL repository variable.
// The /it/ path keeps PayPal on the Italian site instead of guessing a region from browser headers.
export const CHECKOUT_URL = import.meta.env.VITE_CHECKOUT_URL?.startsWith("https://")
  ? import.meta.env.VITE_CHECKOUT_URL
  : "https://www.paypal.com/it/home";

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
export const formatMoney = (cents: number) => euro.format(cents / 100);

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
}: {
  name: "bag" | "chevron" | "minus" | "plus" | "lock" | "arrow" | "check" | "image";
  size?: number;
  strokeWidth?: number;
}) {
  const paths = {
    bag: (
      <>
        <path d="M6 8h12l1 12H5L6 8Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),
    chevron: <path d="m8 10 4 4 4-4" />,
    minus: <path d="M7 12h10" />,
    plus: (
      <>
        <path d="M12 7v10" />
        <path d="M7 12h10" />
      </>
    ),
    lock: (
      <>
        <rect x="6" y="10" width="12" height="10" rx="2" />
        <path d="M9 10V7a3 3 0 0 1 6 0v3" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
      </>
    ),
    check: <path d="m6 12 4 4 8-9" />,
    image: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="m4 18 5-5 4 4 3-3 4 4" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
    >
      {paths[name]}
    </svg>
  );
}

export function ImagePlaceholder({
  src,
  alt,
  size = "card",
}: {
  src: string | null;
  alt: string;
  size?: "card" | "thumb";
}) {
  if (src) {
    return <img className={`image-box image-box--${size}`} src={src} alt={alt} loading="lazy" />;
  }
  return (
    <div className={`image-box image-box--${size} image-placeholder`} role="img" aria-label={alt}>
      <Icon name="image" size={size === "card" ? 40 : 16} strokeWidth={1.4} />
    </div>
  );
}

/** Synch button (reloads the page) plus the "last updated" time. */
export function SyncBar() {
  return (
    <div className="sync">
      <button className="sync-button" type="button" onClick={() => window.location.reload()}>
        Synch
      </button>
      <span className="sync-time">Aggiornato alle {LOADED_AT}</span>
    </div>
  );
}
