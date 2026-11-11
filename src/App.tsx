import { useEffect, useMemo, useState } from "react";
import { loadCatalog, type Catalog, type Item } from "./catalog";
import { INFO_ROUTE, InfoPage, LEGAL_LINKS, LegalPage, useLegalRoute } from "./Legal";

// Moment the page was loaded; a reload is the sync, so this is the "last synced" time.
const LOADED_AT = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

// Placeholder until the real PayPal URL is set via the VITE_CHECKOUT_URL repository variable.
// The /it/ path keeps PayPal on the Italian site instead of guessing a region from browser headers.
const CHECKOUT_URL = import.meta.env.VITE_CHECKOUT_URL?.startsWith("https://")
  ? import.meta.env.VITE_CHECKOUT_URL
  : "https://www.paypal.com/it/home";

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const formatMoney = (cents: number) => euro.format(cents / 100);

function Icon({
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

function ImagePlaceholder({
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

export default function App() {
  const legalRoute = useLegalRoute();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [categoryId, setCategoryId] = useState("all");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadCatalog()
      .then((result) => {
        if (!cancelled) setCatalog(result);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const products = catalog?.items ?? [];
  const categoryNames = useMemo(
    () => new Map((catalog?.categories ?? []).map((category) => [category.id, category.name])),
    [catalog],
  );
  const visibleProducts =
    categoryId === "all" ? products : products.filter((product) => product.categoryId === categoryId);

  // Never trust the stored quantity beyond what is in stock.
  const quantityOf = (product: Item) =>
    Math.min(quantities[product.id] || 0, product.availableQuantity);

  const selectedProducts = products.filter((product) => quantityOf(product) > 0);
  const itemCount = products.reduce((sum, product) => sum + quantityOf(product), 0);
  const total = products.reduce(
    (sum, product) => sum + product.priceCents * quantityOf(product),
    0,
  );

  const updateQuantity = (product: Item, delta: number) => {
    setQuantities((current) => ({
      ...current,
      [product.id]: Math.max(
        0,
        Math.min(product.availableQuantity, (current[product.id] || 0) + delta),
      ),
    }));
  };

  const checkout = () => {
    if (!itemCount) {
      setNotice("Scegli almeno un articolo per continuare.");
      return;
    }
    setNotice("");
    window.open(CHECKOUT_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#" aria-label="ccproj, pagina iniziale">
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          <span>ccproj</span>
        </a>
        <nav aria-label="Navigazione principale">
          <a className={`nav-link ${legalRoute === INFO_ROUTE ? "" : "active"}`} href="#shop">
            Negozio
          </a>
          <a
            className={`nav-link ${legalRoute === INFO_ROUTE ? "active" : ""}`}
            href={`#/${INFO_ROUTE}`}
          >
            Informazioni
          </a>
          <a className="nav-link" href="#support">
            Assistenza
          </a>
        </nav>
        <button
          className="bag-button"
          type="button"
          onClick={() => document.getElementById("summary")?.scrollIntoView({ behavior: "smooth" })}
        >
          <Icon name="bag" size={19} />
          <span>Carrello</span>
          <span className="bag-count">{itemCount}</span>
        </button>
      </header>

      {legalRoute === INFO_ROUTE ? (
        <InfoPage />
      ) : legalRoute ? (
        <LegalPage route={legalRoute} />
      ) : (
      <main id="shop">
        <div className="sync">
          <button className="sync-button" type="button" onClick={() => window.location.reload()}>
            Synch
          </button>
          <span className="sync-time">Aggiornato alle {LOADED_AT}</span>
        </div>
        <section className="intro">
          <p className="eyebrow">Catalogo</p>
          <h1>Scegli cosa vorresti.</h1>
          <p className="intro-copy">
            Sfoglia gli articoli qui sotto, scegli le quantità e controlla la tua selezione prima
            di procedere al pagamento.
          </p>
          <div className="category-row">
            <span>Tutti i prodotti</span>
            <label className="category-select">
              <span className="sr-only">Filtra per categoria</span>
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option value="all">Tutte le categorie</option>
                {(catalog?.categories ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <Icon name="chevron" size={18} />
            </label>
          </div>
        </section>

        <div className="shop-layout">
          <section className="product-grid" aria-label="Prodotti" aria-busy={!catalog && !loadError}>
            {!catalog && !loadError && <p className="grid-message">Caricamento articoli…</p>}
            {loadError && (
              <p className="grid-message" role="alert">
                Impossibile caricare gli articoli. Riprova più tardi.
              </p>
            )}
            {catalog && visibleProducts.length === 0 && (
              <p className="grid-message">Nessun articolo in questa categoria.</p>
            )}
            {visibleProducts.map((product) => {
              const quantity = quantityOf(product);
              const soldOut = product.availableQuantity === 0;
              return (
                <article
                  className={`product-card ${quantity ? "is-selected" : ""} ${soldOut ? "is-sold-out" : ""}`}
                  key={product.id}
                >
                  <div className="product-visual">
                    {soldOut ? (
                      <span className="selected-badge sold-out-badge">Esaurito</span>
                    ) : (
                      quantity > 0 && (
                        <span className="selected-badge">
                          <Icon name="check" size={14} strokeWidth={2.5} />
                          Aggiunto
                        </span>
                      )
                    )}
                    <ImagePlaceholder src={product.imageUrl} alt={product.name} />
                  </div>
                  <div className="product-info">
                    <div>
                      <p className="product-category">
                        {categoryNames.get(product.categoryId) ?? ""}
                      </p>
                      <h2>{product.name}</h2>
                    </div>
                    <p className="price">{formatMoney(product.priceCents)}</p>
                  </div>
                  <div className="quantity-row">
                    <span>
                      {soldOut ? "Non disponibile" : `Disponibili: ${product.availableQuantity}`}
                    </span>
                    <div className="stepper" aria-label={`Quantità per ${product.name}`}>
                      <button
                        aria-label={`Diminuisci la quantità di ${product.name}`}
                        disabled={quantity === 0}
                        onClick={() => updateQuantity(product, -1)}
                        type="button"
                      >
                        <Icon name="minus" size={17} />
                      </button>
                      <span aria-live="polite">{quantity}</span>
                      <button
                        aria-label={`Aumenta la quantità di ${product.name}`}
                        disabled={quantity >= product.availableQuantity}
                        onClick={() => updateQuantity(product, 1)}
                        type="button"
                      >
                        <Icon name="plus" size={17} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <aside className="summary-card" id="summary">
            <div className="summary-heading">
              <div>
                <p className="eyebrow">La tua selezione</p>
                <h2>Riepilogo ordine</h2>
              </div>
              <span>
                {itemCount} {itemCount === 1 ? "articolo" : "articoli"}
              </span>
            </div>

            <div className="summary-items">
              {selectedProducts.length ? (
                selectedProducts.map((product) => (
                  <div className="summary-item" key={product.id}>
                    <ImagePlaceholder src={product.imageUrl} alt={product.name} size="thumb" />
                    <div>
                      <h3>{product.name}</h3>
                      <p>Qtà {quantityOf(product)}</p>
                    </div>
                    <strong>{formatMoney(product.priceCents * quantityOf(product))}</strong>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <span>
                    <Icon name="bag" size={24} />
                  </span>
                  <p>Il tuo carrello è vuoto.</p>
                  <small>Aggiungi un articolo per iniziare.</small>
                </div>
              )}
            </div>

            <div className="grand-total">
              <div>
                <span>Totale</span>
                <small>EUR</small>
              </div>
              <strong>{formatMoney(total)}</strong>
            </div>

            <button className="paypal-button" type="button" onClick={checkout}>
              <span>Paga con</span>
              <strong>
                <i>Pay</i>Pal
              </strong>
              <Icon name="arrow" size={20} strokeWidth={2} />
            </button>
            {notice && (
              <p className="checkout-notice" role="alert">
                {notice}
              </p>
            )}
            <p className="secure-note">
              <Icon name="lock" size={14} />
              Pagamento sicuro tramite PayPal
            </p>
          </aside>
        </div>
      </main>
      )}

      <footer>
        <div className="footer-inner">
          <p>ccproj catalog</p>
          <nav aria-label="Informazioni legali" className="footer-links">
            {LEGAL_LINKS.map((link) => (
              <a key={link.route} href={`#/${link.route}`}>
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
