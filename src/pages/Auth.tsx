import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp, user, currentRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in based on role
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      console.log('Auth still loading...');
      return;
    }

    console.log('Auth loaded - User:', user?.email, 'Role:', currentRole);

    if (user && currentRole) {
      // Redirect based on role
      console.log('Redirecting user with role:', currentRole);
      if (currentRole === 'admin') {
        navigate('/admin');
      } else if (currentRole === 'market_manager') {
        navigate('/manager-dashboard');
      } else if (currentRole === 'bdo') {
        navigate('/bdo-dashboard');
      } else {
        // employee, bms_executive, or other roles
        navigate('/dashboard');
      }
    } else if (user) {
      // User exists but no role yet - give it a moment
      console.log('User exists but waiting for role to load...');
    }
  }, [user, currentRole, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
      try {
        if (isLogin) {
          if (!username.trim()) {
            toast.error('Please enter your username');
            setSubmitting(false);
            return;
          }
          
          if (!password.trim()) {
            toast.error('Please enter your password');
            setSubmitting(false);
            return;
          }
          
          try {
            const result = await signIn(username, password);
            
            if (result.error) {
              toast.error(result.error.message || 'Login failed');
            } else {
              toast.success('Logged in successfully');
              // Wait a moment for role to load, then redirect manually
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 500);
            }
          } catch (error: any) {
            toast.error(error.message || 'An error occurred during login. Please try again.');
          }
      } else {
        if (!fullName.trim() || !username.trim()) {
          toast.error('Please fill in all required fields');
          setSubmitting(false);
          return;
        }
        const { error } = await signUp(email, password, fullName, username);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Account created successfully! You can now log in.');
          setIsLogin(true);
          setUsername('');
          setEmail('');
          setPassword('');
          setFullName('');
        }
        }
      } catch (error: any) {
        toast.error(error.message || 'An error occurred. Please try again.');
      } finally {
        setSubmitting(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-accent/10 rounded-full">
              <Building2 className="h-8 w-8 text-accent" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? 'Enter your credentials to access your dashboard'
              : 'Register to start reporting your market activities'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required={!isLogin}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              </>
            )}
            {isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-accent hover:underline"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
