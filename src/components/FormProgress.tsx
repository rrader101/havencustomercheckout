import { Check } from "lucide-react";
import { Fragment } from "react";

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
    <div className="w-full max-w-xl mx-auto form-progress">
      <div className="flex items-center justify-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <Fragment key={step.id}>
              <div className="flex items-center">
                {/* Step */}
                <div className="flex flex-col items-center text-center w-24">
                  <div
                    className={`
                      relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 mb-2 flex-shrink-0
                      ${isCompleted
                        ? "bg-black border-black text-white"
                        : isCurrent
                        ? "bg-black border-black text-white"
                        : "bg-muted border-border text-muted-foreground"}
                    `}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-medium">
                        {step.number}
                      </span>
                    )}
                  </div>

                  <div className="text-center h-8 flex items-center justify-center">
                    <p
                      className={`text-xs font-medium leading-tight
                        ${isCurrent || isCompleted ? "text-black" : "text-muted-foreground"}
                      `}
                    >
                      {step.label}
                    </p>
                  </div>
                </div>

                {/* Connector (only if not last step) */}
                {index < steps.length - 1 && (
                  <div className="w-12 h-px mx-2 -mt-10" style={{ backgroundColor: "rgba(100, 100, 100, 0.3)" }}></div>
                )}
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
};
