import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Star, TrendingUp, Zap, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { DealAddOn } from '@/services/api';
import { AddOnsTypes } from '@/lib/constants';
import { usePostHog } from 'posthog-js/react';
import { CheckoutEvents, CheckoutEventProperties, getTimestamp } from '@/lib/analytics';

interface AddOnsSectionTwoStepProps {
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

export const AddOnsSectionTwoStep = ({
  data,
  onUpdate,
  onNext,
  onBack,
  availableAddOns,
  loading,
  dealId,
  hasActiveSubscription,
  activeSubscriptionAmount,
}: AddOnsSectionTwoStepProps) => {
  // Filter out add-ons that are same-as-active subscription (un-actionable)
  const actionableAddOns = availableAddOns.filter((addon) => {
    if (!hasActiveSubscription || !activeSubscriptionAmount) return true;
    if (addon.type !== 'Subscription') return true;
    return parseFloat(addon.amount) > activeSubscriptionAmount;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedDescription, setExpandedDescription] = useState(false);
  const posthog = usePostHog();

  const currentAddon: DealAddOn | undefined = actionableAddOns[currentIndex];
  const isLastAddon = currentIndex >= actionableAddOns.length - 1;

  // Track step viewed
  useEffect(() => {
    if (posthog && currentAddon) {
      posthog.capture(CheckoutEvents.AB_ADDON_STEP_VIEWED, {
        [CheckoutEventProperties.AB_TEST_NAME]: 'addons_two_step',
        [CheckoutEventProperties.AB_TEST_VARIANT]: 'two-step',
        [CheckoutEventProperties.AB_ADDON_STEP_INDEX]: currentIndex,
        [CheckoutEventProperties.AB_ADDON_TOTAL_STEPS]: actionableAddOns.length,
        [CheckoutEventProperties.ADDON_ID]: currentAddon.id.toString(),
        [CheckoutEventProperties.ADDON_TITLE]: currentAddon.title,
        [CheckoutEventProperties.ADDON_AMOUNT]: currentAddon.amount,
        [CheckoutEventProperties.DEAL_ID]: dealId,
        [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
      });
    }
  }, [posthog, currentIndex, currentAddon, dealId, actionableAddOns.length]);

  const advance = () => {
    setExpandedDescription(false);
    if (isLastAddon) {
      onNext();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleYes = () => {
    if (!currentAddon) return;
    const addonKey = currentAddon.id.toString();
    onUpdate({ [addonKey]: true });

    if (posthog) {
      posthog.capture(CheckoutEvents.ADDON_SELECTED, {
        [CheckoutEventProperties.AB_TEST_NAME]: 'addons_two_step',
        [CheckoutEventProperties.AB_TEST_VARIANT]: 'two-step',
        [CheckoutEventProperties.ADDON_ID]: addonKey,
        [CheckoutEventProperties.ADDON_TITLE]: currentAddon.title,
        [CheckoutEventProperties.ADDON_AMOUNT]: currentAddon.amount,
        [CheckoutEventProperties.DEAL_ID]: dealId,
        [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
      });
      posthog.capture(CheckoutEvents.AB_ADDON_YES_CLICKED, {
        [CheckoutEventProperties.AB_TEST_NAME]: 'addons_two_step',
        [CheckoutEventProperties.ADDON_ID]: addonKey,
        [CheckoutEventProperties.ADDON_TITLE]: currentAddon.title,
        [CheckoutEventProperties.ADDON_AMOUNT]: currentAddon.amount,
        [CheckoutEventProperties.AB_ADDON_STEP_INDEX]: currentIndex,
        [CheckoutEventProperties.AB_ADDON_TOTAL_STEPS]: actionableAddOns.length,
        [CheckoutEventProperties.DEAL_ID]: dealId,
        [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
      });
    }

    advance();
  };

  const handleNoThanks = () => {
    if (!currentAddon) return;
    const addonKey = currentAddon.id.toString();
    onUpdate({ [addonKey]: false });

    if (posthog) {
      posthog.capture(CheckoutEvents.ADDON_DESELECTED, {
        [CheckoutEventProperties.AB_TEST_NAME]: 'addons_two_step',
        [CheckoutEventProperties.AB_TEST_VARIANT]: 'two-step',
        [CheckoutEventProperties.ADDON_ID]: addonKey,
        [CheckoutEventProperties.ADDON_TITLE]: currentAddon.title,
        [CheckoutEventProperties.ADDON_AMOUNT]: currentAddon.amount,
        [CheckoutEventProperties.DEAL_ID]: dealId,
        [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
      });
      posthog.capture(CheckoutEvents.AB_ADDON_NO_THANKS_CLICKED, {
        [CheckoutEventProperties.AB_TEST_NAME]: 'addons_two_step',
        [CheckoutEventProperties.ADDON_ID]: addonKey,
        [CheckoutEventProperties.ADDON_TITLE]: currentAddon.title,
        [CheckoutEventProperties.ADDON_AMOUNT]: currentAddon.amount,
        [CheckoutEventProperties.AB_ADDON_STEP_INDEX]: currentIndex,
        [CheckoutEventProperties.AB_ADDON_TOTAL_STEPS]: actionableAddOns.length,
        [CheckoutEventProperties.DEAL_ID]: dealId,
        [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
      });
    }

    advance();
  };

  const handleBack = () => {
    if (currentIndex === 0) {
      onBack();
    } else {
      setExpandedDescription(false);
      setCurrentIndex((i) => i - 1);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card className="p-6 border-0 bg-card">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading add-ons...</p>
        </div>
      </Card>
    );
  }

  // Edge case: no actionable add-ons → skip straight to payment
  if (actionableAddOns.length === 0) {
    onNext();
    return null;
  }

  const addon = currentAddon!;
  const addonKey = addon.id.toString();
  const isUpgrade =
    addon.type === 'Subscription' &&
    hasActiveSubscription &&
    parseFloat(addon.amount) > (activeSubscriptionAmount || 0);

  return (
    <Card className="p-6 border-0 bg-card">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
          Add-on {currentIndex + 1} of {actionableAddOns.length}
        </p>
        <div className="flex gap-1.5">
          {actionableAddOns.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i < currentIndex
                  ? 'w-6 bg-primary'
                  : i === currentIndex
                  ? 'w-6 bg-primary/70'
                  : 'w-4 bg-primary/20'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h2
          className="text-xl font-semibold mb-2"
          style={{ fontWeight: 700, fontSize: '1.4rem', letterSpacing: '-0.02rem' }}
        >
          {hasActiveSubscription ? 'Upgrade or Add Services' : 'Enhance Your Experience'}
        </h2>
        <p className="text-muted-foreground">Would you like to add this to your order?</p>
      </div>

      {/* Single add-on card */}
      <div className="relative p-6 rounded-lg border-2 border-primary/20 bg-card transition-all duration-300">
        {/* Upgrade badge */}
        {isUpgrade && (
          <div className="absolute -top-3 left-6">
            <span className="bg-primary text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Upgrade
            </span>
          </div>
        )}

        {/* Popular Badge */}
        {addon.type === 'Subscription' && !hasActiveSubscription && (
          <div className="absolute -top-3 left-6">
            <span className="bg-foreground text-background px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <Star className="w-3 h-3" />
              Most Popular
            </span>
          </div>
        )}

        <div className="flex items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-white border border-foreground">
                {currentIndex === 0 ? (
                  <TrendingUp className="w-5 h-5 text-foreground" />
                ) : (
                  <Zap className="w-5 h-5 text-foreground" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{addon.title}</h3>
                <div className="text-sm text-primary font-medium">
                  {isUpgrade ? (
                    <>
                      <span className="line-through text-muted-foreground mr-2">${addon.amount}</span>
                      <span className="text-primary">
                        ${(parseFloat(addon.amount) - (activeSubscriptionAmount || 0)).toFixed(2)}
                      </span>
                      <span>/month upgrade</span>
                    </>
                  ) : (
                    <>
                      ${addon.amount}
                      {addon.type === AddOnsTypes.Subscription && <span>/month</span>}
                      {addon.type === AddOnsTypes.OneTime && <span> one-time</span>}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-muted-foreground text-sm">
                <span className={expandedDescription ? '' : 'line-clamp-2'}>
                  {addon.description}
                </span>
                {!expandedDescription && (
                  <span>
                    {' '}
                    <button
                      onClick={() => setExpandedDescription(true)}
                      className="text-muted-foreground text-xs font-medium hover:text-muted-foreground/80 transition-colors inline-flex items-center gap-1"
                    >
                      SEE MORE <ChevronDown className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {expandedDescription && (
                  <span>
                    {' '}
                    <button
                      onClick={() => setExpandedDescription(false)}
                      className="text-muted-foreground text-xs font-medium hover:text-muted-foreground/80 transition-colors inline-flex items-center gap-1"
                    >
                      SEE LESS <ChevronUp className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </p>

              {expandedDescription && addon.tags && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {addon.tags.split(',').map((tag, tagIndex) => (
                    <span key={tagIndex} className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Already selected indicator */}
        {data[addonKey] && (
          <div className="mt-2 flex items-center gap-1.5 text-primary text-sm font-medium">
            <Check className="w-4 h-4" />
            Added to your order
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-8 space-y-3">
        <Button onClick={handleYes} className="w-full gap-2 py-6 text-base">
          Yes, add this
        </Button>
        <Button
          variant="outline"
          onClick={handleNoThanks}
          className="w-full gap-2 py-6 text-base border-primary/20 text-muted-foreground hover:text-foreground"
        >
          No thank you
        </Button>
      </div>

      {/* Back button */}
      <div className="mt-6">
        <Button
          variant="outline"
          onClick={handleBack}
          className="gap-2 text-foreground border-0 hover:text-white transition-colors custom-back-button"
          style={{ backgroundColor: 'hsl(0deg 0% 96.86%)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>
    </Card>
  );
};
