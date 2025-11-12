import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { z } from 'zod';

const assetRequestSchema = z.object({
  assetId: z.string().min(1, "Please select an asset"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  purpose: z.string().min(3, "Purpose must be at least 3 characters").max(500),
  expectedReturnDate: z.string().min(1, "Please select expected return date"),
  remarks: z.string().max(1000).optional(),
});

export function AssetRequestForm() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    assetId: '',
    quantity: 1,
    marketId: '',
    purpose: '',
    expectedReturnDate: '',
    remarks: '',
  });

  useEffect(() => {
    fetchAssets();
    fetchMarkets();
    fetchUserRole();
  }, [user]);

  const fetchAssets = async () => {
    const { data } = await supabase
      .from('asset_inventory')
      .select('*')
      .gt('available_quantity', 0)
      .order('asset_name');
    setAssets(data || []);
  };

  const fetchMarkets = async () => {
    const { data } = await supabase
      .from('markets')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setMarkets(data || []);
  };

  const fetchUserRole = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    setUserRole(data?.role || 'employee');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = assetRequestSchema.parse({
        assetId: formData.assetId,
        quantity: formData.quantity,
        purpose: formData.purpose,
        expectedReturnDate: formData.expectedReturnDate,
        remarks: formData.remarks,
      });

      setLoading(true);

      const { error } = await supabase.from('asset_requests').insert({
        requester_id: user?.id,
        requester_role: userRole,
        asset_id: validatedData.assetId,
        quantity: validatedData.quantity,
        market_id: formData.marketId || null,
        purpose: validatedData.purpose,
        expected_return_date: validatedData.expectedReturnDate,
        remarks: validatedData.remarks || null,
      });

      if (error) throw error;

      toast.success('Asset request submitted successfully');
      setFormData({
        assetId: '',
        quantity: 1,
        marketId: '',
        purpose: '',
        expectedReturnDate: '',
        remarks: '',
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error('Failed to submit request');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request for Asset</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="asset">Asset Name *</Label>
            <Select value={formData.assetId} onValueChange={(value) => setFormData({ ...formData, assetId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select an asset" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.asset_name} (Available: {asset.available_quantity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
              required
            />
          </div>

          <div>
            <Label htmlFor="market">Market</Label>
            <Select value={formData.marketId} onValueChange={(value) => setFormData({ ...formData, marketId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a market (optional)" />
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

          <div>
            <Label htmlFor="purpose">Purpose *</Label>
            <Textarea
              id="purpose"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="Describe the purpose for this asset request"
              required
            />
          </div>

          <div>
            <Label htmlFor="returnDate">Expected Return Date *</Label>
            <Input
              id="returnDate"
              type="date"
              value={formData.expectedReturnDate}
              onChange={(e) => setFormData({ ...formData, expectedReturnDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Any additional notes (optional)"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}