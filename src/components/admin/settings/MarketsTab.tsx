import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Market {
  id: string;
  name: string;
  city: string | null;
  location: string;
  is_active: boolean;
  day_of_week?: number | null;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
}

interface MarketsTabProps {
  onChangeMade: () => void;
}

export function MarketsTab({ onChangeMade }: MarketsTabProps) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMarket, setEditingMarket] = useState<Market | null>(null);
  const [form, setForm] = useState({
    name: '',
    city: '',
    location: '',
    day_of_week: '' as string | number,
    lat: '' as string | number,
    lng: '' as string | number,
    address: ''
  });

  const fetchMarkets = async () => {
    try {
      const { data, error } = await supabase
        .from('markets')
        .select('*')
        .order('name');

      if (error) throw error;
      setMarkets(data || []);
    } catch (error) {
      console.error('Error fetching markets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load markets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
  }, []);

  const openEdit = (m: Market) => {
    setEditingMarket(m);
    setForm({
      name: m.name || '',
      city: m.city || '',
      location: m.location || '',
      day_of_week: (m.day_of_week ?? 'none') as any,
      lat: m.lat ?? '',
      lng: m.lng ?? '',
      address: m.address || ''
    });
    setIsEditOpen(true);
  };

  const openAdd = () => {
    setEditingMarket(null);
    setForm({
      name: '',
      city: '',
      location: '',
      day_of_week: 'none' as any,
      lat: '',
      lng: '',
      address: ''
    });
    setIsAddOpen(true);
  };

  const handleFormChange = (key: keyof typeof form, value: string) => {
    const normalized = key === 'day_of_week' && value === 'none' ? '' : value;
    setForm((f) => ({ ...f, [key]: normalized }));
  };

  const saveEdit = async () => {
    if (!editingMarket) return;
    if (!form.name.trim()) {
      toast({ title: 'Validation', description: 'Market name is required', variant: 'destructive' });
      return;
    }

    try {
      const payload: any = {
        name: form.name.trim(),
        city: form.city.trim() || null,
        location: form.location.trim(),
        address: form.address.trim() || null,
        day_of_week: form.day_of_week === '' ? null : Number(form.day_of_week),
        lat: form.lat === '' ? null : Number(form.lat),
        lng: form.lng === '' ? null : Number(form.lng)
      };

      const { error } = await supabase
        .from('markets')
        .update(payload)
        .eq('id', editingMarket.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Market updated' });
      setIsEditOpen(false);
      setEditingMarket(null);
      await fetchMarkets();
      onChangeMade();
    } catch (error) {
      console.error('Error updating market:', error);
      toast({ title: 'Error', description: 'Failed to update market', variant: 'destructive' });
    }
  };

  const saveAdd = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Validation', description: 'Market name is required', variant: 'destructive' });
      return;
    }
    if (!form.location.trim()) {
      toast({ title: 'Validation', description: 'Location is required', variant: 'destructive' });
      return;
    }
    try {
      const payload: any = {
        name: form.name.trim(),
        city: form.city.trim() || null,
        location: form.location.trim(),
        address: form.address.trim() || null,
        day_of_week: form.day_of_week === '' ? null : Number(form.day_of_week),
        lat: form.lat === '' ? null : Number(form.lat),
        lng: form.lng === '' ? null : Number(form.lng),
        is_active: true,
      };

      const { error } = await supabase
        .from('markets')
        .insert(payload);

      if (error) throw error;

      toast({ title: 'Success', description: 'Market added' });
      setIsAddOpen(false);
      await fetchMarkets();
      onChangeMade();
    } catch (error) {
      console.error('Error adding market:', error);
      toast({ title: 'Error', description: 'Failed to add market', variant: 'destructive' });
    }
  };

  const toggleMarketStatus = async (marketId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('markets')
        .update({ is_active: !currentStatus })
        .eq('id', marketId);

      if (error) throw error;

      await fetchMarkets();
      onChangeMade();
      toast({
        title: 'Success',
        description: 'Market status updated',
      });
    } catch (error) {
      console.error('Error updating market:', error);
      toast({
        title: 'Error',
        description: 'Failed to update market',
        variant: 'destructive',
      });
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Markets</CardTitle>
            <CardDescription>Manage market locations and schedules</CardDescription>
          </div>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Market
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {markets.map((market) => (
              <TableRow key={market.id}>
                <TableCell className="font-medium">{market.name}</TableCell>
                <TableCell>{market.city || 'N/A'}</TableCell>
                <TableCell>{market.location}</TableCell>
                <TableCell>
                  <Badge variant={market.is_active ? 'default' : 'secondary'}>
                    {market.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(market)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => toggleMarketStatus(market.id, market.is_active)}
                    >
                      {market.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      {/* Edit dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Market</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Market Name</Label>
              <Input id="name" value={form.name} onChange={(e) => handleFormChange('name', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => handleFormChange('city', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Day of Market</Label>
              <Select value={form.day_of_week === '' ? 'none' : String(form.day_of_week)} onValueChange={(v) => handleFormChange('day_of_week', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location (text or Google Maps link)</Label>
              <Input id="location" value={form.location} onChange={(e) => handleFormChange('location', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lat">Latitude</Label>
                <Input id="lat" value={String(form.lat)} onChange={(e) => handleFormChange('lat', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lng">Longitude</Label>
                <Input id="lng" value={String(form.lng)} onChange={(e) => handleFormChange('lng', e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={(e) => handleFormChange('address', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Market</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name-add">Market Name</Label>
              <Input id="name-add" value={form.name} onChange={(e) => handleFormChange('name', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city-add">City</Label>
              <Input id="city-add" value={form.city} onChange={(e) => handleFormChange('city', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Day of Market</Label>
              <Select value={form.day_of_week === '' ? 'none' : String(form.day_of_week)} onValueChange={(v) => handleFormChange('day_of_week', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location-add">Location (text or Google Maps link)</Label>
              <Input id="location-add" value={form.location} onChange={(e) => handleFormChange('location', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lat-add">Latitude</Label>
                <Input id="lat-add" value={String(form.lat)} onChange={(e) => handleFormChange('lat', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lng-add">Longitude</Label>
                <Input id="lng-add" value={String(form.lng)} onChange={(e) => handleFormChange('lng', e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address-add">Address</Label>
              <Input id="address-add" value={form.address} onChange={(e) => handleFormChange('address', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={saveAdd}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
