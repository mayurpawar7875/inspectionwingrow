import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, MapPin } from 'lucide-react';

interface Market {
  id: string;
  name: string;
  location: string;
}

export default function MarketSelection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMarkets();
  }, []);

  const fetchMarkets = async () => {
    try {
      const istNow = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
      );
      const dow = istNow.getDay(); // 0=Sun..6=Sat
      const istDateStr = istNow.toISOString().split('T')[0];

      const [byWeekday, scheduleRows] = await Promise.all([
        supabase
          .from('markets')
          .select('id, name, location')
          .eq('is_active', true)
          .eq('day_of_week', dow)
          .order('name'),
        supabase
          .from('market_schedule')
          .select('market_id')
          .eq('schedule_date', istDateStr),
      ]);

      const scheduleIds = (scheduleRows.data || []).map((r: any) => r.market_id).filter(Boolean);

      let scheduledMarkets: any[] = [];
      if (scheduleIds.length > 0) {
        const res = await supabase
          .from('markets')
          .select('id, name, location')
          .in('id', scheduleIds)
          .order('name');
        scheduledMarkets = res.data || [];
      }

      const map = new Map<string, Market>();
      (byWeekday.data || []).forEach((m: any) => map.set(m.id, m));
      scheduledMarkets.forEach((m: any) => map.set(m.id, m));

      const list = Array.from(map.values());
      setMarkets(list);
      if (list.length > 0) setSelectedMarket(list[0].id);
    } catch (error: any) {
      toast.error('Failed to load markets');
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMarket) {
      toast.error('Please select a market');
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user!.id,
          market_id: selectedMarket,
          session_date: today,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Session created successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('You already have a session for today');
      } else {
        toast.error('Failed to create session');
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <MapPin className="h-6 w-6 text-accent" />
              </div>
              <div>
                <CardTitle>Select Market</CardTitle>
                <CardDescription>Choose the market you'll be reporting from today</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="market">Market</Label>
              <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                <SelectTrigger id="market">
                  <SelectValue placeholder="Select a market" />
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

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Once you create a session, you cannot change the market for today. Make
                sure to select the correct market.
              </p>
            </div>

            <Button onClick={handleSubmit} disabled={loading || !selectedMarket} className="w-full" size="lg">
              {loading ? 'Creating Session...' : 'Start Session'}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
