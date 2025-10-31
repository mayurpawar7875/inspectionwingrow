import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { IndianRupee } from 'lucide-react';

interface CollectionData {
  market_name: string;
  total_amount: number;
  transaction_count: number;
}

export default function CollectionsWidget() {
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    fetchCollections();
    
    const channel = supabase
      .channel('collections-feed')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'collections' 
      }, fetchCollections)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  const fetchCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select(`
          id,
          amount,
          market_id,
          markets (name)
        `)
        .eq('market_date', selectedDate);

      if (error) throw error;

      const marketMap = new Map<string, CollectionData>();
      let total = 0;

      data?.forEach((item: any) => {
        const marketName = item.markets?.name || 'Unknown Market';
        
        if (!marketMap.has(marketName)) {
          marketMap.set(marketName, {
            market_name: marketName,
            total_amount: 0,
            transaction_count: 0,
          });
        }

        const marketData = marketMap.get(marketName)!;
        marketData.total_amount += Number(item.amount);
        marketData.transaction_count += 1;
        total += Number(item.amount);
      });

      setCollections(Array.from(marketMap.values()));
      setTotalAmount(total);
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Market-wise Collections</CardTitle>
            <CardDescription>Total collections by market</CardDescription>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="p-4 bg-accent rounded-lg">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5" />
              <div>
                <p className="text-sm text-muted-foreground">Total Collections</p>
                <p className="text-2xl font-bold">₹{totalAmount.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>

          {collections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No collections for this date
            </div>
          ) : (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={collections}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="market_name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
                      labelStyle={{ color: 'black' }}
                    />
                    <Bar dataKey="total_amount" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {collections.map((item) => (
                  <div key={item.market_name} className="flex justify-between items-center p-2 border rounded">
                    <span className="font-medium">{item.market_name}</span>
                    <div className="text-right">
                      <p className="font-semibold">₹{item.total_amount.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-muted-foreground">{item.transaction_count} transactions</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
