import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

type PaymentMode = 'cash' | 'online';

interface StallRow {
  id: string;
  farmer_name: string;
  stall_name: string;
  amount: string; // keep as string for input control
  mode: PaymentMode;
}

export default function Collections() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessionMarketId, setSessionMarketId] = useState<string | null>(null);
  const [sessionDate, setSessionDate] = useState<string | null>(null);
  const [rows, setRows] = useState<StallRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [manualFarmer, setManualFarmer] = useState('');
  const [manualStallName, setManualStallName] = useState('');
  const [manualStallNo, setManualStallNo] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualMode, setManualMode] = useState<PaymentMode>('cash');
  const [addingManual, setAddingManual] = useState(false);
  const [depositFile, setDepositFile] = useState<File | null>(null);
  const [uploadingDeposit, setUploadingDeposit] = useState(false);

  // Get IST date string for today
  const getISTDateString = (date: Date) => {
    const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Find today's session (by session_date)
        const today = new Date().toISOString().split('T')[0];
        const { data: session, error: sErr } = await supabase
          .from('sessions')
          .select('id, market_id, session_date, market_date, status')
          .eq('user_id', user.id)
          .eq('session_date', today)
          .maybeSingle();

        if (sErr) throw sErr;
        if (!session) {
          toast.error('No active session for today');
          setLoading(false);
          return;
        }

        const marketId = session.market_id;
        const dateStr = getISTDateString(new Date()); // use IST calendar date for stall confirmations
        setSessionMarketId(marketId);
        setSessionDate(dateStr);

        // Fetch today's confirmed stalls for that market
        const { data: stalls, error: stErr } = await supabase
          .from('stall_confirmations')
          .select('id, farmer_name, stall_name')
          .eq('market_id', marketId)
          .eq('market_date', dateStr)
          .order('created_at', { ascending: true });

        if (stErr) throw stErr;

        setRows(
          (stalls || []).map((s) => ({
            id: s.id,
            farmer_name: s.farmer_name,
            stall_name: s.stall_name,
            amount: '',
            mode: 'cash',
          }))
        );
      } catch (e) {
        console.error(e);
        toast.error('Failed to load collections data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const totals = useMemo(() => {
    let cash = 0;
    let online = 0;
    rows.forEach((r) => {
      const val = Number(r.amount || 0);
      if (!isNaN(val) && val > 0) {
        if (r.mode === 'cash') cash += val;
        else online += val;
      }
    });
    return { cash, online, grand: cash + online };
  }, [rows]);

  const setRowValue = (id: string, key: keyof StallRow, value: string | PaymentMode) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [key]: value } : r))
    );
  };

  const finalize = async () => {
    if (!user || !sessionMarketId || !sessionDate) return;
    const entries = rows
      .map((r) => ({
        amount: Number(r.amount || 0),
        mode: r.mode === 'cash' ? 'cash' : 'upi', // map Online -> 'upi'
        farmer_name: r.farmer_name,
        stall_name: r.stall_name,
        stall_confirmation_id: r.id,
      }))
      .filter((e) => !isNaN(e.amount) && e.amount > 0);

    if (entries.length === 0) {
      toast.error('Please enter at least one amount');
      return;
    }

    setSaving(true);
    try {
      // Insert into collections table
      // Schema: id, market_id, market_date, amount, mode, collected_by, created_at
      const payload = entries.map((e) => ({
        market_id: sessionMarketId,
        market_date: sessionDate,
        amount: e.amount,
        mode: e.mode, // 'cash' | 'upi'
        collected_by: user.id,
      }));

      const { error } = await supabase.from('collections').insert(payload);
      if (error) throw error;

      toast.success(`Saved. Cash ₹${totals.cash.toLocaleString('en-IN')}, Online ₹${totals.online.toLocaleString('en-IN')}`);
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save collections');
    } finally {
      setSaving(false);
    }
  };

  const handleAddManualStall = async () => {
    if (!user || !sessionMarketId || !sessionDate) return;
    if (!manualFarmer.trim() || !manualStallName.trim()) {
      toast.error('Enter farmer and stall name');
      return;
    }

    setAddingManual(true);
    try {
      const { data, error } = await supabase
        .from('stall_confirmations')
        .insert({
          farmer_name: manualFarmer.trim(),
          stall_name: manualStallName.trim(),
          stall_no: manualStallNo.trim() || null,
          created_by: user.id,
          market_id: sessionMarketId,
          market_date: sessionDate,
        } as any)
        .select('id, farmer_name, stall_name')
        .maybeSingle();

      if (error) throw error;

      if (data?.id) {
        setRows((prev) => [
          {
            id: data.id,
            farmer_name: data.farmer_name,
            stall_name: data.stall_name,
            amount: manualAmount,
            mode: manualMode,
          },
          ...prev,
        ]);
      }

      setManualFarmer('');
      setManualStallName('');
      setManualStallNo('');
      setManualAmount('');
      setManualMode('cash');
      toast.success('Stall added');
    } catch (e) {
      console.error(e);
      toast.error('Failed to add stall');
    } finally {
      setAddingManual(false);
    }
  };

  const handleDepositFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setDepositFile(f);
  };

  const uploadCashDepositProof = async () => {
    if (!user || !sessionMarketId || !sessionDate) return;
    if (!depositFile) {
      toast.error('Please choose an image first');
      return;
    }

    setUploadingDeposit(true);
    try {
      const fileName = `${user.id}/${Date.now()}-cash-deposit-${depositFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('employee-media')
        .upload(fileName, depositFile);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('media').insert({
        user_id: user.id,
        market_id: sessionMarketId,
        market_date: sessionDate,
        media_type: 'cash_deposit' as any,
        file_url: fileName, // Store path, not full URL
        file_name: depositFile.name,
        content_type: depositFile.type,
        captured_at: new Date().toISOString(),
      } as any);
      if (insertError) throw insertError;

      toast.success('Cash deposit proof uploaded');
      setDepositFile(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload cash deposit proof');
    } finally {
      setUploadingDeposit(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading collections…</div>
      </div>
    );
  }

  if (!sessionMarketId || !sessionDate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">No active session found for today</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container-responsive py-3">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Market Collections</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-11">Date: {sessionDate}</p>
        </div>
      </header>

      <main className="container-responsive py-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Stall Confirmations (Today)</CardTitle>
          </CardHeader>
          <CardContent className="card-padding-responsive">
            <div className="mb-4 p-3 rounded border space-y-3">
              <div className="text-sm font-medium">Add Stall & Collection</div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                <Input
                  placeholder="Farmer name"
                  value={manualFarmer}
                  onChange={(e) => setManualFarmer(e.target.value)}
                />
                <Input
                  placeholder="Stall name"
                  value={manualStallName}
                  onChange={(e) => setManualStallName(e.target.value)}
                />
                <Input
                  placeholder="Stall no (optional)"
                  value={manualStallNo}
                  onChange={(e) => setManualStallNo(e.target.value)}
                />
                <Input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  placeholder="Amount"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                />
                <div className="flex gap-2">
                  <Select value={manualMode} onValueChange={(v) => setManualMode(v as PaymentMode)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddManualStall} disabled={addingManual}>
                    {addingManual ? 'Adding…' : 'Add'}
                  </Button>
                </div>
              </div>
            </div>
            <div className="scroll-x-touch">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Stall</TableHead>
                    <TableHead className="w-[140px]">Amount (₹)</TableHead>
                    <TableHead className="w-[140px]">Mode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No stall confirmations found for today
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.farmer_name}</TableCell>
                        <TableCell>{r.stall_name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            inputMode="decimal"
                            value={r.amount}
                            onChange={(e) => setRowValue(r.id, 'amount', e.target.value)}
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={r.mode}
                            onValueChange={(v) => setRowValue(r.id, 'mode', v as PaymentMode)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="online">Online</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent className="card-padding-responsive">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 rounded border">
                <div className="text-sm text-muted-foreground">Total Cash</div>
                <div className="text-xl font-semibold">₹{totals.cash.toLocaleString('en-IN')}</div>
              </div>
              <div className="p-3 rounded border">
                <div className="text-sm text-muted-foreground">Total Online</div>
                <div className="text-xl font-semibold">₹{totals.online.toLocaleString('en-IN')}</div>
              </div>
              <div className="p-3 rounded border">
                <div className="text-sm text-muted-foreground">Grand Total</div>
                <div className="text-xl font-semibold">₹{totals.grand.toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="mt-6 p-3 rounded border space-y-3">
              <div className="text-sm font-medium">Cash Deposit Proof (optional)</div>
              <div className="text-sm text-muted-foreground">
                Upload the bank cash deposit slip/screenshot for today.
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <Input type="file" accept="image/*" onChange={handleDepositFileChange} />
                <Button variant="secondary" onClick={uploadCashDepositProof} disabled={uploadingDeposit || !depositFile}>
                  {uploadingDeposit ? 'Uploading…' : 'Upload Proof'}
                </Button>
              </div>
              {depositFile && (
                <div className="text-xs text-muted-foreground break-all">
                  Selected: {depositFile.name}
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={finalize} disabled={saving || rows.length === 0}>
                {saving ? 'Saving…' : 'Finalize & Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}