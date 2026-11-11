import { useEffect, useMemo, useState } from "react";
import { loadCatalog, type Catalog, type Item } from "./catalog";
import {
  INFO_ROUTE,
  InfoPage,
  LEGAL_LINKS,
  LegalPage,
  PREORDINI_ROUTE,
  useLegalRoute,
} from "./Legal";
import Preorders from "./PreordersPage";
import { CHECKOUT_URL, formatMoney, Icon, ImagePlaceholder, SyncBar } from "./ui";

// Main sections, shown in the header nav (desktop) and in the tab row (phones).
const NAV_TABS = [
  { key: "shop", label: "Negozio", href: "#shop" },
  { key: PREORDINI_ROUTE, label: "Preordini", href: `#/${PREORDINI_ROUTE}` },
  { key: INFO_ROUTE, label: "Informazioni", href: `#/${INFO_ROUTE}` },
];

export default function App() {
  const legalRoute = useLegalRoute();
  // Legal pages keep Negozio highlighted, as before.
  const activeTab = legalRoute === INFO_ROUTE || legalRoute === PREORDINI_ROUTE ? legalRoute : "shop";
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [categoryId, setCategoryId] = useState("all");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState("");
  // Selected steps on the Preordini page (reported by <Preorders />).
  const [stepCount, setStepCount] = useState(0);

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
          {NAV_TABS.map((tab) => (
            <a
              className={`nav-link ${tab.key === activeTab ? "active" : ""}`}
              href={tab.href}
              key={tab.key}
            >
              {tab.label}
            </a>
          ))}
        </nav>
        <button
          className="bag-button"
          type="button"
          onClick={() => document.getElementById("summary")?.scrollIntoView({ behavior: "smooth" })}
        >
          <Icon name="bag" size={19} />
          <span>Carrello</span>
          <span className="bag-count">{legalRoute === PREORDINI_ROUTE ? stepCount : itemCount}</span>
        </button>
      </header>

      <nav className="tab-row" aria-label="Sezioni">
        {NAV_TABS.map((tab) => (
          <a
            className={`tab-link ${tab.key === activeTab ? "active" : ""}`}
            href={tab.href}
            key={tab.key}
          >
            {tab.label}
          </a>
        ))}
      </nav>

      {legalRoute === INFO_ROUTE ? (
        <InfoPage />
      ) : legalRoute === PREORDINI_ROUTE ? (
        <Preorders onSelectedCountChange={setStepCount} />
      ) : legalRoute ? (
        <LegalPage route={legalRoute} />
      ) : (
      <main id="shop">
        <SyncBar />
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
