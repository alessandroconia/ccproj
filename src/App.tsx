import { useEffect, useMemo, useState } from "react";
import { loadCatalog, type Catalog } from "./catalog";

const FREE_SHIPPING_CENTS = 6000;
const SHIPPING_CENTS = 600;

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

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

  const selectedProducts = products.filter((product) => quantities[product.id] > 0);
  const itemCount = Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0);
  const subtotal = products.reduce(
    (sum, product) => sum + product.priceCents * (quantities[product.id] || 0),
    0,
  );
  const shipping = subtotal >= FREE_SHIPPING_CENTS || subtotal === 0 ? 0 : SHIPPING_CENTS;
  const total = subtotal + shipping;

  const updateQuantity = (id: string, delta: number) => {
    setQuantities((current) => ({
      ...current,
      [id]: Math.max(0, Math.min(9, (current[id] || 0) + delta)),
    }));
  };

  const checkout = () => {
    if (!itemCount) {
      setNotice("Choose at least one item to continue.");
      return;
    }
    setNotice("");
    window.open("https://www.paypal.com/", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#" aria-label="Catalog home">
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          <span>catalog.</span>
        </a>
        <nav aria-label="Primary navigation">
          <a className="nav-link active" href="#shop">
            Shop
          </a>
          <a className="nav-link" href="#about">
            About
          </a>
          <a className="nav-link" href="#support">
            Support
          </a>
        </nav>
        <button
          className="bag-button"
          type="button"
          onClick={() => document.getElementById("summary")?.scrollIntoView({ behavior: "smooth" })}
        >
          <Icon name="bag" size={19} />
          <span>Bag</span>
          <span className="bag-count">{itemCount}</span>
        </button>
      </header>

      <main id="shop">
        <section className="intro">
          <p className="eyebrow">Catalog</p>
          <h1>Select what you need.</h1>
          <p className="intro-copy">
            Browse the items below, choose your quantities, and review your selection before
            checking out.
          </p>
          <div className="category-row">
            <span>Shop all</span>
            <label className="category-select">
              <span className="sr-only">Filter by category</span>
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option value="all">All categories</option>
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
          <section className="product-grid" aria-label="Products" aria-busy={!catalog && !loadError}>
            {!catalog && !loadError && <p className="grid-message">Loading items…</p>}
            {loadError && (
              <p className="grid-message" role="alert">
                Items could not be loaded. Please try again later.
              </p>
            )}
            {catalog && visibleProducts.length === 0 && (
              <p className="grid-message">No items in this category.</p>
            )}
            {visibleProducts.map((product) => {
              const quantity = quantities[product.id] || 0;
              return (
                <article
                  className={`product-card ${quantity ? "is-selected" : ""}`}
                  key={product.id}
                >
                  <div className="product-visual">
                    {quantity > 0 && (
                      <span className="selected-badge">
                        <Icon name="check" size={14} strokeWidth={2.5} />
                        Added
                      </span>
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
                    <span>Quantity</span>
                    <div className="stepper" aria-label={`Quantity for ${product.name}`}>
                      <button
                        aria-label={`Decrease ${product.name} quantity`}
                        disabled={quantity === 0}
                        onClick={() => updateQuantity(product.id, -1)}
                        type="button"
                      >
                        <Icon name="minus" size={17} />
                      </button>
                      <span aria-live="polite">{quantity}</span>
                      <button
                        aria-label={`Increase ${product.name} quantity`}
                        onClick={() => updateQuantity(product.id, 1)}
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
                <p className="eyebrow">Your selection</p>
                <h2>Order summary</h2>
              </div>
              <span>
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            </div>

            <div className="summary-items">
              {selectedProducts.length ? (
                selectedProducts.map((product) => (
                  <div className="summary-item" key={product.id}>
                    <ImagePlaceholder src={product.imageUrl} alt={product.name} size="thumb" />
                    <div>
                      <h3>{product.name}</h3>
                      <p>Qty {quantities[product.id]}</p>
                    </div>
                    <strong>{formatMoney(product.priceCents * quantities[product.id])}</strong>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <span>
                    <Icon name="bag" size={24} />
                  </span>
                  <p>Your bag is waiting.</p>
                  <small>Add an item to get started.</small>
                </div>
              )}
            </div>

            <div className="totals">
              <div>
                <span>Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div>
                <span>Shipping</span>
                <span>{shipping ? formatMoney(shipping) : "Free"}</span>
              </div>
              {subtotal > 0 && subtotal < FREE_SHIPPING_CENTS && (
                <p>Add {formatMoney(FREE_SHIPPING_CENTS - subtotal)} more for free shipping.</p>
              )}
            </div>

            <div className="grand-total">
              <div>
                <span>Total</span>
                <small>USD</small>
              </div>
              <strong>{formatMoney(total)}</strong>
            </div>

            <button className="paypal-button" type="button" onClick={checkout}>
              <span>Pay with</span>
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
              Secure checkout powered by PayPal
            </p>
          </aside>
        </div>
      </main>

      <footer>
        <div className="footer-inner">
          <p>catalog.</p>
          <span>Free shipping on orders over $60</span>
        </div>
      </footer>
    </div>
  );
}
