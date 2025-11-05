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
  const [currentAddonIndex, setCurrentAddonIndex] = useState(0);

  const addons = [
    {
      key: 'monthlyPlan' as keyof AddOnsData,
      title: 'Monthly Plan Upgrade',
      price: '$195/month',
      description: 'Secure consistent exposure with a full-page feature in every monthly issue (8 issues annually), plus monthly refreshed digital content across our full online network.',
      expandedDescription: 'This plan also delivers substantial savings — breaking down to less than 3¢ per reader — one of the most cost-effective ways to grow name recognition and brand awareness over time.',
      icon: TrendingUp,
      tags: ['Full-Page Feature', '8 Issues (Annual)', 'Monthly Refresh', 'Print + Digital', 'Consistent Exposure', 'Brand Recognition', 'Cost Savings', '<3¢ per Reader'],
      popular: true
    },
    {
      key: 'digitalExposure' as keyof AddOnsData,
      title: 'Enhanced Digital Exposure',
      price: '$95 one-time',
      description: 'Expand your reach with 5,000 additional targeted views across our digital platforms, connecting you directly with prospects in your market.',
      expandedDescription: 'Includes a comprehensive distribution report with impressions, audience demographics, and engagement insights — a powerful tool to share with sellers and demonstrate marketing impact.',
      icon: Zap,
      tags: ['5,000+ Targeted Views', 'Local Reach', 'Multi-Platform Exposure', 'Engagement Insights', 'Seller Reporting']
    }
  ];

  const currentAddon = addons[currentAddonIndex];
  const isLastAddon = currentAddonIndex === addons.length - 1;

  const handleAddonDecision = (accepted: boolean) => {
    onUpdate({ [currentAddon.key]: accepted });
    
    if (isLastAddon) {
      onNext();
    } else {
      setCurrentAddonIndex(prev => prev + 1);
    }
  };

  return (
    <Card className="p-6 border-0 bg-card animate-fade-in">
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-2" style={{ fontWeight: 700, fontSize: '1.4rem', letterSpacing: '-0.02rem' }}>Enhance Your Experience</h2>
        <p className="text-muted-foreground">Review each premium add-on option</p>
      </div>

      <div className="space-y-4">
        {/* Current Add-on */}
        <div className="relative p-6 rounded-lg border-2 border-primary/20 bg-card">
          {/* Popular Badge */}
          {currentAddon.popular && (
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
                  <currentAddon.icon className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{currentAddon.title}</h3>
                  <div className="text-sm text-primary font-medium">{currentAddon.price}</div>
                </div>
              </div>
              
              <div className="mb-3">
                <p className="text-muted-foreground text-sm">
                  {currentAddon.description} {currentAddon.expandedDescription}
                </p>
                
                {/* Tags - Always visible */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {currentAddon.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Buttons */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
        <Button 
          variant="outline" 
          onClick={onBack} 
          className="gap-2 text-foreground border-0 hover:text-white transition-colors custom-back-button order-1 sm:order-1" 
          style={{ backgroundColor: 'hsl(0deg 0% 96.86%)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        
        <div className="flex flex-col sm:flex-row gap-3 order-2 sm:order-2">
          <Button 
            variant="outline" 
            onClick={() => handleAddonDecision(false)} 
            className="gap-2 text-foreground border-0 hover:text-white transition-colors custom-back-button" 
            style={{ backgroundColor: 'hsl(0deg 0% 96.86%)' }}
          >
            No Thanks
          </Button>
          
          <Button onClick={() => handleAddonDecision(true)} className="gap-2 order-3">
            {isLastAddon ? 'Continue to Payment' : 'Yes, Add This'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};