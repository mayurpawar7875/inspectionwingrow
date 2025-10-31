import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, Eye, Users, Store, Image, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Market {
  id: string;
  name: string;
  city: string;
}

interface EmployeeOnDuty {
  employee_id: string;
  employee_name: string;
  session_id: string;
  punch_in: string | null;
  punch_out: string | null;
  last_activity: string | null;
  tasks_done: number;
}

interface StallConfirmation {
  id: string;
  created_at: string;
  farmer_name: string;
  stall_name: string;
  stall_no: string;
  created_by: string;
  employee_name: string;
}

interface MediaUpload {
  id: string;
  uploaded_at: string;
  employee_name: string;
  file_type: string;
  is_late: boolean;
  file_url: string;
}

interface KPIs {
  active_employees: number;
  stalls_confirmed: number;
  media_uploaded: number;
  late_uploads: number;
}

export default function LiveMarket() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [kpis, setKpis] = useState<KPIs>({ active_employees: 0, stalls_confirmed: 0, media_uploaded: 0, late_uploads: 0 });
  const [employeesOnDuty, setEmployeesOnDuty] = useState<EmployeeOnDuty[]>([]);
  const [stallConfirmations, setStallConfirmations] = useState<StallConfirmation[]>([]);
  const [mediaUploads, setMediaUploads] = useState<MediaUpload[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOnDuty | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkets();
  }, []);

  useEffect(() => {
    if (selectedMarket) {
      fetchAllData();
      setupRealtimeSubscriptions();
    }
  }, [selectedMarket, selectedDate]);

  const fetchMarkets = async () => {
    try {
      const { data, error } = await supabase
        .from('markets')
        .select('id, name, city')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setMarkets(data || []);
      if (data && data.length > 0) {
        setSelectedMarket(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching markets:', error);
      toast.error('Failed to load markets');
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchEmployeesOnDuty(),
      fetchStallConfirmations(),
      fetchMediaUploads(),
      fetchKPIs()
    ]);
    setLoading(false);
  };

  const fetchEmployeesOnDuty = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select(`
          id,
          user_id,
          punch_in_time,
          punch_out_time,
          profiles!inner(full_name)
        `)
        .eq('market_id', selectedMarket)
        .eq('session_date', dateStr)
        .in('status', ['active', 'completed', 'finalized']);

      if (error) throw error;

      const employeeData = await Promise.all(
        (sessions || []).map(async (session: any) => {
          // Get task events count
          const { count: taskCount } = await supabase
            .from('task_events')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id);

          // Get media count
          const { count: mediaCount } = await supabase
            .from('media')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id);

          // Get last activity from task_events
          const { data: lastTask } = await supabase
            .from('task_events')
            .select('created_at')
            .eq('session_id', session.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get last media upload
          const { data: lastMedia } = await supabase
            .from('media')
            .select('created_at')
            .eq('session_id', session.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const lastActivity = [lastTask?.created_at, lastMedia?.created_at]
            .filter(Boolean)
            .sort()
            .reverse()[0] || null;

          return {
            employee_id: session.user_id,
            employee_name: session.profiles.full_name,
            session_id: session.id,
            punch_in: session.punch_in_time,
            punch_out: session.punch_out_time,
            last_activity: lastActivity,
            tasks_done: (taskCount || 0) + (mediaCount || 0)
          };
        })
      );

      setEmployeesOnDuty(employeeData);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchStallConfirmations = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('stall_confirmations')
        .select(`
          id,
          created_at,
          farmer_name,
          stall_name,
          stall_no,
          created_by,
          profiles!inner(full_name)
        `)
        .eq('market_id', selectedMarket)
        .eq('market_date', dateStr)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStallConfirmations((data || []).map((item: any) => ({
        id: item.id,
        created_at: item.created_at,
        farmer_name: item.farmer_name,
        stall_name: item.stall_name,
        stall_no: item.stall_no,
        created_by: item.created_by,
        employee_name: item.profiles.full_name
      })));
    } catch (error) {
      console.error('Error fetching stalls:', error);
    }
  };

  const fetchMediaUploads = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Direct filtering using market_id and market_date with IST timezone
      const { data, error } = await supabase
        .from('media')
        .select(`
          id,
          created_at,
          media_type,
          is_late,
          file_url,
          user_id,
          profiles!media_user_id_fkey(full_name)
        `)
        .eq('market_id', selectedMarket)
        .eq('market_date', dateStr)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMediaUploads((data || []).map((item: any) => ({
        id: item.id,
        uploaded_at: item.created_at,
        employee_name: item.profiles?.full_name || 'Unknown',
        file_type: item.media_type,
        is_late: item.is_late,
        file_url: item.file_url
      })));
    } catch (error) {
      console.error('Error fetching media:', error);
      setMediaUploads([]);
    }
  };

  const fetchKPIs = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Active + completed employees for the day
      const { count: activeCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', selectedMarket)
        .eq('session_date', dateStr)
        .in('status', ['active', 'completed', 'finalized']);

      // Stalls confirmed - direct filtering
      const { count: stallsCount } = await supabase
        .from('stall_confirmations')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', selectedMarket)
        .eq('market_date', dateStr);

      // Media uploads - direct filtering using new columns
      const { count: totalMedia } = await supabase
        .from('media')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', selectedMarket)
        .eq('market_date', dateStr);

      const { count: lateMedia } = await supabase
        .from('media')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', selectedMarket)
        .eq('market_date', dateStr)
        .eq('is_late', true);

      setKpis({
        active_employees: activeCount || 0,
        stalls_confirmed: stallsCount || 0,
        media_uploaded: totalMedia || 0,
        late_uploads: lateMedia || 0
      });
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const channel = supabase
      .channel(`live-market-${selectedMarket}-${dateStr}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'sessions',
        filter: `market_id=eq.${selectedMarket},session_date=eq.${dateStr}`
      }, (payload) => {
        console.log('Session change:', payload);
        fetchEmployeesOnDuty();
        fetchKPIs();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'stall_confirmations',
        filter: `market_id=eq.${selectedMarket},market_date=eq.${dateStr}`
      }, (payload) => {
        console.log('Stall confirmation change:', payload);
        fetchStallConfirmations();
        fetchKPIs();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'media',
        filter: `market_id=eq.${selectedMarket},market_date=eq.${dateStr}`
      }, (payload) => {
        console.log('Media change:', payload);
        fetchMediaUploads();
        fetchKPIs();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'task_events'
      }, (payload) => {
        console.log('Task event change:', payload);
        fetchEmployeesOnDuty();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    }) + ' IST';
  };

  const exportStallsCSV = () => {
    const csvContent = [
      ['Time', 'Farmer Name', 'Stall Name', 'Stall No', 'Entered By'],
      ...stallConfirmations.map(s => [
        formatTime(s.created_at),
        s.farmer_name,
        s.stall_name,
        s.stall_no,
        s.employee_name
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stalls-${format(selectedDate, 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('CSV exported successfully');
  };

  if (loading && !selectedMarket) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Live Market Monitor</h1>
          <p className="text-muted-foreground">Real-time tracking of employees, stalls, and media</p>
        </div>
        
        <div className="flex gap-3">
          <Select value={selectedMarket} onValueChange={setSelectedMarket}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select market" />
            </SelectTrigger>
            <SelectContent>
              {markets.map(market => (
                <SelectItem key={market.id} value={market.id}>
                  {market.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{kpis.active_employees}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stalls Confirmed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{kpis.stalls_confirmed}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Media Uploaded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{kpis.media_uploaded}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Late Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-2xl font-bold">{kpis.late_uploads}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employees On Duty */}
      <Card>
        <CardHeader>
          <CardTitle>Employees On Duty</CardTitle>
          <CardDescription>Click on an employee to view their activity timeline</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Punch In</TableHead>
                <TableHead>Punch Out</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Tasks Done</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeesOnDuty.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No employees on duty
                  </TableCell>
                </TableRow>
              ) : (
                employeesOnDuty.map(emp => (
                  <TableRow 
                    key={emp.session_id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    <TableCell className="font-medium">{emp.employee_name}</TableCell>
                    <TableCell>{formatTime(emp.punch_in)}</TableCell>
                    <TableCell>{emp.punch_out ? formatTime(emp.punch_out) : <Badge variant="default">Active</Badge>}</TableCell>
                    <TableCell>{formatTime(emp.last_activity)}</TableCell>
                    <TableCell>{emp.tasks_done}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirmed Stalls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Confirmed Stalls</CardTitle>
              <CardDescription>All stall confirmations for this market and date</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportStallsCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Farmer Name</TableHead>
                <TableHead>Stall Name</TableHead>
                <TableHead>Stall No</TableHead>
                <TableHead>Entered By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stallConfirmations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No stalls confirmed yet
                  </TableCell>
                </TableRow>
              ) : (
                stallConfirmations.map(stall => (
                  <TableRow key={stall.id}>
                    <TableCell>{formatTime(stall.created_at)}</TableCell>
                    <TableCell>{stall.farmer_name}</TableCell>
                    <TableCell>{stall.stall_name}</TableCell>
                    <TableCell>{stall.stall_no}</TableCell>
                    <TableCell>{stall.employee_name}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Media Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Media Feed</CardTitle>
          <CardDescription>Live stream of all media uploads</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mediaUploads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No media uploaded yet
                  </TableCell>
                </TableRow>
              ) : (
                mediaUploads.map(media => (
                  <TableRow key={media.id}>
                    <TableCell>{formatTime(media.uploaded_at)}</TableCell>
                    <TableCell>{media.employee_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{media.file_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {media.is_late && <Badge variant="destructive">Late</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <a href={media.file_url} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={media.file_url} download>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Employee Timeline Sheet */}
      <Sheet open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <SheetContent className="w-[500px] sm:w-[600px]">
          <SheetHeader>
            <SheetTitle>
              {selectedEmployee?.employee_name} - Activity Timeline
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Punch In: {formatTime(selectedEmployee?.punch_in || null)}
              </p>
              <p className="text-sm text-muted-foreground">
                Punch Out: {selectedEmployee?.punch_out ? formatTime(selectedEmployee.punch_out) : 'Active'}
              </p>
              <p className="text-sm text-muted-foreground">
                Total Tasks: {selectedEmployee?.tasks_done || 0}
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
