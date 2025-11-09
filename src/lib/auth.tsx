import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export type UserRole = 'employee' | 'admin' | 'market_manager' | 'bms_executive' | 'bdo';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, username: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  currentRole: UserRole | null;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer role fetching to avoid blocking auth state change
          setTimeout(() => {
            (supabase as any)
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .then(({ data: rolesData, error: rolesError }: any) => {
                if (rolesError) {
                  console.error('Error fetching roles:', rolesError);
                  setUserRoles(['employee']);
                  setCurrentRole('employee');
                  setIsAdmin(false);
                  return;
                }
                
                const roles = (rolesData || []).map(r => r.role as UserRole);
                setUserRoles(roles);
                
                const isAdminUser = roles.includes('admin');
                setIsAdmin(isAdminUser);
                
                if (roles.includes('admin')) {
                  setCurrentRole('admin');
                } else if (roles.includes('bdo')) {
                  setCurrentRole('bdo');
                } else if (roles.includes('bms_executive')) {
                  setCurrentRole('bms_executive');
                } else if (roles.includes('market_manager')) {
                  setCurrentRole('market_manager');
                } else if (roles.includes('employee')) {
                  setCurrentRole('employee');
                } else {
                  setCurrentRole('employee');
                  setUserRoles(['employee']);
                }
              })
              .catch((error: any) => {
                console.error('Error setting up user roles:', error);
                setCurrentRole('employee');
                setUserRoles(['employee']);
                setIsAdmin(false);
              });
          }, 0);
        } else {
          setIsAdmin(false);
          setCurrentRole(null);
          setUserRoles([]);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session }, error: sessionError }) => {
      console.log('Getting session:', { hasSession: !!session, error: sessionError });
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        try {
          console.log('Fetching roles for user:', session.user.id);
          // Fetch user roles
          const { data: rolesData, error: rolesError } = await (supabase as any)
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id);
          
          if (rolesError) {
            console.error('Error fetching roles:', rolesError);
            // Continue with default employee role on error
            setUserRoles(['employee']);
            setCurrentRole('employee');
            setIsAdmin(false);
            console.log('Using default employee role due to error');
            setLoading(false);
            return;
          }
          
          console.log('Roles fetched:', rolesData);
          const roles = (rolesData || []).map(r => r.role as UserRole);
          setUserRoles(roles);
          
          // Check for admin role
          const isAdminUser = roles.includes('admin');
          setIsAdmin(isAdminUser);
          
          // Set current role (priority: admin > bdo > bms_executive > market_manager > employee)
          if (roles.includes('admin')) {
            setCurrentRole('admin');
            console.log('Role set to: admin');
          } else if (roles.includes('bdo')) {
            setCurrentRole('bdo');
            console.log('Role set to: bdo');
          } else if (roles.includes('bms_executive')) {
            setCurrentRole('bms_executive');
            console.log('Role set to: bms_executive');
          } else if (roles.includes('market_manager')) {
            setCurrentRole('market_manager');
            console.log('Role set to: market_manager');
          } else if (roles.includes('employee')) {
            setCurrentRole('employee');
            console.log('Role set to: employee');
          } else {
            // Default to employee if no role found
            setCurrentRole('employee');
            setUserRoles(['employee']);
            console.log('No roles found, defaulting to employee');
          }
        } catch (error) {
          console.error('Error setting up user roles:', error);
          setCurrentRole('employee');
          setUserRoles(['employee']);
          setIsAdmin(false);
        }
      } else {
        console.log('No session found, clearing user state');
        setIsAdmin(false);
        setCurrentRole(null);
        setUserRoles([]);
      }
      
      console.log('Setting loading to false in auth context');
      setLoading(false);
    }).catch((error) => {
      console.error('Unhandled error in getSession:', error);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      // Verify Supabase is configured
      if (!supabase) {
        return { error: { message: 'Authentication service is not configured. Please contact administrator.' } };
      }
      
      const trimmedUsername = username.trim();
      
      // If username looks like an email, try direct auth first (fastest path)
      if (trimmedUsername.includes('@')) {
        // Check if Supabase client is configured
        if (!supabase || !supabase.auth) {
          return { error: { message: 'Authentication service is not available. Please check configuration.' } };
        }
        
        try {
          // Call Supabase auth with a timeout wrapper
          const authResponse = await Promise.race([
            supabase.auth.signInWithPassword({
              email: trimmedUsername,
              password,
            }),
            new Promise<{ error: { message: string } }>((_, reject) => {
              setTimeout(() => {
                reject({ error: { message: 'Login request timed out. Please check your internet connection and try again.' } });
              }, 15000);
            })
          ]);
          
          if (authResponse.error) {
            return { error: { message: authResponse.error.message || 'Invalid username or password.' } };
          }
          
          const response: any = authResponse;
          if (!response.data || !response.data.user) {
            return { error: { message: 'Authentication failed. Please try again.' } };
          }
          
          return { error: null };
        } catch (error: any) {
          // Handle timeout or other errors
          if (error?.error?.message) {
            return { error: { message: error.error.message } };
          }
          
          if (error?.message) {
            return { error: { message: error.message } };
          }
          
          return { error: { message: 'Authentication failed. Please try again.' } };
        }
      }
      
        // For non-email usernames, try RPC function first (with quick timeout)
        let employee: { id: string; email: string; status: string; username: string } | null = null;
        
        let employeeData: any = null;
        let rpcError: any = null;
        
        try {
          // Quick timeout for RPC (3 seconds)
          const rpcResult = await Promise.race([
            (supabase as any).rpc('get_employee_by_username', { _username: trimmedUsername }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('RPC timeout')), 3000)
            )
          ]) as any;
          
          if (rpcResult && rpcResult.data !== undefined) {
            employeeData = rpcResult.data;
            rpcError = rpcResult.error;
          }
        } catch (error: any) {
          rpcError = error;
        }
        
        if (!rpcError && employeeData && employeeData.length > 0) {
          employee = employeeData[0] as any;
        } else {
          // Try direct query as fallback
          const { data: employeeQuery, error: queryError } = await (supabase as any)
            .from('employees')
            .select('id, email, status, username')
            .eq('username', trimmedUsername)
            .maybeSingle();
          
          if (queryError) {
            // If column doesn't exist or RLS blocks it, return error
            if (queryError.code === '42703' || queryError.message?.includes('does not exist')) {
              return { 
                error: { 
                  message: 'Database migration required. Please contact administrator.' 
                } 
              };
            }
            
            if (queryError.code === '42501' || queryError.message?.includes('policy')) {
              return { 
                error: { 
                  message: 'Authentication error. Please contact administrator.' 
                } 
              };
            }
            
            return { error: { message: 'Invalid username or password.' } };
          }
          
          employee = employeeQuery;
        }
        
        if (!employee) {
          return { error: { message: 'Invalid username or password.' } };
        }
        
        // Check if account is active
        if (employee.status !== 'active') {
          return { error: { message: 'Account is inactive. Please contact administrator.' } };
        }
        
        // Now sign in with email (stored in employees table)
        const { data, error } = await supabase.auth.signInWithPassword({
          email: employee.email,
          password,
        });
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            return { error: { message: 'Invalid username or password.' } };
          }
          return { error: { message: error.message || 'Invalid username or password.' } };
        }
        
        return { error: null };
      } catch (error: any) {
        return { error: { message: error.message || 'An unexpected error occurred. Please try again.' } };
      }
    };

  const signUp = async (email: string, password: string, fullName: string, username: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          username: username,
        },
      },
    });
    return { error };
  };

  const hasRole = (role: UserRole): boolean => {
    return userRoles.includes(role);
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error (ignoring):', error);
      // Ignore errors - clear local state anyway
    }
    // Force clear local state
    setUser(null);
    setSession(null);
    setUserRoles([]);
    setCurrentRole(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, isAdmin, currentRole, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
