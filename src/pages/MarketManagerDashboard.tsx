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
import StallConfirmationsWidget from '@/components/admin/StallConfirmationsWidget';
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
} from 'lucide-react';

interface MarketStats {
  market_id: string;
  market_name: string;
  active_sessions: number;
  active_employees: number;
  stall_confirmations: number;
  media_uploads: number;
  collections_total: number;
  collections_count: number;
}

export default function MarketManagerDashboard() {
  const { user, signOut, currentRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<MarketStats[]>([]);
  const [loading, setLoading] = useState(true);
  const getISTDateString = (date: Date) => {
    const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const [selectedDate, setSelectedDate] = useState(getISTDateString(new Date()));
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [markets, setMarkets] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    // Wait for auth to load and role to be determined
    if (authLoading) {
      return;
    }

    // Redirect if not market manager
    if (currentRole !== 'market_manager') {
      if (currentRole === 'admin') {
        navigate('/admin');
      } else if (currentRole === 'bdo') {
        navigate('/bdo-dashboard');
      } else {
        navigate('/dashboard');
      }
      return;
    }
    
    // Only fetch if we're staying on this dashboard
    if (currentRole === 'market_manager') {
      fetchMarkets();
      fetchStats();
    }
  }, [currentRole, navigate, selectedDate, selectedMarket, authLoading]);

  const fetchMarkets = async () => {
    try {
      const { data, error } = await supabase
        .from('markets')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching markets:', error);
        toast.error('Failed to load markets');
        setMarkets([]);
        return;
      }
      setMarkets(data || []);
    } catch (error: any) {
      console.error('Error fetching markets:', error);
      setMarkets([]);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const dateStr = getISTDateString(new Date(selectedDate));
      
      // Fetch live markets data - try view first, fallback to direct query
      let liveMarkets: any[] = [];
      const { data: liveMarketsData, error: liveError } = await supabase
        .from('live_markets_today')
        .select('market_id, market_name, active_sessions, active_employees, stall_confirmations_count, media_uploads_count');

      if (liveError) {
        console.error('Error fetching from live_markets_today view:', liveError);
        // Fallback: Query markets and sessions directly
        const { data: allMarkets, error: marketsError } = await supabase
          .from('markets')
          .select('id, name')
          .eq('is_active', true);

        if (marketsError) throw marketsError;

        // Get sessions for today
        const { data: sessions, error: sessionsError } = await supabase
          .from('sessions')
          .select('id, market_id, user_id, status')
          .eq('session_date', dateStr);

        if (sessionsError) throw sessionsError;

        // Get stall confirmations
        const { data: stallConfirmations, error: scError } = await supabase
          .from('stall_confirmations')
          .select('id, market_id')
          .eq('market_date', dateStr);

        if (scError) throw scError;

        // Get media
        const { data: media, error: mediaError } = await supabase
          .from('media')
          .select('id, market_id')
          .eq('market_date', dateStr);

        if (mediaError) throw mediaError;

        // Aggregate data
        const marketMap = new Map<string, any>();
        allMarkets?.forEach(m => {
          marketMap.set(m.id, {
            market_id: m.id,
            market_name: m.name,
            active_sessions: 0,
            active_employees: 0,
            stall_confirmations_count: 0,
            media_uploads_count: 0,
          });
        });

        sessions?.forEach(s => {
          const market = marketMap.get(s.market_id);
          if (market) {
            if (s.status === 'active') market.active_sessions++;
            if (['active', 'finalized'].includes(s.status)) {
              market.active_employees = (market.active_employees || 0) + 1;
            }
          }
        });

        stallConfirmations?.forEach(sc => {
          const market = marketMap.get(sc.market_id);
          if (market) market.stall_confirmations_count++;
        });

        media?.forEach(m => {
          const market = marketMap.get(m.market_id);
          if (market) market.media_uploads_count++;
        });

        liveMarkets = Array.from(marketMap.values());
      } else {
        liveMarkets = liveMarketsData || [];
      }

      // Fetch collections for the selected date
      const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select('market_id, amount')
        .eq('market_date', dateStr);

      if (collectionsError) throw collectionsError;

      // Aggregate collections by market
      const collectionsMap = new Map<string, { total: number; count: number }>();
      collections?.forEach((item: any) => {
        const marketId = item.market_id;
        const existing = collectionsMap.get(marketId) || { total: 0, count: 0 };
        collectionsMap.set(marketId, {
          total: existing.total + Number(item.amount || 0),
          count: existing.count + 1,
        });
      });

      // Combine data
      const marketStats: MarketStats[] = liveMarkets
        .filter((m: any) => selectedMarket === 'all' || m.market_id === selectedMarket)
        .map((market: any) => {
          const collections = collectionsMap.get(market.market_id) || { total: 0, count: 0 };
          return {
            market_id: market.market_id,
            market_name: market.market_name,
            active_sessions: market.active_sessions || 0,
            active_employees: market.active_employees || 0,
            stall_confirmations: market.stall_confirmations_count || 0,
            media_uploads: market.media_uploads_count || 0,
            collections_total: collections.total,
            collections_count: collections.count,
          };
        });

      setStats(marketStats);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      toast.error(error?.message || 'Failed to load market statistics');
      setStats([]); // Set empty array on error so dashboard still renders
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const totalStats = {
    activeSessions: stats.reduce((sum, s) => sum + s.active_sessions, 0),
    activeEmployees: stats.reduce((sum, s) => sum + s.active_employees, 0),
    stallConfirmations: stats.reduce((sum, s) => sum + s.stall_confirmations, 0),
    mediaUploads: stats.reduce((sum, s) => sum + s.media_uploads, 0),
    collectionsTotal: stats.reduce((sum, s) => sum + s.collections_total, 0),
    collectionsCount: stats.reduce((sum, s) => sum + s.collections_count, 0),
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
            <h1 className="text-2xl font-bold">Market Manager Dashboard</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="market">Market</Label>
                <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                  <SelectTrigger id="market">
                    <SelectValue placeholder="All Markets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Markets</SelectItem>
                    {markets.map((market) => (
                      <SelectItem key={market.id} value={market.id}>
                        {market.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats.activeSessions}</div>
              <p className="text-xs text-muted-foreground">Today's active sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats.activeEmployees}</div>
              <p className="text-xs text-muted-foreground">Employees on duty</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collections</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalStats.collectionsTotal.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{totalStats.collectionsCount} transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stall Confirmations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats.stallConfirmations}</div>
              <p className="text-xs text-muted-foreground">Stalls confirmed today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Media Uploads</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats.mediaUploads}</div>
              <p className="text-xs text-muted-foreground">Files uploaded today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Markets Active</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.length}</div>
              <p className="text-xs text-muted-foreground">Markets with activity</p>
            </CardContent>
          </Card>
        </div>

        {/* Market Details Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Market Performance</CardTitle>
            <CardDescription>Detailed breakdown by market</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No market data available for the selected date
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Market</TableHead>
                    <TableHead>Active Sessions</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Stalls</TableHead>
                    <TableHead>Media</TableHead>
                    <TableHead>Collections</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((market) => (
                    <TableRow key={market.market_id}>
                      <TableCell className="font-medium">{market.market_name}</TableCell>
                      <TableCell>{market.active_sessions}</TableCell>
                      <TableCell>{market.active_employees}</TableCell>
                      <TableCell>{market.stall_confirmations}</TableCell>
                      <TableCell>{market.media_uploads}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">₹{market.collections_total.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{market.collections_count} transactions</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/market/${market.market_id}`)}
                        >
                          View Details
                        </Button>
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
          <StallConfirmationsWidget />
        </div>

        <div className="mt-6">
          <CollectionsWidget />
        </div>
      </main>
    </div>
  );
}

