import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Users } from 'lucide-react';
import { TaskHistoryView } from './TaskHistoryView';

interface EmployeeAllocationFormProps {
  sessionId: string;
  onComplete: () => void;
}

export function EmployeeAllocationForm({ sessionId, onComplete }: EmployeeAllocationFormProps) {
  const [markets, setMarkets] = useState<any[]>([]);
  const [selectedMarket, setSelectedMarket] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLiveMarkets();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, email')
        .eq('status', 'active')
        .order('full_name');
      
      if (error) {
        console.error('Error fetching employees:', error);
        toast.error('Failed to load employees');
        return;
      }
      
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    }
  };

  const fetchLiveMarkets = async () => {
    try {
      const today = new Date();
      const todayIST = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const dayOfWeek = todayIST.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const todayDate = todayIST.toISOString().split('T')[0];
      
      // First, try to get markets with active sessions today
      const { data: activeSessions } = await supabase
        .from('sessions')
        .select('market_id, markets(id, name)')
        .eq('session_date', todayDate)
        .eq('status', 'active');
      
      let liveMarkets: any[] = [];
      
      // Add markets with active sessions
      if (activeSessions && activeSessions.length > 0) {
        const sessionMarkets = activeSessions
          .map(s => s.markets)
          .filter(Boolean)
          .filter((market, index, self) => 
            index === self.findIndex(m => m.id === market.id)
          );
        liveMarkets.push(...sessionMarkets);
      }
      
      // Also fetch markets scheduled for today's day of week
      const { data: scheduledMarkets, error: scheduleError } = await supabase
        .from('market_schedule')
        .select('market_id, markets(id, name)')
        .eq('is_active', true)
        .eq('day_of_week', dayOfWeek);
      
      if (!scheduleError && scheduledMarkets) {
        const scheduled = scheduledMarkets
          .map(s => s.markets)
          .filter(Boolean)
          .filter((market, index, self) => 
            index === self.findIndex(m => m.id === market.id)
          );
        
        // Merge with live markets, avoiding duplicates
        scheduled.forEach(market => {
          if (!liveMarkets.find(m => m.id === market.id)) {
            liveMarkets.push(market);
          }
        });
      }
      
      if (liveMarkets.length === 0) {
        toast.info('No markets scheduled for today');
        setMarkets([]);
      } else {
        // Sort by name
        liveMarkets.sort((a, b) => a.name.localeCompare(b.name));
        setMarkets(liveMarkets);
      }
    } catch (error) {
      console.error('Error fetching live markets:', error);
      toast.error('Failed to load markets');
      setMarkets([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMarket || !employeeName.trim()) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('employee_allocations').insert({
      session_id: sessionId,
      market_id: selectedMarket,
      employee_name: employeeName.trim(),
    });

    setLoading(false);
    if (error) {
      toast.error('Failed to save allocation');
      return;
    }

    toast.success('Employee allocated successfully');
    setEmployeeName('');
    setSelectedMarket('');
    onComplete();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employee Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="market">Live Market</Label>
              <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                <SelectTrigger id="market">
                  <SelectValue placeholder="Select market" />
                </SelectTrigger>
                <SelectContent>
                  {markets.map((market) => (
                    <SelectItem key={market.id} value={market.id}>
                      {market.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee-name">Employee Name</Label>
              <Select value={employeeName} onValueChange={setEmployeeName}>
                <SelectTrigger id="employee-name">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.full_name || employee.email}>
                      {employee.full_name || employee.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Saving...' : 'Allocate Employee'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-semibold mb-3">History</h3>
        <TaskHistoryView
          sessionId={sessionId}
          taskType="employee_allocations"
          columns={[
            { key: 'employee_name', label: 'Employee' },
            { key: 'market_id', label: 'Market', render: (_, row) => markets.find(m => m.id === row.market_id)?.name || 'Unknown' },
          ]}
        />
      </div>
    </div>
  );
}
