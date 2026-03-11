import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ArrowRight,
  Zap,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles,
} from 'lucide-react';
import { DealAddOn } from '@/services/api';
import { AddOnsTypes } from '@/lib/constants';
import { usePostHog } from 'posthog-js/react';
import { CheckoutEvents, CheckoutEventProperties, getTimestamp } from '@/lib/analytics';

/** Resolve the image for a given add-on */
function getAddonImage(addon: DealAddOn): string | null {
  // Subscription add-ons → annual partnership image
  if (addon.type === 'Subscription') return '/addon-annual.webp';
  // Digital exposure one-time add-on
  const titleLower = addon.title.toLowerCase();
  if (titleLower.includes('digital')) return '/addon-digital.webp';
  // Fallback – no image
  return null;
}

interface AddOnsSectionCarouselProps {
  data: Record<string, boolean>;
  onUpdate: (data: Partial<Record<string, boolean>>) => void;
  onNext: () => void;
  onBack: () => void;
  availableAddOns: DealAddOn[];
  loading?: boolean;
  dealId?: string;
  hasActiveSubscription?: boolean;
  activeSubscriptionAmount?: number | null;
}

export const AddOnsSectionCarousel = ({
  data,
  onUpdate,
  onNext,
  onBack,
  availableAddOns,
  loading,
  dealId,
  hasActiveSubscription,
  activeSubscriptionAmount,
}: AddOnsSectionCarouselProps) => {
  // Filter out same-as-active subscriptions (un-actionable)
  const actionableAddOns = useMemo(
    () =>
      availableAddOns.filter((addon) => {
        if (!hasActiveSubscription || !activeSubscriptionAmount) return true;
        if (addon.type !== 'Subscription') return true;
        return parseFloat(addon.amount) > activeSubscriptionAmount;
      }),
    [availableAddOns, hasActiveSubscription, activeSubscriptionAmount],
  );

  const addonCount = actionableAddOns.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedDescription, setExpandedDescription] = useState(false);
  const touchStartX = useRef(0);
  const posthog = usePostHog();

  const current = actionableAddOns[currentIndex];

  // Track each add-on view
  useEffect(() => {
    if (posthog && current) {
      posthog.capture(CheckoutEvents.AB_ADDON_STEP_VIEWED, {
        [CheckoutEventProperties.AB_TEST_NAME]: 'addons_two_step',
        [CheckoutEventProperties.AB_TEST_VARIANT]: 'carousel',
        [CheckoutEventProperties.AB_ADDON_STEP_INDEX]: currentIndex,
        [CheckoutEventProperties.AB_ADDON_TOTAL_STEPS]: addonCount,
        [CheckoutEventProperties.ADDON_ID]: current.id.toString(),
        [CheckoutEventProperties.ADDON_TITLE]: current.title,
        [CheckoutEventProperties.ADDON_AMOUNT]: current.amount,
        [CheckoutEventProperties.DEAL_ID]: dealId,
        [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
      });
    }
  }, [posthog, currentIndex, current, dealId, addonCount]);

  // Navigation
  const goTo = useCallback((i: number) => {
    setCurrentIndex(i);
    setExpandedDescription(false);
  }, []);
  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % addonCount);
    setExpandedDescription(false);
  }, [addonCount]);
  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + addonCount) % addonCount);
    setExpandedDescription(false);
  }, [addonCount]);

  // Toggle the current add-on's selection
  const toggleCurrent = () => {
    if (!current) return;
    const addonKey = current.id.toString();
    const newValue = !data[addonKey];
    onUpdate({ [addonKey]: newValue });

    if (posthog) {
      posthog.capture(
        newValue ? CheckoutEvents.ADDON_SELECTED : CheckoutEvents.ADDON_DESELECTED,
        {
          [CheckoutEventProperties.AB_TEST_NAME]: 'addons_two_step',
          [CheckoutEventProperties.AB_TEST_VARIANT]: 'carousel',
          [CheckoutEventProperties.ADDON_ID]: addonKey,
          [CheckoutEventProperties.ADDON_TITLE]: current.title,
          [CheckoutEventProperties.ADDON_AMOUNT]: current.amount,
          [CheckoutEventProperties.DEAL_ID]: dealId,
          [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
        },
      );
    }
  };

  const handleContinue = () => {
    const hasSelectedAddons = Object.values(data).some(Boolean);
    if (posthog) {
      posthog.capture(
        hasSelectedAddons
          ? CheckoutEvents.AB_ADDON_YES_CLICKED
          : CheckoutEvents.AB_ADDON_NO_THANKS_CLICKED,
        {
          [CheckoutEventProperties.AB_TEST_NAME]: 'addons_two_step',
          [CheckoutEventProperties.AB_TEST_VARIANT]: 'carousel',
          [CheckoutEventProperties.DEAL_ID]: dealId,
          [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
        },
      );
    }
    onNext();
  };

  // Loading
  if (loading) {
    return (
      <Card className="p-6 border-0 bg-card">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading add-ons...</p>
        </div>
      </Card>
    );
  }

  // No actionable add-ons → skip
  if (addonCount === 0) {
    onNext();
    return null;
  }

  const addon = current!;
  const addonKey = addon.id.toString();
  const isSelected = !!data[addonKey];
  const isUpgrade =
    addon.type === 'Subscription' &&
    hasActiveSubscription &&
    parseFloat(addon.amount) > (activeSubscriptionAmount || 0);

  const addonImage = getAddonImage(addon);

  // Determine badge
  let badge: string | null = null;
  const badgeColor = 'bg-foreground text-background';
  if (isUpgrade) {
    badge = 'Upgrade';
  } else if (addon.type === 'Subscription' && !hasActiveSubscription) {
    badge = 'Best Value';
  } else if (addon.isPopular) {
    badge = 'Popular';
  }

  return (
    <Card className="p-6 border-0 bg-card">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <p className="text-[11px] font-bold tracking-[0.08em] uppercase text-muted-foreground">
              {hasActiveSubscription ? 'Upgrade Your Plan' : 'Enhance Your Ad'}
            </p>
          </div>
          <p className="text-[13px] text-muted-foreground">
            Swipe through add-ons to boost your reach.
          </p>
        </div>
      </div>

      {/* Carousel card — touch/swipe enabled */}
      <div
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const diff = touchStartX.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 50) {
            if (diff > 0) { goNext(); } else { goPrev(); }
          }
        }}
      >
        {/* Horizontal card: icon panel left, text right */}
        <button
          type="button"
          onClick={toggleCurrent}
          className={`w-full relative overflow-hidden rounded-2xl border bg-card text-left transition-colors duration-200 flex flex-col sm:flex-row ${
            isSelected ? 'border-primary' : 'border-border hover:border-primary/30'
          }`}
          aria-pressed={isSelected}
        >
          {/* Visual panel */}
          <div
            className="relative w-full sm:w-[270px] aspect-[806/710] shrink-0 overflow-hidden bg-muted"
          >
            {addonImage ? (
              <img
                key={addonKey}
                src={addonImage}
                alt={addon.title}
                className="w-full h-full object-cover animate-fade-in"
                style={{ animationDuration: '0.2s' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                <Zap className="w-16 h-16 text-foreground/30 animate-fade-in" style={{ animationDuration: '0.2s' }} />
              </div>
            )}
            {/* Badge on image panel */}
            {badge && (
              <span
                className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase ${badgeColor} backdrop-blur-sm`}
              >
                {badge}
              </span>
            )}
          </div>

          {/* Content on right */}
          <div
            key={addonKey + '-content'}
            className="flex-1 px-5 pt-5 pb-3 flex flex-col animate-fade-in sm:min-h-[230px]"
            style={{ animationDuration: '0.15s' }}
          >
            <div className="flex-1">
              {/* Title + selection circle */}
              <div className="flex items-start justify-between mb-2">
                <p className="text-[16px] sm:text-[17px] font-bold tracking-[-0.02em] text-foreground leading-snug pr-2">
                  {addon.title}
                </p>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-200 ${
                    isSelected ? 'border-primary bg-primary' : 'border-border'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                </div>
              </div>

              {/* Description */}
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
                <span className={expandedDescription ? '' : 'line-clamp-2'}>
                  {addon.description}
                </span>
                {!expandedDescription && (
                  <span>
                    {' '}
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDescription(true);
                      }}
                      className="text-muted-foreground text-xs font-medium hover:text-muted-foreground/80 transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      SEE MORE <ChevronDown className="w-3 h-3" />
                    </span>
                  </span>
                )}
                {expandedDescription && (
                  <span>
                    {' '}
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDescription(false);
                      }}
                      className="text-muted-foreground text-xs font-medium hover:text-muted-foreground/80 transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      SEE LESS <ChevronUp className="w-3 h-3" />
                    </span>
                  </span>
                )}
              </p>

              {/* Tags when expanded */}
              {expandedDescription && addon.tags && (
                <div className="mt-2 flex flex-wrap gap-2 mb-3">
                  {addon.tags.split(',').map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Price + status */}
            <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-end sm:justify-between mt-auto pt-4">
              <p className="text-[20px] font-bold tracking-[-0.02em] text-foreground">
                {isUpgrade ? (
                  <>
                    <span className="line-through text-muted-foreground text-[16px] mr-2">
                      ${addon.amount}
                    </span>
                    <span>
                      ${(parseFloat(addon.amount) - (activeSubscriptionAmount || 0)).toFixed(2)}
                    </span>
                    <span className="text-[13px] font-medium text-muted-foreground">/mo</span>
                  </>
                ) : (
                  <>
                    ${addon.amount}
                    <span className="text-[13px] font-medium text-muted-foreground">
                      {addon.type === AddOnsTypes.Subscription && '/mo'}
                      {addon.type === AddOnsTypes.OneTime && ' one-time'}
                    </span>
                  </>
                )}
              </p>
              <span
                className={`text-[12px] font-semibold tracking-[-0.02em] transition-colors duration-200 ${
                  isSelected ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {isSelected ? 'Added ✓' : 'Tap to add'}
              </span>
            </div>
          </div>
        </button>

        {/* Bottom navigation: skip link + arrows + dots */}
        <div className="flex items-center justify-end mt-4">

          <div className="flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={goPrev}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors duration-200"
              aria-label="Previous add-on"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              {actionableAddOns.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === currentIndex
                      ? 'w-6 h-2 bg-primary'
                      : data[a.id.toString()]
                        ? 'w-2 h-2 bg-primary/40'
                        : 'w-2 h-2 bg-border hover:bg-muted-foreground/30'
                  }`}
                  aria-label={`Go to ${a.title}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={goNext}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors duration-200"
              aria-label="Next add-on"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer: Back + Continue */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={onBack}
          className="gap-2 text-foreground border-0 hover:text-white transition-colors custom-back-button"
          style={{ backgroundColor: 'hsl(0deg 0% 96.86%)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <Button onClick={handleContinue} className="gap-2">
          {Object.values(data).some(Boolean) ? 'Payment' : 'No thanks'}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};
