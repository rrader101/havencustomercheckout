import React, { useState } from 'react';
import {
  AddonLayout,
  EnrichedAddon,
  Icon,
  fmt,
  renderRich,
  sentenceClamp,
  usePrimarySubmitOnEnter,
} from './shared';

/**
 * Step 02 — "Customize". Renders one of two add-on layouts (bundle or
 * carousel) based on the `layout` prop. Empty state renders a single line
 * of helper text if the deal has no add-ons.
 */
export default function AddonsStep({
  addons,
  selected,
  onToggle,
  onBack,
  onNext,
  layout,
  anchorPricing,
  socialProof,
  customerName,
}: {
  addons: EnrichedAddon[];
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
  layout: AddonLayout;
  anchorPricing: boolean;
  socialProof: boolean;
  customerName: string;
}) {
  const firstName = customerName.trim().split(/\s+/)[0];
  const title = firstName ? `${firstName}, make this issue do more.` : 'Make this issue do more.';

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onNext();
  };

  usePrimarySubmitOnEnter(onNext);

  return (
    <form className="hc-fade-in" data-screen-label="02 Customize" onSubmit={handleSubmit}>
      <div className="hc-section-head">
        <h1 className="hc-section-title">{title}</h1>
        <p className="hc-section-sub">Your order is set. These extras attach to the same buy. Tap to add, remove any time before paying.</p>
      </div>

      {addons.length === 0 && <p className="hc-section-sub">No add-ons are available for this order.</p>}
      {addons.length > 0 && layout === 'bundle' && (
        <BundleLayout addons={addons} selected={selected} onToggle={onToggle} anchorPricing={anchorPricing} socialProof={socialProof} />
      )}
      {addons.length > 0 && layout === 'carousel' && (
        <CarouselLayout addons={addons} selected={selected} onToggle={onToggle} anchorPricing={anchorPricing} socialProof={socialProof} />
      )}

      <div className="hc-step-footer">
        <button type="button" className="hc-link-btn" onClick={onBack}>
          <Icon.Back /> Back
        </button>
        <button type="submit" className="hc-btn lg">
          Continue to payment
          <span className="hc-arrow">
            <Icon.Arrow />
          </span>
        </button>
      </div>
    </form>
  );
}

// ─── Bundle layout — hero card + stacked rows ─────────────────────────────

function BundleLayout({
  addons,
  selected,
  onToggle,
  anchorPricing,
  socialProof,
}: {
  addons: EnrichedAddon[];
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
  anchorPricing: boolean;
  socialProof: boolean;
}) {
  const [hero, ...rest] = addons;
  return (
    <div className="hc-addons">
      <AddonCard
        addon={hero}
        featured
        selected={!!selected[hero.id]}
        onToggle={() => onToggle(hero.id)}
        anchorPricing={anchorPricing}
        socialProof={socialProof}
      />
      {rest.map((addon) => (
        <AddonCard
          key={addon.id}
          addon={addon}
          selected={!!selected[addon.id]}
          onToggle={() => onToggle(addon.id)}
          anchorPricing={anchorPricing}
          socialProof={socialProof}
        />
      ))}
    </div>
  );
}

