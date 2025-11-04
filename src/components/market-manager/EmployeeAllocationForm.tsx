import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Users } from 'lucide-react';

interface EmployeeAllocationFormProps {
  sessionId: string;
  onComplete: () => void;
}

export function EmployeeAllocationForm({ sessionId, onComplete }: EmployeeAllocationFormProps) {
  const [markets, setMarkets] = useState<any[]>([]);
  const [selectedMarket, setSelectedMarket] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLiveMarkets();
  }, []);

  const fetchLiveMarkets = async () => {
    const { data } = await supabase
      .from('markets')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setMarkets(data || []);
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
            <Input
              id="employee-name"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="Enter employee name"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Saving...' : 'Allocate Employee'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
