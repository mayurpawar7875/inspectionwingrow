import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Building2, ClipboardList, MapPin, TrendingUp, Activity, ChevronRight, Clock, Upload, Calendar } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { format } from 'date-fns';

interface EmployeeStatus {
  id: string;
  name: string;
  initials: string;
  status: 'active' | 'half_day' | 'completed';
  punch_in_time: string | null;
  punch_out_time: string | null;
  duration: number | null;
  completed_tasks: number;
  total_tasks: number;
}

interface LiveMarket {
  market_id: string;
  market_name: string;
  city: string | null;
  active_sessions: number;
  active_employees: number;
  employee_names: string[];
  employees: EmployeeStatus[];
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
    collections: number;
    selfie_gps: number;
  };
}

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [bdoStats, setBdoStats] = useState({
    pending: 0,
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, fetchLiveMarkets)
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

      const { count: selfieGpsCount } = await supabase
        .from('media')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketId)
        .eq('market_date', todayDate)
        .eq('media_type', 'selfie_gps');

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

    const { count: collectionsCount } = await supabase
      .from('collections')
      .select('*', { count: 'exact', head: true })
      .eq('market_id', marketId)
      .eq('market_date', todayDate);

    return {
      attendance: attendanceCount || 0,
      stall_confirmations: stallsCount || 0,
      market_video: marketVideoCount || 0,
      cleaning_video: cleaningVideoCount || 0,
      selfie_gps: selfieGpsCount || 0,
      offers: offersCount || 0,
      commodities: commoditiesCount || 0,
      feedback: feedbackCount || 0,
      inspections: inspectionsCount || 0,
      planning: planningCount || 0,
      collections: collectionsCount || 0,
    };
    } catch (error) {
      console.error('Error fetching task stats:', error);
      return {
        attendance: 0,
        stall_confirmations: 0,
        market_video: 0,
        cleaning_video: 0,
        selfie_gps: 0,
        offers: 0,
        commodities: 0,
        feedback: 0,
        inspections: 0,
        planning: 0,
        collections: 0,
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
        // Fetch all recent activity times for markets today
        const marketIds = todaysMarkets.map(m => m.id);
        
        // Get latest media uploads per market
        const { data: mediaActivity } = await supabase
          .from('media')
          .select('market_id, captured_at')
          .in('market_id', marketIds)
          .gte('market_date', todayDate)
          .order('captured_at', { ascending: false });
        
        // Get latest stall confirmations per market
        const { data: stallActivity } = await supabase
          .from('stall_confirmations')
          .select('market_id, created_at')
          .in('market_id', marketIds)
          .gte('market_date', todayDate)
          .order('created_at', { ascending: false });
        
        // Find the latest activity time for each market
        const lastTaskByMarket: Record<string, string> = {};
        
        mediaActivity?.forEach(item => {
          if (!lastTaskByMarket[item.market_id] || item.captured_at > lastTaskByMarket[item.market_id]) {
            lastTaskByMarket[item.market_id] = item.captured_at;
          }
        });
        
        stallActivity?.forEach(item => {
          if (!lastTaskByMarket[item.market_id] || item.created_at > lastTaskByMarket[item.market_id]) {
            lastTaskByMarket[item.market_id] = item.created_at;
          }
        });
        
        const marketsWithStats = await Promise.all(
          todaysMarkets.map(async (market: any) => {

            const taskStats = await fetchTaskStats(market.id, todayDate);
            
            // Get all sessions for this market today
            const { data: sessionsData } = await supabase
              .from('sessions')
              .select('id, user_id, punch_in_time, punch_out_time, status')
              .eq('market_id', market.id)
              .eq('session_date', todayDate);

            // Fetch employee details
            const userIds = sessionsData?.map((s: any) => s.user_id).filter(Boolean) || [];
            let employeeDetailsMap = new Map();
            
            if (userIds.length > 0) {
              const { data: employeesData } = await supabase
                .from('employees')
                .select('id, full_name')
                .in('id', userIds);
              
              employeeDetailsMap = new Map(employeesData?.map(e => [e.id, e.full_name]) || []);
            }

            // Fetch attendance records to determine status
            const { data: attendanceData } = await supabase
              .from('attendance_records')
              .select('user_id, status, completed_tasks, total_tasks')
              .eq('market_id', market.id)
              .eq('attendance_date', todayDate);

            const employees: EmployeeStatus[] = (sessionsData || []).map((session: any) => {
              const attendance = attendanceData?.find((a: any) => a.user_id === session.user_id);
              const fullName = employeeDetailsMap.get(session.user_id) || 'Unknown';
              const nameParts = fullName.split(' ');
              const initials = nameParts.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

              const completedTasks = attendance?.completed_tasks || 0;
              const totalTasks = attendance?.total_tasks || 0;

              // Determine status based on task completion
              let status: 'active' | 'half_day' | 'completed' = 'active';
              if (totalTasks > 0 && completedTasks === totalTasks) {
                status = 'completed';
              } else if (completedTasks > 0 && completedTasks < totalTasks) {
                status = 'half_day'; // This represents 'incomplete'
              }

              const duration = session.punch_in_time && session.punch_out_time
                ? Math.floor((new Date(session.punch_out_time).getTime() - new Date(session.punch_in_time).getTime()) / (1000 * 60))
                : null;

              return {
                id: session.user_id,
                name: fullName,
                initials,
                status,
                punch_in_time: session.punch_in_time,
                punch_out_time: session.punch_out_time,
                duration,
                completed_tasks: attendance?.completed_tasks || 0,
                total_tasks: attendance?.total_tasks || 0,
              };
            });

            const employeeNames = employees.map(e => e.name);

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
              active_employees: employees.filter(e => e.status === 'active').length,
              stall_confirmations_count: stallsCount || 0,
              media_uploads_count: mediaCount || 0,
              last_upload_time: lastTaskByMarket[market.id] || null,
              last_punch_in: null,
              task_stats: taskStats,
              employee_names: employeeNames,
              employees: employees
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

        case 'collections':
          const { data: collectionsData } = await supabase
            .from('collections')
            .select('*')
            .eq('market_id', marketId)
            .eq('market_date', todayDate)
            .order('created_at', { ascending: false });
          
          if (collectionsData && collectionsData.length > 0) {
            const userIds = [...new Set(collectionsData.map(c => c.collected_by).filter(Boolean))];
            const { data: employeesData } = await supabase
              .from('employees')
              .select('id, full_name')
              .in('id', userIds);
            
            const employeeMap = new Map(employeesData?.map(e => [e.id, e.full_name]) || []);
            data = collectionsData.map(c => ({
              ...c,
              employees: { full_name: employeeMap.get(c.collected_by) }
            }));
          }
          console.log(`[${taskType}] Found ${data.length} records`);
          break;

        case 'selfie_gps':
          const { data: selfieData } = await supabase
            .from('media')
            .select('*')
            .eq('market_id', marketId)
            .eq('market_date', todayDate)
            .eq('media_type', 'selfie_gps')
            .order('created_at', { ascending: false });
          
          if (selfieData && selfieData.length > 0) {
            const userIds = [...new Set(selfieData.map(m => m.user_id).filter(Boolean))];
            const { data: employeesData } = await supabase
              .from('employees')
              .select('id, full_name')
              .in('id', userIds);
            
            const employeeMap = new Map(employeesData?.map(e => [e.id, e.full_name]) || []);
            data = selfieData.map(m => ({
              ...m,
              employees: { full_name: employeeMap.get(m.user_id) }
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
      collections: 'Collections',
      selfie_gps: 'Selfie GPS Uploads',
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

      case 'selfie_gps':
        return (
          <div className="space-y-4">
            {data.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-sm">{item.employees?.full_name || 'Unknown'}</CardTitle>
                  <CardDescription>
                    {format(new Date(item.created_at), 'HH:mm')}
                    {item.gps_lat && item.gps_lng && (
                      <span className="ml-2 text-xs">
                        ({item.gps_lat.toFixed(6)}, {item.gps_lng.toFixed(6)})
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {item.file_url ? (
                    <div className="space-y-2">
                      <img 
                        src={item.file_url} 
                        alt="Employee Selfie" 
                        className="w-full rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(item.file_url, '_blank')}
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pjwvc3ZnPg==';
                        }}
                      />
                      <p className="text-xs text-muted-foreground">Click image to view full size</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No selfie available</p>
                  )}
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
                  <CardDescription>
                    {format(new Date(item.created_at), 'HH:mm')}
                  </CardDescription>
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

      case 'collections':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Collected By</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.employees?.full_name || 'N/A'}</TableCell>
                  <TableCell>₹{item.amount}</TableCell>
                  <TableCell>
                    <Badge variant={item.mode === 'cash' ? 'default' : 'secondary'}>
                      {item.mode}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{format(new Date(item.created_at), 'HH:mm')}</TableCell>
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
        label: 'Employees Checked In', 
        completed: market.task_stats ? market.task_stats.attendance > 0 : false,
        value: market.task_stats && market.task_stats.attendance > 0 ? `${market.task_stats.attendance} checked in` : null,
        taskType: 'attendance',
        onClick: () => fetchTaskData(market.market_id, market.market_name, 'attendance')
      },
      { 
        label: 'Stall Confirmation', 
        completed: market.task_stats ? market.task_stats.stall_confirmations > 0 : false,
        value: market.task_stats && market.task_stats.stall_confirmations > 0 ? `${market.task_stats.stall_confirmations} confirmed` : null,
        taskType: 'stall_confirmations',
        onClick: () => fetchTaskData(market.market_id, market.market_name, 'stall_confirmations')
      },
      { 
        label: 'Selfie GPS', 
        completed: market.task_stats ? market.task_stats.selfie_gps > 0 : false,
        value: market.task_stats && market.task_stats.selfie_gps > 0 ? `${market.task_stats.selfie_gps} uploaded` : null,
        taskType: 'selfie_gps',
        onClick: () => fetchTaskData(market.market_id, market.market_name, 'selfie_gps')
      },
      { 
        label: 'Today\'s Offer', 
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
      { 
        label: 'Collection', 
        completed: market.task_stats ? market.task_stats.collections > 0 : false,
        value: market.task_stats && market.task_stats.collections > 0 ? `${market.task_stats.collections} collected` : null,
        taskType: 'collections',
        onClick: () => fetchTaskData(market.market_id, market.market_name, 'collections')
      },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
        {tasks.map((task, index) => (
          <div 
            key={index} 
            className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 px-1.5 py-1 rounded transition-colors"
            onClick={task.onClick}
          >
            <Checkbox checked={task.completed} disabled className="pointer-events-none h-3.5 w-3.5 shrink-0" />
            <div className="flex-1">
              <div className="text-xs font-medium leading-tight">{task.label}</div>
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
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Wingrow Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">Real-time reporting and analytics</p>
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
                  <div className="grid md:grid-cols-[38%_62%] gap-2 md:gap-3 p-3">
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
                          <span>Employees ({market.employees.length})</span>
                        </div>
                        {market.employees.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground italic">No active employees</p>
                        ) : (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {market.employees.map((employee) => (
                              <HoverCard key={employee.id}>
                                <HoverCardTrigger asChild>
                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted hover:bg-muted/80 cursor-pointer transition-colors">
                                    <span className={`h-2 w-2 rounded-full ${
                                      employee.status === 'active' ? 'bg-green-500' :
                                      employee.status === 'half_day' ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`} />
                                    <span className="text-xs font-medium">{employee.initials}</span>
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-80">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-semibold">{employee.name}</h4>
                                      <Badge variant={
                                        employee.status === 'completed' ? 'default' :
                                        employee.status === 'half_day' ? 'secondary' :
                                        'outline'
                                      }>
                                        {employee.status === 'completed' ? '🟢 Completed' :
                                         employee.status === 'half_day' ? '🟡 Incomplete' :
                                         '🔴 Active'}
                                      </Badge>
                                    </div>
                                    
                                    <div className="space-y-1.5 text-sm">
                                      {employee.punch_in_time && (
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-3 w-3 text-muted-foreground" />
                                          <span className="text-muted-foreground">Punch In:</span>
                                          <span className="font-medium">
                                            {format(new Date(employee.punch_in_time), 'hh:mm a')}
                                          </span>
                                        </div>
                                      )}
                                      
                                      {employee.punch_out_time && (
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-3 w-3 text-muted-foreground" />
                                          <span className="text-muted-foreground">Punch Out:</span>
                                          <span className="font-medium">
                                            {format(new Date(employee.punch_out_time), 'hh:mm a')}
                                          </span>
                                        </div>
                                      )}
                                      
                                      {employee.duration && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">Duration:</span>
                                          <span className="font-medium">
                                            {Math.floor(employee.duration / 60)}h {employee.duration % 60}m
                                          </span>
                                        </div>
                                      )}
                                      
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Task Progress:</span>
                                        <span className="font-medium">
                                          {employee.completed_tasks}/{employee.total_tasks}
                                        </span>
                                        {employee.total_tasks > 0 && (
                                          <span className="text-xs text-muted-foreground">
                                            ({Math.round((employee.completed_tasks / employee.total_tasks) * 100)}%)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            ))}
                          </div>
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

          <Card 
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
            onClick={() => navigate('/admin/attendance')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Attendance reports</p>
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
