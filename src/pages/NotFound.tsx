import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ 
      borderTop: '3px solid black',
      backgroundColor: 'hsl(0 0% 96.86%)'
    }}>
      <div className="text-center max-w-lg">
        <div className="mb-6">
          <Logo size="lg" className="mx-auto" />
        </div>
        <div className="space-y-4">
          <Button  variant="default" asChild className="w-full bg-black border-black text-white hover:bg-primary-hover hover:text-white">
            <a
              href="https://havenlifestyles.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Haven | Homepage
            </a>
          </Button>
          <Button variant="default" asChild className="w-full bg-black border-black text-white hover:bg-primary-hover hover:text-white">
            <a
              href="https://havenlifestyles.com/category/haven-of-the-day/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Haven of the Day
            </a>
          </Button>
          <Button variant="default" asChild className="w-full bg-black border-black text-white hover:bg-primary-hover hover:text-white">
            <a
              href="https://issuu.com/havenlifestyles/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Recent Magazines
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
