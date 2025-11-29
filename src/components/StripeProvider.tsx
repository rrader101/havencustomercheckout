import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useMemo, PropsWithChildren } from "react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

export default function StripeProvider({ children }: PropsWithChildren) {
  const options = useMemo(
    () => ({
      fonts: [
        {
          cssSrc:
            "https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap",
        },
       
      ],
      appearance: {
        variables: {
          fontFamily: '"Poppins", sans-serif',
          fontSizeBase: "14px",
        },
      },
    }),
    []
  );

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
}
