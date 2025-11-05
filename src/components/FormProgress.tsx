import { Check } from 'lucide-react';

interface FormProgressProps {
  currentStep: 'shipping' | 'addons' | 'payment';
}

const steps = [
  { id: 'shipping', label: 'Shipping', number: 1 },
  { id: 'addons', label: 'Customize', number: 2 },
  { id: 'payment', label: 'Payment', number: 3 },
];

export const FormProgress = ({ currentStep }: FormProgressProps) => {
  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.id === currentStep);
  };

  const currentIndex = getCurrentStepIndex();

  return (
    <div className="w-full max-w-xl mx-auto form-progress">
      <div className="flex items-center justify-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={step.id} className="flex items-center">
              {/* Step Circle */}
              <div className="flex flex-col items-center text-center w-24">
                <div
                  className={`
                    relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 mb-2 flex-shrink-0
                                                  ${isCompleted 
                                ? 'bg-black border-black text-white' 
                                : isCurrent 
                                ? 'bg-black border-black text-white' 
                                : 'bg-muted border-border text-muted-foreground'
                              }
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{step.number}</span>
                  )}
                </div>
                
                {/* Step Label - fixed height to ensure consistent spacing */}
                <div className="text-center h-8 flex items-center justify-center">
                                                <p className={`text-xs font-medium leading-tight ${isCurrent ? 'text-black' : isCompleted ? 'text-black' : 'text-muted-foreground'}`}>
                    {step.label}
                  </p>
                </div>
              </div>
              
              {/* Subtle connecting line (except after the last step) */}
              {index < steps.length - 1 && (
                <div className="w-12 h-px mx-2 -mt-10" style={{ backgroundColor: 'hsl(0deg 0% 39.09% / 30%)' }}></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};