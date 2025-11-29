import React, { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { CheckCircle, Package, Mail, Calendar } from 'lucide-react';
import { usePostHog } from 'posthog-js/react';
import { CheckoutEvents, CheckoutEventProperties, getTimestamp } from '@/lib/analytics';

export const OrderConfirmed: React.FC = () => {
  const { orderID } = useParams<{ orderID: string }>();
  const [searchParams] = useSearchParams();
  const dealId = searchParams.get('dealId');
  const posthog = usePostHog();

  useEffect(() => {
    if (posthog && orderID) {
      posthog.capture(CheckoutEvents.CHECKOUT_COMPLETED, {
        order_id: orderID,
        [CheckoutEventProperties.TIMESTAMP]: getTimestamp()
      });
    }

    if (dealId) {
      const localStorageKey = `checkout_addons_${dealId}`;
      localStorage.removeItem(localStorageKey);
    }
  }, [posthog, orderID, dealId]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="bg-white p-8 rounded-lg shadow-sm">
          <div className="text-center space-y-6">
            {/* Success Icon */}
            <div className="flex justify-center">
              <CheckCircle className="w-20 h-20 text-green-500" />
            </div>
            
            {/* Main Heading */}
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">
                Order Confirmed!
              </h1>
              <p className="text-muted-foreground text-sm">
                Thank you for your purchase. Your order has been successfully placed.
              </p>
            </div>
            
            {/* Order ID */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-center space-x-2">
                <Package className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Order ID:</span>
                <span className="font-medium text-foreground">{orderID}</span>
              </div>
            </div>
            
            {/* Information Cards */}
            <div className="grid md:grid-cols-2 gap-4 mt-8">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <h3 className="font-medium text-foreground text-sm">
                      Confirmation Email
                    </h3>
                    <p className="text-muted-foreground text-xs">
                      Check your email for order details
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <div className="text-left">
                    <h3 className="font-medium text-foreground text-sm">
                      Processing Time
                    </h3>
                    <p className="text-muted-foreground text-xs">
                      We'll process your order within 1-2 business days
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Additional Information */}
            <div className="mt-8 pt-6 border-t border-border/50">
              <p className="text-muted-foreground text-xs">
                If you have any questions about your order, please contact our support team.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};