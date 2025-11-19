import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

interface StallRow {
  id: string;
  farmer_name: string;
  stall_name: string;
  expected_rent: number;
  actual_rent: string; // keep as string for input control
}

export default function Collections() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessionMarketId, setSessionMarketId] = useState<string | null>(null);
  const [sessionDate, setSessionDate] = useState<string | null>(null);
  const [rows, setRows] = useState<StallRow[]>([]);
  const [saving, setSaving] = useState(false);

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
        // Find today's session using IST date
        const todayIST = getISTDateString(new Date());
        const { data: session, error: sErr } = await supabase
          .from('sessions')
          .select('id, market_id, session_date, market_date, status')
          .eq('user_id', user.id)
          .eq('session_date', todayIST)
          .maybeSingle();

        if (sErr) throw sErr;
        if (!session) {
          toast.error('No active session for today');
          setLoading(false);
          return;
        }

        const marketId = session.market_id;
        const dateStr = getISTDateString(new Date());
        setSessionMarketId(marketId);
        setSessionDate(dateStr);

        // Fetch today's confirmed stalls with rent amounts
        const { data: stalls, error: stErr } = await supabase
          .from('stall_confirmations')
          .select('id, farmer_name, stall_name, rent_amount')
          .eq('market_id', marketId)
          .eq('market_date', dateStr)
          .eq('created_by', user.id)
          .order('created_at', { ascending: true });

        if (stErr) throw stErr;

        // Fetch existing collections for these stalls
        const stallIds = (stalls || []).map(s => s.id);
        const { data: existingCollections } = await supabase
          .from('collections')
          .select('stall_confirmation_id, amount')
          .in('stall_confirmation_id', stallIds)
          .eq('collected_by', user.id);

        // Create a map of stall_confirmation_id -> actual rent collected
        const collectionsMap = new Map(
          (existingCollections || []).map(c => [c.stall_confirmation_id, c.amount])
        );

        // Build rows with expected and actual rent
        setRows(
          (stalls || []).map((s) => ({
            id: s.id,
            farmer_name: s.farmer_name,
            stall_name: s.stall_name,
            expected_rent: s.rent_amount || 0,
            actual_rent: collectionsMap.get(s.id)?.toString() || '',
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

  const setRowValue = (id: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, actual_rent: value } : r))
    );
  };

  const handleSave = async () => {
    if (!user || !sessionMarketId || !sessionDate) return;

    // Filter rows with actual rent entered
    const entries = rows
      .map((r) => ({
        stall_confirmation_id: r.id,
        amount: Number(r.actual_rent || 0),
        farmer_name: r.farmer_name,
        stall_name: r.stall_name,
      }))
      .filter((e) => !isNaN(e.amount) && e.amount > 0);

    if (entries.length === 0) {
      toast.error('Please enter at least one rent amount');
      return;
    }

    setSaving(true);
    try {
      // Delete existing collections for these stalls (to update)
      const stallIds = entries.map(e => e.stall_confirmation_id);
      await supabase
        .from('collections')
        .delete()
        .in('stall_confirmation_id', stallIds)
        .eq('collected_by', user.id);

      // Insert new collections
      const payload = entries.map((e) => ({
        stall_confirmation_id: e.stall_confirmation_id,
        market_id: sessionMarketId,
        market_date: sessionDate,
        amount: e.amount,
        mode: 'rent', // Use 'rent' mode to distinguish from cash/online collections
        collected_by: user.id,
        farmer_name: e.farmer_name,
        stall_name: e.stall_name,
      }));

      const { error } = await supabase.from('collections').insert(payload);
      if (error) throw error;

      toast.success('Rent collections saved successfully!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save collections');
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const totalExpected = rows.reduce((sum, r) => sum + r.expected_rent, 0);
  const totalActual = rows.reduce((sum, r) => {
    const val = Number(r.actual_rent || 0);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading collections…</div>
      </div>
    );
  }

  if (!sessionMarketId || !sessionDate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">No active session found for today</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container-responsive py-2">
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="h-7 w-7"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-base font-bold">Rent Collections</h1>
          </div>
          <p className="text-xs text-muted-foreground ml-9">Date: {sessionDate}</p>
        </div>
      </header>

      <main className="container-responsive py-3 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Stall Rent Collection</CardTitle>
          </CardHeader>
          <CardContent className="card-padding-responsive pt-0">
            {rows.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                No stall confirmations found for today
              </div>
            ) : (
              <>
                <div className="scroll-x-touch">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs py-2">Stall Name</TableHead>
                        <TableHead className="text-xs py-2">Farmer Name</TableHead>
                        <TableHead className="text-xs py-2 text-right">Expected Rent (₹)</TableHead>
                        <TableHead className="w-[140px] text-xs py-2">Actual Rent (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium text-xs py-2">{r.stall_name}</TableCell>
                          <TableCell className="text-xs py-2">{r.farmer_name}</TableCell>
                          <TableCell className="text-xs py-2 text-right">
                            ₹{r.expected_rent.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="py-2">
                            <Input
                              type="number"
                              min="0"
                              inputMode="decimal"
                              value={r.actual_rent}
                              onChange={(e) => setRowValue(r.id, e.target.value)}
                              placeholder="0"
                              className="h-7 text-xs"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals Summary */}
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Total Expected Rent:</span>
                    <span className="font-semibold">₹{totalExpected.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Total Actual Rent Collected:</span>
                    <span className="font-semibold text-primary">₹{totalActual.toLocaleString('en-IN')}</span>
                  </div>
                  {totalExpected !== totalActual && (
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Difference:</span>
                      <span className={`font-semibold ${totalActual > totalExpected ? 'text-green-600' : 'text-amber-600'}`}>
                        ₹{Math.abs(totalExpected - totalActual).toLocaleString('en-IN')}
                        {totalActual > totalExpected ? ' (Over)' : ' (Under)'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleSave} disabled={saving || rows.length === 0} className="h-8 text-xs px-4">
                    {saving ? 'Saving…' : 'Save Collections'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}