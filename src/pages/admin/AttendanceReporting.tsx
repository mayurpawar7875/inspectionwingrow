import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Calendar, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

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

export default function AttendanceReporting() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<any[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  
  // Filters
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('');

  useEffect(() => {
    fetchMarkets();
    fetchRecords();
  }, []);

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
      
      const enrichedData = data.map(record => ({
        ...record,
        employee_name: employeeMap.get(record.user_id) || 'Unknown',
        market_name: record.market_id ? marketMap.get(record.market_id) || 'N/A' : 'N/A',
      }));
      
      // Filter by user name if specified
      let filteredData = enrichedData;
      if (selectedUser) {
        const searchLower = selectedUser.toLowerCase();
        filteredData = enrichedData.filter(r => 
          r.employee_name?.toLowerCase().includes(searchLower)
        );
      }
      
      setRecords(filteredData);
    } else {
      setRecords([]);
    }
    
    setLoading(false);
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

  const exportToCSV = () => {
    const headers = ['Date', 'User', 'Role', 'Market', 'City', 'Total Tasks', 'Completed', 'Status'];
    const rows = records.map(r => [
      format(new Date(r.attendance_date), 'yyyy-MM-dd'),
      r.employee_name || 'Unknown',
      r.role,
      r.market_name || 'N/A',
      r.city || 'N/A',
      r.total_tasks.toString(),
      r.completed_tasks.toString(),
      r.status,
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Attendance report exported successfully');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Attendance Reporting</h1>
            <p className="text-muted-foreground">View and analyze employee attendance records</p>
          </div>
          <Button onClick={exportToCSV} disabled={records.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Market</label>
                <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Markets</SelectItem>
                    {markets.map(market => (
                      <SelectItem key={market.id} value={market.id}>{market.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">User Name</label>
                <Input
                  placeholder="Search by name..."
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4">
              <Button onClick={fetchRecords}>
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance Records ({records.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : records.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No attendance records found for the selected filters
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Market</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead className="text-center">Total Tasks</TableHead>
                      <TableHead className="text-center">Completed</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {format(new Date(record.attendance_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>{record.employee_name || 'Unknown'}</TableCell>
                        <TableCell className="capitalize">{record.role.replace('_', ' ')}</TableCell>
                        <TableCell>{record.market_name || 'N/A'}</TableCell>
                        <TableCell>{record.city || 'N/A'}</TableCell>
                        <TableCell className="text-center">{record.total_tasks}</TableCell>
                        <TableCell className="text-center">{record.completed_tasks}</TableCell>
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
    </AdminLayout>
  );
}
