import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Star,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { DealAddOn } from "@/services/api";
import { AddOnsTypes } from "@/lib/constants";

interface AddOnsSectionProps {
  data: Record<string, boolean>;
  onUpdate: (data: Partial<Record<string, boolean>>) => void;
  onNext: () => void;
  onBack: () => void;
  availableAddOns: DealAddOn[];
  loading?: boolean;
}

export const AddOnsSection = ({
  data,
  onUpdate,
  onNext,
  onBack,
  availableAddOns,
  loading,
}: AddOnsSectionProps) => {
  const [expandedDescriptions, setExpandedDescriptions] = useState<
    Record<string, boolean>
  >({});
  console.log("availableAddOns:", availableAddOns);
  const toggleAddon = (addonId: string) => {
    onUpdate({ [addonId]: !data[addonId] });
  };

  const toggleDescription = (addonId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the addon selection
    setExpandedDescriptions((prev) => ({
      ...prev,
      [addonId]: !prev[addonId],
    }));
  };

  if (loading) {
    return (
      <Card className="p-6 border-0 bg-card animate-fade-in">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading add-ons...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-0 bg-card animate-fade-in">
      <div className="mb-10">
        <h2
          className="text-xl font-semibold mb-2"
          style={{
            fontWeight: 700,
            fontSize: "1.4rem",
            letterSpacing: "-0.02rem",
          }}
        >
          Enhance Your Experience
        </h2>
        <p className="text-muted-foreground">
          Select premium add-ons to maximize your investment
        </p>
      </div>

      <div className="space-y-4">
        {/* Dynamic Add-ons from API */}
        {availableAddOns.map((addon, index) => {
          const addonKey = addon.id.toString();
          const isSelected = !!data[addonKey];
          const isExpanded = !!expandedDescriptions[addonKey];

          return (
            <div
              key={addon.id}
              className={`
                relative p-6 rounded-lg border-2 cursor-pointer transition-all duration-300 group
                ${
                  isSelected
                    ? "border-primary bg-gradient-accent"
                    : "border-primary/20 bg-card hover:border-primary/50"
                }
              `}
              onClick={() => toggleAddon(addonKey)}
            >
              {/* Popular Badge */}
              {addon.type === "Subscription" && (
                <div className="absolute -top-3 left-6">
                  <span className="bg-foreground text-background px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-white border border-foreground">
                      {index === 0 ? (
                        <TrendingUp className="w-5 h-5 text-foreground" />
                      ) : (
                        <Zap className="w-5 h-5 text-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{addon.title}</h3>
                      <div className="text-sm text-primary font-medium">
                        ${addon.amount}
                        {addon.type === AddOnsTypes.Subscription && (
                          <span>/month</span>
                        )}
                        {addon.type === AddOnsTypes.OneTime && (
                          <span> one-time</span>
                        )}
                      </div>{" "}
                      {/* add /month if month other add one-time */}
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-muted-foreground text-sm">
                      <span className={isExpanded ? "" : "line-clamp-2"}>
                        {addon.description}
                      </span>
                      {!isExpanded && (
                        <span>
                          {" "}
                          <button
                            onClick={(e) => toggleDescription(addonKey, e)}
                            className="text-muted-foreground text-xs font-medium hover:text-muted-foreground/80 transition-colors flex items-center gap-1 inline-flex"
                          >
                            SEE MORE <ChevronDown className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {isExpanded && (
                        <span>
                          {" "}
                          <button
                            onClick={(e) => toggleDescription(addonKey, e)}
                            className="text-muted-foreground text-xs font-medium hover:text-muted-foreground/80 transition-colors flex items-center gap-1 inline-flex"
                          >
                            SEE LESS <ChevronUp className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                    </p>

                    {/* Tags - Only show when expanded (to mirror previous file’s style) */}
                    {isExpanded && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {addon.type !== AddOnsTypes.OneTime ? (
                          <>
                            <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">
                              Full-Page Feature
                            </span>
                            <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">
                              8 Issues (Annual)
                            </span>
                            <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">
                              Monthly Refresh
                            </span>
                            <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">
                              Print + Digital
                            </span>
                            <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">
                              Consistent Exposure
                            </span>
                            <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">
                              Brand Recognition
                            </span>
                            <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">
                              Cost Savings
                            </span>
                            <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">
                              &lt;3¢ per Reader
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">
                              5,000+ Targeted Views
                            </span>
                            <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">
                              Local Reach
                            </span>
                            <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">
                              Multi-Platform Exposure
                            </span>
                            <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">
                              Engagement Insights
                            </span>
                            <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">
                              Seller Reporting
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Selection Indicator */}
              <div
                className={`
                  absolute top-4 right-4 w-6 h-6 rounded-full border-2 transition-all duration-200
                  ${
                    isSelected
                      ? "bg-primary border-primary"
                      : "border-primary/20 group-hover:border-primary"
                  }
                `}
              >
                {isSelected && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Value Proposition (style aligned with previous file) */}
      {availableAddOns?.[0]?.type === "Subscription" && data?.[1] === true && (
        <div className="mt-6 p-4 bg-gradient-accent rounded-lg border border-primary/20 animate-slide-in">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Star className="w-4 h-4" />
            <span className="font-medium">Major Savings</span>
          </div>
          <p className="text-sm text-muted-foreground">
            A full-page every month plus digital reach, all at less than 3¢ per
            reader.
          </p>
        </div>
      )}
      {availableAddOns?.[0]?.type === "Subscription" && data?.[2] === true && (
        <div className="mt-6 p-4 bg-gradient-accent rounded-lg border border-primary/20 animate-slide-in">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Star className="w-4 h-4" />
            <span className="font-medium">Good Move</span>
          </div>
          <p className="text-sm text-muted-foreground">
            More reach, verified impressions, and reporting you can share with sellers.
          </p>
        </div>
      )}

      <div className="space-y-6 mt-6">
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            className="gap-2 text-foreground border-0 hover:text-white transition-colors custom-back-button"
            style={{ backgroundColor: "hsl(0deg 0% 96.86%)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <Button onClick={onNext} className="gap-2">
            {Object.values(data).some(Boolean) ? "Payment" : "No thanks"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