function AddonCard({
  addon,
  selected,
  onToggle,
  featured,
  anchorPricing,
  socialProof,
}: {
  addon: EnrichedAddon;
  selected: boolean;
  onToggle: () => void;
  featured?: boolean;
  anchorPricing: boolean;
  socialProof: boolean;
}) {
  // NOTE: we deliberately do NOT use the shared Radix-based <Checkbox /> from
  // components/ui/check-box.tsx here. Under React 19, nesting Radix Checkbox
  // inside a parent that the user is also clicking triggers a
  // "Maximum update depth exceeded" loop on selection — Radix's
  // useComposedRefs ref callback ends up calling setControl during ref
  // attach/detach in a way that React 19 doesn't bail out of. A styled span
  // with a lucide Check icon gives an identical visual and avoids the loop.
  // (The OrderSummary still uses the shared Checkbox because there it IS the
  // click target, not a passive indicator inside a clickable parent.)
  const checkVisual = (
    <span className={`hc-check ${selected ? 'is-checked' : ''}`} aria-hidden="true">
      {selected && <Icon.Check />}
    </span>
  );

  // Featured (full-width hero) card only: show a truncated first paragraph with
  // a "See more" that reveals every paragraph. It has the width to absorb the
  // expanded copy; the compact thumbnail rows below use a fixed blurb instead.
  // Toggling stops propagation so it never also selects the card.
  const [expanded, setExpanded] = useState(false);
  const paragraphs = addon.desc.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const hasMore = addon.desc.trim() !== addon.shortDesc.trim();

  const descBlock = (
    <span className="hc-desc">
      {expanded
        ? paragraphs.map((paragraph, index) => (
            <span key={index} className="hc-desc-para">
              {renderRich(paragraph)}
            </span>
          ))
        : renderRich(addon.shortDesc)}
      {hasMore && (
        <>
          {' '}
          <button
            type="button"
            className="hc-see-more"
            aria-expanded={expanded}
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((value) => !value);
            }}
          >
            {expanded ? 'See less' : 'See more'}
          </button>
        </>
      )}
    </span>
  );

  // The card is a div (not a <button>) so it can legally contain the nested
  // "See more" button and any links renderRich emits. Space toggles selection;
  // Enter is left to the form-level submit handler, matching CarouselLayout.
  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === ' ') {
      event.preventDefault();
      onToggle();
    }
  };

  if (featured) {
    return (
      <div
        role="button"
        tabIndex={0}
        className={`hc-addon featured ${selected ? 'selected' : ''}`}
        onClick={onToggle}
        onKeyDown={handleCardKeyDown}
        aria-pressed={selected}
      >
        {addon.tag && <span className="hc-badge">{addon.tag}</span>}
        <img className="hc-feat-banner" src={addon.image} alt="" loading="lazy" />
        <span className="hc-feat-inner">
          <span className="hc-addon-body">
            <span className="hc-addon-title">{addon.title}</span>
            {descBlock}
            {addon.detailLine && <span className="hc-desc-detail">{addon.detailLine}</span>}
            {socialProof && addon.socialProof && (
              <span className="hc-social-proof">
                <Icon.Trend />
                {addon.socialProof}
              </span>
            )}
          </span>
          <PriceColumn addon={addon} anchorPricing={anchorPricing} />
          {checkVisual}
        </span>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`hc-addon ${selected ? 'selected' : ''}`}
      onClick={onToggle}
      onKeyDown={handleCardKeyDown}
      aria-pressed={selected}
    >
      <img className="hc-thumb" src={addon.image} alt="" loading="lazy" />
      <span className="hc-addon-body">
        <span className="hc-addon-title">{addon.title}</span>
        {/* Compact rows use a fixed, sentence-complete blurb (no expand) so the
            thumbnail never ends up dwarfed by a wall of expanded text. */}
        <span className="hc-desc">{renderRich(sentenceClamp(addon.desc))}</span>
        {addon.detailLine && <span className="hc-desc-detail">{addon.detailLine}</span>}
        {socialProof && addon.socialProof && (
          <span className="hc-social-proof">
            <Icon.Trend />
            {addon.socialProof}
          </span>
        )}
      </span>
      <PriceColumn addon={addon} anchorPricing={anchorPricing} />
      {checkVisual}
    </div>
  );
}

function PriceColumn({ addon, anchorPricing }: { addon: EnrichedAddon; anchorPricing: boolean }) {
  return (
    <span className="hc-price-col">
      {anchorPricing && addon.anchor && <span className="hc-anchor">${fmt(addon.anchor)}</span>}
      <span className="hc-price">${fmt(addon.price)}</span>
      <span className="hc-per">{addon.per}</span>
      {addon.saveLabel && <span className="hc-save">{addon.saveLabel}</span>}
    </span>
  );
}

