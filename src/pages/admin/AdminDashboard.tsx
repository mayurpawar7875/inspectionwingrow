import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, CheckCircle, Clock } from 'lucide-react';
import LiveMarketsWidget from '@/components/admin/LiveMarketsWidget';
import RealtimeMediaFeed from '@/components/admin/RealtimeMediaFeed';
import CollectionsWidget from '@/components/admin/CollectionsWidget';
import StallConfirmationsWidget from '@/components/admin/StallConfirmationsWidget';
import EmployeeTimeline from '@/components/admin/EmployeeTimeline';
import TaskProgressWidget from '@/components/admin/TaskProgressWidget';

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSessions: 0,
    todaySessions: 0,
    finalizedToday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchStats();

    const channel = supabase
      .channel('dashboard-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, navigate]);

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [usersRes, sessionsRes, todaySessionsRes, finalizedRes] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('sessions').select('id', { count: 'exact', head: true }),
        supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('session_date', today),
        supabase
          .from('sessions')
          .select('id', { count: 'exact', head: true })
          .eq('session_date', today)
          .in('status', ['completed', 'finalized']),
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalSessions: sessionsRes.count || 0,
        todaySessions: todaySessionsRes.count || 0,
        finalizedToday: finalizedRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Active Employees',
      value: stats.totalUsers,
      icon: Users,
      description: 'Total active users',
      onClick: () => navigate('/admin/users'),
    },
    {
      title: 'Total Sessions',
      value: stats.totalSessions,
      icon: FileText,
      description: 'All-time sessions',
      onClick: () => navigate('/admin/sessions'),
    },
    {
      title: "Today's Sessions",
      value: stats.todaySessions,
      icon: Clock,
      description: 'Active today',
      onClick: () => navigate('/admin/sessions', { state: { filterToday: true } }),
    },
    {
      title: 'Completed Today',
      value: stats.finalizedToday,
      icon: CheckCircle,
      description: 'Sessions finalized',
      onClick: () => navigate('/admin/sessions', { state: { filterCompleted: true } }),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard Overview</h2>
        <p className="text-muted-foreground">Real-time operations monitoring</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat) => (
          <Card 
            key={stat.title} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={stat.onClick}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <LiveMarketsWidget />
      
      <RealtimeMediaFeed />

      <EmployeeTimeline />
      
      <TaskProgressWidget />

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <CollectionsWidget />
        <StallConfirmationsWidget />
      </div>
    </div>
  );
}
