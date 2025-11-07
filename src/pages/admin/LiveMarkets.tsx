import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Users, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface LiveMarket {
  market_id: string;
  market_name: string;
  city: string | null;
  active_sessions: number;
  active_employees: number;
  stall_confirmations_count: number;
  media_uploads_count: number;
  last_upload_time: string | null;
  last_punch_in: string | null;
  task_stats?: {
    attendance: number;
    stall_confirmations: number;
    market_video: number;
    cleaning_video: number;
    other: number;
  };
}

export default function LiveMarkets() {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<LiveMarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveMarkets();
    
    // Subscribe to real-time updates
    const sessionsChannel = supabase
      .channel('live-markets-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, fetchLiveMarkets)
      .subscribe();

    const stallsChannel = supabase
      .channel('live-markets-stalls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stall_confirmations' }, fetchLiveMarkets)
      .subscribe();

    const mediaChannel = supabase
      .channel('live-markets-media')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, fetchLiveMarkets)
      .subscribe();

    const scheduleChannel = supabase
      .channel('live-markets-schedule')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_schedule' }, fetchLiveMarkets)
      .subscribe();

    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(stallsChannel);
      supabase.removeChannel(mediaChannel);
      supabase.removeChannel(scheduleChannel);
    };
  }, []);

  const fetchTaskStats = async (marketId: string, todayDate: string) => {
    try {
      // Fetch attendance (sessions with punch_in_time today)
      const { count: attendanceCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketId)
        .eq('session_date', todayDate)
        .not('punch_in_time', 'is', null);

      // Fetch stall confirmations
      const { count: stallsCount } = await supabase
        .from('stall_confirmations')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketId)
        .eq('market_date', todayDate);

      // Fetch market videos
      const { count: marketVideoCount } = await supabase
        .from('media')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketId)
        .eq('market_date', todayDate)
        .eq('media_type', 'market_video');

      // Fetch cleaning videos
      const { count: cleaningVideoCount } = await supabase
        .from('media')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketId)
        .eq('market_date', todayDate)
        .eq('media_type', 'cleaning_video');

      // Fetch other media types
      const { count: otherCount } = await supabase
        .from('media')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketId)
        .eq('market_date', todayDate)
        .not('media_type', 'in', '(market_video,cleaning_video)');

      return {
        attendance: attendanceCount || 0,
        stall_confirmations: stallsCount || 0,
        market_video: marketVideoCount || 0,
        cleaning_video: cleaningVideoCount || 0,
        other: otherCount || 0,
      };
    } catch (error) {
      console.error('Error fetching task stats:', error);
      return {
        attendance: 0,
        stall_confirmations: 0,
        market_video: 0,
        cleaning_video: 0,
        other: 0,
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
            return { ...market, task_stats: taskStats };
          })
        );
        setMarkets(marketsWithStats);
      } else {
        // Fallback: derive live markets from weekday and schedule if view is empty/unavailable
        const istDateStr = todayDate;
        const dow = istNow.getDay(); // 0=Sun..1=Mon..6=Sat

        // Auto by weekday (excluding Monday handled by DB, but we won't exclude here)
        const [byWeekday, scheduleRows] = await Promise.all([
          supabase
            .from('markets')
            .select('id, name, city')
            .eq('is_active', true)
            .eq('day_of_week', dow),
          supabase
            .from('market_schedule')
            .select('market_id')
            .eq('schedule_date', istDateStr),
        ]);

        const map = new Map<string, LiveMarket>();

        (byWeekday.data || []).forEach((m: any) => {
          map.set(m.id, {
            market_id: m.id,
            market_name: m.name,
            city: m.city ?? null,
            active_sessions: 0,
            active_employees: 0,
            stall_confirmations_count: 0,
            media_uploads_count: 0,
            last_upload_time: null,
            last_punch_in: null,
          });
        });

        const scheduleIds = (scheduleRows.data || [])
          .map((r: any) => r.market_id)
          .filter(Boolean);

        if (scheduleIds.length > 0) {
          const scheduledMarkets = await supabase
            .from('markets')
            .select('id, name, city')
            .in('id', scheduleIds);

          (scheduledMarkets.data || []).forEach((m: any) => {
            if (!map.has(m.id)) {
              map.set(m.id, {
                market_id: m.id,
                market_name: m.name,
                city: m.city ?? null,
                active_sessions: 0,
                active_employees: 0,
                stall_confirmations_count: 0,
                media_uploads_count: 0,
                last_upload_time: null,
                last_punch_in: null,
              });
            }
          });
        }

        const fallbackMarkets = Array.from(map.values());
        const marketsWithStats = await Promise.all(
          fallbackMarkets.map(async (market) => {
            const taskStats = await fetchTaskStats(market.market_id, todayDate);
            return { ...market, task_stats: taskStats };
          })
        );
        setMarkets(marketsWithStats);
      }
    } catch (error) {
      console.error('Error fetching live markets:', error);
    } finally {
      setLoading(false);
    }
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
    // getDay(): 0=Sun ... 1=Mon ... 6=Sat
    return istNow.getDay() === 1;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderTaskChart = (market: LiveMarket) => {
    if (!market.task_stats) return null;

    const { attendance, stall_confirmations, market_video, cleaning_video, other } = market.task_stats;
    const total = attendance + stall_confirmations + market_video + cleaning_video + other;

    if (total === 0) return null;

    const data = [
      { name: 'Attendance', value: attendance, color: 'hsl(var(--chart-1))' },
      { name: 'Stall Confirmations', value: stall_confirmations, color: 'hsl(var(--chart-2))' },
      { name: 'Market Video', value: market_video, color: 'hsl(var(--chart-3))' },
      { name: 'Cleaning Video', value: cleaning_video, color: 'hsl(var(--chart-4))' },
      { name: 'Other', value: other, color: 'hsl(var(--chart-5))' },
    ].filter(item => item.value > 0);

    return (
      <div className="space-y-3">
        <div className="relative h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [
                  `${value} (${((value / total) * 100).toFixed(1)}%)`,
                  ''
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-2xl font-bold">{total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </div>
        <div className="space-y-1 text-xs">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground">{item.name}</span>
              </div>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Live Markets Today</h1>
        <p className="text-muted-foreground mt-2">Real-time view of active markets</p>
      </div>

      <div className="space-y-4">
        {markets.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-48">
              <p className="text-muted-foreground">
                {isISTMonday() ? 'Markets are closed on Mondays' : 'No active markets today'}
              </p>
            </CardContent>
          </Card>
        ) : (
          markets.map((market) => (
            <Card key={market.market_id} className="overflow-hidden">
              <div className="grid md:grid-cols-[1fr,auto] gap-6 p-6">
                {/* Left: Market Info */}
                <div 
                  className="space-y-4 cursor-pointer"
                  onClick={() => navigate(`/admin/market/${market.market_id}`)}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xl font-semibold">{market.market_name}</h3>
                      <Badge variant="default" className="ml-2">{market.active_sessions} active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {market.city || 'N/A'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>Employees</span>
                      </div>
                      <p className="text-2xl font-bold">{market.active_employees}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Upload className="h-4 w-4" />
                        <span>Uploads</span>
                      </div>
                      <p className="text-2xl font-bold">{market.media_uploads_count}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Last upload: {formatTime(market.last_upload_time)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Task Chart */}
                <div className="md:border-l md:pl-6 md:min-w-[280px]">
                  <h4 className="text-sm font-medium mb-3">Task Submissions</h4>
                  {renderTaskChart(market)}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
