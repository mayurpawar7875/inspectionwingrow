import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { NotificationBell } from '@/components/NotificationBell';
import {
  LogOut,
  Clock,
  MapPin,
  Calendar,
  CheckCircle,
  AlertCircle,
  Users,
  Camera,
  FileText,
  MessageSquare,
  ClipboardCheck,
  ExternalLink,
  Umbrella,
  History,
  Upload,
  Video,
  ImageIcon,
  Sparkles,
  Package,
  CalendarCheck,
} from 'lucide-react';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Textarea } from '@/components/ui/textarea';
// import { Input } from '@/components/ui/input';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TodaysOffersForm = lazy(() => import('@/components/TodaysOffersForm'));
const NonAvailableCommoditiesForm = lazy(() => import('@/components/NonAvailableCommoditiesForm'));
const OrganiserFeedbackForm = lazy(() => import('@/components/OrganiserFeedbackForm'));
const StallInspectionForm = lazy(() => import('@/components/StallInspectionForm'));
const NextDayPlanningForm = lazy(() => import('@/components/NextDayPlanningForm'));

interface Session {
  id: string;
  session_date: string;
  market_date: string | null;
  punch_in_time: string | null;
  punch_out_time: string | null;
  status: 'active' | 'completed' | 'finalized' | 'locked';
  market_id: string;
  market: { name: string; location: string };
  media: any[];
}

interface SessionSummary {
  stalls_count: number;
  media_count: number;
  late_uploads_count: number;
  first_activity_at: string | null;
  last_activity_at: string | null;
  finalized_at: string;
}

