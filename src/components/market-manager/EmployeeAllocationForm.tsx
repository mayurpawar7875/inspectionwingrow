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

  const handleSubmit = async () => {
    if (!selectedMarket || !employeeName.trim()) {
      toast.error('Please select both market and employee');
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

    toast.success('Employee allocated to market successfully');
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
            Manpower Allocation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Live Markets List */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Live Markets Today ({markets.length})</Label>
            {markets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No markets scheduled for today</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {markets.map((market) => (
                  <div
                    key={market.id}
                    onClick={() => setSelectedMarket(market.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedMarket === market.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className="font-medium">{market.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Available Employees List */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Available Employees ({employees.length})</Label>
            {employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active employees found</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    onClick={() => setEmployeeName(employee.full_name || employee.email)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      employeeName === (employee.full_name || employee.email)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className="font-medium text-sm">{employee.full_name || employee.email}</p>
                    {employee.full_name && (
                      <p className="text-xs text-muted-foreground">{employee.email}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Selection Summary and Submit */}
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Current Selection:</p>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Market:</span>{' '}
                  <span className="font-medium">
                    {selectedMarket ? markets.find(m => m.id === selectedMarket)?.name : 'Not selected'}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Employee:</span>{' '}
                  <span className="font-medium">{employeeName || 'Not selected'}</span>
                </p>
              </div>
            </div>

            <Button 
              onClick={handleSubmit} 
              disabled={loading || !selectedMarket || !employeeName} 
              className="w-full"
            >
              {loading ? 'Allocating...' : 'Allocate Employee to Market'}
            </Button>
          </div>
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
