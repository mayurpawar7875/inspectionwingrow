import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
  const { user, currentRole } = useAuth();
  const navigate = useNavigate();
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showBDOPanVideoDialog, setShowBDOPanVideoDialog] = useState(false);
  const [bdoPanVideoFile, setBdoPanVideoFile] = useState<File | null>(null);
  const [bdoPanVideoForm, setBdoPanVideoForm] = useState({
    marketName: '',
    marketOpeningDate: '',
    customerReach: '',
    locationType: 'society' as 'society' | 'residential_colony',
    flatsOccupancy: '',
    googleMapLocation: '',
    rent: '',
  });
  useEffect(() => {
    fetchData();
  }, [user, currentRole]);

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

  const handleMarketVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBdoPanVideoFile(file);
    // Open dialog when file is selected
    setShowBDOPanVideoDialog(true);
  };

  const handleMarketVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileUpload(file, 'market_video');
  };

  const handleBDOPanVideoSubmit = async () => {
    if (!user || !bdoPanVideoFile) return;

    // Validate required fields
    if (!bdoPanVideoForm.marketName.trim()) {
      toast.error('Market name is required');
      return;
    }
    if (!bdoPanVideoForm.marketOpeningDate) {
      toast.error('Market opening date is required');
      return;
    }
    if (!bdoPanVideoForm.customerReach.trim()) {
      toast.error('Customer reach is required');
      return;
    }
    if (bdoPanVideoForm.locationType === 'society' && !bdoPanVideoForm.flatsOccupancy.trim()) {
      toast.error('Flats occupancy is required for society locations');
      return;
    }
    if (!bdoPanVideoForm.googleMapLocation.trim()) {
      toast.error('Market Google Map location is required');
      return;
    }

    setUploading(true);
    try {
      // Get market ID from name (only use existing markets, don't create new ones due to RLS)
      let marketId: string | null = null;
      
      // Check if market exists by name (case-insensitive search)
      const marketNameTrimmed = bdoPanVideoForm.marketName.trim();
      let existingMarket: { id: string; name: string } | null = null;
      
      // Try exact match first (case-insensitive)
      const { data: exactMatch, error: exactError } = await supabase
        .from('markets')
        .select('id, name')
        .ilike('name', marketNameTrimmed);
      
      if (exactError) {
        console.error('Error searching for market:', exactError);
        toast.error(`Error checking for existing market: ${exactError.message}`);
        setUploading(false);
        return;
      }
      
      if (exactMatch && exactMatch.length > 0) {
        existingMarket = exactMatch[0];
        marketId = existingMarket.id;
        console.log('Found existing market:', existingMarket.id, existingMarket.name);
      } else {
        // Market doesn't exist - we can't create it due to RLS
        // We'll proceed without market_id and store market name in metadata
        // Admin can create the market later and link it
        console.log('Market does not exist. Will store market name in metadata for admin review.');
        toast.info('Market does not exist. Submission will be saved with market details for admin review.');
      }

      const fileName = `${user.id}/${Date.now()}-${bdoPanVideoFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('employee-media')
        .upload(fileName, bdoPanVideoFile);

      if (uploadError) {
        console.error('File upload error:', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage.from('employee-media').getPublicUrl(fileName);
      const today = new Date().toISOString().split('T')[0];
      let sessionId: string | null = null;

      // Only create session if market exists (sessions require market_id)
      if (marketId) {
        // Check if session exists
        const { data: existingSession } = await supabase
          .from('sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('market_id', marketId)
          .eq('session_date', today)
          .maybeSingle();

        if (existingSession) {
          sessionId = existingSession.id;
        } else {
          // Create a new session for BDO
          const { data: newSession, error: sessionError } = await supabase
            .from('sessions')
            .insert({
              user_id: user.id,
              market_id: marketId,
              session_date: today,
              status: 'active',
            } as any)
            .select('id')
            .single();

          if (sessionError) {
            console.error('Session creation error:', sessionError);
            // Continue anyway - we'll store media without session
            console.log('Will proceed without session due to error');
          } else {
            sessionId = newSession?.id || null;
          }
        }
      }

      // Store metadata - we'll store it as JSON in a way that can be retrieved
      // Since media table might not have a metadata field, we'll log it for now
      // and can extend the table later if needed
      const metadata = {
        market_name: bdoPanVideoForm.marketName.trim(),
        market_opening_date: bdoPanVideoForm.marketOpeningDate,
        customer_reach: bdoPanVideoForm.customerReach.trim(),
        location_type: bdoPanVideoForm.locationType,
        flats_occupancy: bdoPanVideoForm.locationType === 'society' ? bdoPanVideoForm.flatsOccupancy.trim() : null,
        google_map_location: bdoPanVideoForm.googleMapLocation.trim(),
        rent: bdoPanVideoForm.rent.trim() || null,
      };

      // Insert media - use market_id if available, otherwise null (media table might allow nullable market_id)
      // Store all market info in metadata for admin review
      const mediaPayload: any = {
        user_id: user.id,
        market_date: today,
        media_type: 'market_video',
        file_url: urlData.publicUrl,
        file_name: bdoPanVideoFile.name,
        content_type: bdoPanVideoFile.type,
        captured_at: new Date().toISOString(),
      };

      // Add market_id and session_id only if they exist
      if (marketId) {
        mediaPayload.market_id = marketId;
      }
      if (sessionId) {
        mediaPayload.session_id = sessionId;
      }

      const { error: insertError } = await supabase.from('media').insert(mediaPayload);

      if (insertError) {
        console.error('Media insert error:', insertError);
        throw insertError;
      }

      // Store BDO market submission in separate reporting table
      // This is separate from employee reporting/tasks
      try {
        const submissionData = {
          bdo_user_id: user.id,
          submission_date: today,
          market_name: marketNameTrimmed,
          market_opening_date: bdoPanVideoForm.marketOpeningDate || null,
          google_map_location: bdoPanVideoForm.googleMapLocation.trim(),
          location_type: bdoPanVideoForm.locationType,
          flats_occupancy: bdoPanVideoForm.locationType === 'society' ? bdoPanVideoForm.flatsOccupancy.trim() : null,
          customer_reach: bdoPanVideoForm.customerReach.trim(),
          rent: bdoPanVideoForm.rent.trim() || null,
          video_url: urlData.publicUrl,
          video_file_name: bdoPanVideoFile.name,
          market_id: marketId || null,
          status: marketId ? 'market_created' : 'pending_review',
          submission_metadata: {
            media_id: null,
            uploaded_at: new Date().toISOString(),
            ...metadata,
          },
        };

        const { data: submissionDataResult, error: submissionError } = await (supabase as any)
          .from('bdo_market_submissions' as any)
          .insert(submissionData)
          .select();

        if (submissionError) {
          console.error('Error creating BDO market submission:', submissionError);
          console.error('Submission data:', submissionData);
          const errorMsg = submissionError.message || submissionError.code || 'Unknown error';
          
          // Check if table doesn't exist (migration not applied)
          if (errorMsg.includes('does not exist') || errorMsg.includes('relation') || submissionError.code === '42P01') {
            toast.error('Database table not found. Please apply the migration file: 20251102000000_bdo_market_submissions.sql');
          } else if (errorMsg.includes('row-level security') || errorMsg.includes('RLS') || submissionError.code === '42501') {
            toast.error('Permission denied. Please check RLS policies for BDO role.');
          } else {
            toast.error(`Failed to save submission: ${errorMsg}`);
          }
        } else {
          console.log('BDO market submission recorded successfully:', submissionDataResult);
        }
      } catch (submissionError: any) {
        console.error('Error storing BDO submission:', submissionError);
        const errorMsg = submissionError?.message || submissionError?.code || 'Unknown error';
        toast.error(`Submission error: ${errorMsg}`);
      }

      const istTime = new Date().toLocaleTimeString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit'
      });
      toast.success(`Market pan video uploaded at ${istTime} IST`);
      
      // Reset form
      setBdoPanVideoFile(null);
      setBdoPanVideoForm({
        marketName: '',
        marketOpeningDate: '',
        customerReach: '',
        locationType: 'society',
        flatsOccupancy: '',
        googleMapLocation: '',
        rent: '',
      });
      setShowBDOPanVideoDialog(false);
      
      fetchData();
    } catch (error: any) {
      toast.error('Failed to upload market pan video');
      console.error(error);
    } finally {
      setUploading(false);
    }
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
          <Button variant="ghost" size="sm" onClick={() => navigate(currentRole === 'bdo' ? '/bdo-dashboard' : '/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-4xl space-y-4 sm:space-y-6">
        {/* BDO users see only Market Pan Video upload */}
        {currentRole === 'bdo' ? (
          <>
            {/* Market Pan Video (BDO Only) */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Upload className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>Market Pan Video (Finalized)</CardTitle>
                    <CardDescription>Upload finalized market pan video with details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="market-video">Upload Market Pan Video</Label>
                  <Input
                    id="market-video"
                    type="file"
                    accept="video/*"
                    onChange={handleMarketVideoFileSelect}
                    disabled={uploading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Select a video file to upload. You will be prompted to fill in market details.
                  </p>
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

            {/* BDO Market Pan Video Dialog */}
            <Dialog open={showBDOPanVideoDialog} onOpenChange={setShowBDOPanVideoDialog}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Upload Market Pan Video (Finalized)</DialogTitle>
                  <DialogDescription>
                    Upload the finalized market pan video and provide market details
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="market-name-input">Market Name *</Label>
                    <Input
                      id="market-name-input"
                      placeholder="Enter market name"
                      value={bdoPanVideoForm.marketName}
                      onChange={(e) => setBdoPanVideoForm({ ...bdoPanVideoForm, marketName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="market-opening-date">Market Opening Date *</Label>
                    <Input
                      id="market-opening-date"
                      type="date"
                      value={bdoPanVideoForm.marketOpeningDate}
                      onChange={(e) => setBdoPanVideoForm({ ...bdoPanVideoForm, marketOpeningDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer-reach">Customer Reach *</Label>
                    <Input
                      id="customer-reach"
                      type="number"
                      placeholder="Number of customers reached"
                      value={bdoPanVideoForm.customerReach}
                      onChange={(e) => setBdoPanVideoForm({ ...bdoPanVideoForm, customerReach: e.target.value })}
                      min="0"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location-type">Location Type *</Label>
                    <Select
                      value={bdoPanVideoForm.locationType}
                      onValueChange={(value: 'society' | 'residential_colony') => 
                        setBdoPanVideoForm({ 
                          ...bdoPanVideoForm, 
                          locationType: value,
                          flatsOccupancy: value === 'residential_colony' ? '' : bdoPanVideoForm.flatsOccupancy
                        })
                      }
                    >
                      <SelectTrigger id="location-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="society">Society</SelectItem>
                        <SelectItem value="residential_colony">Residential Colony</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {bdoPanVideoForm.locationType === 'society' && (
                    <div className="space-y-2">
                      <Label htmlFor="flats-occupancy">Flats Occupancy *</Label>
                      <Input
                        id="flats-occupancy"
                        type="number"
                        placeholder="Number of flats/households"
                        value={bdoPanVideoForm.flatsOccupancy}
                        onChange={(e) => setBdoPanVideoForm({ ...bdoPanVideoForm, flatsOccupancy: e.target.value })}
                        min="0"
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="google-map-location">Market Google Map Location *</Label>
                    <Input
                      id="google-map-location"
                      type="url"
                      placeholder="Paste Google Maps link or coordinates (e.g., https://maps.google.com/... or 19.0760, 72.8777)"
                      value={bdoPanVideoForm.googleMapLocation}
                      onChange={(e) => setBdoPanVideoForm({ ...bdoPanVideoForm, googleMapLocation: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste the Google Maps link or coordinates for the market location
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rent">Rent (Optional)</Label>
                    <Input
                      id="rent"
                      type="number"
                      placeholder="Enter rent amount (e.g., 5000)"
                      value={bdoPanVideoForm.rent}
                      onChange={(e) => setBdoPanVideoForm({ ...bdoPanVideoForm, rent: e.target.value })}
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional: Enter the rent amount for the market location
                    </p>
                  </div>

                  {bdoPanVideoFile && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">Selected Video:</p>
                      <p className="text-xs text-muted-foreground">{bdoPanVideoFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(bdoPanVideoFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowBDOPanVideoDialog(false);
                      setBdoPanVideoFile(null);
                      setBdoPanVideoForm({
                        marketName: '',
                        marketOpeningDate: '',
                        customerReach: '',
                        locationType: 'society',
                        flatsOccupancy: '',
                        googleMapLocation: '',
                        rent: '',
                      });
                    }}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleBDOPanVideoSubmit} disabled={uploading || !bdoPanVideoFile}>
                    {uploading ? 'Submitting...' : 'Final Submit'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <>
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
          </>
        )}

      </main>
    </div>
  );
}
