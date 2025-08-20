import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Star, TrendingUp, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { DealAddOn } from '@/services/api';

interface AddOnsSectionProps {
  data: Record<string, boolean>;
  onUpdate: (data: Partial<Record<string, boolean>>) => void;
  onNext: () => void;
  onBack: () => void;
  availableAddOns: DealAddOn[];
  loading?: boolean;
}

export const AddOnsSection = ({ data, onUpdate, onNext, onBack, availableAddOns, loading }: AddOnsSectionProps) => {
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  const toggleAddon = (addonId: string) => {
    onUpdate({ [addonId]: !data[addonId] });
  };

  const toggleDescription = (addonId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the addon selection
    setExpandedDescriptions(prev => ({
      ...prev,
      [addonId]: !prev[addonId]
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
        <h2 className="text-xl font-semibold mb-2" style={{ fontWeight: 700, fontSize: '1.4rem', letterSpacing: '-0.02rem' }}>Enhance Your Experience</h2>
        <p className="text-muted-foreground">Select premium add-ons to maximize your investment</p>
      </div>

      <div className="space-y-4">
        {/* Dynamic Add-ons from API */}
        {availableAddOns.map((addon, index) => {
          const addonKey = addon.id.toString();
          return (
            <div 
              key={addon.id}
              className={`
                relative p-6 rounded-lg border-2 cursor-pointer transition-all duration-300 group
                ${data[addonKey] 
                  ? 'border-primary bg-gradient-accent' 
                  : 'border-primary/20 bg-card hover:border-primary/50'
                }
              `}
              onClick={() => toggleAddon(addonKey)}
            >
              {/* Popular Badge */}
              {addon.isPopular && (
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
                      {index === 0 ? <TrendingUp className="w-5 h-5 text-foreground" /> : <Zap className="w-5 h-5 text-foreground" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{addon.title}</h3>
                      <div className="text-sm text-primary font-medium">${addon.amount}</div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-muted-foreground text-sm">
                      {addon.description}
                      {expandedDescriptions[addonKey] && addon.description.length > 100 && (
                        <span> Additional details about this add-on and its benefits.</span>
                      )}
                      {addon.description.length > 100 && !expandedDescriptions[addonKey] && (
                        <span> <button
                          onClick={(e) => toggleDescription(addonKey, e)}
                          className="text-muted-foreground text-xs font-medium hover:text-muted-foreground/80 transition-colors flex items-center gap-1 inline-flex"
                        >
                          SEE MORE <ChevronDown className="w-3 h-3" />
                        </button></span>
                      )}
                      {expandedDescriptions[addonKey] && (
                        <span> <button
                          onClick={(e) => toggleDescription(addonKey, e)}
                          className="text-muted-foreground text-xs font-medium hover:text-muted-foreground/80 transition-colors flex items-center gap-1 inline-flex"
                        >
                          SEE LESS <ChevronUp className="w-3 h-3" />
                        </button></span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Selection Indicator */}
              <div className={`
                absolute top-4 right-4 w-6 h-6 rounded-full border-2 transition-all duration-200
                ${data[addonKey] 
                  ? 'bg-primary border-primary' 
                  : 'border-primary/20 group-hover:border-primary'
                }
              `}>
                {data[addonKey] && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Value Proposition */}
      {Object.values(data).some(selected => selected) && (
        <div className="mt-6 p-4 bg-gradient-accent rounded-lg border border-primary/20 animate-slide-in">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Star className="w-4 h-4" />
            <span className="font-medium">Excellent choice</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Great selection! These add-ons will maximize your investment.
          </p>
        </div>
      )}

      <div className="flex justify-between mt-6">
        <Button 
          variant="outline" 
          onClick={onBack} 
          className="gap-2 text-foreground border-0 hover:text-white transition-colors custom-back-button" 
          style={{ backgroundColor: 'hsl(0deg 0% 96.86%)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        
        <Button onClick={onNext} className="gap-2 bg-black border-black text-white hover:bg-gray-800 hover:text-white">
          Payment
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};