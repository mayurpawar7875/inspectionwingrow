import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Package } from 'lucide-react';
import { TaskHistoryView } from './TaskHistoryView';
import { PreviewDialog } from './PreviewDialog';
import { format } from 'date-fns';

interface AssetsUsageFormProps {
  sessionId: string;
  onComplete: () => void;
}

export function AssetsUsageForm({ sessionId, onComplete }: AssetsUsageFormProps) {
  const [loading, setLoading] = useState(false);
  const [markets, setMarkets] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    employeeName: '',
    marketId: '',
    assetName: '',
    quantity: '1',
    returnDate: '',
  });

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

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeName || !formData.marketId || !formData.assetName) {
      toast.error('Please fill all required fields');
      return;
    }
    setShowPreview(true);
  };

  const handleConfirmSubmit = async () => {
    setLoading(true);
    const { error } = await supabase.from('assets_usage').insert({
      session_id: sessionId,
      employee_name: formData.employeeName,
      market_id: formData.marketId,
      asset_name: formData.assetName,
      quantity: Number(formData.quantity) || 1,
      return_date: formData.returnDate || null,
    });

    setLoading(false);
    if (error) {
      toast.error('Failed to save asset usage');
      return;
    }

    toast.success('Asset usage saved successfully');
    setFormData({ employeeName: '', marketId: '', assetName: '', quantity: '1', returnDate: '' });
    setShowPreview(false);
    onComplete();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Assets Usage in Live Markets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePreview} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee-name">Employee Name</Label>
              <Input
                id="employee-name"
                value={formData.employeeName}
                onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                placeholder="Enter employee name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="market">Market Name</Label>
              <Select value={formData.marketId} onValueChange={(value) => setFormData({ ...formData, marketId: value })}>
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
              <Label htmlFor="asset-name">Asset Issued</Label>
              <Input
                id="asset-name"
                value={formData.assetName}
                onChange={(e) => setFormData({ ...formData, assetName: e.target.value })}
                placeholder="Enter asset name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="return-date">Return Date (Optional)</Label>
              <Input
                id="return-date"
                type="date"
                value={formData.returnDate}
                onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
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
        title="Asset Usage"
        data={{
          employeeName: formData.employeeName,
          market: markets.find(m => m.id === formData.marketId)?.name || '-',
          assetName: formData.assetName,
          quantity: formData.quantity,
          returnDate: formData.returnDate || 'Not specified',
        }}
        loading={loading}
      />

      <div>
        <h3 className="font-semibold mb-3">History</h3>
        <TaskHistoryView
          sessionId={sessionId}
          taskType="assets_usage"
          columns={[
            { key: 'employee_name', label: 'Employee' },
            { key: 'market_id', label: 'Market', render: (_, row) => markets.find(m => m.id === row.market_id)?.name || 'Unknown' },
            { key: 'asset_name', label: 'Asset' },
            { key: 'quantity', label: 'Qty' },
            { key: 'return_date', label: 'Return Date', render: (val) => val ? format(new Date(val), 'dd/MM/yyyy') : '-' },
          ]}
        />
      </div>
    </div>
  );
}
