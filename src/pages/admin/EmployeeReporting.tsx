import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import RealtimeMediaFeed from '@/components/admin/RealtimeMediaFeed';
import EmployeeTimeline from '@/components/admin/EmployeeTimeline';
import TaskProgressWidget from '@/components/admin/TaskProgressWidget';
import CollectionsWidget from '@/components/admin/CollectionsWidget';
import StallConfirmationsWidget from '@/components/admin/StallConfirmationsWidget';

export default function EmployeeReporting() {
  const navigate = useNavigate();
  const { marketId } = useParams<{ marketId: string }>();
  const [marketName, setMarketName] = useState('');
  const [cityName, setCityName] = useState('');
  const [stats, setStats] = useState({
    activeSessions: 0,
    completedToday: 0,
    totalMediaUploads: 0,
    totalCollections: 0,
  });

  useEffect(() => {
    if (marketId) {
      fetchMarketInfo();
    }
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
  }, [marketId]);

  const fetchMarketInfo = async () => {
    if (!marketId) return;
    
    try {
      const { data } = await supabase
        .from('markets')
        .select('name, city')
        .eq('id', marketId)
        .single();
      
      if (data) {
        setMarketName(data.name);
        setCityName(data.city || '');
      }
    } catch (error) {
      console.error('Error fetching market info:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Employee-specific data: Sessions, media uploads, and collections by field staff
      // Filter by marketId if provided
      const sessionsQuery = supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('session_date', today);
      
      const completedQuery = supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('session_date', today)
        .in('status', ['completed', 'finalized']);
      
      const mediaQuery = supabase
        .from('media')
        .select('id', { count: 'exact', head: true })
        .eq('market_date', today);
      
      const collectionsQuery = supabase
        .from('collections')
        .select('amount')
        .eq('market_date', today);

      if (marketId) {
        sessionsQuery.eq('market_id', marketId);
        completedQuery.eq('market_id', marketId);
        mediaQuery.eq('market_id', marketId);
        collectionsQuery.eq('market_id', marketId);
      }

      const [sessionsRes, completedRes, mediaRes, collectionsRes] = await Promise.all([
        sessionsQuery,
        completedQuery,
        mediaQuery,
        collectionsQuery,
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
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => marketId ? navigate(`/admin/employee-reporting/city/${encodeURIComponent(cityName)}`) : navigate('/admin')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {marketId ? 'Back to Markets' : 'Back to Dashboard'}
        </Button>
        <div className="flex-1">
          {marketId && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <span 
                className="cursor-pointer hover:text-primary" 
                onClick={() => navigate('/admin/employee-reporting')}
              >
                Employee Reporting
              </span>
              <ChevronRight className="h-4 w-4" />
              <span 
                className="cursor-pointer hover:text-primary" 
                onClick={() => navigate(`/admin/employee-reporting/city/${encodeURIComponent(cityName)}`)}
              >
                {cityName}
              </span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground font-medium">{marketName}</span>
            </div>
          )}
          <h2 className="text-3xl font-bold">
            {marketId ? `${marketName} - Live Employee Report` : 'Employee Real-Time Reporting'}
          </h2>
          <p className="text-muted-foreground">
            {marketId ? 'Real-time employee activities for this market' : 'Monitor employee activities and submissions'}
          </p>
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
