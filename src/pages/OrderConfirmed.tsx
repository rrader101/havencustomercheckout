import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, HelpCircle } from 'lucide-react';
import Logo from '@/components/Logo';

export const OrderConfirmed: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-4 md:p-8 relative" style={{ 
      backgroundColor: 'hsl(0 0% 96.86%)' // #f7f7f7 converted to HSL
    }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in" style={{ marginTop: '1.2rem' }}>
          <div className="mb-6">
            <Logo size="lg" className="mx-auto" />
          </div>
        </div>

        <Card className="p-8 border-0 bg-card animate-fade-in">
          <div className="text-center space-y-6">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
            
            {/* Main Heading */}
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-foreground" style={{ fontWeight: 700, letterSpacing: '-0.02rem' }}>
                Payment Received
              </h1>
              <p className="text-muted-foreground text-base max-w-md mx-auto">
                Thank you for your purchase. Your payment has been successfully processed.
              </p>
            </div>
            
            {/* Support Information */}
            <div className="pt-6 border-t border-border/50">
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <HelpCircle className="w-5 h-5" />
                  <p className="text-sm">Have questions about your order?</p>
                </div>
                <div className="flex items-center justify-center">
                  <Button
                    variant="outline"
                    asChild
                    className="bg-white hover:bg-gray-50 border border-gray-300 text-foreground transition-colors"
                  >
                    <a
                      href="mailto:support@havenlifestyles.com"
                      className="flex items-center gap-2"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Mail className="w-4 h-4" />
                      support@havenlifestyles.com
                    </a>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-4 max-w-md mx-auto">
                  We'll get back to you as soon as possible. Please reach out if you have any questions.
                </p>
              </div>
            </div>

            {/* Back to Home Button */}
            <div className="pt-6">
              <Button
                onClick={() => navigate('/')}
                className="bg-primary hover:bg-primary-hover text-white"
              >
                Return to Home
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

