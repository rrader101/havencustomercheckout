import { Check } from "lucide-react";

interface FormProgressProps {
  currentStep: "shipping" | "addons" | "billing" | "payment";
}

const steps = [
  { id: "shipping", label: "Shipping", number: 1 },
  { id: "addons", label: "Customize", number: 2 },
  { id: "payment", label: "Payment", number: 3 },
];

export const FormProgress = ({ currentStep }: FormProgressProps) => {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);

  return (
    <div className="w-full max-w-xl mx-auto px-3 sm:px-4">
      <div className="flex items-center w-full">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <>
              {/* Step */}
              <div key={step.id} className="flex flex-col items-center text-center">
                <div
                  className={`
                    flex items-center justify-center
                    w-8 h-8 sm:w-10 sm:h-10
                    rounded-full border-2 transition-all duration-300
                    ${isCompleted
                      ? "bg-black border-black text-white"
                      : isCurrent
                      ? "bg-black border-black text-white"
                      : "bg-muted border-border text-muted-foreground"}
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <span className="text-xs sm:text-sm font-medium">
                      {step.number}
                    </span>
                  )}
                </div>

                <p
                  className={`mt-1 text-[10px] sm:text-xs font-medium leading-tight
                    ${isCurrent || isCompleted ? "text-black" : "text-muted-foreground"}
                  `}
                >
                  {step.label}
                </p>
              </div>

              {/* Connector (only if not last step) */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-px bg-gray-400/30 mx-1 sm:mx-2"></div>
              )}
            </>
          );
        })}
      </div>
    </div>
  );
};
