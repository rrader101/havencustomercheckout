import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Star, TrendingUp, Zap, ChevronDown, ChevronUp } from 'lucide-react';

interface AddOnsData {
  monthlyPlan: boolean;
  digitalExposure: boolean;
}

interface AddOnsSectionProps {
  data: AddOnsData;
  onUpdate: (data: Partial<AddOnsData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const AddOnsSection = ({ data, onUpdate, onNext, onBack }: AddOnsSectionProps) => {
  const [expandedDescriptions, setExpandedDescriptions] = useState<{
    monthlyPlan: boolean;
    digitalExposure: boolean;
  }>({
    monthlyPlan: false,
    digitalExposure: false
  });

  const toggleAddon = (addon: keyof AddOnsData) => {
    onUpdate({ [addon]: !data[addon] });
  };

  const toggleDescription = (addon: keyof AddOnsData, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the addon selection
    setExpandedDescriptions(prev => ({
      ...prev,
      [addon]: !prev[addon]
    }));
  };

  return (
            <Card className="p-6 border-0 bg-card animate-fade-in">
              <div className="mb-10">
                            <h2 className="text-xl font-semibold mb-2" style={{ fontWeight: 700, fontSize: '1.4rem', letterSpacing: '-0.02rem' }}>Enhance Your Experience</h2>
          <p className="text-muted-foreground">Select premium add-ons to maximize your investment</p>
        </div>

      <div className="space-y-4">
        {/* Monthly Plan Add-on */}
        <div 
          className={`
            relative p-6 rounded-lg border-2 cursor-pointer transition-all duration-300 group
            ${data.monthlyPlan 
              ? 'border-primary bg-gradient-accent' 
              : 'border-primary/20 bg-card hover:border-primary/50'
            }
          `}
          onClick={() => toggleAddon('monthlyPlan')}
        >
          {/* Popular Badge */}
          <div className="absolute -top-3 left-6">
            <span className="bg-foreground text-background px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              <Star className="w-3 h-3" />
              Most Popular
            </span>
          </div>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-white border border-foreground">
                  <TrendingUp className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Monthly Plan Upgrade</h3>
                  <div className="text-sm text-primary font-medium">$195/month</div>
                </div>
              </div>
              
              <div className="mb-3">
                <p className="text-muted-foreground text-sm">
                  Secure consistent exposure with a full-page feature in every monthly issue (8 issues annually), plus monthly refreshed digital content across our full online network.
                  {expandedDescriptions.monthlyPlan && (
                    <span> This plan also delivers substantial savings — breaking down to less than 3¢ per reader — one of the most cost-effective ways to grow name recognition and brand awareness over time.</span>
                  )}
                  {!expandedDescriptions.monthlyPlan && (
                    <span> <button
                      onClick={(e) => toggleDescription('monthlyPlan', e)}
                      className="text-muted-foreground text-xs font-medium hover:text-muted-foreground/80 transition-colors flex items-center gap-1 inline-flex"
                    >
                      SEE MORE <ChevronDown className="w-3 h-3" />
                    </button></span>
                  )}
                  {expandedDescriptions.monthlyPlan && (
                    <span> <button
                      onClick={(e) => toggleDescription('monthlyPlan', e)}
                      className="text-muted-foreground text-xs font-medium hover:text-muted-foreground/80 transition-colors flex items-center gap-1 inline-flex"
                    >
                      SEE LESS <ChevronUp className="w-3 h-3" />
                    </button></span>
                  )}
                </p>
                
                {/* Tags - Only show when expanded */}
                {expandedDescriptions.monthlyPlan && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">Full-Page Feature</span>
                    <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">8 Issues (Annual)</span>
                    <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">Monthly Refresh</span>
                    <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">Print + Digital</span>
                    <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">Consistent Exposure</span>
                    <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">Brand Recognition</span>
                    <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">Cost Savings</span>
                    <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">&lt;3¢ per Reader</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Selection Indicator */}
          <div className={`
            absolute top-4 right-4 w-6 h-6 rounded-full border-2 transition-all duration-200
            ${data.monthlyPlan 
              ? 'bg-primary border-primary' 
              : 'border-primary/20 group-hover:border-primary'
            }
          `}>
            {data.monthlyPlan && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            )}
          </div>
        </div>

        {/* Digital Exposure Add-on */}
        <div 
          className={`
            relative p-6 rounded-lg border-2 cursor-pointer transition-all duration-300 group
            ${data.digitalExposure 
              ? 'border-primary bg-gradient-accent' 
              : 'border-primary/20 bg-card hover:border-primary/50'
            }
          `}
          onClick={() => toggleAddon('digitalExposure')}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-white border border-foreground">
                  <Zap className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Enhanced Digital Exposure</h3>
                  <div className="text-sm text-primary font-medium">$95 one-time</div>
                </div>
              </div>
              
              <div className="mb-3">
                <p className="text-muted-foreground text-sm">
                  Expand your reach with 5,000 additional targeted views across our digital platforms, connecting you directly with prospects in your market.
                  {expandedDescriptions.digitalExposure && (
                    <span> Includes a comprehensive distribution report with impressions, audience demographics, and engagement insights — a powerful tool to share with sellers and demonstrate marketing impact.</span>
                  )}
                  {!expandedDescriptions.digitalExposure && (
                    <span> <button
                      onClick={(e) => toggleDescription('digitalExposure', e)}
                      className="text-muted-foreground text-xs font-medium hover:text-muted-foreground/80 transition-colors flex items-center gap-1 inline-flex"
                    >
                      SEE MORE <ChevronDown className="w-3 h-3" />
                    </button></span>
                  )}
                  {expandedDescriptions.digitalExposure && (
                    <span> <button
                      onClick={(e) => toggleDescription('digitalExposure', e)}
                      className="text-muted-foreground text-xs font-medium hover:text-muted-foreground/80 transition-colors flex items-center gap-1 inline-flex"
                    >
                      SEE LESS <ChevronUp className="w-3 h-3" />
                    </button></span>
                  )}
                </p>
              </div>
              
              {/* Tags - Only show when expanded */}
              {expandedDescriptions.digitalExposure && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">5,000+ Targeted Views</span>
                  <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">Local Reach</span>
                  <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">Multi-Platform Exposure</span>
                  <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">Engagement Insights</span>
                  <span className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">Seller Reporting</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Selection Indicator */}
          <div className={`
            absolute top-4 right-4 w-6 h-6 rounded-full border-2 transition-all duration-200
            ${data.digitalExposure 
              ? 'bg-primary border-primary' 
              : 'border-primary/20 group-hover:border-primary'
            }
          `}>
            {data.digitalExposure && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Value Proposition */}
      {data.monthlyPlan && (
        <div className="mt-6 p-4 bg-gradient-accent rounded-lg border border-primary/20 animate-slide-in">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Star className="w-4 h-4" />
            <span className="font-medium">Major Savings</span>
          </div>
          <p className="text-sm text-muted-foreground">
            A full-page every month plus digital reach, all at less than 3¢ per reader.
          </p>
        </div>
      )}
      
      {data.digitalExposure && !data.monthlyPlan && (
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
        
        <Button onClick={onNext} className="gap-2">
          {data.monthlyPlan || data.digitalExposure ? (
            <>
              Payment
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            'No thanks'
          )}
        </Button>
      </div>
    </Card>
  );
};