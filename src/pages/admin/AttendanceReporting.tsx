import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Download, ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Users, CheckCircle2, AlertCircle, XCircle, MinusCircle } from 'lucide-react';
import { format, startOfYear, endOfYear, eachMonthOfInterval, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AttendanceRecord {
  id: string;
  user_id: string;
  attendance_date: string;
  role: string;
  market_id: string;
  city: string;
  total_tasks: number;
  completed_tasks: number;
  status: 'full_day' | 'half_day' | 'absent' | 'weekly_off';
  employee_name?: string;
  market_name?: string;
}

interface DayData {
  date: string;
  records: AttendanceRecord[];
  summary: {
    full_day: number;
    half_day: number;
    absent: number;
    weekly_off: number;
  };
}

const STATUS_CONFIG = {
  full_day: { label: 'Full Day', color: 'bg-green-500', icon: CheckCircle2 },
  half_day: { label: 'Half Day', color: 'bg-orange-500', icon: AlertCircle },
  absent: { label: 'Absent', color: 'bg-red-500', icon: XCircle },
  weekly_off: { label: 'Weekly Off', color: 'bg-blue-500', icon: MinusCircle },
  no_data: { label: 'No Data', color: 'bg-muted', icon: MinusCircle },
};

export default function AttendanceReporting() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<any[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  
  // Filters
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [userSearch, setUserSearch] = useState<string>('');
  
  // Drawer state
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Data aggregation
  const [dayMap, setDayMap] = useState<Map<string, DayData>>(new Map());
  const [yearSummary, setYearSummary] = useState({
    full_day: 0,
    half_day: 0,
    absent: 0,
    weekly_off: 0,
  });

  useEffect(() => {
    fetchMarkets();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [selectedYear, selectedRole, selectedCity, selectedMarket, userSearch]);

  const fetchMarkets = async () => {
    const { data } = await supabase
      .from('markets')
      .select('id, name, city')
      .eq('is_active', true)
      .order('name');
    
    if (data) {
      setMarkets(data);
      const uniqueCities = [...new Set(data.map(m => m.city).filter(Boolean))];
      setCities(uniqueCities as string[]);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    
    const startDate = format(startOfYear(new Date(selectedYear, 0)), 'yyyy-MM-dd');
    const endDate = format(endOfYear(new Date(selectedYear, 0)), 'yyyy-MM-dd');
    
    let query = supabase
      .from('attendance_records')
      .select('*')
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: false });
    
    if (selectedRole !== 'all') {
      query = query.eq('role', selectedRole as any);
    }
    
    if (selectedCity !== 'all') {
      query = query.eq('city', selectedCity);
    }
    
    if (selectedMarket !== 'all') {
      query = query.eq('market_id', selectedMarket);
    }
    
    const { data, error } = await query;
    
    if (error) {
      toast.error('Failed to fetch attendance records');
      setLoading(false);
      return;
    }
    
    // Fetch employee names and market names
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(r => r.user_id))];
      const marketIds = [...new Set(data.map(r => r.market_id).filter(Boolean))];
      
      const { data: employees } = await supabase
        .from('employees')
        .select('id, full_name')
        .in('id', userIds);
      
      const { data: marketsData } = await supabase
        .from('markets')
        .select('id, name')
        .in('id', marketIds);
      
      const employeeMap = new Map(employees?.map(e => [e.id, e.full_name]) || []);
      const marketMap = new Map(marketsData?.map(m => [m.id, m.name]) || []);
      
      let enrichedData = data.map(record => ({
        ...record,
        employee_name: employeeMap.get(record.user_id) || 'Unknown',
        market_name: record.market_id ? marketMap.get(record.market_id) || 'N/A' : 'N/A',
      }));
      
      // Apply user search filter
      if (userSearch.trim()) {
        enrichedData = enrichedData.filter(r => 
          r.employee_name?.toLowerCase().includes(userSearch.toLowerCase())
        );
      }
      
      setRecords(enrichedData);
      aggregateData(enrichedData);
    } else {
      setRecords([]);
      setDayMap(new Map());
      setYearSummary({ full_day: 0, half_day: 0, absent: 0, weekly_off: 0 });
    }
    
    setLoading(false);
  };

  const aggregateData = (data: AttendanceRecord[]) => {
    const map = new Map<string, DayData>();
    const summary = { full_day: 0, half_day: 0, absent: 0, weekly_off: 0 };
    
    data.forEach(record => {
      const date = record.attendance_date;
      
      if (!map.has(date)) {
        map.set(date, {
          date,
          records: [],
          summary: { full_day: 0, half_day: 0, absent: 0, weekly_off: 0 },
        });
      }
      
      const dayData = map.get(date)!;
      dayData.records.push(record);
      dayData.summary[record.status]++;
      summary[record.status]++;
    });
    
    setDayMap(map);
    setYearSummary(summary);
  };

  const handleDayClick = (dayData: DayData | null) => {
    if (dayData && dayData.records.length > 0) {
      setSelectedDay(dayData);
      setDrawerOpen(true);
    }
  };

  const exportCSV = () => {
    if (records.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const headers = ['Date', 'Employee', 'Role', 'City', 'Market', 'Completed Tasks', 'Total Tasks', 'Status'];
    const rows = records.map(r => [
      r.attendance_date,
      r.employee_name || 'Unknown',
      r.role,
      r.city || 'N/A',
      r.market_name || 'N/A',
      r.completed_tasks.toString(),
      r.total_tasks.toString(),
      r.status,
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('CSV exported successfully');
  };

  const changeYear = (direction: 'prev' | 'next') => {
    setSelectedYear(prev => direction === 'prev' ? prev - 1 : prev + 1);
  };

  const months = eachMonthOfInterval({
    start: startOfYear(new Date(selectedYear, 0)),
    end: endOfYear(new Date(selectedYear, 0)),
  });

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
        {/* Left Sidebar - Filters & Legend */}
        <div className="w-72 space-y-4 flex-shrink-0">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Filters
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Role</label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="market_manager">Market Manager</SelectItem>
                        <SelectItem value="bdo">BDO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">City</label>
                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Cities</SelectItem>
                        {cities.map(city => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Market</label>
                    <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Markets</SelectItem>
                        {markets
                          .filter(m => selectedCity === 'all' || m.city === selectedCity)
                          .map(market => (
                            <SelectItem key={market.id} value={market.id}>
                              {market.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">User Search</label>
                    <Input
                      placeholder="Search by name..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
              
              {/* Legend */}
              <div>
                <h3 className="font-semibold mb-3 text-sm">Status Legend</h3>
                <div className="space-y-2">
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <div className={cn('w-4 h-4 rounded', config.color)} />
                      <span className="text-muted-foreground">{config.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Calendar */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Summary Chips */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Present</p>
                    <p className="text-2xl font-bold text-green-500">{yearSummary.full_day}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500/50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Half Day</p>
                    <p className="text-2xl font-bold text-orange-500">{yearSummary.half_day}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-orange-500/50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Absent</p>
                    <p className="text-2xl font-bold text-red-500">{yearSummary.absent}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500/50" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Weekly Off</p>
                    <p className="text-2xl font-bold text-blue-500">{yearSummary.weekly_off}</p>
                  </div>
                  <MinusCircle className="h-8 w-8 text-blue-500/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Year Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => changeYear('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => changeYear('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Month Grids */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-3 gap-4 pb-4">
              {months.map((month) => (
                <MonthCalendar
                  key={month.toISOString()}
                  month={month}
                  dayMap={dayMap}
                  onDayClick={handleDayClick}
                  loading={loading}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Day Details Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="h-[80vh]">
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle>
                  Attendance Details - {selectedDay && format(new Date(selectedDay.date), 'MMMM d, yyyy')}
                </DrawerTitle>
                <DrawerDescription>
                  {selectedDay && `${selectedDay.records.length} record(s)`}
                </DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          
          <ScrollArea className="flex-1 px-4">
            {selectedDay && (
              <div className="space-y-4 pb-4">
                {/* Summary */}
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(selectedDay.summary).map(([status, count]) => {
                    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
                    return (
                      <div key={status} className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                        <div className={cn('w-3 h-3 rounded', config.color)} />
                        <div>
                          <p className="text-xs text-muted-foreground">{config.label}</p>
                          <p className="text-lg font-bold">{count}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Records Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Market</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Tasks</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDay.records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.employee_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {record.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{record.market_name}</TableCell>
                        <TableCell className="text-sm">{record.city || 'N/A'}</TableCell>
                        <TableCell className="text-sm">
                          {record.completed_tasks}/{record.total_tasks}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              record.status === 'full_day' && 'border-green-500 text-green-500',
                              record.status === 'half_day' && 'border-orange-500 text-orange-500',
                              record.status === 'absent' && 'border-red-500 text-red-500',
                              record.status === 'weekly_off' && 'border-blue-500 text-blue-500'
                            )}
                          >
                            {STATUS_CONFIG[record.status].label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </AdminLayout>
  );
}

// Month Calendar Component
function MonthCalendar({ 
  month, 
  dayMap, 
  onDayClick, 
  loading 
}: { 
  month: Date; 
  dayMap: Map<string, DayData>; 
  onDayClick: (dayData: DayData | null) => void;
  loading: boolean;
}) {
  const daysInMonth = getDaysInMonth(month);
  const firstDayOfMonth = getDay(startOfMonth(month));
  const monthName = format(month, 'MMMM');
  
  // Create array of days with leading empty cells
  const days = Array.from({ length: firstDayOfMonth }, () => null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );
  
  const getDayStatus = (day: number): keyof typeof STATUS_CONFIG => {
    const dateStr = format(new Date(month.getFullYear(), month.getMonth(), day), 'yyyy-MM-dd');
    const dayData = dayMap.get(dateStr);
    
    if (!dayData || dayData.records.length === 0) return 'no_data';
    
    // Determine primary status based on majority
    const summary = dayData.summary;
    const max = Math.max(summary.full_day, summary.half_day, summary.absent, summary.weekly_off);
    
    if (summary.full_day === max) return 'full_day';
    if (summary.half_day === max) return 'half_day';
    if (summary.absent === max) return 'absent';
    if (summary.weekly_off === max) return 'weekly_off';
    
    return 'no_data';
  };
  
  return (
    <Card>
      <CardContent className="p-3">
        <h3 className="font-semibold text-sm mb-2 text-center">{monthName}</h3>
        
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-center text-[10px] font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        
        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }
            
            const dateStr = format(new Date(month.getFullYear(), month.getMonth(), day), 'yyyy-MM-dd');
            const dayData = dayMap.get(dateStr);
            const status = getDayStatus(day);
            const config = STATUS_CONFIG[status];
            
            return (
              <HoverCard key={day} openDelay={200}>
                <HoverCardTrigger asChild>
                  <button
                    onClick={() => onDayClick(dayData || null)}
                    disabled={!dayData || dayData.records.length === 0}
                    className={cn(
                      'aspect-square rounded text-[10px] font-medium transition-all',
                      config.color,
                      dayData && dayData.records.length > 0 
                        ? 'hover:ring-2 hover:ring-primary hover:scale-110 cursor-pointer text-white' 
                        : 'cursor-default opacity-50',
                      loading && 'animate-pulse'
                    )}
                  >
                    {day}
                  </button>
                </HoverCardTrigger>
                
                {dayData && dayData.records.length > 0 && (
                  <HoverCardContent side="top" className="w-64 p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{format(new Date(dateStr), 'MMM d, yyyy')}</span>
                        <Badge variant="outline" className="text-[10px]">
                          <Users className="h-3 w-3 mr-1" />
                          {dayData.records.length}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(dayData.summary).map(([status, count]) => {
                          if (count === 0) return null;
                          const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
                          return (
                            <div key={status} className="flex items-center gap-1">
                              <div className={cn('w-2 h-2 rounded', cfg.color)} />
                              <span className="text-muted-foreground">{cfg.label}:</span>
                              <span className="font-semibold">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        <p>Roles: {[...new Set(dayData.records.map(r => r.role))].join(', ')}</p>
                      </div>
                    </div>
                  </HoverCardContent>
                )}
              </HoverCard>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
