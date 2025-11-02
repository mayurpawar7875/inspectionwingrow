import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import LiveMarketsWidget from '@/components/admin/LiveMarketsWidget';
import TaskProgressWidget from '@/components/admin/TaskProgressWidget';
import CollectionsWidget from '@/components/admin/CollectionsWidget';
import { toast } from 'sonner';
import {
  LogOut,
  Users,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  FileText,
  TrendingUp,
  AlertCircle,
  Building2,
  Download,
  BarChart3,
  Activity,
} from 'lucide-react';

interface DistrictStats {
  total_markets: number;
  active_markets: number;
  total_sessions: number;
  active_sessions: number;
  total_employees: number;
  active_employees: number;
  stall_confirmations: number;
  media_uploads: number;
  collections_total: number;
  collections_count: number;
  completion_rate: number;
}

interface MarketSummary {
  market_id: string;
  market_name: string;
  city: string;
  active_sessions: number;
  active_employees: number;
  stall_confirmations: number;
  media_uploads: number;
  collections_total: number;
}

export default function BDODashboard() {
  const { user, signOut, currentRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DistrictStats>({
    total_markets: 0,
    active_markets: 0,
    total_sessions: 0,
    active_sessions: 0,
    total_employees: 0,
    active_employees: 0,
    stall_confirmations: 0,
    media_uploads: 0,
    collections_total: 0,
    collections_count: 0,
    completion_rate: 0,
  });
  const [marketSummaries, setMarketSummaries] = useState<MarketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const getISTDateString = (date: Date) => {
    const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const [selectedDate, setSelectedDate] = useState(getISTDateString(new Date()));
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    // Wait for auth to load and role to be determined
    if (authLoading) {
      return;
    }

    // Redirect if not BDO
    if (currentRole !== 'bdo') {
      if (currentRole === 'admin') {
        navigate('/admin');
      } else if (currentRole === 'market_manager') {
        navigate('/manager-dashboard');
      } else {
        navigate('/dashboard');
      }
      return;
    }
    
    // Only fetch if we're staying on this dashboard
    if (currentRole === 'bdo') {
      fetchDistrictStats();
      fetchMarketSummaries();
    }
  }, [currentRole, navigate, selectedDate, authLoading]);

  const fetchDistrictStats = async () => {
    try {
      setLoading(true);
      const dateStr = getISTDateString(new Date(selectedDate));

      // Fetch all markets
      const { data: allMarkets, error: marketsError } = await supabase
        .from('markets')
        .select('id, is_active')
        .eq('is_active', true);

      if (marketsError) throw marketsError;

      // Fetch live markets (active today) - with fallback
      let liveMarkets: any[] = [];
      const { data: liveMarketsData, error: liveError } = await supabase
        .from('live_markets_today')
        .select('market_id, active_sessions, active_employees, stall_confirmations_count, media_uploads_count');

      if (liveError) {
        console.error('Error fetching from live_markets_today view:', liveError);
        // Fallback: Query directly from markets and sessions
        const { data: sessionsForDay, error: sessionsErr } = await supabase
          .from('sessions')
          .select('id, market_id, user_id, status')
          .eq('session_date', dateStr);

        if (sessionsErr) throw sessionsErr;

        const { data: stallConf, error: scErr } = await supabase
          .from('stall_confirmations')
          .select('id, market_id')
          .eq('market_date', dateStr);

        if (scErr) throw scErr;

        const { data: mediaFiles, error: mediaErr } = await supabase
          .from('media')
          .select('id, market_id')
          .eq('market_date', dateStr);

        if (mediaErr) throw mediaErr;

        // Aggregate by market
        const marketAgg = new Map<string, any>();
        sessionsForDay?.forEach(s => {
          const existing = marketAgg.get(s.market_id) || {
            market_id: s.market_id,
            active_sessions: 0,
            active_employees: new Set<string>(),
            stall_confirmations_count: 0,
            media_uploads_count: 0,
          };
          if (s.status === 'active') existing.active_sessions++;
          if (['active', 'finalized'].includes(s.status)) {
            existing.active_employees.add(s.user_id);
          }
          marketAgg.set(s.market_id, existing);
        });

        stallConf?.forEach(sc => {
          const existing = marketAgg.get(sc.market_id) || {
            market_id: sc.market_id,
            active_sessions: 0,
            active_employees: new Set<string>(),
            stall_confirmations_count: 0,
            media_uploads_count: 0,
          };
          existing.stall_confirmations_count++;
          marketAgg.set(sc.market_id, existing);
        });

        mediaFiles?.forEach(m => {
          const existing = marketAgg.get(m.market_id) || {
            market_id: m.market_id,
            active_sessions: 0,
            active_employees: new Set<string>(),
            stall_confirmations_count: 0,
            media_uploads_count: 0,
          };
          existing.media_uploads_count++;
          marketAgg.set(m.market_id, existing);
        });

        liveMarkets = Array.from(marketAgg.values()).map(m => ({
          market_id: m.market_id,
          active_sessions: m.active_sessions || 0,
          active_employees: m.active_employees?.size || 0,
          stall_confirmations_count: m.stall_confirmations_count || 0,
          media_uploads_count: m.media_uploads_count || 0,
        }));
      } else {
        liveMarkets = liveMarketsData || [];
      }

      // Fetch total employees
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      if (employeesError) throw employeesError;

      // Fetch sessions for date range
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, status')
        .eq('session_date', dateStr);

      if (sessionsError) throw sessionsError;

      // Fetch collections
      const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select('amount')
        .eq('market_date', dateStr);

      if (collectionsError) throw collectionsError;

      // Calculate totals
      const totalMarkets = allMarkets?.length || 0;
      const activeMarkets = liveMarkets?.length || 0;
      const totalSessions = sessions?.length || 0;
      const activeSessions = sessions?.filter((s: any) => s.status === 'active').length || 0;
      const completedSessions = sessions?.filter((s: any) => ['completed', 'finalized'].includes(s.status)).length || 0;
      const totalEmployees = (employees as any)?.length || 0;
      
      const stallConfirmations = liveMarkets.reduce((sum: number, m: any) => sum + (m.stall_confirmations_count || 0), 0) || 0;
      const mediaUploads = liveMarkets.reduce((sum: number, m: any) => sum + (m.media_uploads_count || 0), 0) || 0;
      const collectionsTotal = collections?.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0) || 0;
      const collectionsCount = collections?.length || 0;
      const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

      const activeEmployees = liveMarkets.reduce((sum: number, m: any) => sum + (m.active_employees || 0), 0) || 0;

      setStats({
        total_markets: totalMarkets,
        active_markets: activeMarkets,
        total_sessions: totalSessions,
        active_sessions: activeSessions,
        total_employees: totalEmployees,
        active_employees: activeEmployees,
        stall_confirmations: stallConfirmations,
        media_uploads: mediaUploads,
        collections_total: collectionsTotal,
        collections_count: collectionsCount,
        completion_rate: completionRate,
      });
    } catch (error: any) {
      console.error('Error fetching district stats:', error);
      toast.error(error?.message || 'Failed to load district statistics');
      // Set default stats on error so dashboard still renders
      setStats({
        total_markets: 0,
        active_markets: 0,
        total_sessions: 0,
        active_sessions: 0,
        total_employees: 0,
        active_employees: 0,
        stall_confirmations: 0,
        media_uploads: 0,
        collections_total: 0,
        collections_count: 0,
        completion_rate: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketSummaries = async () => {
    try {
      const { data, error } = await supabase
        .from('live_markets_today')
        .select('market_id, market_name, city, active_sessions, active_employees, stall_confirmations_count, media_uploads_count');

      if (error) {
        console.error('Error fetching market summaries:', error);
        // Fallback: set empty array
        setMarketSummaries([]);
        return;
      }

      const dateStr = getISTDateString(new Date(selectedDate));

      // Fetch collections for each market
      const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select('market_id, amount')
        .eq('market_date', dateStr);

      if (collectionsError) throw collectionsError;

      const collectionsMap = new Map<string, number>();
      collections?.forEach((item: any) => {
        const marketId = item.market_id;
        const existing = collectionsMap.get(marketId) || 0;
        collectionsMap.set(marketId, existing + Number(item.amount || 0));
      });

      const summaries: MarketSummary[] = (data || []).map((market: any) => ({
        market_id: market.market_id,
        market_name: market.market_name,
        city: market.city || 'N/A',
        active_sessions: market.active_sessions || 0,
        active_employees: market.active_employees || 0,
        stall_confirmations: market.stall_confirmations_count || 0,
        media_uploads: market.media_uploads_count || 0,
        collections_total: collectionsMap.get(market.market_id) || 0,
      }));

      setMarketSummaries(summaries || []);
    } catch (error: any) {
      console.error('Error fetching market summaries:', error);
      setMarketSummaries([]);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">BDO Dashboard</h1>
            <p className="text-sm text-muted-foreground">District-level Reporting & Monitoring</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/my-sessions')}>
              <FileText className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">My Sessions</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Markets</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_markets}</div>
              <p className="text-xs text-muted-foreground">{stats.active_markets} active today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_sessions}</div>
              <p className="text-xs text-muted-foreground">{stats.active_sessions} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_employees}</div>
              <p className="text-xs text-muted-foreground">of {stats.total_employees} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completion_rate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Sessions completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stall Confirmations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.stall_confirmations}</div>
              <p className="text-xs text-muted-foreground">Stalls confirmed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Media Uploads</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.media_uploads}</div>
              <p className="text-xs text-muted-foreground">Files uploaded</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.collections_total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{stats.collections_count} transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Markets</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_markets}</div>
              <p className="text-xs text-muted-foreground">Markets with activity</p>
            </CardContent>
          </Card>
        </div>

        {/* Market Performance Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Market Performance Overview</CardTitle>
            <CardDescription>District-wide market activity summary</CardDescription>
          </CardHeader>
          <CardContent>
            {marketSummaries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No market data available for the selected date
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Market</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Active Sessions</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Stalls</TableHead>
                    <TableHead>Media</TableHead>
                    <TableHead>Collections</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marketSummaries.map((market) => (
                    <TableRow key={market.market_id}>
                      <TableCell className="font-medium">{market.market_name}</TableCell>
                      <TableCell>{market.city}</TableCell>
                      <TableCell>{market.active_sessions}</TableCell>
                      <TableCell>{market.active_employees}</TableCell>
                      <TableCell>{market.stall_confirmations}</TableCell>
                      <TableCell>{market.media_uploads}</TableCell>
                      <TableCell>₹{market.collections_total.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge
                          variant={market.active_sessions > 0 ? 'default' : 'secondary'}
                          className={market.active_sessions > 0 ? 'bg-green-600' : ''}
                        >
                          {market.active_sessions > 0 ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Widgets */}
        <div className="grid gap-6 md:grid-cols-2">
          <LiveMarketsWidget />
          <TaskProgressWidget />
        </div>

        <div className="mt-6">
          <CollectionsWidget />
        </div>
      </main>
    </div>
  );
}

