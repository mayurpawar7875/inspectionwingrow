import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Clock, CheckCircle, Camera, MapPin, User, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function BDOSession() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetchSession();
    getCurrentLocation();
    
    return () => {
      stopCamera();
    };
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
      const { data, error } = await (supabase as any)
        .from('sessions')
        .select('*, markets(name)')
        .eq('user_id', user.id)
        .eq('session_date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setSession(data);
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
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Unable to access camera. Please grant camera permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      stopCamera();
      toast.success('Photo captured successfully!');
    }
  };

  const uploadSelfie = async (imageData: string, type: 'punch_in' | 'punch_out') => {
    try {
      const blob = await (await fetch(imageData)).blob();
      const fileName = `${user?.id}_${type}_${Date.now()}.jpg`;
      const filePath = `bdo-selfies/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-media')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('employee-media')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading selfie:', error);
      throw error;
    }
  };

  const handleStartSession = async () => {
    if (!location) {
      toast.error('Please enable GPS to start session');
      return;
    }

    if (!capturedImage) {
      toast.error('Please capture a selfie before starting session');
      return;
    }

    setActionLoading(true);
    try {
      const selfieUrl = await uploadSelfie(capturedImage, 'punch_in');
      const today = getISTDateString(new Date());

      // Create a new session for BDO
      const { data: newSession, error } = await (supabase as any)
        .from('sessions')
        .insert({
          user_id: user?.id,
          session_date: today,
          market_date: today,
          punch_in_time: new Date().toISOString(),
          status: 'active',
          market_id: null // BDO doesn't need a specific market
        })
        .select()
        .single();

      if (error) throw error;

      // Store punch in selfie and GPS in media table
      await (supabase as any)
        .from('media')
        .insert({
          session_id: newSession.id,
          user_id: user?.id,
          file_url: selfieUrl,
          file_name: 'punch_in_selfie.jpg',
          content_type: 'image/jpeg',
          media_type: 'attendance',
          gps_lat: location.lat,
          gps_lng: location.lng,
          captured_at: new Date().toISOString()
        });

      toast.success('Session started successfully!');
      setCapturedImage(null);
      fetchSession();
    } catch (error: any) {
      console.error('Error starting session:', error);
      toast.error('Failed to start session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!session) return;

    if (!location) {
      toast.error('Please enable GPS to end session');
      return;
    }

    if (!capturedImage) {
      toast.error('Please capture a selfie before ending session');
      return;
    }

    setActionLoading(true);
    try {
      const selfieUrl = await uploadSelfie(capturedImage, 'punch_out');

      // Update session with punch out time
      const { error: updateError } = await (supabase as any)
        .from('sessions')
        .update({
          punch_out_time: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', session.id);

      if (updateError) throw updateError;

      // Store punch out selfie and GPS in media table
      await (supabase as any)
        .from('media')
        .insert({
          session_id: session.id,
          user_id: user?.id,
          file_url: selfieUrl,
          file_name: 'punch_out_selfie.jpg',
          content_type: 'image/jpeg',
          media_type: 'attendance',
          gps_lat: location.lat,
          gps_lng: location.lng,
          captured_at: new Date().toISOString()
        });

      toast.success('Session ended successfully!');
      setCapturedImage(null);
      fetchSession();
    } catch (error: any) {
      console.error('Error ending session:', error);
      toast.error('Failed to end session');
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/bdo-dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">BDO Session</h1>
              <p className="text-sm text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Session Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Session Status</CardTitle>
              {session ? (
                <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                  {session.status === 'active' ? 'Active' : 'Completed'}
                </Badge>
              ) : (
                <Badge variant="outline">No Active Session</Badge>
              )}
            </div>
            <CardDescription>
              {getISTDateString(new Date())}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {session && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Punch In:</span>
                  <span className="font-medium">
                    {new Date(session.punch_in_time).toLocaleTimeString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {session.punch_out_time && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Punch Out:</span>
                    <span className="font-medium">
                      {new Date(session.punch_out_time).toLocaleTimeString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">GPS:</span>
              {location ? (
                <span className="font-medium text-green-600">Enabled</span>
              ) : (
                <span className="font-medium text-red-600">Disabled</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Camera Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Selfie Verification</CardTitle>
            <CardDescription>
              Capture a selfie for attendance verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showCamera ? (
              <div className="space-y-4">
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={capturePhoto} className="flex-1">
                    <Camera className="h-4 w-4 mr-2" />
                    Capture Photo
                  </Button>
                  <Button onClick={stopCamera} variant="outline">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : capturedImage ? (
              <div className="space-y-4">
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  <img src={capturedImage} alt="Captured selfie" className="w-full h-full object-cover" />
                </div>
                <Button onClick={() => setCapturedImage(null)} variant="outline" className="w-full">
                  Retake Photo
                </Button>
              </div>
            ) : (
              <Button onClick={startCamera} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Open Camera
              </Button>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-4">
          {!session || session.status === 'completed' ? (
            <Button
              onClick={handleStartSession}
              disabled={actionLoading || !location || !capturedImage}
              className="w-full"
              size="lg"
            >
              <Clock className="h-5 w-5 mr-2" />
              {actionLoading ? 'Starting Session...' : 'Start Session & Punch In'}
            </Button>
          ) : (
            <Button
              onClick={handleEndSession}
              disabled={actionLoading || !location || !capturedImage}
              className="w-full"
              size="lg"
              variant="destructive"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              {actionLoading ? 'Ending Session...' : 'End Session & Punch Out'}
            </Button>
          )}

          {(!location || !capturedImage) && (
            <div className="text-sm text-muted-foreground text-center space-y-1">
              {!location && <p>⚠️ GPS location required</p>}
              {!capturedImage && <p>⚠️ Selfie verification required</p>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