// ─── Carousel layout — one card at a time, prev/next/dots ────────────────

function CarouselLayout({
  addons,
  selected,
  onToggle,
  anchorPricing,
  socialProof,
}: {
  addons: EnrichedAddon[];
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
  anchorPricing: boolean;
  socialProof: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const addon = addons[Math.min(index, addons.length - 1)];
  const paragraphs = addon.desc.split(/\n\s*\n/);
  const isSelected = !!selected[addon.id];

  const go = (delta: number) => {
    setIndex((current) => (current + delta + addons.length) % addons.length);
    setExpanded(false);
  };

  // Clicking anywhere on the card adds (or removes) the current addon. Nested
  // controls (see more, nav, dots, the explicit Add button) stop propagation
  // so they don't double-fire onToggle.
  const handleCardClick = () => onToggle(addon.id);
  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === ' ') {
      event.preventDefault();
      onToggle(addon.id);
    }
  };
  const stop = (event: React.MouseEvent) => event.stopPropagation();

  return (
    <div className="hc-addon-carousel">
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        className={`hc-carousel-card clickable ${isSelected ? 'selected' : ''}`}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
      >
        {addon.tag && <span className="hc-badge">{addon.tag}</span>}
        <img className="hc-carousel-img" src={addon.image} alt="" />
        <div className="hc-carousel-body">
          <div className="hc-carousel-top">
            <h3>{addon.title}</h3>
            <IncludedList items={addon.tags} />
            <div className="hc-carousel-text">
              {(expanded ? paragraphs : paragraphs.slice(0, 1)).map((paragraph, paragraphIndex, visible) => (
                <p key={paragraphIndex} className="hc-desc">
                  {renderRich(paragraph)}
                  {paragraphs.length > 1 && paragraphIndex === visible.length - 1 && (
                    <>
                      {' '}
                      <button
                        type="button"
                        className="hc-see-more"
                        onClick={(event) => {
                          event.stopPropagation();
                          setExpanded((value) => !value);
                        }}
                      >
                        {expanded ? 'See less' : 'See more'}
                      </button>
                    </>
                  )}
                </p>
              ))}
              {socialProof && addon.socialProof && (
                <div className="hc-social-proof">
                  <Icon.Trend />
                  {addon.socialProof}
                </div>
              )}
            </div>
          </div>
          <div className="hc-carousel-foot">
            <PriceColumn addon={addon} anchorPricing={anchorPricing} />
            <button
              type="button"
              className={`hc-addon-toggle ${isSelected ? 'selected' : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                onToggle(addon.id);
              }}
            >
              <span className="hc-addon-toggle-mark">{isSelected ? <Icon.Check /> : <Icon.Plus />}</span>
              {isSelected ? 'Added' : 'Add to order'}
            </button>
          </div>
          <div className="hc-carousel-nav" onClick={stop}>
            <button
              type="button"
              className="hc-carousel-nav-btn"
              onClick={(event) => {
                event.stopPropagation();
                go(-1);
              }}
            >
              <Icon.Back />
              <span>Prev</span>
            </button>
            <div className="hc-carousel-dots">
              {addons.map((item, itemIndex) => (
                <button
                  type="button"
                  key={item.id}
                  className={`hc-dot ${itemIndex === index ? 'active' : ''} ${selected[item.id] ? 'added' : ''}`}
                  aria-label={`Go to ${item.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setIndex(itemIndex);
                    setExpanded(false);
                  }}
                />
              ))}
              <span className="hc-carousel-count">
                {index + 1} of {addons.length}
              </span>
            </div>
            <button
              type="button"
              className="hc-carousel-nav-btn"
              onClick={(event) => {
                event.stopPropagation();
                go(1);
              }}
            >
              <span>Next</span>
              <Icon.Arrow />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IncludedList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="hc-included">
      <span className="hc-included-label">What's included</span>
      <ul className="hc-addon-checklist">
        {items.map((item) => (
          <li key={item}>
            <span className="hc-check-ico">
              <Icon.Check />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
