import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Clock, CheckCircle, Camera, MapPin, LogOut, X, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface BDOSessionData {
  id: string;
  session_date: string;
  status: string;
  created_at: string;
  punch_in?: {
    punched_at: string;
    gps_lat: number;
    gps_lng: number;
    selfie_url: string;
  };
  punch_out?: {
    punched_at: string;
    gps_lat: number;
    gps_lng: number;
  };
}

export default function BDOSession() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<BDOSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    fetchSession();
    getCurrentLocation();
  }, [user]);

  const getISTDateString = (date: Date) => {
    const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const fetchSession = async () => {
    if (!user) return;

    try {
      const today = getISTDateString(new Date());
      
      // Fetch BDO session
      const { data: sessionData, error: sessionError } = await supabase
        .from('bdo_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_date', today)
        .maybeSingle();

      if (sessionError && sessionError.code !== 'PGRST116') throw sessionError;

      if (sessionData) {
        // Fetch punch-in data
        const { data: punchInData } = await supabase
          .from('bdo_punchin')
          .select('*')
          .eq('session_id', sessionData.id)
          .maybeSingle();

        // Fetch punch-out data
        const { data: punchOutData } = await supabase
          .from('bdo_punchout')
          .select('*')
          .eq('session_id', sessionData.id)
          .maybeSingle();

        setSession({
          ...sessionData,
          punch_in: punchInData || undefined,
          punch_out: punchOutData || undefined,
        });
      } else {
        setSession(null);
      }
    } catch (error: any) {
      console.error('Error fetching session:', error);
      toast.error('Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
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
      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
    } catch (error: any) {
      console.error('Error getting location:', error);
      toast.error('Unable to get your location. Please enable GPS.');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      setCameraStream(stream);
      setShowCamera(true);
    } catch (error) {
      toast.error('Unable to access camera. Please allow camera permissions.');
      console.error('Camera error:', error);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `bdo-selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setSelfieFile(file);
          setSelfiePreview(URL.createObjectURL(blob));
          stopCamera();
          toast.success('Photo captured!');
        }
      }, 'image/jpeg');
    }
  };

  const clearPhoto = () => {
    setSelfieFile(null);
    setSelfiePreview(null);
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const handleStartSession = async () => {
    if (!user || !location) {
      toast.error('Please enable GPS location');
      return;
    }

    if (!selfieFile) {
      toast.error('Please capture selfie');
      return;
    }

    setActionLoading(true);

    try {
      const today = getISTDateString(new Date());

      // Create session
      const { data: newSession, error: sessionError } = await supabase
        .from('bdo_sessions')
        .insert({
          user_id: user.id,
          session_date: today,
          status: 'active',
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Upload selfie
      const fileExt = selfieFile.name.split('.').pop();
      const fileName = `${newSession.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('employee-media')
        .upload(`bdo-punchin/${fileName}`, selfieFile);

      if (uploadError) throw uploadError;

      // Save punch-in record
      const { error: punchInError } = await supabase
        .from('bdo_punchin')
        .insert({
          session_id: newSession.id,
          selfie_url: `bdo-punchin/${fileName}`,
          gps_lat: location.lat,
          gps_lng: location.lng,
        });

      if (punchInError) throw punchInError;

      toast.success('Session started successfully');
      fetchSession();
      clearPhoto();
    } catch (error: any) {
      console.error('Error starting session:', error);
      toast.error('Failed to start session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!session || !location) {
      toast.error('Please enable GPS location');
      return;
    }

    setActionLoading(true);

    try {
      // Save punch-out record
      const { error: punchOutError } = await supabase
        .from('bdo_punchout')
        .insert({
          session_id: session.id,
          gps_lat: location.lat,
          gps_lng: location.lng,
        });

      if (punchOutError) throw punchOutError;

      // Update session status
      const { error: updateError } = await supabase
        .from('bdo_sessions')
        .update({ status: 'completed' })
        .eq('id', session.id);

      if (updateError) throw updateError;

      toast.success('Session ended successfully');
      setTimeout(() => navigate('/bdo-dashboard'), 1500);
    } catch (error: any) {
      console.error('Error ending session:', error);
      toast.error('Failed to end session');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasPunchedIn = session?.punch_in;
  const hasPunchedOut = session?.punch_out;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/bdo-dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">BDO Session</h1>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-2xl px-4 py-6 space-y-6">
        {/* Session Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Session Status
              </CardTitle>
              {session && (
                <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                  {session.status}
                </Badge>
              )}
            </div>
            <CardDescription>
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Punch In Status */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Punch In</span>
              </div>
              {hasPunchedIn ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">
                    {format(new Date(hasPunchedIn.punched_at), 'HH:mm')}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Not started</span>
              )}
            </div>

            {/* Punch Out Status */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Punch Out</span>
              </div>
              {hasPunchedOut ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">
                    {format(new Date(hasPunchedOut.punched_at), 'HH:mm')}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Pending</span>
              )}
            </div>

            {/* GPS Status */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {location ? (
                <span>GPS: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
              ) : (
                <span>Acquiring GPS location...</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Punch In/Out Actions */}
        {!hasPunchedIn ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Start Session
              </CardTitle>
              <CardDescription>
                Take a selfie and enable GPS to punch in
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="block text-sm font-medium">Selfie</label>
                
                {!selfieFile && !showCamera && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startCamera}
                    className="w-full h-32 flex flex-col gap-2"
                  >
                    <Camera className="h-8 w-8" />
                    <span>Take Selfie</span>
                  </Button>
                )}

                {showCamera && (
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video 
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 px-4">
                      <Button
                        type="button"
                        variant="default"
                        size="lg"
                        onClick={capturePhoto}
                        className="flex-1 max-w-[200px]"
                      >
                        <Camera className="h-5 w-5 mr-2" />
                        Capture
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={stopCamera}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )}

                {selfieFile && selfiePreview && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Preview</label>
                    <div className="relative">
                      <img 
                        src={selfiePreview} 
                        alt="Selfie preview" 
                        className="w-full h-64 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={clearPhoto}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retake
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Button 
                onClick={handleStartSession} 
                disabled={actionLoading || !selfieFile || !location} 
                className="w-full"
              >
                {actionLoading ? 'Starting...' : 'Start Session'}
              </Button>
            </CardContent>
          </Card>
        ) : !hasPunchedOut ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                End Session
              </CardTitle>
              <CardDescription>
                Mark your session as complete
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleEndSession} 
                disabled={actionLoading || !location} 
                className="w-full"
                variant="destructive"
              >
                {actionLoading ? 'Ending...' : 'End Session'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                <h3 className="font-semibold">Session Completed</h3>
                <p className="text-sm text-muted-foreground">
                  Your session for today has been completed.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
