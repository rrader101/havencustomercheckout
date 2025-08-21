import React, { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface SuccessPopupProps {
  isVisible: boolean;
  orderId: string;
  onClose: () => void;
}

export const SuccessPopup: React.FC<SuccessPopupProps> = ({ isVisible, orderId, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 6000); // Auto-close after 6 seconds

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4 text-center">
        <div className="flex flex-col items-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500" />
          <h2 className="text-xl font-semibold text-foreground">Payment Successful!</h2>
          <p className="text-muted-foreground text-sm">
            Your order has been placed successfully.
          </p>
          <p className="text-muted-foreground text-sm">
            Order ID: <span className="font-medium text-foreground">{orderId}</span>
          </p>
          <div className="text-xs text-muted-foreground mt-4">
            Redirecting to order confirmation in a few seconds...
          </div>
        </div>
      </Card>
    </div>
  );
};