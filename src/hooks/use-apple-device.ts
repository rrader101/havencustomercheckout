import { useState, useEffect } from 'react';

export const useAppleDevice = () => {
  const [isApplePaySupported, setIsApplePaySupported] = useState(false);

  useEffect(() => {
    // Detect Apple device
    const userAgent = navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod|macintosh|mac os x/.test(userAgent);
    
    // Simpler Safari detection
    const isSafari = navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
    
    console.log('Device detection:', {
      userAgent: navigator.userAgent,
      isApple,
      isSafari,
      hasApplePaySession: 'ApplePaySession' in window
    });
    
    // For now, show Apple Pay on Safari for testing (we can make this stricter later)
    if (isApple && isSafari) {
      console.log('Apple Pay conditions met for testing');
      setIsApplePaySupported(true);
    } else {
      console.log('Apple Pay conditions not met:', { isApple, isSafari, hasApplePaySession: 'ApplePaySession' in window });
    }
    
    // Original strict logic (commented out for now)
    /*
    if (isApple && isSafari && typeof window !== 'undefined' && 'ApplePaySession' in window) {
      try {
        // Check if Apple Pay can make payments
        if (ApplePaySession.canMakePayments()) {
          console.log('Apple Pay is supported!');
          setIsApplePaySupported(true);
        } else {
          console.log('Apple Pay canMakePayments() returned false');
        }
      } catch (error) {
        // Apple Pay not available or error occurred
        console.log('Apple Pay not available:', error);
      }
    }
    */
  }, []);

  return { isApplePaySupported };
};
