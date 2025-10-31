import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Edit } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Stall {
  id: string;
  farmer_name: string;
  stall_name: string;
  stall_no: string;
}

export default function Stalls() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStall, setEditingStall] = useState<Stall | null>(null);
  const [formData, setFormData] = useState({
    farmer_name: '',
    stall_name: '',
    stall_no: '',
  });
  const [formAmount, setFormAmount] = useState<string>('');
  const [formMode, setFormMode] = useState<'cash' | 'online'>('cash');
  const [savingCollection, setSavingCollection] = useState<Record<string, boolean>>({});
  const [quickAmounts, setQuickAmounts] = useState<Record<string, string>>({});
  const [quickModes, setQuickModes] = useState<Record<string, 'cash' | 'online'>>({});

  useEffect(() => {
    fetchData();
  }, [user]);

  const getISTDateString = (date: Date) => {
    const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const fetchData = async () => {
    if (!user) return;

    try {
      const today = getISTDateString(new Date());
      
      // Fetch stall confirmations for today
      const { data: stallsData, error: stallsError } = await supabase
        .from('stall_confirmations')
        .select('*')
        .eq('created_by', user.id)
        .eq('market_date', today)
        .order('created_at', { ascending: true });

      if (stallsError) throw stallsError;
      setStalls(stallsData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load stalls');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.farmer_name.trim() || !formData.stall_name.trim() || !formData.stall_no.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!user) return;

    try {
      // Resolve market id from local storage OR fallback to today's active session
      const dashboardState = JSON.parse(localStorage.getItem('dashboardState') || '{}');
      let marketId: string | undefined = dashboardState.selectedMarketId;

      const today = getISTDateString(new Date());
      const { data: todaySession, error: sessionErr } = await supabase
        .from('sessions')
        .select('id, market_id, status, session_date')
        .eq('user_id', user.id)
        .eq('session_date', today)
        .maybeSingle();
      if (sessionErr) throw sessionErr;

      // If a session already exists for today, always use its market to avoid duplicate session creation
      if (todaySession?.market_id) {
        marketId = todaySession.market_id;
        localStorage.setItem('dashboardState', JSON.stringify({ selectedMarketId: marketId }));
      }
      // Otherwise keep previously selected marketId (from dashboard)

      if (!marketId) {
        toast.error('Please select a market from the dashboard first');
        navigate('/dashboard');
        return;
      }

      if (editingStall) {
        // Update existing stall confirmation
        const { error } = await supabase
          .from('stall_confirmations')
          .update(formData)
          .eq('id', editingStall.id);

        if (error) throw error;
        
        const istTime = new Date().toLocaleTimeString('en-IN', { 
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit'
        });
        toast.success(`Updated at ${istTime} IST`);
      } else {
        // Insert new stall confirmation - trigger will handle session and metadata
        const payload = {
          ...formData,
          created_by: user.id,
          market_id: marketId,
          market_date: getISTDateString(new Date()),
        } as any;
        console.debug('Adding stall confirmation payload', payload);
        const { data: inserted, error } = await supabase
          .from('stall_confirmations')
          .insert(payload)
          .select('id')
          .maybeSingle();

        if (error) throw error;
        
        const istTime = new Date().toLocaleTimeString('en-IN', { 
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit'
        });
        toast.success(`Saved at ${istTime} IST`);

        // If amount provided, create a collection entry immediately
        const amountNum = Number(formAmount || 0);
        if (!isNaN(amountNum) && amountNum > 0 && inserted?.id) {
          const { error: collErr } = await supabase.from('collections').insert({
            market_id: marketId,
            market_date: getISTDateString(new Date()),
            amount: amountNum,
            mode: formMode === 'cash' ? 'cash' : 'upi',
            collected_by: user.id,
          } as any);
          if (collErr) {
            console.error(collErr);
            toast.error('Stall added, but failed to save collection');
          } else {
            toast.success('Collection saved');
          }
        }
      }

      setDialogOpen(false);
      setEditingStall(null);
      setFormData({ farmer_name: '', stall_name: '', stall_no: '' });
      setFormAmount('');
      setFormMode('cash');
      fetchData();
    } catch (error: any) {
      toast.error((editingStall ? 'Failed to update stall: ' : 'Failed to add stall: ') + (error?.message || ''));
      console.error('Stall confirmation error', error);
    }
  };

  const handleEdit = (stall: Stall) => {
    setEditingStall(stall);
    setFormData({
      farmer_name: stall.farmer_name,
      stall_name: stall.stall_name,
      stall_no: stall.stall_no,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stall?')) return;

    try {
      const { error } = await supabase.from('stall_confirmations').delete().eq('id', id);

      if (error) throw error;
      toast.success('Stall deleted successfully!');
      fetchData();
    } catch (error: any) {
      toast.error('Failed to delete stall');
      console.error(error);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingStall(null);
    setFormData({ farmer_name: '', stall_name: '', stall_no: '' });
    setFormAmount('');
    setFormMode('cash');
  };

  const saveQuickCollection = async (stallId: string) => {
    if (!user) return;
    const amountStr = quickAmounts[stallId] || '';
    const amountNum = Number(amountStr || 0);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    try {
      // Resolve market id from local storage OR fallback to today's active session
      const dashboardState = JSON.parse(localStorage.getItem('dashboardState') || '{}');
      let marketId: string | undefined = dashboardState.selectedMarketId;
      if (!marketId) {
        const today = getISTDateString(new Date());
        const { data: todaySession, error: sessionErr } = await supabase
          .from('sessions')
          .select('id, market_id, status')
          .eq('user_id', user.id)
          .eq('session_date', today)
          .maybeSingle();
        if (sessionErr) throw sessionErr;
        marketId = todaySession?.market_id;
        if (marketId) {
          localStorage.setItem('dashboardState', JSON.stringify({ selectedMarketId: marketId }));
        }
      }
      if (!marketId) {
        toast.error('Please select a market from the dashboard first');
        navigate('/dashboard');
        return;
      }

      setSavingCollection((prev) => ({ ...prev, [stallId]: true }));
      const { error } = await supabase.from('collections').insert({
        market_id: marketId,
        market_date: getISTDateString(new Date()),
        amount: amountNum,
        mode: (quickModes[stallId] || 'cash') === 'cash' ? 'cash' : 'upi',
        collected_by: user.id,
      } as any);
      if (error) throw error;
      toast.success('Collection saved');
      setQuickAmounts((prev) => ({ ...prev, [stallId]: '' }));
    } catch (err) {
      console.error(err);
      toast.error('Failed to save collection');
    } finally {
      setSavingCollection((prev) => ({ ...prev, [stallId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div>
                <CardTitle>Stall Confirmations</CardTitle>
                <CardDescription className="mt-1">Add and manage stall information for today's session</CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Stall
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingStall ? 'Edit Stall' : 'Add New Stall'}</DialogTitle>
                    <DialogDescription>
                      Enter the details of the stall
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="farmer_name">Farmer Name</Label>
                      <Input
                        id="farmer_name"
                        value={formData.farmer_name}
                        onChange={(e) => setFormData({ ...formData, farmer_name: e.target.value })}
                        placeholder="Enter farmer name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stall_name">Stall Name</Label>
                      <Input
                        id="stall_name"
                        value={formData.stall_name}
                        onChange={(e) => setFormData({ ...formData, stall_name: e.target.value })}
                        placeholder="Enter stall name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stall_no">Stall Number</Label>
                      <Input
                        id="stall_no"
                        value={formData.stall_no}
                        onChange={(e) => setFormData({ ...formData, stall_no: e.target.value })}
                        placeholder="Enter stall number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Collection Amount (optional)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="amount"
                          type="number"
                          min="0"
                          inputMode="decimal"
                          value={formAmount}
                          onChange={(e) => setFormAmount(e.target.value)}
                          placeholder="0"
                        />
                        <Select value={formMode} onValueChange={(v) => setFormMode(v as 'cash' | 'online')}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        {editingStall ? 'Update' : 'Add'} Stall
                      </Button>
                      <Button type="button" variant="outline" onClick={handleDialogClose}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {stalls.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No stalls added yet. Click "Add Stall" to begin.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stalls.map((stall) => (
                  <Card key={stall.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{stall.stall_name}</h3>
                          <p className="text-sm text-muted-foreground">Farmer: {stall.farmer_name}</p>
                          <p className="text-sm text-muted-foreground">Stall No: {stall.stall_no}</p>
                          <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
                            <Input
                              type="number"
                              min="0"
                              inputMode="decimal"
                              className="w-full sm:w-40"
                              placeholder="Amount"
                              value={quickAmounts[stall.id] || ''}
                              onChange={(e) => setQuickAmounts((prev) => ({ ...prev, [stall.id]: e.target.value }))}
                            />
                            <Select
                              value={quickModes[stall.id] || 'cash'}
                              onValueChange={(v) => setQuickModes((prev) => ({ ...prev, [stall.id]: v as 'cash' | 'online' }))}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Mode" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="online">Online</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              onClick={() => saveQuickCollection(stall.id)}
                              disabled={!!savingCollection[stall.id]}
                            >
                              {savingCollection[stall.id] ? 'Saving…' : 'Save Collection'}
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(stall)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(stall.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
