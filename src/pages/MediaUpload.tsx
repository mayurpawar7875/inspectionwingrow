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
  created_at: string;
  is_late: boolean;
  market_id: string | null;
  market_name?: string;
}

export default function MediaUpload() {
  const { user, currentRole } = useAuth();
  const navigate = useNavigate();
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedVideoDetails, setSelectedVideoDetails] = useState<any>(null);
  const [showVideoDetailsDialog, setShowVideoDetailsDialog] = useState(false);
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
  const [marketsQueue, setMarketsQueue] = useState<Array<{
    marketName: string;
    marketOpeningDate: string;
    customerReach: string;
    locationType: 'society' | 'residential_colony';
    flatsOccupancy: string;
    googleMapLocation: string;
    rent: string;
    videoFile: File;
  }>>([]);
  useEffect(() => {
    fetchData();
  }, [user, currentRole]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch media for today with market name
      const { data: mediaData, error: mediaError } = await supabase
        .from('media')
        .select(`
          *,
          markets (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('market_date', today)
        .order('created_at', { ascending: false });

      if (mediaError) throw mediaError;
      
      // For BDO users, also fetch market submissions to get market names
      let submissions: any[] = [];
      if (currentRole === 'bdo') {
        const { data: submissionsData } = await supabase
          .from('bdo_market_submissions')
          .select('*')
          .eq('submitted_by', user.id)
          .order('created_at', { ascending: false });
        
        submissions = submissionsData || [];
      }
      
      // Map the data to include market_name
      const formattedMedia = mediaData?.map((item: any) => {
        let marketName = item.markets?.name || null;
        
        // If no market name from markets table (BDO case), try to find from submissions
        if (!marketName && currentRole === 'bdo' && submissions.length > 0) {
          // Match by video URL or approximate time
          const matchingSubmission = submissions.find((sub: any) => 
            sub.video_url === item.file_url ||
            // Or match by approximate time (within 5 minutes)
            (Math.abs(new Date(sub.created_at).getTime() - new Date(item.created_at).getTime()) < 5 * 60 * 1000)
          );
          
          if (matchingSubmission) {
            marketName = matchingSubmission.name;
          }
        }
        
        return {
          ...item,
          market_name: marketName,
        };
      }) || [];
      
      setMedia(formattedMedia);
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

  const handleAddToQueue = () => {
    if (!bdoPanVideoFile) {
      toast.error('Please select a video file');
      return;
    }

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

    // Add to queue
    setMarketsQueue([...marketsQueue, {
      ...bdoPanVideoForm,
      videoFile: bdoPanVideoFile,
    }]);

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

    toast.success('Market added to queue. Add more or submit all.');
  };

  const handleRemoveFromQueue = (index: number) => {
    setMarketsQueue(marketsQueue.filter((_, i) => i !== index));
    toast.success('Market removed from queue');
  };

  const handleBDOPanVideoSubmit = async () => {
    if (!user) return;

    // Prepare the list of markets to submit
    let marketsToSubmit = [...marketsQueue];
    
    // If current form has data, validate and add it to the submission list
    if (bdoPanVideoFile) {
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

      // Add current form data to markets to submit
      marketsToSubmit.push({
        ...bdoPanVideoForm,
        videoFile: bdoPanVideoFile,
      });
    }

    // Check if there's anything to submit
    if (marketsToSubmit.length === 0) {
      toast.error('Please fill in the market details and select a video');
      return;
    }

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const marketData of marketsToSubmit) {
        try {
          // Get market ID from name (only use existing markets, don't create new ones due to RLS)
          let marketId: string | null = null;
          
          // Check if market exists by name (case-insensitive search)
          const marketNameTrimmed = marketData.marketName.trim();
          let existingMarket: { id: string; name: string } | null = null;
          
          // Try exact match first (case-insensitive)
          const { data: exactMatch, error: exactError } = await supabase
            .from('markets')
            .select('id, name')
            .ilike('name', marketNameTrimmed);
          
          if (exactError) {
            console.error('Error searching for market:', exactError);
            errorCount++;
            continue;
          }
          
          if (exactMatch && exactMatch.length > 0) {
            existingMarket = exactMatch[0];
            marketId = existingMarket.id;
            console.log('Found existing market:', existingMarket.id, existingMarket.name);
          }

          const fileName = `${user.id}/${Date.now()}-${marketData.videoFile.name}`;
          const { error: uploadError } = await supabase.storage
            .from('employee-media')
            .upload(fileName, marketData.videoFile);

          if (uploadError) {
            console.error('File upload error:', uploadError);
            errorCount++;
            continue;
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

              if (!sessionError && newSession) {
                sessionId = newSession.id;
              }
            }
          }

          // Insert media
          const mediaPayload: any = {
            user_id: user.id,
            market_date: today,
            media_type: 'market_video',
            file_url: urlData.publicUrl,
            file_name: marketData.videoFile.name,
            content_type: marketData.videoFile.type,
            captured_at: new Date().toISOString(),
          };

          if (marketId) {
            mediaPayload.market_id = marketId;
          }
          if (sessionId) {
            mediaPayload.session_id = sessionId;
          }

          const { error: insertError } = await supabase.from('media').insert(mediaPayload);

          if (insertError) {
            console.error('Media insert error:', insertError);
            errorCount++;
            continue;
          }

          // Save market submission details to bdo_market_submissions table
          const submissionData = {
            name: marketNameTrimmed,
            location: marketData.googleMapLocation.trim(),
            address: marketData.googleMapLocation.trim(), // Using google map location as address for now
            city: null,
            contact_person_name: user.email || 'BDO User',
            contact_phone: '',
            contact_email: user.email || null,
            opening_date: marketData.marketOpeningDate,
            photo_url: urlData.publicUrl, // Using video URL as photo for now
            submitted_by: user.id,
            status: 'pending',
            submitted_at: new Date().toISOString(),
          };

          const { error: submissionError } = await supabase
            .from('bdo_market_submissions')
            .insert(submissionData);

          if (submissionError) {
            console.error('Submission insert error:', submissionError);
            // Don't increment error count as media was uploaded successfully
          }

          successCount++;
        } catch (error: any) {
          console.error('Error processing market:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} market pan video(s)`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to upload ${errorCount} market video(s)`);
      }

      // Reset everything
      setMarketsQueue([]);
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
      toast.error('Failed to upload market pan videos');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleViewVideoDetails = async (video: MediaFile) => {
    // Fetch BDO submission details if available
    try {
      const { data: submissions } = await supabase
        .from('bdo_market_submissions')
        .select('*')
        .eq('submitted_by', user?.id || '')
        .order('created_at', { ascending: false });

      // Try to match submission by video URL or time
      const matchingSubmission = submissions?.find((sub: any) => 
        sub.video_url === video.file_url ||
        (Math.abs(new Date(sub.created_at).getTime() - new Date(video.created_at).getTime()) < 5 * 60 * 1000)
      );

      setSelectedVideoDetails({
        video,
        submission: matchingSubmission || null,
      });
      setShowVideoDetailsDialog(true);
    } catch (error) {
      console.error('Error fetching video details:', error);
      setSelectedVideoDetails({ video, submission: null });
      setShowVideoDetailsDialog(true);
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
                      <div
                        key={file.id}
                        className="p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => handleViewVideoDetails(file)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{file.market_name || 'Market Name Not Available'}</p>
                            <p className="text-xs text-muted-foreground">{file.file_name}</p>
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

                  {/* Queue Display */}
                  {marketsQueue.length > 0 && (
                    <div className="space-y-2 border-t pt-4 mt-4">
                      <h4 className="font-semibold text-sm">Queued Markets ({marketsQueue.length})</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {marketsQueue.map((market, index) => (
                          <div key={index} className="p-3 bg-muted rounded-lg">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium">{market.marketName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {market.videoFile.name} ({(market.videoFile.size / 1024 / 1024).toFixed(2)} MB)
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Opening: {market.marketOpeningDate} | Location: {market.locationType}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveFromQueue(index)}
                                disabled={uploading}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className="gap-2">
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
                  {marketsQueue.length > 0 && (
                    <Button
                      variant="secondary"
                      onClick={handleAddToQueue}
                      disabled={uploading || !bdoPanVideoFile}
                    >
                      Add More to Queue
                    </Button>
                  )}
                  {marketsQueue.length === 0 && bdoPanVideoFile && (
                    <Button
                      variant="secondary"
                      onClick={handleAddToQueue}
                      disabled={uploading}
                    >
                      Add to Queue
                    </Button>
                  )}
                  <Button
                    onClick={handleBDOPanVideoSubmit}
                    disabled={uploading || (!bdoPanVideoFile && marketsQueue.length === 0)}
                  >
                    {uploading 
                      ? 'Submitting...' 
                      : marketsQueue.length > 0 && bdoPanVideoFile
                        ? `Submit All (${marketsQueue.length + 1})`
                        : marketsQueue.length > 0
                          ? `Submit All (${marketsQueue.length})`
                          : 'Submit'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Video Details Dialog */}
            <Dialog open={showVideoDetailsDialog} onOpenChange={setShowVideoDetailsDialog}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Market Video Details</DialogTitle>
                  <DialogDescription>
                    View the submitted market information
                  </DialogDescription>
                </DialogHeader>
                
                {selectedVideoDetails && (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Market Name</Label>
                      <p className="text-sm">{selectedVideoDetails.video.market_name || 'Not Available'}</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Video File</Label>
                      <p className="text-sm">{selectedVideoDetails.video.file_name}</p>
                      <a
                        href={selectedVideoDetails.video.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        View Video
                      </a>
                    </div>

                    <div className="space-y-2">
                      <Label>Upload Time</Label>
                      <p className="text-sm">
                        {new Date(selectedVideoDetails.video.captured_at).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>

                    {selectedVideoDetails.submission && (
                      <>
                        <div className="border-t pt-4 mt-4">
                          <h4 className="font-semibold mb-3">Submitted Market Details</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Opening Date</Label>
                            <p className="text-sm">{selectedVideoDetails.submission.opening_date || 'N/A'}</p>
                          </div>

                          <div className="space-y-2">
                            <Label>Location Type</Label>
                            <p className="text-sm capitalize">
                              {selectedVideoDetails.submission.location?.replace('_', ' ') || 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Address</Label>
                          <p className="text-sm">{selectedVideoDetails.submission.address || 'N/A'}</p>
                        </div>

                        {selectedVideoDetails.submission.city && (
                          <div className="space-y-2">
                            <Label>City</Label>
                            <p className="text-sm">{selectedVideoDetails.submission.city}</p>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Google Map Location</Label>
                          <a
                            href={selectedVideoDetails.submission.location}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline break-all"
                          >
                            {selectedVideoDetails.submission.location}
                          </a>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Contact Person</Label>
                            <p className="text-sm">{selectedVideoDetails.submission.contact_person_name || 'N/A'}</p>
                          </div>

                          <div className="space-y-2">
                            <Label>Contact Phone</Label>
                            <p className="text-sm">{selectedVideoDetails.submission.contact_phone || 'N/A'}</p>
                          </div>
                        </div>

                        {selectedVideoDetails.submission.contact_email && (
                          <div className="space-y-2">
                            <Label>Contact Email</Label>
                            <p className="text-sm">{selectedVideoDetails.submission.contact_email}</p>
                          </div>
                        )}

                        {selectedVideoDetails.submission.photo_url && (
                          <div className="space-y-2">
                            <Label>Market Photo</Label>
                            <a
                              href={selectedVideoDetails.submission.photo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              View Photo
                            </a>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Submission Status</Label>
                          <p className="text-sm capitalize">{selectedVideoDetails.submission.status?.replace('_', ' ') || 'Pending'}</p>
                        </div>

                        {selectedVideoDetails.submission.review_notes && (
                          <div className="space-y-2">
                            <Label>Review Notes</Label>
                            <p className="text-sm">{selectedVideoDetails.submission.review_notes}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <DialogFooter>
                  <Button onClick={() => setShowVideoDetailsDialog(false)}>
                    Close
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
