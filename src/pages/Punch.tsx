import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Clock, CheckCircle, Camera, MapPin } from 'lucide-react';

export default function Punch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);

  useEffect(() => {
    fetchSession();
  }, [user]);

  const fetchSession = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_date', today)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error('No session found for today');
        navigate('/dashboard');
        return;
      }
      setSession(data);
    } catch (error: any) {
      console.error('Error fetching session:', error);
      toast.error('Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPosition = () => {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handlePunchIn = async () => {
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      let gpsLat: number | null = null;
      let gpsLng: number | null = null;
      let gpsAccuracy: number | null = null;

      if (!selfieFile) {
        toast.error('Please take a selfie before punching in.');
        setActionLoading(false);
        return;
      }

      try {
        const pos = await getCurrentPosition();
        gpsLat = pos.coords.latitude;
        gpsLng = pos.coords.longitude;
        gpsAccuracy = pos.coords.accuracy;
        setLastLocation({ lat: gpsLat, lng: gpsLng });
      } catch (geoErr: any) {
        toast.error('Location is required for punch in. Please enable GPS.');
        setActionLoading(false);
        return;
      }
      
      // 1) Upload selfie to storage and create media entry with gps
      setUploadingSelfie(true);
      const fileName = `${user!.id}/${Date.now()}-${selfieFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('employee-media')
        .upload(fileName, selfieFile);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('employee-media').getPublicUrl(fileName);

      const { error: insertMediaErr } = await supabase.from('media').insert({
        user_id: user!.id,
        market_id: session.market_id,
        media_type: 'selfie_gps',
        file_url: urlData.publicUrl,
        file_name: selfieFile.name,
        content_type: selfieFile.type,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
        captured_at: now,
      } as any);
      if (insertMediaErr) throw insertMediaErr;

      // Update session
      const { error: sessionError } = await supabase
        .from('sessions')
        .update({ punch_in_time: now })
        .eq('id', session.id);

      if (sessionError) throw sessionError;

      // Create task event
      const { data: eventData, error: eventError } = await supabase
        .from('task_events')
        .insert({
          session_id: session.id,
          task_type: 'punch',
          payload: { action: 'punch_in', timestamp: now, gps_lat: gpsLat, gps_lng: gpsLng, gps_accuracy: gpsAccuracy, selfie_url: urlData.publicUrl },
          created_at: now,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Update task status
      await supabase
        .from('task_status')
        .upsert({
          session_id: session.id,
          task_type: 'punch',
          status: 'in_progress',
          latest_event_id: eventData.id,
          updated_at: now,
        });

      toast.success('Punched in successfully!');
      fetchSession();
      setSelfieFile(null);
    } catch (error: any) {
      toast.error('Failed to punch in');
      console.error(error);
    } finally {
      setActionLoading(false);
      setUploadingSelfie(false);
    }
  };

  const handlePunchOut = async () => {
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      
      // Update session with punch_out_time and status='completed'
      // This will trigger the finalize_session_on_punchout trigger
      const { error: sessionError } = await supabase
        .from('sessions')
        .update({ 
          punch_out_time: now,
          status: 'completed'
        })
        .eq('id', session.id);

      if (sessionError) throw sessionError;

      // Create task event
      const { data: eventData, error: eventError } = await supabase
        .from('task_events')
        .insert({
          session_id: session.id,
          task_type: 'punch',
          payload: { action: 'punch_out', timestamp: now },
          created_at: now,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Update task status
      await supabase
        .from('task_status')
        .upsert({
          session_id: session.id,
          task_type: 'punch',
          status: 'submitted',
          latest_event_id: eventData.id,
          updated_at: now,
        });

      toast.success('Session completed! Your report has been finalized.');
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error: any) {
      toast.error('Failed to punch out');
      console.error(error);
    } finally {
      setActionLoading(false);
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

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <div>
                <CardTitle>Attendance Tracking</CardTitle>
                <CardDescription>Record your punch in and punch out times</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Punch In Section */}
            <div className="space-y-4">
              {/* Selfie + GPS before punch */}
              {!session.punch_in_time && (
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-accent" />
                    <h3 className="font-semibold">Selfie with GPS (Required)</h3>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="selfie">Take/Upload Selfie</Label>
                    <Input
                      id="selfie"
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                      disabled={uploadingSelfie || actionLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      <MapPin className="inline h-3 w-3 mr-1" /> GPS will be captured automatically on Punch In
                    </p>
                    {selfieFile && (
                      <p className="text-xs text-muted-foreground">Selected: {selfieFile.name}</p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <h3 className="font-semibold">Punch In Time</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {session.punch_in_time
                      ? new Date(session.punch_in_time).toLocaleString()
                      : 'Not recorded yet'}
                  </p>
                  {lastLocation && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last location: {lastLocation.lat.toFixed(6)}, {lastLocation.lng.toFixed(6)}
                    </p>
                  )}
                </div>
                {session.punch_in_time ? (
                  <CheckCircle className="h-6 w-6 text-success" />
                ) : (
                  <Button onClick={handlePunchIn} disabled={actionLoading}>
                    {actionLoading ? 'Recording...' : 'Punch In'}
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <h3 className="font-semibold">Punch Out Time</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {session.punch_out_time
                      ? new Date(session.punch_out_time).toLocaleString()
                      : 'Not recorded yet'}
                  </p>
                </div>
                {session.punch_out_time ? (
                  <CheckCircle className="h-6 w-6 text-success" />
                ) : (
                  <Button
                    onClick={handlePunchOut}
                    disabled={actionLoading || !session.punch_in_time}
                    variant={session.punch_in_time ? 'default' : 'secondary'}
                  >
                    {actionLoading ? 'Recording...' : 'Punch Out'}
                  </Button>
                )}
              </div>
            </div>

            {!session.punch_in_time && (
              <div className="bg-info/10 text-info-foreground p-4 rounded-lg">
                <p className="text-sm">
                  <strong>Note:</strong> You must punch in before you can punch out.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
