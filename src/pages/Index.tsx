import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import PaymentForm from '@/components/PaymentForm';
import NotFound from '@/pages/NotFound';

const Index = () => {
  const { dealId } = useParams<{ dealId: string }>();
  const location = useLocation();
  const [showNotFound, setShowNotFound] = useState(false);

  useEffect(() => {
    if (location.pathname === '/' && !dealId) {
      setShowNotFound(true);
    }
  }, [dealId, location.pathname]);

  if (location.pathname === '/' && !dealId) {
    return <NotFound />;
  }

  return <PaymentForm />;
};

export default Index;
