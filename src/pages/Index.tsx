import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';

const Index = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(isAdmin ? '/admin' : '/dashboard');
    }
  }, [user, isAdmin, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-4 sm:space-y-6">
        <div className="flex justify-center">
          <div className="p-3 sm:p-4 bg-accent/10 rounded-full">
            <Building2 className="h-12 w-12 sm:h-16 sm:w-16 text-accent" />
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Market Reporting System</h1>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-md px-4">
          Daily reporting platform for market activities and stall management
        </p>
        <Button size="lg" onClick={() => navigate('/auth')}>
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default Index;
