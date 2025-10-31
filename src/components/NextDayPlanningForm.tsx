import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Trash2, Calendar, Plus, X } from 'lucide-react';

interface Props {
  sessionId: string;
  marketDate: string;
  userId: string;
  onSuccess?: () => void;
}

interface StallConfirmation {
  farmerName: string;
  stallName: string;
}

interface NextDayPlan {
  id: string;
  next_day_market_name: string;
  stall_list: string;
}

export default function NextDayPlanningForm({ sessionId, marketDate, userId, onSuccess }: Props) {
  const [marketName, setMarketName] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [stallName, setStallName] = useState('');
  const [confirmations, setConfirmations] = useState<StallConfirmation[]>([]);
  const [existingPlan, setExistingPlan] = useState<NextDayPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchExistingPlan();
  }, [userId, marketDate]);

  const fetchExistingPlan = async () => {
    try {
      const { data, error } = await supabase
        .from('next_day_planning')
        .select('*')
        .eq('user_id', userId)
        .eq('current_market_date', marketDate)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingPlan(data);
        setMarketName(data.next_day_market_name);
        // Parse the stall list back into array
        try {
          const parsed = JSON.parse(data.stall_list);
          setConfirmations(parsed);
        } catch {
          // Fallback for old format
          setConfirmations([]);
        }
      }
    } catch (error: any) {
      console.error('Error fetching plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddConfirmation = () => {
    if (!farmerName.trim()) {
      toast.error('Please enter farmer name');
      return;
    }
    if (!stallName.trim()) {
      toast.error('Please enter stall name');
      return;
    }

    setConfirmations([...confirmations, { farmerName: farmerName.trim(), stallName: stallName.trim() }]);
    setFarmerName('');
    setStallName('');
  };

  const handleRemoveConfirmation = (index: number) => {
    setConfirmations(confirmations.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!marketName.trim()) {
      toast.error('Please enter next day market name');
      return;
    }

    if (confirmations.length === 0) {
      toast.error('Please add at least one stall confirmation');
      return;
    }

    setSaving(true);
    try {
      const stallListJson = JSON.stringify(confirmations);
      
      // Calculate next day's date
      const currentDate = new Date(marketDate);
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];

      // Find market by name for next day
      const { data: marketData, error: marketError } = await supabase
        .from('markets')
        .select('id')
        .ilike('name', marketName.trim())
        .maybeSingle();

      if (marketError) throw marketError;

      // Save or update next day planning
      if (existingPlan) {
        const { error } = await supabase
          .from('next_day_planning')
          .update({
            next_day_market_name: marketName.trim(),
            stall_list: stallListJson,
          })
          .eq('id', existingPlan.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('next_day_planning')
          .insert({
            user_id: userId,
            session_id: sessionId,
            current_market_date: marketDate,
            next_day_market_name: marketName.trim(),
            stall_list: stallListJson,
          });

        if (error) throw error;
      }

      // Create stall confirmations for next day if market exists
      if (marketData?.id) {
        // First, delete existing stall confirmations for this user, market, and date
        await supabase
          .from('stall_confirmations')
          .delete()
          .eq('created_by', userId)
          .eq('market_id', marketData.id)
          .eq('market_date', nextDayStr);

        // Insert new stall confirmations
        const stallConfirmationsToInsert = confirmations.map((conf, index) => ({
          farmer_name: conf.farmerName,
          stall_name: conf.stallName,
          stall_no: `${index + 1}`, // Auto-generate stall numbers
          created_by: userId,
          market_id: marketData.id,
          market_date: nextDayStr,
        }));

        const { error: stallError } = await supabase
          .from('stall_confirmations')
          .insert(stallConfirmationsToInsert);

        if (stallError) throw stallError;

        toast.success('Next day planning saved and stall confirmations created!');
      } else {
        toast.success('Next day planning saved (market will need to be selected)');
      }

      await fetchExistingPlan();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving plan:', error);
      toast.error('Failed to save planning');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingPlan) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('next_day_planning')
        .delete()
        .eq('id', existingPlan.id);

      if (error) throw error;

      setExistingPlan(null);
      setMarketName('');
      setConfirmations([]);
      toast.success('Planning deleted');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete planning');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-accent" />
          <CardTitle>Next Day Market Planning</CardTitle>
        </div>
        <CardDescription>Plan tomorrow's market and stall confirmations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="market-name">Next Day Market Name *</Label>
          <Input
            id="market-name"
            placeholder="Enter market name for next day"
            value={marketName}
            onChange={(e) => setMarketName(e.target.value)}
            disabled={saving}
          />
        </div>

        <div className="space-y-3">
          <Label>Add Stall Confirmations *</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="farmer-name" className="text-sm">Farmer Name</Label>
              <Input
                id="farmer-name"
                placeholder="Enter farmer name"
                value={farmerName}
                onChange={(e) => setFarmerName(e.target.value)}
                disabled={saving}
                onKeyPress={(e) => e.key === 'Enter' && handleAddConfirmation()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stall-name" className="text-sm">Stall Name</Label>
              <Input
                id="stall-name"
                placeholder="Enter stall name"
                value={stallName}
                onChange={(e) => setStallName(e.target.value)}
                disabled={saving}
                onKeyPress={(e) => e.key === 'Enter' && handleAddConfirmation()}
              />
            </div>
          </div>
          <Button 
            type="button"
            variant="outline" 
            onClick={handleAddConfirmation} 
            disabled={saving}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Confirmation
          </Button>

          {confirmations.length > 0 && (
            <div className="space-y-2 mt-4">
              <Label className="text-sm">Added Confirmations ({confirmations.length})</Label>
              <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                {confirmations.map((conf, index) => (
                  <div key={index} className="flex items-center justify-between p-3 hover:bg-muted/50">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{conf.stallName}</p>
                      <p className="text-xs text-muted-foreground">{conf.farmerName}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveConfirmation(index)}
                      disabled={saving}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {existingPlan ? 'Update' : 'Save'} Planning
              </>
            )}
          </Button>

          {existingPlan && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
