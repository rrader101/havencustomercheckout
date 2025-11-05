import React from 'react';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Privacy = () => {
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
          <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

          <div className="space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">1. Information We Collect</h2>
              <p>
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Name and contact information</li>
                <li>Billing and shipping addresses</li>
                <li>Payment information</li>
                <li>Email communications</li>
                <li>Usage data and preferences</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">2. How We Use Your Information</h2>
              <p>
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Process your orders and payments</li>
                <li>Communicate with you about your orders</li>
                <li>Send you marketing communications (with your consent)</li>
                <li>Improve our services</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">3. Information Sharing</h2>
              <p>
                We do not sell your personal information. We share your information only with:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Service providers who assist in our operations</li>
                <li>Payment processors</li>
                <li>Shipping partners</li>
                <li>Legal authorities when required by law</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">4. Data Security</h2>
              <p>
                We implement appropriate security measures to protect your personal information. This includes encryption, secure servers, and regular security assessments.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">5. Your Rights</h2>
              <p>
                You have the right to:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your information</li>
                <li>Opt-out of marketing communications</li>
                <li>Request a copy of your data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">6. Cookies and Tracking</h2>
              <p>
                We use cookies and similar technologies to improve your experience, understand usage patterns, and deliver personalized content.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">7. Updates to Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any material changes via email or through our platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4 text-foreground">8. Contact Us</h2>
              <p>
                For questions about this Privacy Policy or our data practices, please contact us at:
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

export default Privacy;