export default function Dashboard() {
  const { user, signOut, currentRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [todaySession, setTodaySession] = useState<Session | null>(null);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewDialog, setViewDialog] = useState<'stalls' | 'media' | 'late' | null>(null);
  const [dialogData, setDialogData] = useState<any[]>([]);
  const [offersDialog, setOffersDialog] = useState(false);
  const [commoditiesDialog, setCommoditiesDialog] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [inspectionDialog, setInspectionDialog] = useState(false);
  const [planningDialog, setPlanningDialog] = useState(false);
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [leaveDate, setLeaveDate] = useState<string>('');
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [stallsCount, setStallsCount] = useState<number>(0);
  const [collectionSheetUrl, setCollectionSheetUrl] = useState<string | null>(null);

  useEffect(() => {
    console.log('Dashboard useEffect:', { authLoading, currentRole, user: !!user });
    
    // Wait for auth to finish loading before checking roles
    if (authLoading) {
      console.log('Auth still loading, waiting...');
      return;
    }

    // If no user after auth loads, redirect to login
    if (!user) {
      console.log('No user found, redirecting to auth');
      navigate('/auth');
      setLoading(false);
      return;
    }

    console.log('User found, checking role:', currentRole);

    // Redirect based on role only if role is determined
    if (currentRole === 'admin') {
      console.log('Redirecting to admin dashboard');
      navigate('/admin');
      return;
    }
    if (currentRole === 'market_manager') {
      console.log('Redirecting to market manager dashboard');
      navigate('/manager-dashboard');
      return;
    }
    if (currentRole === 'bdo') {
      console.log('Redirecting to BDO dashboard');
      navigate('/bdo-dashboard');
      return;
    }
    
    // Only fetch if we're staying on employee dashboard and user is available
    if (currentRole === 'employee' || currentRole === 'bms_executive' || !currentRole) {
      console.log('Fetching employee dashboard data');
      fetchTodaySession();
      fetchCollectionSheetUrl();
    } else {
      console.log('Unknown role or no role, setting loading to false');
      setLoading(false);
    }

    // Subscribe to notifications for this user and broadcasts
    if (user) {
      const channel = supabase
        .channel(`notifications-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `target_user_id=eq.${user.id}`,
        }, (payload: any) => {
          const n = payload.new as { title: string; body: string };
          toast(n.title, { description: n.body });
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: 'target_user_id=is.null',
        }, (payload: any) => {
          const n = payload.new as { title: string; body: string };
          toast(n.title, { description: n.body });
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, authLoading, currentRole, navigate]);

  const fetchCollectionSheetUrl = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('collection_sheet_url')
        .single();
      
      if (error) throw error;
      setCollectionSheetUrl(data?.collection_sheet_url || null);
    } catch (error) {
      console.error('Error fetching collection sheet URL:', error);
    }
  };

  const handleOpenCollectionSheet = () => {
    navigate('/collections');
  };

  const fetchTodaySession = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Use IST date for session validation
      const today = getISTDateString(new Date());
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          market:markets(*),
          media(*)
        `)
        .eq('user_id', user.id)
        .eq('session_date', today)
        .maybeSingle();

      if (error) {
        console.error('Error fetching session:', error);
        throw error;
      }
      setTodaySession(data);
      
      // Also compute stalls count from stall_confirmations using IST date to match triggers
      if (data) {
        const dateStr = getISTDateString(new Date());
        const { count, error: countError } = await supabase
          .from('stall_confirmations')
          .select('*', { count: 'exact', head: true })
          .eq('market_id', data.market_id)
          .eq('market_date', dateStr);
        
        if (countError) {
          console.error('Error fetching stalls count:', countError);
        } else {
          setStallsCount(count || 0);
        }
      } else {
        setStallsCount(0);
      }
      
      // If session is completed, fetch summary
      if (data && (data.status === 'completed' || data.status === 'finalized')) {
        const { data: summary, error: summaryError } = await supabase
          .from('session_summaries')
          .select('*')
          .eq('session_id', data.id)
          .maybeSingle();
        
        if (summaryError) {
          console.error('Error fetching session summary:', summaryError);
        } else {
          setSessionSummary(summary);
        }
      }
    } catch (error: any) {
      console.error('Error fetching session:', error);
      toast.error('Failed to load session data');
    } finally {
      setLoading(false);
    }
  };

  const getISTDateString = (date: Date) => {
    const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleViewDetails = async (type: 'stalls' | 'media' | 'late') => {
    if (!todaySession) return;
    
    try {
      if (type === 'stalls') {
        const dateStr = getISTDateString(new Date());
        const { data, error } = await supabase
          .from('stall_confirmations')
          .select('id, stall_no, stall_name, farmer_name, created_at')
          .eq('market_id', todaySession.market_id)
          .eq('market_date', dateStr)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setDialogData(data || []);
      } else if (type === 'media' || type === 'late') {
        const query = supabase
          .from('media')
          .select('*')
          .eq('session_id', todaySession.id)
          .order('captured_at', { ascending: false });
        
        if (type === 'late') {
          query.eq('is_late', true);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        setDialogData(data || []);
      }
      
      setViewDialog(type);
    } catch (error) {
      console.error('Error fetching details:', error);
      toast.error('Failed to load details');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-info text-info-foreground',
      completed: 'bg-success text-success-foreground',
      finalized: 'bg-success text-success-foreground',
      locked: 'bg-muted text-muted-foreground',
    };

    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render if we're redirecting to another dashboard
  if (currentRole === 'admin' || currentRole === 'market_manager' || currentRole === 'bdo') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-2 mb-2 sm:mb-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-sm sm:text-2xl font-bold text-foreground">Employee Dashboard</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
            <div className="flex gap-1 sm:gap-2 flex-shrink-0">
              <NotificationBell />
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
          <TooltipProvider>
            <div className="flex gap-1 sm:gap-2 mt-2 sm:mt-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => navigate('/my-sessions')}>
                    <History className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">My Sessions</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>My Sessions</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => setLeaveDialog(true)}>
                    <Umbrella className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Request Leave</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Request Leave</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => navigate('/asset-requests')}>
                    <Package className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Assets</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Request Assets</p>
                </TooltipContent>
              </Tooltip>
              
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => navigate('/install')}>
                Install App
              </Button>
            </div>
          </TooltipProvider>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        {!todaySession ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Start Your Daily Report</CardTitle>
                <CardDescription>
                  You haven't started a reporting session for today. Click below to begin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/market-selection')} size="lg">
                  <MapPin className="mr-2 h-5 w-5" />
                  Start New Session
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  View Your Session History
                </CardTitle>
                <CardDescription>
                  See all the markets you've attended and track your past sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/my-sessions')} variant="outline" size="lg">
                  <History className="mr-2 h-5 w-5" />
                  View Session History
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Session Info */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl">Today's Session</CardTitle>
                    <CardDescription className="mt-1.5 sm:mt-2 text-xs sm:text-sm break-words">
                      <span className="font-medium">{todaySession.market.name}</span>
                      <span className="mx-1">-</span>
                      <a 
                        href={todaySession.market.location} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <MapPin className="h-3 w-3 inline" />
                        <span className="break-all">View Location</span>
                      </a>
                    </CardDescription>
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(todaySession.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">Punch In</p>
                      <p className="font-medium text-sm sm:text-base break-words">
                        {todaySession.punch_in_time
                          ? new Date(todaySession.punch_in_time).toLocaleTimeString()
                          : 'Not recorded'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">Punch Out</p>
                      <p className="font-medium text-sm sm:text-base break-words">
                        {todaySession.punch_out_time
                          ? new Date(todaySession.punch_out_time).toLocaleTimeString()
                          : 'Not recorded'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">Date</p>
                      <p className="font-medium text-sm sm:text-base break-words">
                        {new Date(todaySession.session_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Cards - Show until punch out */}
            {!todaySession.punch_out_time && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {/* Punch In */}
                {!todaySession.punch_in_time && (
                  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/punch')}>
                    <CardHeader className="p-3 sm:p-4">
                      <Clock className="h-6 w-6 sm:h-7 sm:w-7 text-accent mb-1" />
                      <CardTitle className="text-sm sm:text-base">Punch In</CardTitle>
                      <CardDescription className="text-xs">Record arrival</CardDescription>
                    </CardHeader>
                  </Card>
                )}

                {/* Stall Confirmations */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/stalls')}>
                  <CardHeader className="p-3 sm:p-4">
                    <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-accent mb-1" />
                    <CardTitle className="text-sm sm:text-base">Stalls</CardTitle>
                    <CardDescription className="text-xs">
                      {stallsCount} added
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Outside Market Rates */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/media-upload?type=outside_rates')}>
                  <CardHeader className="p-3 sm:p-4">
                    <Upload className="h-6 w-6 sm:h-7 sm:w-7 text-accent mb-1" />
                    <CardTitle className="text-sm sm:text-base">Outside Rates</CardTitle>
                    <CardDescription className="text-xs">Upload media</CardDescription>
                  </CardHeader>
                </Card>

                {/* Rate Board Photo */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/media-upload?type=rate_board')}>
                  <CardHeader className="p-3 sm:p-4">
                    <ImageIcon className="h-6 w-6 sm:h-7 sm:w-7 text-accent mb-1" />
                    <CardTitle className="text-sm sm:text-base">Rate Board</CardTitle>
                    <CardDescription className="text-xs">Photo upload</CardDescription>
                  </CardHeader>
                </Card>

                {/* Market Video */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/media-upload?type=market_video')}>
                  <CardHeader className="p-3 sm:p-4">
                    <Video className="h-6 w-6 sm:h-7 sm:w-7 text-accent mb-1" />
                    <CardTitle className="text-sm sm:text-base">Market Video</CardTitle>
                    <CardDescription className="text-xs">Pan video</CardDescription>
                  </CardHeader>
                </Card>

                {/* Cleaning Video */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/media-upload?type=cleaning_video')}>
                  <CardHeader className="p-3 sm:p-4">
                    <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-accent mb-1" />
                    <CardTitle className="text-sm sm:text-base">Cleaning</CardTitle>
                    <CardDescription className="text-xs">Video upload</CardDescription>
                  </CardHeader>
                </Card>

                {/* Customer Feedback */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/media-upload?type=customer_feedback')}>
                  <CardHeader className="p-3 sm:p-4">
                    <MessageSquare className="h-6 w-6 sm:h-7 sm:w-7 text-accent mb-1" />
                    <CardTitle className="text-sm sm:text-base">Feedback</CardTitle>
                    <CardDescription className="text-xs">Customer video</CardDescription>
                  </CardHeader>
                </Card>

                {/* Today's Offers */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setOffersDialog(true)}>
                  <CardHeader className="p-3 sm:p-4">
                    <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-accent mb-1" />
                    <CardTitle className="text-sm sm:text-base">Today's Offers</CardTitle>
                    <CardDescription className="text-xs">Add pricing</CardDescription>
                  </CardHeader>
                </Card>

                {/* Non-Available Commodities */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCommoditiesDialog(true)}>
                  <CardHeader className="p-3 sm:p-4">
                    <AlertCircle className="h-6 w-6 sm:h-7 sm:w-7 text-accent mb-1" />
                    <CardTitle className="text-sm sm:text-base">Non-Available</CardTitle>
                    <CardDescription className="text-xs">Report items</CardDescription>
                  </CardHeader>
                </Card>

                {/* Organiser Feedback */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFeedbackDialog(true)}>
                  <CardHeader className="p-3 sm:p-4">
                    <MessageSquare className="h-6 w-6 sm:h-7 sm:w-7 text-accent mb-1" />
                    <CardTitle className="text-sm sm:text-base">My Feedback</CardTitle>
                    <CardDescription className="text-xs">Share thoughts</CardDescription>
                  </CardHeader>
                </Card>

                {/* Stall Inspection */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setInspectionDialog(true)}>
                  <CardHeader className="p-3 sm:p-4">
                    <ClipboardCheck className="h-6 w-6 sm:h-7 sm:w-7 text-accent mb-1" />
                    <CardTitle className="text-sm sm:text-base">Inspection</CardTitle>
                    <CardDescription className="text-xs">Stall check</CardDescription>
                  </CardHeader>
                </Card>

                {/* Next Day Planning */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setPlanningDialog(true)}>
                  <CardHeader className="p-3 sm:p-4">
                    <Calendar className="h-6 w-6 sm:h-7 sm:w-7 text-accent mb-1" />
                    <CardTitle className="text-sm sm:text-base">Planning</CardTitle>
                    <CardDescription className="text-xs">Next day</CardDescription>
                  </CardHeader>
                </Card>

                {/* Collection Sheet */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleOpenCollectionSheet}>
                  <CardHeader className="p-3 sm:p-4">
                    <ExternalLink className="h-6 w-6 sm:h-7 sm:w-7 text-accent mb-1" />
                    <CardTitle className="text-sm sm:text-base">Collections</CardTitle>
                    <CardDescription className="text-xs">Record daily</CardDescription>
                  </CardHeader>
                </Card>

                {/* My Attendance */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/my-attendance')}>
                  <CardHeader className="p-3 sm:p-4">
                    <CalendarCheck className="h-6 w-6 sm:h-7 sm:w-7 text-accent mb-1" />
                    <CardTitle className="text-sm sm:text-base">Attendance</CardTitle>
                    <CardDescription className="text-xs">View records</CardDescription>
                  </CardHeader>
                </Card>

                {/* Punch Out - Show at bottom after punch in */}
                {todaySession.punch_in_time && !todaySession.punch_out_time && (
                  <Card 
                    className="cursor-pointer hover:shadow-md transition-shadow" 
                    onClick={async () => {
                      if (!todaySession) return;
                      
                      // Get GPS location
                      navigator.geolocation.getCurrentPosition(
                        async (position) => {
                          const { latitude, longitude } = position.coords;
                          
                          try {
                            // Update session with punch out time
                            const { error: sessionError } = await supabase
                              .from('sessions')
                              .update({ 
                                punch_out_time: new Date().toISOString(),
                                status: 'completed'
                              })
                              .eq('id', todaySession.id);

                            if (sessionError) throw sessionError;

                            toast.success('Punched out successfully! Session completed.');
                            
                            // Refresh the session data
                            fetchTodaySession();
                          } catch (error: any) {
                            console.error('Punch out error:', error);
                            toast.error('Failed to punch out: ' + error.message);
                          }
                        },
                        (error) => {
                          toast.error('Failed to get GPS location. Please enable location services.');
                        },
                        { enableHighAccuracy: true, timeout: 10000 }
                      );
                    }}
                  >
                    <CardHeader className="p-3 sm:p-4">
                      <LogOut className="h-6 w-6 sm:h-7 sm:w-7 text-accent mb-1" />
                      <CardTitle className="text-sm sm:text-base">Punch Out</CardTitle>
                      <CardDescription className="text-xs">Record departure</CardDescription>
                    </CardHeader>
                  </Card>
                )}
              </div>
            )}

            {/* Session Summary - Show after completion */}
            {(todaySession.status === 'completed' || todaySession.status === 'finalized') && sessionSummary && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <CardTitle>Session Summary</CardTitle>
                  </div>
                  <CardDescription>Your session has been completed and finalized</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div 
                      className="p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleViewDetails('stalls')}
                    >
                      <p className="text-sm text-muted-foreground">Stalls Confirmed</p>
                      <p className="text-2xl font-bold">{sessionSummary.stalls_count}</p>
                    </div>
                    <div 
                      className="p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleViewDetails('media')}
                    >
                      <p className="text-sm text-muted-foreground">Media Uploaded</p>
                      <p className="text-2xl font-bold">{sessionSummary.media_count}</p>
                    </div>
                    <div 
                      className="p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleViewDetails('late')}
                    >
                      <p className="text-sm text-muted-foreground">Late Uploads</p>
                      <p className="text-2xl font-bold text-warning">{sessionSummary.late_uploads_count}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Finalized At</p>
                      <p className="text-sm font-semibold">
                        {new Date(sessionSummary.finalized_at).toLocaleTimeString('en-IN', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          timeZone: 'Asia/Kolkata'
                        })} IST
                      </p>
                    </div>
                  </div>
                  {sessionSummary.first_activity_at && sessionSummary.last_activity_at && (
                    <div className="mt-4 p-3 bg-info/10 rounded-lg">
                      <p className="text-sm">
                        <strong>Activity Period:</strong> {new Date(sessionSummary.first_activity_at).toLocaleTimeString('en-IN')} - {new Date(sessionSummary.last_activity_at).toLocaleTimeString('en-IN')} IST
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            {todaySession.status === 'active' && (
              <Card className="border-info">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-info" />
                    <CardTitle>Instructions</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>• All tasks are saved automatically in real-time</p>
                  <p>• Your session will be finalized when you Punch Out</p>
                  <p>• Remember to Punch Out at the end of your shift</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* Today's Offers Dialog */}
      <Dialog open={offersDialog} onOpenChange={setOffersDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Today's Offers</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading form...</div>}>
            {todaySession && (
              <TodaysOffersForm
                sessionId={todaySession.id}
                marketId={todaySession.market_id}
                marketDate={todaySession.market_date || todaySession.session_date}
                userId={user!.id}
                onSuccess={() => {
                  fetchTodaySession();
                  setOffersDialog(false);
                }}
              />
            )}
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Non-Available Commodities Dialog */}
      <Dialog open={commoditiesDialog} onOpenChange={setCommoditiesDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Non-Available Commodities</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading form...</div>}>
            {todaySession && (
              <NonAvailableCommoditiesForm
                sessionId={todaySession.id}
                marketId={todaySession.market_id}
                marketDate={todaySession.market_date || todaySession.session_date}
                userId={user!.id}
                onSuccess={() => {
                  fetchTodaySession();
                  setCommoditiesDialog(false);
                }}
              />
            )}
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Organiser Feedback Dialog */}
      <Dialog open={feedbackDialog} onOpenChange={setFeedbackDialog}>
        <DialogContent className="w-screen h-screen max-w-full max-h-full overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Organiser Feedback & Difficulties</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading form...</div>}>
            {todaySession && (
              <OrganiserFeedbackForm
                sessionId={todaySession.id}
                marketId={todaySession.market_id}
                marketDate={todaySession.market_date || todaySession.session_date}
                userId={user!.id}
                onSuccess={() => {
                  fetchTodaySession();
                  setFeedbackDialog(false);
                }}
              />
            )}
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Stall Inspection Dialog */}
      <Dialog open={inspectionDialog} onOpenChange={setInspectionDialog}>
        <DialogContent className="w-screen h-screen max-w-full max-h-full overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Stall Inspection</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading form...</div>}>
            {todaySession && (
              <StallInspectionForm
                sessionId={todaySession.id}
                marketId={todaySession.market_id}
                marketDate={todaySession.market_date || todaySession.session_date}
                userId={user!.id}
                onSuccess={() => {
                  fetchTodaySession();
                  setInspectionDialog(false);
                }}
              />
            )}
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Next Day Planning Dialog */}
      <Dialog open={planningDialog} onOpenChange={setPlanningDialog}>
        <DialogContent className="w-screen h-screen max-w-full max-h-full overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Next Day Market Planning</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading form...</div>}>
            {todaySession && (
              <NextDayPlanningForm
                sessionId={todaySession.id}
                marketDate={todaySession.market_date || todaySession.session_date}
                userId={user!.id}
                onSuccess={() => {
                  fetchTodaySession();
                  setPlanningDialog(false);
                }}
              />
            )}
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Leave Request Dialog */}
      <Dialog open={leaveDialog} onOpenChange={setLeaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="leave-date">Leave Date</label>
              <input
                id="leave-date"
                type="date"
                className="border rounded-md px-3 py-2 w-full bg-background"
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="leave-reason">Reason</label>
              <textarea
                id="leave-reason"
                className="border rounded-md px-3 py-2 w-full bg-background min-h-[100px]"
                placeholder="Describe your reason"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Your request will be sent to admin for approval.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLeaveDialog(false)} disabled={submittingLeave}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!leaveDate || !leaveReason.trim() || !user) {
                  toast.error('Please select a date and enter a reason');
                  return;
                }
                setSubmittingLeave(true);
                try {
                  const { error } = await (supabase as any)
                    .from('employee_leaves')
                    .insert({ user_id: user.id, leave_date: leaveDate, reason: leaveReason.trim(), status: 'pending' });
                  if (error) throw error;
                  toast.success('Leave request submitted');
                  setLeaveDialog(false);
                  setLeaveDate('');
                  setLeaveReason('');
                } catch (err) {
                  console.error('Error submitting leave:', err);
                  toast.error('Failed to submit leave request');
                } finally {
                  setSubmittingLeave(false);
                }
              }}
              disabled={submittingLeave}
            >
              {submittingLeave ? 'Submitting...' : 'Apply for Approval'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stall Inspection Dialog */}
      <Dialog open={inspectionDialog} onOpenChange={setInspectionDialog}>
        <DialogContent className="w-screen h-screen max-w-full max-h-full overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Stall Inspection</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading form...</div>}>
            {todaySession && (
              <StallInspectionForm
                sessionId={todaySession.id}
                marketId={todaySession.market_id}
                marketDate={todaySession.market_date || todaySession.session_date}
                userId={user!.id}
                onSuccess={() => {
                  fetchTodaySession();
                  setInspectionDialog(false);
                }}
              />
            )}
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialog !== null} onOpenChange={() => setViewDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewDialog === 'stalls' && 'Stall Confirmations'}
              {viewDialog === 'media' && 'Media Uploads'}
              {viewDialog === 'late' && 'Late Uploads'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {viewDialog === 'stalls' && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 text-sm font-semibold">Stall No</th>
                      <th className="text-left p-3 text-sm font-semibold">Stall Name</th>
                      <th className="text-left p-3 text-sm font-semibold">Farmer Name</th>
                      <th className="text-left p-3 text-sm font-semibold">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dialogData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center p-6 text-muted-foreground">
                          No stall confirmations found
                        </td>
                      </tr>
                    ) : (
                      dialogData.map((stall: any) => (
                        <tr key={stall.id} className="border-t">
                          <td className="p-3">{stall.stall_no}</td>
                          <td className="p-3">{stall.stall_name}</td>
                          <td className="p-3">{stall.farmer_name}</td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {new Date(stall.created_at).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {(viewDialog === 'media' || viewDialog === 'late') && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dialogData.length === 0 ? (
                  <div className="col-span-full text-center p-6 text-muted-foreground">
                    No media uploads found
                  </div>
                ) : (
                  dialogData.map((media: any) => (
                    <Card key={media.id}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          {media.media_type === 'image' ? (
                            <img 
                              src={media.file_url} 
                              alt={media.file_name}
                              className="w-full h-40 object-cover rounded"
                            />
                          ) : (
                            <video 
                              src={media.file_url}
                              className="w-full h-40 object-cover rounded"
                              controls
                            />
                          )}
                          <div className="text-sm">
                            <p className="font-medium truncate">{media.file_name}</p>
                            <p className="text-muted-foreground">
                              {new Date(media.captured_at).toLocaleString('en-IN')}
                            </p>
                            {media.is_late && (
                              <Badge className="mt-1 bg-warning text-warning-foreground">Late Upload</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
