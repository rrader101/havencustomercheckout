import React from 'react';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'hsl(0 0% 96.86%)' }}>
      <div className="max-w-4xl mx-auto">
        <Button
          variant="outline"
          onClick={() => {
            if (window.history.length > 2) {
              navigate(-1);
            } else {
              navigate('/');
            }
          }}
          className="mb-6 gap-2 text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <Card className="p-8 border-0">
          <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

          <div className="space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">1. Introduction</h2>
              <p>
                Welcome to HAVEN. By accessing our service, you agree to these terms of service. Please read them carefully.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">2. Definitions</h2>
              <p>
                "Service" refers to the HAVEN platform and all related services.
                "User" refers to any individual or entity using our Service.
                "Content" refers to all materials and information provided through our Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">3. Use of Service</h2>
              <p>
                Our Service is provided for business and professional use. You agree to use the Service only for lawful purposes and in accordance with these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">4. Payment Terms</h2>
              <p>
                Payments are processed securely through our platform. All fees are non-refundable unless otherwise specified. We reserve the right to change our fees upon notice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">5. Intellectual Property</h2>
              <p>
                All content, features, and functionality of our Service are owned by HAVEN and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">6. Privacy</h2>
              <p>
                Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">7. Limitations of Liability</h2>
              <p>
                HAVEN shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">8. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through our Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">9. Contact Information</h2>
              <p>
                For questions about these Terms, please contact us at:
              </p>
              <p className="mt-2">
                HAVEN<br />
                33 Irving Pl, 3rd Floor<br />
                New York, NY 10003<br />
                United States
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Terms;