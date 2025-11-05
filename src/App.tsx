import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { PaymentRequestProvider } from "./contexts/PaymentRequestContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { OrderConfirmed } from "./pages/OrderConfirmed";

const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Elements stripe={stripePromise}>
        <PaymentRequestProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/checkout/:dealId" element={<Index />} />
              <Route path="/order-confirmed/:orderID" element={<OrderConfirmed />} />
              <Route
                path="/terms"
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <Terms />
                  </Suspense>
                }
              />
              <Route
                path="/privacy"
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <Privacy />
                  </Suspense>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </PaymentRequestProvider>
      </Elements>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
