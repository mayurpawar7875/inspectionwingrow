import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin } from 'lucide-react';

interface CityStats {
  city: string;
  activeMarkets: number;
  activeSessions: number;
}

export default function EmployeeCitySelection() {
  const navigate = useNavigate();
  const [cities, setCities] = useState<CityStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCities();

    const channel = supabase
      .channel('employee-cities')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, fetchCities)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'markets' }, fetchCities)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCities = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get live markets with activity
      const { data: liveMarkets } = await supabase
        .from('live_markets_today')
        .select('*');

      // Group by city
      const cityMap = new Map<string, CityStats>();
      
      (liveMarkets || []).forEach((market) => {
        const city = market.city || 'Unknown';
        const existing = cityMap.get(city) || {
          city,
          activeMarkets: 0,
          activeSessions: 0,
        };

        cityMap.set(city, {
          city,
          activeMarkets: existing.activeMarkets + 1,
          activeSessions: existing.activeSessions + (market.active_sessions || 0),
        });
      });

      setCities(Array.from(cityMap.values()).sort((a, b) => a.city.localeCompare(b.city)));
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h2 className="text-3xl font-bold">Employee Reporting - Select City</h2>
          <p className="text-muted-foreground">Choose a city to view employee activities</p>
        </div>
      </div>

      {cities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No active cities found for today</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cities.map((cityData) => (
            <Card
              key={cityData.city}
              className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all border-2 hover:border-primary/50"
              onClick={() => navigate(`/admin/employee-reporting/city/${encodeURIComponent(cityData.city)}`)}
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <MapPin className="h-6 w-6 text-green-500" />
                  </div>
                  <CardTitle className="text-xl">{cityData.city}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-2 rounded-lg bg-accent/50">
                  <span className="text-sm text-muted-foreground">Active Markets</span>
                  <span className="font-bold text-lg">{cityData.activeMarkets}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-accent/50">
                  <span className="text-sm text-muted-foreground">Active Sessions</span>
                  <span className="font-bold text-lg text-green-500">{cityData.activeSessions}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
