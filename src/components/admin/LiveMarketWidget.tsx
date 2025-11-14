import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Users, Store, Image, AlertCircle, ArrowRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

interface LiveMarketSummary {
  market_id: string;
  market_name: string;
  active_employees: number;
  stalls_confirmed: number;
  media_uploaded: number;
  late_uploads: number;
  employees: EmployeeStatus[];
}

export default function LiveMarketWidget() {
  const [summary, setSummary] = useState<LiveMarketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSummary();
    
    const channel = supabase
      .channel('live-market-widget')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, fetchSummary)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stall_confirmations' }, fetchSummary)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, fetchSummary)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_schedule' }, fetchSummary)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSummary = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('live_markets_today')
        .select('market_id, market_name, active_employees, stall_confirmations_count, media_uploads_count');

      if (error) throw error;

      const summaries: LiveMarketSummary[] = await Promise.all(
        (data || []).map(async (row: any) => {
          // Fetch employee details for this market
          const { data: sessionsData } = await supabase
            .from('sessions')
            .select(`
              id,
              user_id,
              punch_in_time,
              punch_out_time,
              status,
              profiles:user_id (full_name)
            `)
            .eq('market_id', row.market_id)
            .eq('session_date', today);

          // Fetch attendance records to determine status
          const { data: attendanceData } = await supabase
            .from('attendance_records')
            .select('user_id, status, completed_tasks, total_tasks')
            .eq('market_id', row.market_id)
            .eq('attendance_date', today);

          const employees: EmployeeStatus[] = (sessionsData || []).map((session: any) => {
            const attendance = attendanceData?.find((a: any) => a.user_id === session.user_id);
            const fullName = session.profiles?.full_name || 'Unknown';
            const nameParts = fullName.split(' ');
            const initials = nameParts.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

            let status: 'active' | 'half_day' | 'completed' = 'active';
            if (session.status === 'completed' || session.punch_out_time) {
              status = 'completed';
            } else if (attendance?.status === 'half_day') {
              status = 'half_day';
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

          return {
            market_id: row.market_id,
            market_name: row.market_name,
            active_employees: row.active_employees || 0,
            stalls_confirmed: row.stall_confirmations_count || 0,
            media_uploaded: row.media_uploads_count || 0,
            late_uploads: 0,
            employees,
          };
        })
      );

      setSummary(summaries);
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Live Markets Today</CardTitle>
            <CardDescription>Real-time activity across all markets</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/live-market')}>
            View Full Monitor
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {summary.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active markets today
            </div>
          ) : (
            summary.map((market, idx) => (
              <div key={idx} className="flex flex-col p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{market.market_name}</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{market.active_employees} employees</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-primary" />
                    <span>{market.stalls_confirmed} stalls</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-primary" />
                    <span>{market.media_uploaded} uploads</span>
                  </div>
                  {market.late_uploads > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <Badge variant="destructive" className="text-xs">
                        {market.late_uploads} late
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Employee List */}
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-2">Active Employees:</p>
                  {market.employees.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No active employees</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {market.employees.map((employee) => (
                        <HoverCard key={employee.id}>
                          <HoverCardTrigger asChild>
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted hover:bg-muted/80 cursor-pointer transition-colors">
                              <span className={`h-2 w-2 rounded-full ${
                                employee.status === 'active' ? 'bg-success' :
                                employee.status === 'half_day' ? 'bg-warning' :
                                'bg-destructive'
                              }`} />
                              <span className="text-xs font-medium">{employee.initials}</span>
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold">{employee.name}</h4>
                                <Badge variant={
                                  employee.status === 'active' ? 'default' :
                                  employee.status === 'half_day' ? 'secondary' :
                                  'outline'
                                }>
                                  {employee.status === 'active' ? '🟢 Active' :
                                   employee.status === 'half_day' ? '🟡 Half Day' :
                                   '🔴 Completed'}
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
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
