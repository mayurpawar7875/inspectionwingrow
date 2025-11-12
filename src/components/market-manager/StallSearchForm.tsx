import { useState } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Store } from 'lucide-react';
import { TaskHistoryView } from './TaskHistoryView';
import { format } from 'date-fns';

const stallSearchSchema = z.object({
  farmerName: z.string().trim().min(1, 'Farmer name is required').max(200, 'Farmer name must be less than 200 characters'),
  stallName: z.string().trim().min(1, 'Stall name is required').max(200, 'Stall name must be less than 200 characters'),
  contactPhone: z.string().trim().min(10, 'Phone number must be at least 10 digits').max(15, 'Phone number must be less than 15 digits'),
  joiningDate: z.string().optional(),
});

interface StallSearchFormProps {
  sessionId: string;
  onComplete: () => void;
}

export function StallSearchForm({ sessionId, onComplete }: StallSearchFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    farmerName: '',
    stallName: '',
    contactPhone: '',
    isInterested: false,
    joiningDate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    try {
      stallSearchSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);
    const { error } = await supabase.from('stall_searching_updates').insert({
      session_id: sessionId,
      farmer_name: formData.farmerName,
      stall_name: formData.stallName,
      contact_phone: formData.contactPhone,
      is_interested: formData.isInterested,
      joining_date: formData.isInterested && formData.joiningDate ? formData.joiningDate : null,
    });

    setLoading(false);
    if (error) {
      toast.error('Failed to save stall search');
      return;
    }

    toast.success('Stall search saved successfully');
    setFormData({ farmerName: '', stallName: '', contactPhone: '', isInterested: false, joiningDate: '' });
    onComplete();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Stall Searching Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="farmer-name">Farmer Name</Label>
              <Input
                id="farmer-name"
                value={formData.farmerName}
                onChange={(e) => setFormData({ ...formData, farmerName: e.target.value })}
                placeholder="Enter farmer name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stall-name">Stall Name</Label>
              <Input
                id="stall-name"
                value={formData.stallName}
                onChange={(e) => setFormData({ ...formData, stallName: e.target.value })}
                placeholder="Enter stall name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-phone">Contact Number</Label>
              <Input
                id="contact-phone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="Enter contact number"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="interested">Interested</Label>
              <Switch
                id="interested"
                checked={formData.isInterested}
                onCheckedChange={(checked) => setFormData({ ...formData, isInterested: checked })}
              />
            </div>

            {formData.isInterested && (
              <div className="space-y-2">
                <Label htmlFor="joining-date">Joining Date</Label>
                <Input
                  id="joining-date"
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                />
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Saving...' : 'Save Stall Search'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-semibold mb-3">History</h3>
        <TaskHistoryView
          sessionId={sessionId}
          taskType="stall_searching_updates"
          columns={[
            { key: 'farmer_name', label: 'Farmer' },
            { key: 'stall_name', label: 'Stall' },
            { key: 'contact_phone', label: 'Contact' },
            { key: 'is_interested', label: 'Interested', render: (val) => val ? 'Yes' : 'No' },
            { key: 'joining_date', label: 'Joining Date', render: (val) => val ? format(new Date(val), 'dd/MM/yyyy') : '-' },
          ]}
        />
      </div>
    </div>
  );
}
