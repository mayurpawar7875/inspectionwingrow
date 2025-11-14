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
      .lte('attendance_date', endDate);
    
    // Apply filters
    if (selectedRole !== 'all') query = query.eq('role', selectedRole as 'admin' | 'bdo' | 'bms_executive' | 'employee' | 'market_manager');
    if (selectedCity !== 'all') query = query.eq('city', selectedCity);
    if (selectedMarket !== 'all') query = query.eq('market_id', selectedMarket);
    
    const { data, error } = await query;
    
    if (error) {
      toast.error('Failed to fetch attendance records');
      setLoading(false);
      return;
    }
    
    // Enrich records with employee and market names
    const enrichedRecords = await Promise.all(
      (data || []).map(async (record) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', record.user_id)
          .single();
        
        const market = markets.find(m => m.id === record.market_id);
        
        return {
          ...record,
          employee_name: profile?.full_name || 'Unknown',
          market_name: market?.name || 'Unknown',
        };
      })
    );
    
    // Filter by user search
    let filteredRecords = enrichedRecords;
    if (userSearch) {
      filteredRecords = enrichedRecords.filter(r => 
        r.employee_name?.toLowerCase().includes(userSearch.toLowerCase())
      );
    }
    
    setRecords(filteredRecords);
    
    // Build day map
    const newDayMap = new Map<string, DayData>();
    filteredRecords.forEach(record => {
      const dateStr = record.attendance_date;
      if (!newDayMap.has(dateStr)) {
        newDayMap.set(dateStr, {
          date: dateStr,
          records: [],
          summary: { full_day: 0, half_day: 0, absent: 0, weekly_off: 0 },
        });
      }
      
      const dayData = newDayMap.get(dateStr)!;
      dayData.records.push(record);
      dayData.summary[record.status]++;
    });
    
    setDayMap(newDayMap);
    
    // Calculate year summary
    const summary = {
      full_day: 0,
      half_day: 0,
      absent: 0,
      weekly_off: 0,
    };
    
    filteredRecords.forEach(record => {
      summary[record.status]++;
    });
    
    setYearSummary(summary);
    setLoading(false);
  };

  const handleDayClick = (dayData: DayData) => {
    setSelectedDay(dayData);
    setDrawerOpen(true);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'User', 'Role', 'Market', 'City', 'Tasks Done', 'Total Tasks', 'Status'];
    const rows = records.map(r => [
      r.attendance_date,
      r.employee_name || '',
      r.role,
      r.market_name || '',
      r.city,
      r.completed_tasks,
      r.total_tasks,
      r.status,
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Attendance data exported successfully');
  };

  const months = eachMonthOfInterval({
    start: startOfYear(new Date(selectedYear, 0)),
    end: endOfYear(new Date(selectedYear, 0)),
  });

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-4rem)] gap-4 p-6">
        {/* Left Sidebar - Filters */}
        <div className="w-80 border-r border-border pr-6 overflow-y-auto">
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Filters</h2>
            </div>

            {/* Role Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="bdo">BDO</SelectItem>
                  <SelectItem value="market_manager">Market Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* City Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">City</label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
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

            {/* Market Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Market</label>
              <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Markets</SelectItem>
                  {markets.map(market => (
                    <SelectItem key={market.id} value={market.id}>
                      {market.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">User Search</label>
              <Input
                placeholder="Search by name..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>

            {/* Status Legend */}
            <div className="pt-6 border-t space-y-3">
              <h3 className="text-sm font-semibold">Status Legend</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-green-500" />
                  <span className="text-sm">Full Day</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-orange-500" />
                  <span className="text-sm">Half Day</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-red-500" />
                  <span className="text-sm">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-blue-500" />
                  <span className="text-sm">Weekly Off (Monday)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-muted" />
                  <span className="text-sm">No Data</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Summary Cards & Year Selector */}
          <div className="flex items-center justify-between mb-8">
            <div className="grid grid-cols-4 gap-4 flex-1">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-700">{yearSummary.full_day}</div>
                      <div className="text-sm text-green-600">Present</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-700">{yearSummary.half_day}</div>
                      <div className="text-sm text-orange-600">Half Day</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                      <XCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-700">{yearSummary.absent}</div>
                      <div className="text-sm text-red-600">Absent</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                      <MinusCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-700">{yearSummary.weekly_off}</div>
                      <div className="text-sm text-blue-600">Weekly Off</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Year Selector & Export */}
            <div className="flex items-center gap-3 ml-6">
              <Button variant="outline" size="icon" onClick={() => setSelectedYear(y => y - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="icon" onClick={() => setSelectedYear(y => y + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-3 gap-8">
            {months.map((monthDate) => (
              <MiniMonthCalendar
                key={format(monthDate, 'yyyy-MM')}
                monthDate={monthDate}
                dayMap={dayMap}
                onDayClick={handleDayClick}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Day Details Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle>
                  Attendance Details - {selectedDay && format(new Date(selectedDay.date), 'MMMM d, yyyy')}
                </DrawerTitle>
                <DrawerDescription>
                  {selectedDay?.records.length} user(s) recorded
                </DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          
          <ScrollArea className="max-h-[60vh] px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="text-center">Tasks Done/Total</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDay?.records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.employee_name}</TableCell>
                    <TableCell className="capitalize">{record.role.replace('_', ' ')}</TableCell>
                    <TableCell>{record.market_name}</TableCell>
                    <TableCell>{record.city}</TableCell>
                    <TableCell className="text-center">
                      {record.completed_tasks}/{record.total_tasks}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          record.status === 'full_day' ? 'default' :
                          record.status === 'half_day' ? 'secondary' :
                          record.status === 'absent' ? 'destructive' :
                          'outline'
                        }
                      >
                        {STATUS_CONFIG[record.status].label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </AdminLayout>
  );
}

// ============= Mini Month Calendar Component =============
interface MiniMonthCalendarProps {
  monthDate: Date;
  dayMap: Map<string, DayData>;
  onDayClick: (dayData: DayData) => void;
}

function MiniMonthCalendar({ monthDate, dayMap, onDayClick }: MiniMonthCalendarProps) {
  const daysInMonth = getDaysInMonth(monthDate);
  const firstDayOfMonth = getDay(startOfMonth(monthDate));
  const monthName = format(monthDate, 'MMMM');
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  
  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <h3 className="text-base font-semibold mb-4 text-center">{monthName}</h3>
      
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-xs text-muted-foreground text-center font-semibold py-1">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-px">
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {days.map((day) => {
          const dateStr = format(new Date(monthDate.getFullYear(), monthDate.getMonth(), day), 'yyyy-MM-dd');
          const dayData = dayMap.get(dateStr);
          
          return (
            <DayCell
              key={day}
              day={day}
              dayData={dayData}
              onDayClick={onDayClick}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============= Day Cell Component =============
interface DayCellProps {
  day: number;
  dayData?: DayData;
  onDayClick: (dayData: DayData) => void;
}

function DayCell({ day, dayData, onDayClick }: DayCellProps) {
  if (!dayData || dayData.records.length === 0) {
    return (
      <div className="aspect-square flex items-center justify-center text-xs text-muted-foreground rounded hover:bg-muted/50 transition-colors">
        {day}
      </div>
    );
  }
  
  // Determine majority status
  const { full_day, half_day, absent, weekly_off } = dayData.summary;
  let majorityStatus: keyof typeof STATUS_CONFIG = 'no_data';
  let maxCount = 0;
  
  if (full_day > maxCount) { majorityStatus = 'full_day'; maxCount = full_day; }
  if (half_day > maxCount) { majorityStatus = 'half_day'; maxCount = half_day; }
  if (absent > maxCount) { majorityStatus = 'absent'; maxCount = absent; }
  if (weekly_off > maxCount) { majorityStatus = 'weekly_off'; maxCount = weekly_off; }
  
  const config = STATUS_CONFIG[majorityStatus];
  const totalTasks = dayData.records.reduce((sum, r) => sum + r.total_tasks, 0);
  const completedTasks = dayData.records.reduce((sum, r) => sum + r.completed_tasks, 0);
  
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <button
          onClick={() => onDayClick(dayData)}
          className={cn(
            "aspect-square flex items-center justify-center text-xs font-semibold rounded cursor-pointer transition-all hover:ring-2 hover:ring-offset-1 hover:ring-primary",
            config.color,
            "text-white"
          )}
        >
          {day}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-64" side="top">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{dayData.records.length} User(s)</span>
            <Badge variant="outline" className="text-xs">
              {config.label}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs">Full: {full_day}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-orange-500" />
              <span className="text-xs">Half: {half_day}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-xs">Absent: {absent}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-xs">Off: {weekly_off}</span>
            </div>
          </div>
          <div className="pt-2 border-t text-xs text-muted-foreground">
            Tasks: {completedTasks}/{totalTasks} completed
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
