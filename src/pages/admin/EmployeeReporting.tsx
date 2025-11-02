import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import RealtimeMediaFeed from '@/components/admin/RealtimeMediaFeed';
import EmployeeTimeline from '@/components/admin/EmployeeTimeline';
import TaskProgressWidget from '@/components/admin/TaskProgressWidget';
import CollectionsWidget from '@/components/admin/CollectionsWidget';
import StallConfirmationsWidget from '@/components/admin/StallConfirmationsWidget';

export default function EmployeeReporting() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeSessions: 0,
    completedToday: 0,
    totalMediaUploads: 0,
    totalCollections: 0,
  });

  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel('employee-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [sessionsRes, completedRes, mediaRes, collectionsRes] = await Promise.all([
        supabase
          .from('sessions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .eq('session_date', today),
        supabase
          .from('sessions')
          .select('id', { count: 'exact', head: true })
          .eq('session_date', today)
          .in('status', ['completed', 'finalized']),
        supabase.from('media').select('id', { count: 'exact', head: true }).eq('market_date', today),
        supabase.from('collections').select('amount').eq('market_date', today),
      ]);

      const totalCollections = (collectionsRes.data || []).reduce(
        (sum, c) => sum + Number(c.amount || 0),
        0
      );

      setStats({
        activeSessions: sessionsRes.count || 0,
        completedToday: completedRes.count || 0,
        totalMediaUploads: mediaRes.count || 0,
        totalCollections,
      });
    } catch (error) {
      console.error('Error fetching employee stats:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h2 className="text-3xl font-bold">Employee Real-Time Reporting</h2>
          <p className="text-muted-foreground">Monitor employee activities and submissions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{stats.activeSessions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.completedToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Media Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalMediaUploads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{stats.totalCollections.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <RealtimeMediaFeed />

      <EmployeeTimeline />

      <TaskProgressWidget />

      <div className="grid gap-6 md:grid-cols-2">
        <CollectionsWidget />
        <StallConfirmationsWidget />
      </div>
    </div>
  );
}
