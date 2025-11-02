import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, ChevronRight, Users, Camera, Clock } from 'lucide-react';

interface MarketData {
  market_id: string;
  market_name: string;
  city: string;
  active_sessions: number;
  active_employees: number;
  media_uploads_count: number;
  last_upload_time: string | null;
}

interface Market {
  id: string;
  name: string;
  city: string;
  day_of_week: number | null;
}

export default function EmployeeMarketsList() {
  const navigate = useNavigate();
  const { city } = useParams<{ city: string }>();
  const decodedCity = decodeURIComponent(city || '');
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkets();

    const channel = supabase
      .channel('employee-markets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, fetchMarkets)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, fetchMarkets)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_schedule' }, fetchMarkets)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'markets' }, fetchMarkets)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [decodedCity]);

  const fetchMarkets = async () => {
    try {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const todayDateStr = today.toISOString().split('T')[0];

      // First, get all active markets in the city
      const { data: allMarkets } = await supabase
        .from('markets')
        .select('id, name, city, day_of_week')
        .eq('city', decodedCity)
        .eq('is_active', true);

      if (!allMarkets || allMarkets.length === 0) {
        setMarkets([]);
        setLoading(false);
        return;
      }

      // Check which markets are scheduled for today using the new market_schedule table
      const { data: schedules } = await supabase
        .from('market_schedule')
        .select('market_id')
        .in('market_id', allMarkets.map(m => m.id))
        .eq('is_active', true)
        .or(`day_of_week.eq.${dayOfWeek},schedule_date.eq.${todayDateStr}`);

      const scheduledMarketIds = new Set(schedules?.map(s => s.market_id) || []);

      // Get live market data
      const { data: liveData } = await supabase
        .from('live_markets_today')
        .select('*')
        .eq('city', decodedCity);

      const liveDataMap = new Map(liveData?.map(m => [m.market_id, m]) || []);

      // Filter markets: show markets that are either:
      // 1. In market_schedule table for today, OR
      // 2. Have day_of_week matching today (legacy support), OR
      // 3. If no schedules exist anywhere, show all markets
      const hasAnySchedules = scheduledMarketIds.size > 0 || allMarkets.some(m => m.day_of_week !== null);
      
      const marketsToShow = hasAnySchedules
        ? allMarkets.filter(market => 
            scheduledMarketIds.has(market.id) || market.day_of_week === dayOfWeek
          )
        : allMarkets;

      const marketData: MarketData[] = marketsToShow.map(market => {
          const live = liveDataMap.get(market.id);
          return {
            market_id: market.id,
            market_name: market.name,
            city: market.city,
            active_sessions: live?.active_sessions || 0,
            active_employees: live?.active_employees || 0,
            media_uploads_count: live?.media_uploads_count || 0,
            last_upload_time: live?.last_upload_time || null,
          };
        });

      setMarkets(marketData);
    } catch (error) {
      console.error('Error fetching markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'No activity';
    const now = new Date();
    const then = new Date(dateString);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/employee-reporting')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cities
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span className="cursor-pointer hover:text-primary" onClick={() => navigate('/admin/employee-reporting')}>
              Employee Reporting
            </span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">{decodedCity}</span>
          </div>
          <h2 className="text-3xl font-bold">Live Markets in {decodedCity}</h2>
          <p className="text-muted-foreground">Select a market to view employee activities</p>
        </div>
      </div>

      {markets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No active markets found in {decodedCity} today</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {markets.map((market) => (
            <Card
              key={market.market_id}
              className="cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all border-2 hover:border-primary/50 group"
              onClick={() => navigate(`/admin/employee-reporting/market/${market.market_id}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                      <Building2 className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{market.market_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{market.city}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-lg bg-accent/50 text-center">
                    <Users className="h-4 w-4 mx-auto mb-1 text-green-500" />
                    <p className="text-xs text-muted-foreground">Active</p>
                    <p className="font-bold text-lg text-green-500">{market.active_employees || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/50 text-center">
                    <Clock className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                    <p className="text-xs text-muted-foreground">Sessions</p>
                    <p className="font-bold text-lg">{market.active_sessions || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/50 text-center">
                    <Camera className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                    <p className="text-xs text-muted-foreground">Media</p>
                    <p className="font-bold text-lg">{market.media_uploads_count || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                  <Clock className="h-3 w-3" />
                  <span>Last activity: {getTimeAgo(market.last_upload_time)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
