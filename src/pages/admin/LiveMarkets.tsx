import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Users, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';

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
            
            // Fetch employee names for this market
            const { data: sessionsData } = await supabase
              .from('sessions')
              .select('user_id, profiles!inner(full_name)')
              .eq('market_id', market.market_id)
              .eq('session_date', todayDate)
              .not('punch_in_time', 'is', null);
            
            const employeeNames = sessionsData?.map((s: any) => s.profiles?.full_name).filter(Boolean) || [];
            
            return { ...market, task_stats: taskStats, employee_names: employeeNames };
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
            employee_names: [],
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
                employee_names: [],
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
            
            // Fetch employee names for this market
            const { data: sessionsData } = await supabase
              .from('sessions')
              .select('user_id, profiles!inner(full_name)')
              .eq('market_id', market.market_id)
              .eq('session_date', todayDate)
              .not('punch_in_time', 'is', null);
            
            const employeeNames = sessionsData?.map((s: any) => s.profiles?.full_name).filter(Boolean) || [];
            
            return { ...market, task_stats: taskStats, employee_names: employeeNames };
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

  const renderTaskChecklist = (market: LiveMarket) => {
    const tasks = [
      { 
        label: 'Punch-in Time', 
        completed: !!market.last_punch_in,
        value: market.last_punch_in ? formatTime(market.last_punch_in) : null
      },
      { 
        label: 'Selfie Uploaded', 
        completed: market.task_stats ? market.task_stats.attendance > 0 : false 
      },
      { 
        label: 'Stall Confirmations', 
        completed: market.stall_confirmations_count > 0,
        value: market.stall_confirmations_count > 0 ? `${market.stall_confirmations_count} stalls` : null
      },
      { 
        label: 'Market Video', 
        completed: market.task_stats ? market.task_stats.market_video > 0 : false 
      },
      { 
        label: 'Cleaning Video', 
        completed: market.task_stats ? market.task_stats.cleaning_video > 0 : false 
      },
      { 
        label: 'Media Uploads', 
        completed: market.media_uploads_count > 0,
        value: market.media_uploads_count > 0 ? `${market.media_uploads_count} files` : null
      },
    ];

    return (
      <div className="space-y-3">
        {tasks.map((task, index) => (
          <div key={index} className="flex items-center gap-3">
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
                      {market.employee_names.length > 0 && (
                        <p className="text-xs text-muted-foreground">{market.employee_names.join(', ')}</p>
                      )}
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

                {/* Right: Task Checklist */}
                <div className="md:border-l md:pl-6 md:min-w-[280px]">
                  <h4 className="text-sm font-medium mb-4">Task Status</h4>
                  {renderTaskChecklist(market)}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
