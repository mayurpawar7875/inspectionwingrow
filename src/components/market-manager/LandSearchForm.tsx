import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { MapPin } from 'lucide-react';
import { TaskHistoryView } from './TaskHistoryView';
import { format } from 'date-fns';

interface LandSearchFormProps {
  sessionId: string;
  onComplete: () => void;
}

export function LandSearchForm({ sessionId, onComplete }: LandSearchFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    placeName: '',
    address: '',
    contactName: '',
    isFinalized: false,
    openingDate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.placeName || !formData.address || !formData.contactName) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('market_land_search').insert({
      session_id: sessionId,
      place_name: formData.placeName,
      address: formData.address,
      contact_name: formData.contactName,
      is_finalized: formData.isFinalized,
      opening_date: formData.isFinalized && formData.openingDate ? formData.openingDate : null,
    });

    setLoading(false);
    if (error) {
      toast.error('Failed to save land search');
      return;
    }

    toast.success('Land search saved successfully');
    setFormData({ placeName: '', address: '', contactName: '', isFinalized: false, openingDate: '' });
    onComplete();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            New Market Land Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="place-name">Place Name</Label>
              <Input
                id="place-name"
                value={formData.placeName}
                onChange={(e) => setFormData({ ...formData, placeName: e.target.value })}
                placeholder="Enter place name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-name">Local Body Contact Name</Label>
              <Input
                id="contact-name"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="Enter contact name"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="finalized">Finalized</Label>
              <Switch
                id="finalized"
                checked={formData.isFinalized}
                onCheckedChange={(checked) => setFormData({ ...formData, isFinalized: checked })}
              />
            </div>

            {formData.isFinalized && (
              <div className="space-y-2">
                <Label htmlFor="opening-date">Opening Date</Label>
                <Input
                  id="opening-date"
                  type="date"
                  value={formData.openingDate}
                  onChange={(e) => setFormData({ ...formData, openingDate: e.target.value })}
                />
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Saving...' : 'Save Land Search'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-semibold mb-3">History</h3>
        <TaskHistoryView
          sessionId={sessionId}
          taskType="market_land_search"
          columns={[
            { key: 'place_name', label: 'Place' },
            { key: 'address', label: 'Address' },
            { key: 'contact_name', label: 'Contact' },
            { key: 'is_finalized', label: 'Finalized', render: (val) => val ? 'Yes' : 'No' },
            { key: 'opening_date', label: 'Opening Date', render: (val) => val ? format(new Date(val), 'dd/MM/yyyy') : '-' },
          ]}
        />
      </div>
    </div>
  );
}
