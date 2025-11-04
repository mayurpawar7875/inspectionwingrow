import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ClipboardList } from 'lucide-react';

interface InspectionUpdateFormProps {
  sessionId: string;
  onComplete: () => void;
}

export function InspectionUpdateForm({ sessionId, onComplete }: InspectionUpdateFormProps) {
  const [loading, setLoading] = useState(false);
  const [markets, setMarkets] = useState<any[]>([]);
  const [marketId, setMarketId] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');

  useEffect(() => {
    fetchMarkets();
  }, []);

  const fetchMarkets = async () => {
    const { data } = await supabase
      .from('markets')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setMarkets(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketId || !updateNotes.trim()) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('market_inspection_updates').insert({
      session_id: sessionId,
      market_id: marketId,
      update_notes: updateNotes.trim(),
    });

    setLoading(false);
    if (error) {
      toast.error('Failed to save inspection update');
      return;
    }

    toast.success('Inspection update saved successfully');
    setMarketId('');
    setUpdateNotes('');
    onComplete();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Market Inspection Update
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="market">Market Name</Label>
            <Select value={marketId} onValueChange={setMarketId}>
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
            <Label htmlFor="update">What's New Today</Label>
            <Textarea
              id="update"
              value={updateNotes}
              onChange={(e) => setUpdateNotes(e.target.value)}
              placeholder="Enter inspection updates"
              rows={4}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Saving...' : 'Save Update'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
