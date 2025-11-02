import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit } from 'lucide-react';

interface Farmer {
  id: string;
  name: string;
  is_active: boolean;
}

interface FarmersTabProps {
  onChangeMade: () => void;
}

export function FarmersTab({ onChangeMade }: FarmersTabProps) {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Farmer | null>(null);
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchFarmers = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('farmers')
        .select('*')
        .order('name');
      if (error) throw error;
      setFarmers(data || []);
    } catch (err) {
      console.error('Error fetching farmers:', err);
      toast({ title: 'Error', description: 'Failed to load farmers', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setActive(true);
    setIsDialogOpen(true);
  };

  const openEdit = (farmer: Farmer) => {
    setEditing(farmer);
    setName(farmer.name);
    setActive(farmer.is_active);
    setIsDialogOpen(true);
  };

  const save = async () => {
    if (!name.trim()) {
      toast({ title: 'Name required', description: 'Enter a farmer name', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await (supabase as any)
          .from('farmers')
          .update({ name: name.trim(), is_active: active })
          .eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Updated', description: 'Farmer updated' });
      } else {
        const { error } = await (supabase as any)
          .from('farmers')
          .insert({ name: name.trim(), is_active: active });
        if (error) throw error;
        toast({ title: 'Created', description: 'Farmer added' });
      }
      await fetchFarmers();
      onChangeMade();
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error('Error saving farmer:', err);
      const message = err?.code === '23505' ? 'Farmer name already exists' : 'Failed to save farmer';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Farmers</CardTitle>
            <CardDescription>Manage the farmer master list for suggestions</CardDescription>
          </div>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Farmer
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {farmers.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.name}</TableCell>
                <TableCell>
                  <Badge variant={f.is_active ? 'default' : 'secondary'}>
                    {f.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(f)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Farmer' : 'Add Farmer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="farmer-name">Name</Label>
              <Input id="farmer-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="farmer-active">Active</Label>
              <Switch id="farmer-active" checked={active} onCheckedChange={setActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}



