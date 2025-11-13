import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  role: string;
  market_id: string;
  city: string;
  total_tasks: number;
  completed_tasks: number;
  status: 'full_day' | 'half_day' | 'absent' | 'weekly_off';
  market_name?: string;
}

export default function MyAttendance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyAttendance();
      subscribeToUpdates();
    }
  }, [user]);

  const fetchMyAttendance = async () => {
    if (!user) return;
    
    setLoading(true);
    
    // Fetch last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', user.id)
      .gte('attendance_date', format(thirtyDaysAgo, 'yyyy-MM-dd'))
      .order('attendance_date', { ascending: false });
    
    if (error) {
      toast.error('Failed to fetch attendance records');
      setLoading(false);
      return;
    }
    
    // Fetch market names
    if (data && data.length > 0) {
      const marketIds = [...new Set(data.map(r => r.market_id).filter(Boolean))];
      
      if (marketIds.length > 0) {
        const { data: marketsData } = await supabase
          .from('markets')
          .select('id, name')
          .in('id', marketIds);
        
        const marketMap = new Map(marketsData?.map(m => [m.id, m.name]) || []);
        
        const enrichedData = data.map(record => ({
          ...record,
          market_name: record.market_id ? marketMap.get(record.market_id) || 'N/A' : 'N/A',
        }));
        
        setRecords(enrichedData);
      } else {
        setRecords(data);
      }
    } else {
      setRecords([]);
    }
    
    setLoading(false);
  };

  const subscribeToUpdates = () => {
    if (!user) return;
    
    const channel = supabase
      .channel('my-attendance')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchMyAttendance();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'full_day':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Full Day</Badge>;
      case 'half_day':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Half Day</Badge>;
      case 'absent':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Absent</Badge>;
      case 'weekly_off':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Weekly Off</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusSummary = () => {
    const fullDays = records.filter(r => r.status === 'full_day').length;
    const halfDays = records.filter(r => r.status === 'half_day').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const weeklyOffs = records.filter(r => r.status === 'weekly_off').length;
    
    return { fullDays, halfDays, absent, weeklyOffs };
  };

  const summary = getStatusSummary();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">My Attendance</h1>
            <p className="text-muted-foreground">View your attendance records for the last 30 days</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Full Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.fullDays}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Half Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{summary.halfDays}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Absent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.absent}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Offs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{summary.weeklyOffs}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Attendance Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : records.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No attendance records found
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Market</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead className="text-center">Tasks</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {format(new Date(record.attendance_date), 'MMM dd, yyyy (EEE)')}
                        </TableCell>
                        <TableCell className="capitalize">{record.role.replace('_', ' ')}</TableCell>
                        <TableCell>{record.market_name || 'N/A'}</TableCell>
                        <TableCell>{record.city || 'N/A'}</TableCell>
                        <TableCell className="text-center">
                          {record.completed_tasks} / {record.total_tasks}
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
