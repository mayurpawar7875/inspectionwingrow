import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, ClipboardList, MapPin, TrendingUp, Activity, ChevronRight } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchAllStats();

    const channel = supabase
      .channel('dashboard-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bdo_market_submissions' }, fetchAllStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bdo_stall_submissions' }, fetchAllStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, fetchAllStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, fetchAllStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, navigate]);

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

        {/* Main Tiles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* BDO Reporting Tile */}
          <Card 
            className="group cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 bg-gradient-to-br from-card to-card/80 border-2 hover:border-primary/50"
            onClick={() => navigate('/admin/bdo-reporting')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <MapPin className="h-8 w-8 text-blue-500" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <CardTitle className="text-2xl mt-4">BDO Reporting</CardTitle>
              <CardDescription>Block Development Officer submissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                <span className="text-sm font-medium text-muted-foreground">Pending Reviews</span>
                <span className="text-2xl font-bold text-orange-500">{bdoStats.pending}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="h-3 w-3" />
                <span>Last update: {getTimeAgo(bdoStats.lastUpdate)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Employee Reporting Tile */}
          <Card 
            className="group cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 bg-gradient-to-br from-card to-card/80 border-2 hover:border-primary/50"
            onClick={() => navigate('/admin/employee-reporting')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                  <Users className="h-8 w-8 text-green-500" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <CardTitle className="text-2xl mt-4">Employee Reporting</CardTitle>
              <CardDescription>Field staff activities and submissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                <span className="text-sm font-medium text-muted-foreground">Active Sessions</span>
                <span className="text-2xl font-bold text-green-500">{employeeStats.active}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="h-3 w-3" />
                <span>Last update: {getTimeAgo(employeeStats.lastUpdate)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Market Manager Reporting Tile */}
          <Card 
            className="group cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 bg-gradient-to-br from-card to-card/80 border-2 hover:border-primary/50"
            onClick={() => navigate('/admin/market-reporting')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                  <Building2 className="h-8 w-8 text-purple-500" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <CardTitle className="text-2xl mt-4">Market Manager Reporting</CardTitle>
              <CardDescription>Live market operations and analytics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                <span className="text-sm font-medium text-muted-foreground">Live Markets</span>
                <span className="text-2xl font-bold text-purple-500">{marketStats.live}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
