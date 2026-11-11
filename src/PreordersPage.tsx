import { useEffect, useMemo, useState } from "react";
import { loadCatalog, type Category } from "./catalog";
import {
  isOpenForContributions,
  loadPreorders,
  remainingSteps,
  stepPriceCents,
  type BoughtItem,
  type PreorderItem,
  type Preorders as PreorderData,
} from "./preorders";
import { CHECKOUT_URL, formatMoney, Icon, ImagePlaceholder, SyncBar } from "./ui";

type View = "preorder" | "confirmed" | "all";

const VIEWS: { key: View; label: string }[] = [
  { key: "preorder", label: "In preordine" },
  { key: "confirmed", label: "Confermati" },
  { key: "all", label: "Tutti" },
];

export default function Preorders({
  onSelectedCountChange,
}: {
  /** Lets the header show how many steps are selected. */
  onSelectedCountChange: (count: number) => void;
}) {
  const [data, setData] = useState<PreorderData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [categoryId, setCategoryId] = useState("all");
  const [view, setView] = useState<View>("all");
  // Ids of the items with one selected step (never more than one step per item).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadPreorders(), loadCatalog()])
      .then(([preorders, catalog]) => {
        if (cancelled) return;
        setData(preorders);
        setCategories(catalog.categories);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const inCategory = (item: { categoryId: string }) =>
    categoryId === "all" || item.categoryId === categoryId;
  const preorderItems = (data?.preorderItems ?? []).filter(inCategory);
  const boughtItems = (data?.boughtItems ?? []).filter(inCategory);
  const showPreorders = view !== "confirmed";
  const showConfirmed = view !== "preorder";
  const visibleCount =
    (showPreorders ? preorderItems.length : 0) + (showConfirmed ? boughtItems.length : 0);

  // A step counts only for items that are still open, whatever is stored in the selection.
  const isSelected = (item: PreorderItem) => selectedIds.has(item.id) && isOpenForContributions(item);
  const selectedItems = (data?.preorderItems ?? []).filter(isSelected);
  const stepCount = selectedItems.length;
  const total = selectedItems.reduce((sum, item) => sum + stepPriceCents(item), 0);

  useEffect(() => {
    onSelectedCountChange(stepCount);
  }, [stepCount, onSelectedCountChange]);

  const setStep = (item: PreorderItem, selected: boolean) => {
    if (selected && !isOpenForContributions(item)) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) next.add(item.id);
      else next.delete(item.id);
      return next;
    });
  };

  const checkout = () => {
    if (!stepCount) {
      setNotice("Scegli almeno un passo per continuare.");
      return;
    }
    setNotice("");
    window.open(CHECKOUT_URL, "_blank", "noopener,noreferrer");
  };

  const renderPreorder = (item: PreorderItem) => {
    const open = isOpenForContributions(item);
    const selected = isSelected(item);
    const unavailableLabel = item.quantity === 0 ? "Non disponibile" : "Completo";
    const percent = Math.round((item.currentProgress / item.requiredProgress) * 100);
    const left = remainingSteps(item);
    return (
      <article
        className={`product-card ${selected ? "is-selected" : ""} ${open ? "" : "is-sold-out"}`}
        key={item.id}
      >
        <div className="product-visual">
          {!open ? (
            <span className="selected-badge sold-out-badge">{unavailableLabel}</span>
          ) : (
            selected && (
              <span className="selected-badge">
                <Icon name="check" size={14} strokeWidth={2.5} />
                Aggiunto
              </span>
            )
          )}
          <ImagePlaceholder src={item.imageUrl} alt={item.name} />
        </div>
        <div className="product-info preorder-info">
          <div>
            <p className="product-category">{categoryNames.get(item.categoryId) ?? ""}</p>
            <h2>{item.name}</h2>
          </div>
          <p className="preorder-prices">
            <span className="step-price">{formatMoney(stepPriceCents(item))}</span>
            <span className="full-price">
              <span className="sr-only">Prezzo intero </span>
              {formatMoney(item.priceCents)}
            </span>
          </p>
        </div>
        <div className="preorder-progress">
          <div
            aria-label={`Avanzamento di ${item.name}`}
            aria-valuemax={item.requiredProgress}
            aria-valuemin={0}
            aria-valuenow={item.currentProgress}
            className="progress-bar"
            role="progressbar"
          >
            <span style={{ width: `${percent}%` }} />
            {/* Temporary segment for the step the visitor is about to pay: striped and
                animated while selected, fades and shrinks away when removed. */}
            <i
              aria-hidden="true"
              className={`progress-pending ${selected ? "is-active" : ""}`}
              style={{ left: `${percent}%`, ["--step" as string]: `${100 / item.requiredProgress}%` }}
            />
          </div>
          <span className="progress-text">
            {item.currentProgress} / {item.requiredProgress}
          </span>
        </div>
        <div className="quantity-row">
          <span>
            {open
              ? `Mancano ${left} ${left === 1 ? "passo" : "passi"}`
              : unavailableLabel}
          </span>
          <div className="stepper" aria-label={`Passo per ${item.name}`}>
            <button
              aria-label={`Rimuovi il passo di ${item.name}`}
              disabled={!open || !selected}
              onClick={() => setStep(item, false)}
              type="button"
            >
              <Icon name="minus" size={17} />
            </button>
            <span aria-live="polite">{selected ? 1 : 0}</span>
            <button
              aria-label={`Aggiungi un passo per ${item.name}`}
              disabled={!open || selected}
              onClick={() => setStep(item, true)}
              type="button"
            >
              <Icon name="plus" size={17} />
            </button>
          </div>
        </div>
      </article>
    );
  };

  const renderConfirmed = (item: BoughtItem) => (
    <article className="product-card is-confirmed" key={item.id}>
      <div className="product-visual">
        <span className="confirmed-badge">Confermato</span>
        <ImagePlaceholder src={item.imageUrl} alt={item.name} />
      </div>
      <div className="product-info">
        <div>
          <p className="product-category">{categoryNames.get(item.categoryId) ?? ""}</p>
          <h2>{item.name}</h2>
        </div>
        <p className="price">{formatMoney(item.priceCents)}</p>
      </div>
      <div className="quantity-row">
        <span>Quantità: {item.quantity}</span>
      </div>
    </article>
  );

  return (
    <main id="preordini">
      <SyncBar />
      <section className="intro">
        <p className="eyebrow">Preordini</p>
        <h1>Scegli a cosa contribuire.</h1>
        <p className="intro-copy">
          Ogni articolo si finanzia a piccoli passi: scegli un passo, controlla la tua selezione e
          procedi al pagamento. Quando i passi sono completi, l’articolo viene confermato.
        </p>
        <div className="category-row">
          <span>Preordini</span>
          <label className="category-select">
            <span className="sr-only">Filtra per categoria</span>
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="all">Tutte le categorie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <Icon name="chevron" size={18} />
          </label>
        </div>
        <div className="view-toggle" role="group" aria-label="Mostra">
          {VIEWS.map((option) => (
            <button
              aria-pressed={view === option.key}
              className={view === option.key ? "active" : ""}
              key={option.key}
              onClick={() => setView(option.key)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <div className="shop-layout">
        <section className="product-grid" aria-label="Preordini" aria-busy={!data && !loadError}>
          {!data && !loadError && <p className="grid-message">Caricamento articoli…</p>}
          {loadError && (
            <p className="grid-message" role="alert">
              Impossibile caricare gli articoli. Riprova più tardi.
            </p>
          )}
          {data && visibleCount === 0 && (
            <p className="grid-message">Nessun articolo in questa selezione.</p>
          )}
          {showPreorders && preorderItems.map(renderPreorder)}
          {showConfirmed && boughtItems.map(renderConfirmed)}
        </section>

        <aside className="summary-card" id="summary">
          <div className="summary-heading">
            <div>
              <p className="eyebrow">La tua selezione</p>
              <h2>Riepilogo preordini</h2>
            </div>
            <span>
              {stepCount} {stepCount === 1 ? "passo" : "passi"}
            </span>
          </div>

          <div className="summary-items">
            {selectedItems.length ? (
              selectedItems.map((item) => (
                <div className="summary-item" key={item.id}>
                  <ImagePlaceholder src={item.imageUrl} alt={item.name} size="thumb" />
                  <div>
                    <h3>{item.name}</h3>
                    <p>
                      1 passo su {item.requiredProgress}
                    </p>
                  </div>
                  <strong>{formatMoney(stepPriceCents(item))}</strong>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <span>
                  <Icon name="bag" size={24} />
                </span>
                <p>Il tuo carrello è vuoto.</p>
                <small>Aggiungi un passo per iniziare.</small>
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
  );
}
