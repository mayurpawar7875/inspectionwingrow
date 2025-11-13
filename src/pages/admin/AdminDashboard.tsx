import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Building2, ClipboardList, MapPin, TrendingUp, Activity, ChevronRight, Clock, Upload } from 'lucide-react';
import { format } from 'date-fns';

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
  const [taskDialog, setTaskDialog] = useState<{
    open: boolean;
    taskType: string;
    data: any[];
    marketName: string;
  }>({ open: false, taskType: '', data: [], marketName: '' });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchAllStats();
    fetchLiveMarkets();

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
      const dayOfWeek = istNow.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Get markets scheduled for today based on day_of_week
      const { data: todaysMarkets, error: marketsError } = await supabase
        .from('markets')
        .select('id, name, city, location')
        .eq('is_active', true)
        .eq('day_of_week', dayOfWeek);

      if (marketsError) throw marketsError;

      if (todaysMarkets && todaysMarkets.length > 0) {
        const marketsWithStats = await Promise.all(
          todaysMarkets.map(async (market: any) => {

            const taskStats = await fetchTaskStats(market.id, todayDate);
            
            // Get active sessions for this market
            const { data: sessionsData } = await supabase
              .from('sessions')
              .select('user_id')
              .eq('market_id', market.id)
              .eq('session_date', todayDate)
              .eq('status', 'active');
            
            const userIds = sessionsData?.map((s: any) => s.user_id).filter(Boolean) || [];
            let employeeNames: string[] = [];
            
            if (userIds.length > 0) {
              const { data: profilesData } = await supabase
                .from('profiles')
                .select('full_name')
                .in('id', userIds);
              
              employeeNames = profilesData?.map((p: any) => p.full_name).filter(Boolean) || [];
            }

            // Get counts
            const { count: stallsCount } = await supabase
              .from('stall_confirmations')
              .select('*', { count: 'exact', head: true })
              .eq('market_id', market.id)
              .eq('market_date', todayDate);

            const { count: mediaCount } = await supabase
              .from('media')
              .select('*', { count: 'exact', head: true })
              .eq('market_id', market.id)
              .eq('market_date', todayDate);
            
            return {
              market_id: market.id,
              market_name: market.name,
              city: market.city,
              active_sessions: sessionsData?.length || 0,
              active_employees: userIds.length,
              stall_confirmations_count: stallsCount || 0,
              media_uploads_count: mediaCount || 0,
              last_upload_time: null,
              last_punch_in: null,
              task_stats: taskStats,
              employee_names: employeeNames
            };
          })
        );
        
        setLiveMarkets(marketsWithStats.filter(m => m !== null) as LiveMarket[]);
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

  const fetchTaskData = async (marketId: string, marketName: string, taskType: string) => {
    const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    let data: any[] = [];

    console.log(`[${taskType}] Fetching data for market:`, marketId, marketName, todayDate);

    try {
      switch (taskType) {
        case 'stall_confirmations':
          const { data: confirmations } = await supabase
            .from('stall_confirmations')
            .select('*')
            .eq('market_id', marketId)
            .eq('market_date', todayDate)
            .order('created_at', { ascending: false });
          data = confirmations || [];
          console.log(`[${taskType}] Found ${data.length} records`);
          break;

        case 'offers':
          const { data: offersData } = await supabase
            .from('offers')
            .select('*')
            .eq('market_id', marketId)
            .eq('market_date', todayDate)
            .order('created_at', { ascending: false});
          
          if (offersData && offersData.length > 0) {
            const userIds = [...new Set(offersData.map(o => o.user_id).filter(Boolean))];
            const { data: employeesData } = await supabase
              .from('employees')
              .select('id, full_name')
              .in('id', userIds);
            
            const employeeMap = new Map(employeesData?.map(e => [e.id, e.full_name]) || []);
            data = offersData.map(o => ({
              ...o,
              employees: { full_name: employeeMap.get(o.user_id) }
            }));
          }
          console.log(`[${taskType}] Found ${data.length} records`);
          break;

        case 'commodities':
          const { data: commoditiesData } = await supabase
            .from('non_available_commodities')
            .select('*')
            .eq('market_id', marketId)
            .eq('market_date', todayDate)
            .order('created_at', { ascending: false });
          
          if (commoditiesData && commoditiesData.length > 0) {
            const userIds = [...new Set(commoditiesData.map(c => c.user_id).filter(Boolean))];
            const { data: employeesData } = await supabase
              .from('employees')
              .select('id, full_name')
              .in('id', userIds);
            
            const employeeMap = new Map(employeesData?.map(e => [e.id, e.full_name]) || []);
            data = commoditiesData.map(c => ({
              ...c,
              employees: { full_name: employeeMap.get(c.user_id) }
            }));
          }
          console.log(`[${taskType}] Found ${data.length} records`);
          break;

        case 'feedback':
          const { data: feedbackData } = await supabase
            .from('organiser_feedback')
            .select('*')
            .eq('market_id', marketId)
            .eq('market_date', todayDate)
            .order('created_at', { ascending: false });
          
          if (feedbackData && feedbackData.length > 0) {
            const userIds = [...new Set(feedbackData.map(f => f.user_id).filter(Boolean))];
            const { data: employeesData } = await supabase
              .from('employees')
              .select('id, full_name')
              .in('id', userIds);
            
            const employeeMap = new Map(employeesData?.map(e => [e.id, e.full_name]) || []);
            data = feedbackData.map(f => ({
              ...f,
              employees: { full_name: employeeMap.get(f.user_id) }
            }));
          }
          console.log(`[${taskType}] Found ${data.length} records`);
          break;

        case 'inspections':
          const { data: inspectionsData } = await supabase
            .from('stall_inspections')
            .select('*')
            .eq('market_id', marketId)
            .eq('market_date', todayDate)
            .order('created_at', { ascending: false });
          
          if (inspectionsData && inspectionsData.length > 0) {
            const userIds = [...new Set(inspectionsData.map(i => i.user_id).filter(Boolean))];
            const { data: employeesData } = await supabase
              .from('employees')
              .select('id, full_name')
              .in('id', userIds);
            
            const employeeMap = new Map(employeesData?.map(e => [e.id, e.full_name]) || []);
            data = inspectionsData.map(i => ({
              ...i,
              employees: { full_name: employeeMap.get(i.user_id) }
            }));
          }
          console.log(`[${taskType}] Found ${data.length} records`);
          break;

        case 'planning':
          // Get users who have sessions at this market on this date
          const { data: marketSessionsForPlanning } = await supabase
            .from('sessions')
            .select('user_id')
            .eq('market_id', marketId)
            .eq('session_date', todayDate);
          
          const sessionUserIds = marketSessionsForPlanning?.map(s => s.user_id).filter(Boolean) || [];
          
          if (sessionUserIds.length > 0) {
            const { data: planningData } = await supabase
              .from('next_day_planning')
              .select('*')
              .eq('current_market_date', todayDate)
              .in('user_id', sessionUserIds)
              .order('created_at', { ascending: false });
            
            if (planningData && planningData.length > 0) {
              const userIds = [...new Set(planningData.map(p => p.user_id).filter(Boolean))];
              const { data: employeesData } = await supabase
                .from('employees')
                .select('id, full_name')
                .in('id', userIds);
              
              const employeeMap = new Map(employeesData?.map(e => [e.id, e.full_name]) || []);
              data = planningData.map(p => ({
                ...p,
                employees: { full_name: employeeMap.get(p.user_id) }
              }));
            }
          }
          console.log(`[${taskType}] Found ${data.length} records`);
          break;

        case 'market_video':
          const { data: marketVideosData } = await supabase
            .from('media')
            .select('*')
            .eq('market_id', marketId)
            .eq('market_date', todayDate)
            .eq('media_type', 'market_video')
            .order('created_at', { ascending: false });
          
          if (marketVideosData && marketVideosData.length > 0) {
            const userIds = [...new Set(marketVideosData.map(m => m.user_id).filter(Boolean))];
            const { data: employeesData } = await supabase
              .from('employees')
              .select('id, full_name')
              .in('id', userIds);
            
            const employeeMap = new Map(employeesData?.map(e => [e.id, e.full_name]) || []);
            data = marketVideosData.map(m => ({
              ...m,
              employees: { full_name: employeeMap.get(m.user_id) }
            }));
          }
          console.log(`[${taskType}] Found ${data.length} records`);
          break;

        case 'cleaning_video':
          const { data: cleaningVideosData } = await supabase
            .from('media')
            .select('*')
            .eq('market_id', marketId)
            .eq('market_date', todayDate)
            .eq('media_type', 'cleaning_video')
            .order('created_at', { ascending: false });
          
          if (cleaningVideosData && cleaningVideosData.length > 0) {
            const userIds = [...new Set(cleaningVideosData.map(m => m.user_id).filter(Boolean))];
            const { data: employeesData } = await supabase
              .from('employees')
              .select('id, full_name')
              .in('id', userIds);
            
            const employeeMap = new Map(employeesData?.map(e => [e.id, e.full_name]) || []);
            data = cleaningVideosData.map(m => ({
              ...m,
              employees: { full_name: employeeMap.get(m.user_id) }
            }));
          }
          console.log(`[${taskType}] Found ${data.length} records`);
          break;

        case 'attendance':
          const { data: sessionsData } = await supabase
            .from('sessions')
            .select('*')
            .eq('market_id', marketId)
            .eq('session_date', todayDate)
            .order('punch_in_time', { ascending: false });
          
          if (sessionsData && sessionsData.length > 0) {
            const userIds = [...new Set(sessionsData.map(s => s.user_id).filter(Boolean))];
            const { data: employeesData } = await supabase
              .from('employees')
              .select('id, full_name')
              .in('id', userIds);
            
            const employeeMap = new Map(employeesData?.map(e => [e.id, e.full_name]) || []);
            data = sessionsData.map(s => ({
              ...s,
              employees: { full_name: employeeMap.get(s.user_id) }
            }));
          }
          console.log(`[${taskType}] Found ${data.length} records`);
          break;
      }

      console.log(`[${taskType}] Setting dialog with ${data.length} records`);
      setTaskDialog({ open: true, taskType, data, marketName });
    } catch (error) {
      console.error(`Error fetching ${taskType} data:`, error);
    }
  };

  const getTaskTitle = (taskType: string) => {
    const titles: Record<string, string> = {
      stall_confirmations: 'Stall Confirmations',
      offers: "Today's Offers",
      commodities: 'Non-Available Commodities',
      feedback: 'Organiser Feedback',
      inspections: 'Stall Inspections',
      planning: 'Next Day Planning',
      market_video: 'Market Videos',
      cleaning_video: 'Cleaning Videos',
      attendance: 'Attendance Records',
    };
    return titles[taskType] || taskType;
  };

  const renderTaskDialogContent = () => {
    const { taskType, data } = taskDialog;

    if (data.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">No data available</div>;
    }

    switch (taskType) {
      case 'stall_confirmations':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stall No</TableHead>
                <TableHead>Stall Name</TableHead>
                <TableHead>Farmer Name</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.stall_no}</TableCell>
                  <TableCell>{item.stall_name}</TableCell>
                  <TableCell>{item.farmer_name}</TableCell>
                  <TableCell className="text-xs">{format(new Date(item.created_at), 'HH:mm')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'offers':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commodity</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.commodity_name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.price ? `₹${item.price}` : 'N/A'}</TableCell>
                  <TableCell>{item.employees?.full_name || 'N/A'}</TableCell>
                  <TableCell className="text-xs">{format(new Date(item.created_at), 'HH:mm')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'commodities':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commodity Name</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.commodity_name}</TableCell>
                  <TableCell>{item.notes || '-'}</TableCell>
                  <TableCell>{item.employees?.full_name || 'N/A'}</TableCell>
                  <TableCell className="text-xs">{format(new Date(item.created_at), 'HH:mm')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'feedback':
        return (
          <div className="space-y-4">
            {data.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-sm">{item.employees?.full_name || 'Unknown'}</CardTitle>
                  <CardDescription>{format(new Date(item.created_at), 'HH:mm')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {item.difficulties && (
                    <div className="mb-2">
                      <strong>Difficulties:</strong> {item.difficulties}
                    </div>
                  )}
                  {item.feedback && (
                    <div>
                      <strong>Feedback:</strong> {item.feedback}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'inspections':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Farmer Name</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => {
                const items = [];
                if (item.has_tent) items.push('Tent');
                if (item.has_table) items.push('Table');
                if (item.has_green_net) items.push('Green Net');
                if (item.has_flex) items.push('Flex');
                if (item.has_rateboard) items.push('Rate Board');
                if (item.has_light) items.push('Light');
                if (item.has_apron) items.push('Apron');
                if (item.has_display) items.push('Display');
                if (item.has_digital_weighing_machine) items.push('Weighing Machine');
                if (item.has_mat) items.push('Mat');
                if (item.has_cap) items.push('Cap');

                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.farmer_name}</TableCell>
                    <TableCell>{item.employees?.full_name || 'N/A'}</TableCell>
                    <TableCell>{items.join(', ') || 'None'}</TableCell>
                    <TableCell className="text-xs">{format(new Date(item.created_at), 'HH:mm')}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        );

      case 'planning':
        return (
          <div className="space-y-4">
            {data.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-sm">{item.next_day_market_name}</CardTitle>
                  <CardDescription>
                    By {item.employees?.full_name || 'Unknown'} at {format(new Date(item.created_at), 'HH:mm')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap">{item.stall_list}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'market_video':
      case 'cleaning_video':
        return (
          <div className="space-y-4">
            {data.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-sm">{item.employees?.full_name || 'Unknown'}</CardTitle>
                  <CardDescription>{format(new Date(item.created_at), 'HH:mm')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <video controls className="w-full rounded-md">
                    <source src={item.file_url} type={item.content_type} />
                    Your browser does not support the video tag.
                  </video>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'attendance':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Punch In</TableHead>
                <TableHead>Punch Out</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.employees?.full_name || 'N/A'}</TableCell>
                  <TableCell>{item.punch_in_time ? format(new Date(item.punch_in_time), 'HH:mm') : 'N/A'}</TableCell>
                  <TableCell>{item.punch_out_time ? format(new Date(item.punch_out_time), 'HH:mm') : 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      default:
        return <div>Unknown task type</div>;
    }
  };

  const renderTaskChecklist = (market: LiveMarket) => {
    const tasks = [
      { 
        label: 'Punch-in Time', 
        completed: !!market.last_punch_in,
        value: market.last_punch_in ? formatTime(market.last_punch_in) : null,
        taskType: 'attendance',
        onClick: () => fetchTaskData(market.market_id, market.market_name, 'attendance')
      },
      { 
        label: 'Selfie Uploaded', 
        completed: market.task_stats ? market.task_stats.attendance > 0 : false,
        taskType: 'attendance',
        onClick: () => fetchTaskData(market.market_id, market.market_name, 'attendance')
      },
      { 
        label: 'Stall Confirmations', 
        completed: market.stall_confirmations_count > 0,
        value: market.stall_confirmations_count > 0 ? `${market.stall_confirmations_count} stalls` : null,
        taskType: 'stall_confirmations',
        onClick: () => fetchTaskData(market.market_id, market.market_name, 'stall_confirmations')
      },
      { 
        label: "Today's Offers", 
        completed: market.task_stats ? market.task_stats.offers > 0 : false,
        value: market.task_stats && market.task_stats.offers > 0 ? `${market.task_stats.offers} items` : null,
        taskType: 'offers',
        onClick: () => fetchTaskData(market.market_id, market.market_name, 'offers')
      },
      { 
        label: 'Non-Available Commodities', 
        completed: market.task_stats ? market.task_stats.commodities > 0 : false,
        value: market.task_stats && market.task_stats.commodities > 0 ? `${market.task_stats.commodities} items` : null,
        taskType: 'commodities',
        onClick: () => fetchTaskData(market.market_id, market.market_name, 'commodities')
      },
      { 
        label: 'Organiser Feedback', 
        completed: market.task_stats ? market.task_stats.feedback > 0 : false,
        taskType: 'feedback',
        onClick: () => fetchTaskData(market.market_id, market.market_name, 'feedback')
      },
      { 
        label: 'Stall Inspection', 
        completed: market.task_stats ? market.task_stats.inspections > 0 : false,
        value: market.task_stats && market.task_stats.inspections > 0 ? `${market.task_stats.inspections} stalls` : null,
        taskType: 'inspections',
        onClick: () => fetchTaskData(market.market_id, market.market_name, 'inspections')
      },
      { 
        label: 'Next Day Planning', 
        completed: market.task_stats ? market.task_stats.planning > 0 : false,
        taskType: 'planning',
        onClick: () => fetchTaskData(market.market_id, market.market_name, 'planning')
      },
      { 
        label: 'Market Video', 
        completed: market.task_stats ? market.task_stats.market_video > 0 : false,
        taskType: 'market_video',
        onClick: () => fetchTaskData(market.market_id, market.market_name, 'market_video')
      },
      { 
        label: 'Cleaning Video', 
        completed: market.task_stats ? market.task_stats.cleaning_video > 0 : false,
        taskType: 'cleaning_video',
        onClick: () => fetchTaskData(market.market_id, market.market_name, 'cleaning_video')
      },
    ];

    return (
      <div className="space-y-1.5">
        {tasks.map((task, index) => (
          <div 
            key={index} 
            className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 px-1.5 py-1 rounded transition-colors"
            onClick={task.onClick}
          >
            <Checkbox checked={task.completed} disabled className="pointer-events-none h-3.5 w-3.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium leading-tight truncate">{task.label}</div>
              {task.value && (
                <div className="text-[10px] text-muted-foreground leading-tight">{task.value}</div>
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Live Markets Today</h2>
            <Badge variant="outline" className="text-xs px-2 py-0.5">{liveMarkets.length} Active</Badge>
          </div>

          {liveMarkets.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-24">
                <p className="text-sm text-muted-foreground">
                  {isISTMonday() ? 'Markets are closed on Mondays' : 'No active markets today'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2.5">
              {liveMarkets.map((market) => (
                <Card key={market.market_id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="grid md:grid-cols-2 gap-2 md:gap-3 p-3">
                    {/* Left Column: Market Info */}
                    <div className="space-y-2">
                      <div 
                        className="cursor-pointer"
                        onClick={() => navigate(`/admin/market/${market.market_id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-semibold leading-tight">{market.market_name}</h3>
                          <Badge variant="default" className="ml-2 text-[10px] px-1.5 py-0 h-5">{market.active_sessions} active</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {market.city || 'N/A'}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>Employees</span>
                        </div>
                        <p className="text-lg font-bold leading-tight">{market.active_employees}</p>
                        {market.employee_names && market.employee_names.length > 0 ? (
                          <p className="text-[11px] text-foreground font-medium leading-tight">{market.employee_names.join(', ')}</p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">No employee data</p>
                        )}
                      </div>

                      <div className="pt-1 border-t">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Last upload: {formatTime(market.last_upload_time)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Task Status */}
                    <div className="md:border-l md:pl-3 space-y-1.5">
                      <h4 className="text-xs font-semibold">Task Status</h4>
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

        <Dialog open={taskDialog.open} onOpenChange={(open) => setTaskDialog({ ...taskDialog, open })}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {getTaskTitle(taskDialog.taskType)} - {taskDialog.marketName}
              </DialogTitle>
            </DialogHeader>
            {renderTaskDialogContent()}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
