import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface Props {
  sessionId: string;
  marketId: string;
  marketDate: string;
  userId: string;
  onSuccess?: () => void;
}

interface InspectionItem {
  label: string;
  key: string;
}

interface Inspection {
  id: string;
  farmer_name: string;
  has_tent: boolean;
  has_table: boolean;
  has_rateboard: boolean;
  has_flex: boolean;
  has_light: boolean;
  has_green_net: boolean;
  has_mat: boolean;
  has_digital_weighing_machine: boolean;
  has_display: boolean;
  has_apron: boolean;
  has_cap: boolean;
  created_at: string;
}

const INSPECTION_ITEMS: InspectionItem[] = [
  { label: 'Tent', key: 'has_tent' },
  { label: 'Table', key: 'has_table' },
  { label: 'Rate Board', key: 'has_rateboard' },
  { label: 'Flex', key: 'has_flex' },
  { label: 'Light', key: 'has_light' },
  { label: 'Green Net', key: 'has_green_net' },
  { label: 'Mat', key: 'has_mat' },
  { label: 'Digital Weighing Machine', key: 'has_digital_weighing_machine' },
  { label: 'Display', key: 'has_display' },
  { label: 'Apron', key: 'has_apron' },
  { label: 'Cap', key: 'has_cap' },
];

export default function StallInspectionForm({ sessionId, marketId, marketDate, userId, onSuccess }: Props) {
  const [farmerName, setFarmerName] = useState('');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInspections();
  }, [userId, marketDate]);

  const fetchInspections = async () => {
    try {
      const { data, error } = await supabase
        .from('stall_inspections')
        .select('*')
        .eq('user_id', userId)
        .eq('market_date', marketDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInspections(data || []);
    } catch (error: any) {
      console.error('Error fetching inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckChange = (key: string, checked: boolean) => {
    setCheckedItems((prev) => ({ ...prev, [key]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!farmerName.trim()) {
      toast.error('Please enter farmer name');
      return;
    }

    setSaving(true);
    try {
      const inspectionData: any = {
        user_id: userId,
        session_id: sessionId,
        market_id: marketId,
        market_date: marketDate,
        farmer_name: farmerName.trim(),
      };

      // Add all checkbox values
      INSPECTION_ITEMS.forEach((item) => {
        inspectionData[item.key] = checkedItems[item.key] || false;
      });

      const { error } = await supabase
        .from('stall_inspections')
        .insert(inspectionData);

      if (error) throw error;

      toast.success(`Inspection submitted for ${farmerName}`);
      
      // Reset form
      setFarmerName('');
      setCheckedItems({});
      
      await fetchInspections();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving inspection:', error);
      toast.error('Failed to save inspection');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, farmerName: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('stall_inspections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success(`Inspection deleted for ${farmerName}`);
      await fetchInspections();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error deleting inspection:', error);
      toast.error('Failed to delete inspection');
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Stall Inspection</CardTitle>
          <CardDescription>Inspect each farmer's stall and check available equipment</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="farmer-name">Farmer Name</Label>
              <Input
                id="farmer-name"
                placeholder="Enter farmer name"
                value={farmerName}
                onChange={(e) => setFarmerName(e.target.value)}
                disabled={saving}
                required
              />
            </div>

            <div className="space-y-3">
              <Label>Equipment Available</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {INSPECTION_ITEMS.map((item) => (
                  <div key={item.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={item.key}
                      checked={checkedItems[item.key] || false}
                      onCheckedChange={(checked) => handleCheckChange(item.key, checked as boolean)}
                      disabled={saving}
                    />
                    <Label
                      htmlFor={item.key}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {item.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Submit Inspection
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* List of Inspections */}
      {inspections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed Inspections ({inspections.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {inspections.map((inspection) => (
              <div key={inspection.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-lg">{inspection.farmer_name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inspection.created_at).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(inspection.id, inspection.farmer_name)}
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-sm">
                  {INSPECTION_ITEMS.map((item) => {
                    const hasItem = inspection[item.key as keyof Inspection] as boolean;
                    return (
                      <div
                        key={item.key}
                        className={`flex items-center gap-1 ${
                          hasItem ? 'text-success' : 'text-muted-foreground'
                        }`}
                      >
                        <span>{hasItem ? '✓' : '✗'}</span>
                        <span>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
