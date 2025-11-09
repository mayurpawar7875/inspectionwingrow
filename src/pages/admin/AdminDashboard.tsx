import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Building2, ClipboardList, MapPin, TrendingUp, Activity, ChevronRight, Clock, Upload } from 'lucide-react';

interface LiveMarket {
  market_id: string;
  market_name: string;
  city: string | null;
  active_sessions: number;
  active_employees: number;
  employee_names: string[];
  stall_confirmations_count: number;
  media_uploads_count: number;
  last_upload_time: string | null;
  last_punch_in: string | null;
  task_stats?: {
    attendance: number;
    stall_confirmations: number;
    market_video: number;
    cleaning_video: number;
    offers: number;
    commodities: number;
    feedback: number;
    inspections: number;
    planning: number;
  };
}

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [bdoStats, setBdoStats] = useState({
    pending: 0,
    lastUpdate: '',
  });
  const [employeeStats, setEmployeeStats] = useState({
    active: 0,
    lastUpdate: '',
  });
  const [marketStats, setMarketStats] = useState({
    live: 0,
    lastUpdate: '',
  });
  const [liveMarkets, setLiveMarkets] = useState<LiveMarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchAllStats();

    const statsChannel = supabase
      .channel('dashboard-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bdo_market_submissions' }, fetchAllStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bdo_stall_submissions' }, fetchAllStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        fetchAllStats();
        fetchLiveMarkets();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, () => {
        fetchAllStats();
        fetchLiveMarkets();
      })
      .subscribe();

    const stallsChannel = supabase
      .channel('live-markets-stalls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stall_confirmations' }, fetchLiveMarkets)
      .subscribe();

    const scheduleChannel = supabase
      .channel('live-markets-schedule')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_schedule' }, fetchLiveMarkets)
      .subscribe();

    return () => {
      supabase.removeChannel(statsChannel);
      supabase.removeChannel(stallsChannel);
      supabase.removeChannel(scheduleChannel);
    };
  }, [isAdmin, navigate]);

  const fetchTaskStats = async (marketId: string, todayDate: string) => {
    try {
      const { count: attendanceCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketId)
        .eq('session_date', todayDate)
        .not('punch_in_time', 'is', null);

      const { count: stallsCount } = await supabase
        .from('stall_confirmations')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketId)
        .eq('market_date', todayDate);

      const { count: marketVideoCount } = await supabase
        .from('media')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketId)
        .eq('market_date', todayDate)
        .eq('media_type', 'market_video');

      const { count: cleaningVideoCount } = await supabase
        .from('media')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketId)
        .eq('market_date', todayDate)
        .eq('media_type', 'cleaning_video');

      const { count: offersCount } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketId)
        .eq('market_date', todayDate);

      const { count: commoditiesCount } = await supabase
        .from('non_available_commodities')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketId)
        .eq('market_date', todayDate);

      const { count: feedbackCount } = await supabase
        .from('organiser_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketId)
        .eq('market_date', todayDate);

      const { count: inspectionsCount } = await supabase
        .from('stall_inspections')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketId)
        .eq('market_date', todayDate);

      const { count: planningCount } = await supabase
        .from('next_day_planning')
        .select('*', { count: 'exact', head: true })
        .eq('current_market_date', todayDate);

      return {
        attendance: attendanceCount || 0,
        stall_confirmations: stallsCount || 0,
        market_video: marketVideoCount || 0,
        cleaning_video: cleaningVideoCount || 0,
        offers: offersCount || 0,
        commodities: commoditiesCount || 0,
        feedback: feedbackCount || 0,
        inspections: inspectionsCount || 0,
        planning: planningCount || 0,
      };
    } catch (error) {
      console.error('Error fetching task stats:', error);
      return {
        attendance: 0,
        stall_confirmations: 0,
        market_video: 0,
        cleaning_video: 0,
        offers: 0,
        commodities: 0,
        feedback: 0,
        inspections: 0,
        planning: 0,
      };
    }
  };

  const fetchLiveMarkets = async () => {
    try {
      const istNow = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
      );
      const todayDate = istNow.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('live_markets_today')
        .select('*');

      if (error) throw error;
      if (data && data.length > 0) {
        const marketsWithStats = await Promise.all(
          (data as any[]).map(async (market) => {
            const taskStats = await fetchTaskStats(market.market_id, todayDate);
            
            const { data: sessionsData } = await supabase
              .from('sessions')
              .select('user_id')
              .eq('market_id', market.market_id)
              .eq('session_date', todayDate)
              .not('punch_in_time', 'is', null);
            
            const userIds = sessionsData?.map((s: any) => s.user_id).filter(Boolean) || [];
            let employeeNames: string[] = [];
            
            if (userIds.length > 0) {
              const { data: employeesData } = await supabase
                .from('employees')
                .select('full_name')
                .in('id', userIds);
              
              employeeNames = employeesData?.map((e: any) => e.full_name).filter(Boolean) || [];
            }
            
            return { ...market, task_stats: taskStats, employee_names: employeeNames };
          })
        );
        setLiveMarkets(marketsWithStats);
      } else {
        setLiveMarkets([]);
      }
    } catch (error) {
      console.error('Error fetching live markets:', error);
    }
  };

  const fetchAllStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [
        bdoMarketsRes,
        bdoStallsRes,
        activeSessionsRes,
        liveMarketsRes,
      ] = await Promise.all([
        supabase.from('bdo_market_submissions').select('status, updated_at').eq('status', 'pending'),
        supabase.from('bdo_stall_submissions').select('status, updated_at').eq('status', 'pending'),
        supabase
          .from('sessions')
          .select('id, updated_at', { count: 'exact' })
          .eq('status', 'active')
          .eq('session_date', today),
        supabase.from('live_markets_today').select('*'),
      ]);

      const bdoPending = (bdoMarketsRes.data?.length || 0) + (bdoStallsRes.data?.length || 0);
      const bdoLatest = [...(bdoMarketsRes.data || []), ...(bdoStallsRes.data || [])]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

      const activeSessions = activeSessionsRes.data || [];
      const sessionLatest = activeSessions.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )[0];

      setBdoStats({
        pending: bdoPending,
        lastUpdate: bdoLatest?.updated_at || '',
      });

      setEmployeeStats({
        active: activeSessions.length,
        lastUpdate: sessionLatest?.updated_at || '',
      });

      setMarketStats({
        live: liveMarketsRes.data?.length || 0,
        lastUpdate: new Date().toISOString(),
      });

      await fetchLiveMarkets();
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    if (!dateString) return 'No updates yet';
    const now = new Date();
    const then = new Date(dateString);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    }) + ' IST';
  };

  const isISTMonday = () => {
    const istNow = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
    );
    return istNow.getDay() === 1;
  };

  const renderTaskChecklist = (market: LiveMarket) => {
    const tasks = [
      { 
        label: 'Punch-in Time', 
        completed: !!market.last_punch_in,
        value: market.last_punch_in ? formatTime(market.last_punch_in) : null,
        onClick: () => navigate(`/admin/market/${market.market_id}`)
      },
      { 
        label: 'Selfie Uploaded', 
        completed: market.task_stats ? market.task_stats.attendance > 0 : false,
        onClick: () => navigate(`/admin/market/${market.market_id}`)
      },
      { 
        label: 'Stall Confirmations', 
        completed: market.stall_confirmations_count > 0,
        value: market.stall_confirmations_count > 0 ? `${market.stall_confirmations_count} stalls` : null,
        onClick: () => navigate(`/admin/market/${market.market_id}`)
      },
      { 
        label: "Today's Offers", 
        completed: market.task_stats ? market.task_stats.offers > 0 : false,
        value: market.task_stats && market.task_stats.offers > 0 ? `${market.task_stats.offers} items` : null,
        onClick: () => navigate(`/admin/market/${market.market_id}`)
      },
      { 
        label: 'Non-Available Commodities', 
        completed: market.task_stats ? market.task_stats.commodities > 0 : false,
        value: market.task_stats && market.task_stats.commodities > 0 ? `${market.task_stats.commodities} items` : null,
        onClick: () => navigate(`/admin/market/${market.market_id}`)
      },
      { 
        label: 'Organiser Feedback', 
        completed: market.task_stats ? market.task_stats.feedback > 0 : false,
        onClick: () => navigate(`/admin/market/${market.market_id}`)
      },
      { 
        label: 'Stall Inspection', 
        completed: market.task_stats ? market.task_stats.inspections > 0 : false,
        value: market.task_stats && market.task_stats.inspections > 0 ? `${market.task_stats.inspections} stalls` : null,
        onClick: () => navigate(`/admin/market/${market.market_id}`)
      },
      { 
        label: 'Next Day Planning', 
        completed: market.task_stats ? market.task_stats.planning > 0 : false,
        onClick: () => navigate(`/admin/market/${market.market_id}`)
      },
      { 
        label: 'Market Video', 
        completed: market.task_stats ? market.task_stats.market_video > 0 : false,
        onClick: () => navigate(`/admin/market/${market.market_id}`)
      },
      { 
        label: 'Cleaning Video', 
        completed: market.task_stats ? market.task_stats.cleaning_video > 0 : false,
        onClick: () => navigate(`/admin/market/${market.market_id}`)
      },
    ];

    return (
      <div className="space-y-3">
        {tasks.map((task, index) => (
          <div 
            key={index} 
            className="flex items-center gap-3 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors"
            onClick={task.onClick}
          >
            <Checkbox checked={task.completed} disabled className="pointer-events-none" />
            <div className="flex-1">
              <div className="text-sm font-medium">{task.label}</div>
              {task.value && (
                <div className="text-xs text-muted-foreground">{task.value}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Wingrow Admin Dashboard
          </h1>
          <p className="text-lg text-muted-foreground">Real-time reporting and analytics</p>
        </div>

        {/* Live Markets Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Live Markets Today</h2>
            <Badge variant="outline" className="text-sm">{liveMarkets.length} Active</Badge>
          </div>

          {liveMarkets.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">
                  {isISTMonday() ? 'Markets are closed on Mondays' : 'No active markets today'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {liveMarkets.map((market) => (
                <Card key={market.market_id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="grid md:grid-cols-[1fr,auto] gap-6 p-6">
                    {/* Left: Market Info */}
                    <div className="space-y-4">
                      <div 
                        className="cursor-pointer"
                        onClick={() => navigate(`/admin/market/${market.market_id}`)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-xl font-semibold">{market.market_name}</h3>
                          <Badge variant="default" className="ml-2">{market.active_sessions} active</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {market.city || 'N/A'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>Employees</span>
                          </div>
                          <p className="text-2xl font-bold">{market.active_employees}</p>
                          {market.employee_names && market.employee_names.length > 0 ? (
                            <p className="text-sm text-foreground font-medium mt-1">{market.employee_names.join(', ')}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">No employee data</p>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Last upload: {formatTime(market.last_upload_time)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Task Checklist */}
                    <div className="md:border-l md:pl-6 md:min-w-[280px]">
                      <h4 className="text-sm font-medium mb-4">Task Status</h4>
                      {renderTaskChecklist(market)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Main Tiles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* BDO Reporting Tile */}
          <Card 
            className="group cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-300 bg-gradient-to-br from-card to-card/80 border-2 hover:border-primary/50"
            onClick={() => navigate('/admin/bdo-reporting')}
          >
            <CardHeader className="pb-2 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <MapPin className="h-5 w-5 text-blue-500" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <CardTitle className="text-lg">BDO Reporting</CardTitle>
              <CardDescription className="text-xs">Block Development Officer submissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              <div className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
                <span className="text-xs font-medium text-muted-foreground">Pending Reviews</span>
                <span className="text-xl font-bold text-orange-500">{bdoStats.pending}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Activity className="h-3 w-3" />
                <span>Last update: {getTimeAgo(bdoStats.lastUpdate)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Employee Reporting Tile */}
          <Card 
            className="group cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-300 bg-gradient-to-br from-card to-card/80 border-2 hover:border-primary/50"
            onClick={() => navigate('/admin/employee-reporting')}
          >
            <CardHeader className="pb-2 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <CardTitle className="text-lg">Employee Reporting</CardTitle>
              <CardDescription className="text-xs">Field staff activities and submissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              <div className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
                <span className="text-xs font-medium text-muted-foreground">Active Sessions</span>
                <span className="text-xl font-bold text-green-500">{employeeStats.active}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Activity className="h-3 w-3" />
                <span>Last update: {getTimeAgo(employeeStats.lastUpdate)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Market Manager Reporting Tile */}
          <Card 
            className="group cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-300 bg-gradient-to-br from-card to-card/80 border-2 hover:border-primary/50"
            onClick={() => navigate('/admin/market-reporting')}
          >
            <CardHeader className="pb-2 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                  <Building2 className="h-5 w-5 text-purple-500" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <CardTitle className="text-lg">Market Manager Reporting</CardTitle>
              <CardDescription className="text-xs">Live market operations and analytics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              <div className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
                <span className="text-xs font-medium text-muted-foreground">Live Markets</span>
                <span className="text-xl font-bold text-purple-500">{marketStats.live}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Activity className="h-3 w-3" />
                <span>Last update: {getTimeAgo(marketStats.lastUpdate)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
            onClick={() => navigate('/admin/users')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Manage employees</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
            onClick={() => navigate('/admin/sessions')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">View all sessions</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
            onClick={() => navigate('/admin/collections')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Collections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Financial tracking</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
            onClick={() => navigate('/admin/settings')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Configure system</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
