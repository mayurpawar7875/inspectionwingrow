import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LogOut, MapPin } from 'lucide-react';

interface PunchOutFormProps {
  sessionId: string;
  onComplete: () => void;
}

export function PunchOutForm({ sessionId, onComplete }: PunchOutFormProps) {
  const [loading, setLoading] = useState(false);

  const handlePunchOut = async () => {
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        const { error } = await supabase.from('market_manager_punchout').insert({
          session_id: sessionId,
          gps_lat: latitude,
          gps_lng: longitude,
        });

        setLoading(false);
        if (error) {
          toast.error('Failed to punch out');
          return;
        }

        toast.success('Punched out successfully');
        onComplete();
      },
      (error) => {
        setLoading(false);
        toast.error('Failed to get GPS location');
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LogOut className="h-5 w-5" />
          Punch-Out
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          GPS location will be captured automatically
        </div>

        <Button onClick={handlePunchOut} disabled={loading} className="w-full">
          {loading ? 'Processing...' : 'Punch Out'}
        </Button>
      </CardContent>
    </Card>
  );
}
