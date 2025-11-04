import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { DollarSign } from 'lucide-react';
import { TaskHistoryView } from './TaskHistoryView';
import { PreviewDialog } from './PreviewDialog';

interface MoneyRecoveryFormProps {
  sessionId: string;
  onComplete: () => void;
}

export function MoneyRecoveryForm({ sessionId, onComplete }: MoneyRecoveryFormProps) {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    farmerName: '',
    stallName: '',
    itemName: '',
    receivedAmount: '',
    pendingAmount: '',
  });

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.farmerName || !formData.stallName || !formData.itemName) {
      toast.error('Please fill all required fields');
      return;
    }
    setShowPreview(true);
  };

  const handleConfirmSubmit = async () => {
    setLoading(true);
    const { error } = await supabase.from('assets_money_recovery').insert({
      session_id: sessionId,
      farmer_name: formData.farmerName,
      stall_name: formData.stallName,
      item_name: formData.itemName,
      received_amount: Number(formData.receivedAmount) || 0,
      pending_amount: Number(formData.pendingAmount) || 0,
    });

    setLoading(false);
    if (error) {
      toast.error('Failed to save money recovery');
      return;
    }

    toast.success('Money recovery saved successfully');
    setFormData({ farmerName: '', stallName: '', itemName: '', receivedAmount: '', pendingAmount: '' });
    setShowPreview(false);
    onComplete();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Assets Money Recovery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePreview} className="space-y-4">
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
              <Label htmlFor="item-name">Item Name</Label>
              <Input
                id="item-name"
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                placeholder="Enter item name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="received">Received Amount (₹)</Label>
              <Input
                id="received"
                type="number"
                min="0"
                value={formData.receivedAmount}
                onChange={(e) => setFormData({ ...formData, receivedAmount: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pending">Pending Amount (₹)</Label>
              <Input
                id="pending"
                type="number"
                min="0"
                value={formData.pendingAmount}
                onChange={(e) => setFormData({ ...formData, pendingAmount: e.target.value })}
                placeholder="0"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              Preview & Submit
            </Button>
          </form>
        </CardContent>
      </Card>

      <PreviewDialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={handleConfirmSubmit}
        title="Money Recovery"
        data={{
          farmerName: formData.farmerName,
          stallName: formData.stallName,
          itemName: formData.itemName,
          receivedAmount: formData.receivedAmount || '0',
          pendingAmount: formData.pendingAmount || '0',
        }}
        loading={loading}
      />

      <div>
        <h3 className="font-semibold mb-3">History</h3>
        <TaskHistoryView
          sessionId={sessionId}
          taskType="assets_money_recovery"
          columns={[
            { key: 'farmer_name', label: 'Farmer' },
            { key: 'stall_name', label: 'Stall' },
            { key: 'item_name', label: 'Item' },
            { key: 'received_amount', label: 'Received', render: (val) => `₹${val}` },
            { key: 'pending_amount', label: 'Pending', render: (val) => `₹${val}` },
          ]}
        />
      </div>
    </div>
  );
}
