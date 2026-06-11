import { Suspense, lazy, useEffect, useMemo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useSearchParams } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { PaymentRequestProvider } from "./contexts/PaymentRequestContext";
import NotFound from "./pages/NotFound";

// Route-level code splitting: keep the heavy legacy checkout (Index ->
// PaymentForm -> PaymentSection, ~2,000 lines plus their deps) and the
// confirmation page out of the initial/critical bundle. They load on demand.
const Index = lazy(() => import("./pages/Index"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const RedesignedPaymentForm = lazy(() => import("./components/RedesignedPaymentForm"));
const OrderConfirmed = lazy(() =>
  import("./pages/OrderConfirmed").then((m) => ({ default: m.OrderConfirmed }))
);

/**
 * /checkout/:dealId — A/B test between two redesigned layouts.
 *
 * Resolution order:
 *   1. If the URL has ?layout=bundle or ?layout=carousel, that wins
 *      and the choice is persisted to localStorage.
 *   2. Else if localStorage has a previously-assigned layout, reuse it
 *      so the user sees the same variant on every reload.
 *   3. Else pick bundle or carousel 50/50, persist it, and use it.
 *
 * Escape hatch for the legacy/original checkout: ?layout=legacy renders the
 * old Index page. (Nothing else routes there anymore from /checkout/:id.)
 */
type RedesignLayout = "bundle" | "carousel";
const LAYOUT_STORAGE_KEY = "hc-checkout-layout";

const isLayout = (value: string | null): value is RedesignLayout =>
  value === "bundle" || value === "carousel";

const readStoredLayout = (): RedesignLayout | null => {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    return isLayout(value) ? value : null;
  } catch {
    // localStorage can throw in private mode / when blocked by site settings.
    return null;
  }
};

const writeStoredLayout = (layout: RedesignLayout): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, layout);
  } catch {
    // Storage unavailable — silently fall through; the user will get a new
    // random pick next visit, which is acceptable.
  }
};

const pickRandomLayout = (): RedesignLayout =>
  Math.random() < 0.5 ? "bundle" : "carousel";

function CheckoutRouter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawLayout = (searchParams.get("layout") || "").toLowerCase();

  // Resolve the layout once per URL change. useMemo prevents the random pick
  // from re-rolling on unrelated re-renders, which would otherwise hand the
  // user a different layout mid-session.
  const resolution = useMemo<{ kind: "legacy" } | { kind: "redesign"; layout: RedesignLayout }>(() => {
    if (rawLayout === "legacy") return { kind: "legacy" };

    if (isLayout(rawLayout)) {
      writeStoredLayout(rawLayout);
      return { kind: "redesign", layout: rawLayout };
    }

    const stored = readStoredLayout();
    if (stored) return { kind: "redesign", layout: stored };

    const picked = pickRandomLayout();
    writeStoredLayout(picked);
    return { kind: "redesign", layout: picked };
  }, [rawLayout]);

  // Mirror the resolved layout into the URL so the user can see (and share)
  // exactly which variant they were assigned. `replace: true` so this URL
  // rewrite doesn't add a back-button entry. The early return inside the
  // effect prevents an infinite loop once the URL already matches.
  useEffect(() => {
    if (resolution.kind !== "redesign") return;
    if (searchParams.get("layout") === resolution.layout) return;
    const next = new URLSearchParams(searchParams);
    next.set("layout", resolution.layout);
    setSearchParams(next, { replace: true });
  }, [resolution, searchParams, setSearchParams]);

  if (resolution.kind === "legacy") return <Index />;

  const { layout } = resolution;
  return (
    <Suspense fallback={<div></div>}>
      <RedesignedPaymentForm
        // RedesignedPaymentForm itself reads ?layout from the URL; this default
        // only kicks in when the URL has no layout param (the common case here).
        defaultLayout={layout}
        defaultTheme="modern"
        defaultSocialProof={layout === "carousel"}
      />
    </Suspense>
  );
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

/**
 * Stripe Elements render inside a same-origin iframe that doesn't inherit
 * fonts from the parent document. To make the card input render in DM Sans
 * (matching the other form inputs in the redesigned checkout), we have to
 * load the font *into* the iframe via Elements.options.fonts.
 */
const stripeElementsOptions = {
  fonts: [
    {
      cssSrc:
        "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500&display=swap",
    },
  ],
};

// const queryClient = new QueryClient();

const App = () => (
  // <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Elements stripe={stripePromise} options={stripeElementsOptions}>
        <PaymentRequestProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<div></div>}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/checkout/:dealId" element={<CheckoutRouter />} />
              <Route
                path="/checkout-redesign/:dealId"
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <RedesignedPaymentForm defaultLayout="bundle" defaultTheme="modern" />
                  </Suspense>
                }
              />
              <Route
                path="/checkout-redesign-2/:dealId"
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <RedesignedPaymentForm defaultLayout="carousel" defaultTheme="editorial" defaultSocialProof />
                  </Suspense>
                }
              />
              <Route
                path="/checkout-new/:dealId"
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <RedesignedPaymentForm defaultLayout="bundle" defaultTheme="modern" />
                  </Suspense>
                }
              />
              <Route
                path="/checkout-new-2/:dealId"
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <RedesignedPaymentForm defaultLayout="carousel" defaultTheme="editorial" defaultSocialProof />
                  </Suspense>
                }
              />
              <Route
                path="/express/:dealId"
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <RedesignedPaymentForm express defaultTheme="modern" />
                  </Suspense>
                }
              />
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
            </Suspense>
          </BrowserRouter>
        </PaymentRequestProvider>
      </Elements>
    </TooltipProvider>
  // </QueryClientProvider>
);

export default App;
