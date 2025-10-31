import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Camera, MapPin } from 'lucide-react';

interface MediaFile {
  id: string;
  media_type: 'outside_rates' | 'selfie_gps' | 'rate_board' | 'market_video' | 'cleaning_video' | 'customer_feedback';
  file_url: string;
  file_name: string;
  gps_lat: number | null;
  gps_lng: number | null;
  captured_at: string;
  is_late: boolean;
}

export default function MediaUpload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch media for today
      const { data: mediaData, error: mediaError } = await supabase
        .from('media')
        .select('*')
        .eq('user_id', user.id)
        .eq('market_date', today)
        .order('created_at', { ascending: false });

      if (mediaError) throw mediaError;
      setMedia(mediaData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (
    file: File,
    mediaType: MediaFile['media_type'],
    gpsLat?: number,
    gpsLng?: number
  ) => {
    if (!user) return;

    setUploading(true);
    try {
      // Get market info from dashboard state (or default)
      const dashboardState = JSON.parse(localStorage.getItem('dashboardState') || '{}');
      const marketId = dashboardState.selectedMarketId;
      
      if (!marketId) {
        toast.error('Please select a market from the dashboard first');
        navigate('/dashboard');
        return;
      }

      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('employee-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('employee-media').getPublicUrl(fileName);

      // Insert media - trigger will handle session creation and metadata
      const { error: insertError } = await supabase.from('media').insert({
        user_id: user.id,
        market_id: marketId,
        media_type: mediaType,
        file_url: urlData.publicUrl,
        file_name: file.name,
        content_type: file.type,
        gps_lat: gpsLat || null,
        gps_lng: gpsLng || null,
        captured_at: new Date().toISOString(),
      } as any);

      if (insertError) throw insertError;

      const istTime = new Date().toLocaleTimeString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit'
      });
      toast.success(`Saved at ${istTime} IST`);
      fetchData();
    } catch (error: any) {
      toast.error('Failed to upload media');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleOutsideRatesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileUpload(file, 'outside_rates');
  };

  const handleSelfieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await handleFileUpload(
            file,
            'selfie_gps',
            position.coords.latitude,
            position.coords.longitude
          );
        },
        (error) => {
          toast.error('Failed to get GPS location. Please enable location access.');
          console.error(error);
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
    }
  };

  const handleRateBoardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileUpload(file, 'rate_board');
  };

  const handleMarketVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileUpload(file, 'market_video');
  };

  const handleCleaningVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileUpload(file, 'cleaning_video');
  };

  const handleCustomerFeedbackUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileUpload(file, 'customer_feedback');
  };

  const outsideRatesMedia = media.filter((m) => m.media_type === 'outside_rates');
  const selfieMedia = media.filter((m) => m.media_type === 'selfie_gps');
  const rateBoardMedia = media.filter((m) => m.media_type === 'rate_board');
  const marketVideoMedia = media.filter((m) => m.media_type === 'market_video');
  const cleaningVideoMedia = media.filter((m) => m.media_type === 'cleaning_video');
  const customerFeedbackMedia = media.filter((m) => m.media_type === 'customer_feedback');

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

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-4xl space-y-4 sm:space-y-6">
        {/* Outside Market Rates */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Upload className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1">
                <CardTitle>Outside Market Rates</CardTitle>
                <CardDescription>Suggested: 2:00 PM - 2:15 PM IST</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="outside-rates">Upload Media (Image/Video/Audio)</Label>
              <Input
                id="outside-rates"
                type="file"
                accept="image/*,video/*,audio/*"
                onChange={handleOutsideRatesUpload}
                disabled={uploading}
              />
            </div>
            {outsideRatesMedia.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Uploaded Files ({outsideRatesMedia.length})</h4>
                {outsideRatesMedia.map((file) => (
                  <div key={file.id} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded at {new Date(file.captured_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </p>
                      </div>
                      {file.is_late && (
                        <span className="text-xs font-semibold text-destructive">Late Upload</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selfie + GPS */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Camera className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1">
                <CardTitle>Selfie + GPS Location</CardTitle>
                <CardDescription>Suggested: 2:15 PM - 2:20 PM IST</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="selfie">Upload Selfie with GPS</Label>
              <Input
                id="selfie"
                type="file"
                accept="image/*"
                onChange={handleSelfieUpload}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                <MapPin className="inline h-3 w-3 mr-1" />
                GPS location will be automatically captured when you upload
              </p>
            </div>
            {selfieMedia.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Uploaded Selfies ({selfieMedia.length})</h4>
                {selfieMedia.map((file) => (
                  <div key={file.id} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded at {new Date(file.captured_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </p>
                        {file.gps_lat && file.gps_lng && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {file.gps_lat.toFixed(6)}, {file.gps_lng.toFixed(6)}
                          </p>
                        )}
                      </div>
                      {file.is_late && (
                        <span className="text-xs font-semibold text-destructive">Late Upload</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Big Rate Board Photo */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Upload className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1">
                <CardTitle>Big Rate Board Photo</CardTitle>
                <CardDescription>Suggested: 3:45 PM - 4:00 PM IST</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rate-board">Upload Photo</Label>
              <Input
                id="rate-board"
                type="file"
                accept="image/*"
                onChange={handleRateBoardUpload}
                disabled={uploading}
              />
            </div>
            {rateBoardMedia.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Uploaded Photos ({rateBoardMedia.length})</h4>
                {rateBoardMedia.map((file) => (
                  <div key={file.id} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded at {new Date(file.captured_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </p>
                      </div>
                      {file.is_late && (
                        <span className="text-xs font-semibold text-destructive">Late Upload</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Market Video */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Upload className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1">
                <CardTitle>Market Video</CardTitle>
                <CardDescription>Suggested: 4:00 PM - 4:15 PM IST</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="market-video">Upload Video</Label>
              <Input
                id="market-video"
                type="file"
                accept="video/*"
                onChange={handleMarketVideoUpload}
                disabled={uploading}
              />
            </div>
            {marketVideoMedia.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Uploaded Videos ({marketVideoMedia.length})</h4>
                {marketVideoMedia.map((file) => (
                  <div key={file.id} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded at {new Date(file.captured_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </p>
                      </div>
                      {file.is_late && (
                        <span className="text-xs font-semibold text-destructive">Late Upload</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Market Space Cleaning Video */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Upload className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1">
                <CardTitle>Market Space Cleaning Video</CardTitle>
                <CardDescription>Suggested: 9:15 PM - 9:30 PM IST</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cleaning-video">Upload Video</Label>
              <Input
                id="cleaning-video"
                type="file"
                accept="video/*"
                onChange={handleCleaningVideoUpload}
                disabled={uploading}
              />
            </div>
            {cleaningVideoMedia.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Uploaded Videos ({cleaningVideoMedia.length})</h4>
                {cleaningVideoMedia.map((file) => (
                  <div key={file.id} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded at {new Date(file.captured_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </p>
                      </div>
                      {file.is_late && (
                        <span className="text-xs font-semibold text-destructive">Late Upload</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Feedback Video */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Upload className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1">
                <CardTitle>Customer Feedback Video</CardTitle>
                <CardDescription>Record customer feedback and experiences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer-feedback">Upload Video</Label>
              <Input
                id="customer-feedback"
                type="file"
                accept="video/*"
                onChange={handleCustomerFeedbackUpload}
                disabled={uploading}
              />
            </div>
            {customerFeedbackMedia.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Uploaded Videos ({customerFeedbackMedia.length})</h4>
                {customerFeedbackMedia.map((file) => (
                  <div key={file.id} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded at {new Date(file.captured_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </p>
                      </div>
                      {file.is_late && (
                        <span className="text-xs font-semibold text-destructive">Late Upload</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
