import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import LiveMarketsWidget from '@/components/admin/LiveMarketsWidget';
import TaskProgressWidget from '@/components/admin/TaskProgressWidget';
import CollectionsWidget from '@/components/admin/CollectionsWidget';
import { toast } from 'sonner';
import {
  LogOut,
  Calendar,
  Clock,
  FileText,
  AlertCircle,
  Download,
  Plus,
  Camera,
  User,
  Phone,
  Mail,
} from 'lucide-react';

interface DistrictStats {
  total_markets: number;
  active_markets: number;
  total_sessions: number;
  active_sessions: number;
  total_employees: number;
  active_employees: number;
  media_uploads: number;
  collections_total: number;
  collections_count: number;
  completion_rate: number;
}

interface MarketSummary {
  market_id: string;
  market_name: string;
  city: string;
  active_sessions: number;
  active_employees: number;
  media_uploads: number;
  collections_total: number;
}

export default function BDODashboard() {
  const { user, signOut, currentRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DistrictStats>({
    total_markets: 0,
    active_markets: 0,
    total_sessions: 0,
    active_sessions: 0,
    total_employees: 0,
    active_employees: 0,
    media_uploads: 0,
    collections_total: 0,
    collections_count: 0,
    completion_rate: 0,
  });
  const [marketSummaries, setMarketSummaries] = useState<MarketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMarketDialog, setShowAddMarketDialog] = useState(false);
  const [uploadingMarket, setUploadingMarket] = useState(false);
  const [marketsToSubmit, setMarketsToSubmit] = useState<Array<{
    name: string;
    location: string;
    address: string;
    city: string;
    contactPersonName: string;
    contactPhone: string;
    contactEmail: string;
    openingDate: string;
    photoFile: File | null;
  }>>([]);
  const [marketForm, setMarketForm] = useState({
    name: '',
    location: '',
    address: '',
    city: '',
    contactPersonName: '',
    contactPhone: '',
    contactEmail: '',
    openingDate: '',
    photoFile: null as File | null,
  });
  const [showAddStallDialog, setShowAddStallDialog] = useState(false);
  const [uploadingStall, setUploadingStall] = useState(false);
  const [stallsToSubmit, setStallsToSubmit] = useState<Array<{
    farmerName: string;
    stallName: string;
    contactNumber: string;
    address: string;
    dateOfStartingMarkets: string;
  }>>([]);
  const [stallForm, setStallForm] = useState({
    farmerName: '',
    stallName: '',
    contactNumber: '',
    address: '',
    dateOfStartingMarkets: '',
  });
  
  const getISTDateString = (date: Date) => {
    const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const [selectedDate, setSelectedDate] = useState(getISTDateString(new Date()));
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    // Wait for auth to load and role to be determined
    if (authLoading) {
      return;
    }

    // Redirect if not BDO
    if (currentRole !== 'bdo') {
      if (currentRole === 'admin') {
        navigate('/admin');
      } else if (currentRole === 'market_manager') {
        navigate('/manager-dashboard');
      } else {
        navigate('/dashboard');
      }
      return;
    }
    
    // Only fetch if we're staying on this dashboard
    if (currentRole === 'bdo') {
      // BDO can access dashboard after punching in, but by default should go to punch page
      // This page can be accessed via navigation but punch page is the entry point
      fetchDistrictStats();
      fetchMarketSummaries();
    }
  }, [currentRole, navigate, selectedDate, authLoading]);

  const fetchDistrictStats = async () => {
    try {
      setLoading(true);
      const dateStr = getISTDateString(new Date(selectedDate));

      // Fetch all markets
      const { data: allMarkets, error: marketsError } = await supabase
        .from('markets')
        .select('id, is_active')
        .eq('is_active', true);

      if (marketsError) throw marketsError;

      // Fetch live markets (active today) - with fallback
      let liveMarkets: any[] = [];
      const { data: liveMarketsData, error: liveError } = await supabase
        .from('live_markets_today')
        .select('market_id, active_sessions, active_employees, media_uploads_count');

      if (liveError) {
        console.error('Error fetching from live_markets_today view:', liveError);
        // Fallback: Query directly from markets and sessions
        const { data: sessionsForDay, error: sessionsErr } = await supabase
          .from('sessions')
          .select('id, market_id, user_id, status')
          .eq('session_date', dateStr);

        if (sessionsErr) throw sessionsErr;

        const { data: mediaFiles, error: mediaErr } = await supabase
          .from('media')
          .select('id, market_id')
          .eq('market_date', dateStr);

        if (mediaErr) throw mediaErr;

        // Aggregate by market
        const marketAgg = new Map<string, any>();
        sessionsForDay?.forEach(s => {
          const existing = marketAgg.get(s.market_id) || {
            market_id: s.market_id,
            active_sessions: 0,
            active_employees: new Set<string>(),
            media_uploads_count: 0,
          };
          if (s.status === 'active') existing.active_sessions++;
          if (['active', 'finalized'].includes(s.status)) {
            existing.active_employees.add(s.user_id);
          }
          marketAgg.set(s.market_id, existing);
        });

        mediaFiles?.forEach(m => {
          const existing = marketAgg.get(m.market_id) || {
            market_id: m.market_id,
            active_sessions: 0,
            active_employees: new Set<string>(),
            media_uploads_count: 0,
          };
          existing.media_uploads_count++;
          marketAgg.set(m.market_id, existing);
        });

        liveMarkets = Array.from(marketAgg.values()).map(m => ({
          market_id: m.market_id,
          active_sessions: m.active_sessions || 0,
          active_employees: m.active_employees?.size || 0,
          media_uploads_count: m.media_uploads_count || 0,
        }));
      } else {
        liveMarkets = liveMarketsData || [];
      }

      // Fetch total employees
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      if (employeesError) throw employeesError;

      // Fetch sessions for date range
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, status')
        .eq('session_date', dateStr);

      if (sessionsError) throw sessionsError;

      // Fetch collections
      const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select('amount')
        .eq('market_date', dateStr);

      if (collectionsError) throw collectionsError;

      // Calculate totals
      const totalMarkets = allMarkets?.length || 0;
      const activeMarkets = liveMarkets?.length || 0;
      const totalSessions = sessions?.length || 0;
      const activeSessions = sessions?.filter((s: any) => s.status === 'active').length || 0;
      const completedSessions = sessions?.filter((s: any) => ['completed', 'finalized'].includes(s.status)).length || 0;
      const totalEmployees = (employees as any)?.length || 0;
      
      const mediaUploads = liveMarkets.reduce((sum: number, m: any) => sum + (m.media_uploads_count || 0), 0) || 0;
      const collectionsTotal = collections?.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0) || 0;
      const collectionsCount = collections?.length || 0;
      const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

      const activeEmployees = liveMarkets.reduce((sum: number, m: any) => sum + (m.active_employees || 0), 0) || 0;

      setStats({
        total_markets: totalMarkets,
        active_markets: activeMarkets,
        total_sessions: totalSessions,
        active_sessions: activeSessions,
        total_employees: totalEmployees,
        active_employees: activeEmployees,
        media_uploads: mediaUploads,
        collections_total: collectionsTotal,
        collections_count: collectionsCount,
        completion_rate: completionRate,
      });
    } catch (error: any) {
      console.error('Error fetching district stats:', error);
      toast.error(error?.message || 'Failed to load district statistics');
      // Set default stats on error so dashboard still renders
      setStats({
        total_markets: 0,
        active_markets: 0,
        total_sessions: 0,
        active_sessions: 0,
        total_employees: 0,
        active_employees: 0,
        media_uploads: 0,
        collections_total: 0,
        collections_count: 0,
        completion_rate: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketSummaries = async () => {
    try {
      const { data, error } = await supabase
        .from('live_markets_today')
        .select('market_id, market_name, city, active_sessions, active_employees, media_uploads_count');

      if (error) {
        console.error('Error fetching market summaries:', error);
        // Fallback: set empty array
        setMarketSummaries([]);
        return;
      }

      const dateStr = getISTDateString(new Date(selectedDate));

      // Fetch collections for each market
      const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select('market_id, amount')
        .eq('market_date', dateStr);

      if (collectionsError) throw collectionsError;

      const collectionsMap = new Map<string, number>();
      collections?.forEach((item: any) => {
        const marketId = item.market_id;
        const existing = collectionsMap.get(marketId) || 0;
        collectionsMap.set(marketId, existing + Number(item.amount || 0));
      });

      const summaries: MarketSummary[] = (data || []).map((market: any) => ({
        market_id: market.market_id,
        market_name: market.market_name,
        city: market.city || 'N/A',
        active_sessions: market.active_sessions || 0,
        active_employees: market.active_employees || 0,
        media_uploads: market.media_uploads_count || 0,
        collections_total: collectionsMap.get(market.market_id) || 0,
      }));

      setMarketSummaries(summaries || []);
    } catch (error: any) {
      console.error('Error fetching market summaries:', error);
      setMarketSummaries([]);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleAddToQueue = () => {
    // Validate required fields
    if (!marketForm.name.trim()) {
      toast.error('Market name is required');
      return;
    }
    if (!marketForm.location.trim()) {
      toast.error('Location is required');
      return;
    }
    if (!marketForm.address.trim()) {
      toast.error('Address is required');
      return;
    }
    if (!marketForm.contactPersonName.trim()) {
      toast.error('Contact person name is required');
      return;
    }
    if (!marketForm.contactPhone.trim()) {
      toast.error('Contact phone is required');
      return;
    }
    if (!marketForm.openingDate) {
      toast.error('Opening date is required');
      return;
    }

    // Add to queue
    setMarketsToSubmit([...marketsToSubmit, { ...marketForm }]);
    
    // Reset form
    setMarketForm({
      name: '',
      location: '',
      address: '',
      city: '',
      contactPersonName: '',
      contactPhone: '',
      contactEmail: '',
      openingDate: '',
      photoFile: null,
    });
    
    toast.success('Market added to queue. Add more or submit all.');
  };

  const handleRemoveFromQueue = (index: number) => {
    setMarketsToSubmit(marketsToSubmit.filter((_, i) => i !== index));
    toast.success('Market removed from queue');
  };

  const handleSubmitAllMarkets = async () => {
    if (!user) return;
    
    if (marketsToSubmit.length === 0) {
      toast.error('Please add at least one market location');
      return;
    }

    setUploadingMarket(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const market of marketsToSubmit) {
        try {
          let photoUrl: string | null = null;
          
          // Upload photo if provided
          if (market.photoFile) {
            const fileName = `market-locations/${user.id}/${Date.now()}-${market.photoFile.name}`;
            const { error: uploadError } = await supabase.storage
              .from('employee-media')
              .upload(fileName, market.photoFile);
            
            if (uploadError) {
              console.error('Photo upload error:', uploadError);
              errorCount++;
              continue;
            }
            
            const { data: urlData } = supabase.storage.from('employee-media').getPublicUrl(fileName);
            photoUrl = urlData.publicUrl;
          }

          // Submit to BDO market submissions table for admin review
          const { error: submissionError } = await (supabase as any)
            .from('bdo_market_submissions')
            .insert({
              name: market.name.trim(),
              location: market.location.trim(),
              address: market.address.trim(),
              city: market.city.trim() || null,
              contact_person_name: market.contactPersonName.trim(),
              contact_phone: market.contactPhone.trim(),
              contact_email: market.contactEmail.trim() || null,
              opening_date: market.openingDate,
              photo_url: photoUrl,
              submitted_by: user.id,
              status: 'pending',
            });

          if (submissionError) {
            console.error('Market submission error:', submissionError);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error('Error submitting market:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully submitted ${successCount} market location(s)! They will be reviewed by admin before activation.`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to submit ${errorCount} market location(s).`);
      }

      // Reset everything
      setMarketsToSubmit([]);
      setMarketForm({
        name: '',
        location: '',
        address: '',
        city: '',
        contactPersonName: '',
        contactPhone: '',
        contactEmail: '',
        openingDate: '',
        photoFile: null,
      });
      
      setShowAddMarketDialog(false);
      
    } catch (error: any) {
      console.error('Error submitting markets:', error);
      toast.error(error.message || 'Failed to submit market locations');
    } finally {
      setUploadingMarket(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setMarketForm({ ...marketForm, photoFile: file });
    }
  };

  const handleAddStallToQueue = () => {
    // Validate required fields
    if (!stallForm.farmerName.trim()) {
      toast.error('Farmer name is required');
      return;
    }
    if (!stallForm.stallName.trim()) {
      toast.error('Stall name is required');
      return;
    }
    if (!stallForm.contactNumber.trim()) {
      toast.error('Contact number is required');
      return;
    }
    if (!stallForm.address.trim()) {
      toast.error('Address is required');
      return;
    }
    if (!stallForm.dateOfStartingMarkets) {
      toast.error('Date of starting markets is required');
      return;
    }

    // Add to queue
    setStallsToSubmit([...stallsToSubmit, { ...stallForm }]);
    
    // Reset form
    setStallForm({
      farmerName: '',
      stallName: '',
      contactNumber: '',
      address: '',
      dateOfStartingMarkets: '',
    });
    
    toast.success('Stall added to queue. Add more or submit all.');
  };

  const handleRemoveStallFromQueue = (index: number) => {
    setStallsToSubmit(stallsToSubmit.filter((_, i) => i !== index));
    toast.success('Stall removed from queue');
  };

  const handleSubmitAllStalls = async () => {
    if (!user) return;
    
    if (stallsToSubmit.length === 0) {
      toast.error('Please add at least one stall');
      return;
    }

    setUploadingStall(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const stall of stallsToSubmit) {
        try {
          // Submit to BDO stall submissions table for admin review
          const { error: submissionError } = await (supabase as any)
            .from('bdo_stall_submissions')
            .insert({
              farmer_name: stall.farmerName.trim(),
              stall_name: stall.stallName.trim(),
              contact_number: stall.contactNumber.trim(),
              address: stall.address.trim(),
              date_of_starting_markets: stall.dateOfStartingMarkets,
              submitted_by: user.id,
              status: 'pending',
            });

          if (submissionError) {
            console.error('Stall submission error:', submissionError);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error('Error submitting stall:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully onboarded ${successCount} stall(s)! Submissions will be reviewed by admin.`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to onboard ${errorCount} stall(s).`);
      }

      // Reset everything
      setStallsToSubmit([]);
      setStallForm({
        farmerName: '',
        stallName: '',
        contactNumber: '',
        address: '',
        dateOfStartingMarkets: '',
      });
      
      setShowAddStallDialog(false);
      
    } catch (error: any) {
      console.error('Error submitting stalls:', error);
      toast.error(error.message || 'Failed to onboard stalls');
    } finally {
      setUploadingStall(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">BDO Dashboard</h1>
            <p className="text-sm text-muted-foreground">District-level Reporting & Monitoring</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={() => navigate('/bdo-session')}>
              <Clock className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">My Session</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/my-sessions')}>
              <FileText className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">View Sessions</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card 
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate('/media-upload')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Media Uploads</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.media_uploads}</div>
              <p className="text-xs text-muted-foreground">Files uploaded</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-accent transition-colors border-dashed border-2"
            onClick={() => setShowAddMarketDialog(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Add Market Location</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">+</div>
              <p className="text-xs text-muted-foreground">Submit new location</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-accent transition-colors border-dashed border-2"
            onClick={() => setShowAddStallDialog(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Add Onboarded Stall</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">+</div>
              <p className="text-xs text-muted-foreground">Onboard new stall</p>
            </CardContent>
          </Card>
        </div>

        {/* Market Performance Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Market Performance Overview</CardTitle>
            <CardDescription>District-wide market activity summary</CardDescription>
          </CardHeader>
          <CardContent>
            {marketSummaries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No market data available for the selected date
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Market</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Active Sessions</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Media</TableHead>
                    <TableHead>Collections</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marketSummaries.map((market) => (
                    <TableRow key={market.market_id}>
                      <TableCell className="font-medium">{market.market_name}</TableCell>
                      <TableCell>{market.city}</TableCell>
                      <TableCell>{market.active_sessions}</TableCell>
                      <TableCell>{market.active_employees}</TableCell>
                      <TableCell>{market.media_uploads}</TableCell>
                      <TableCell>₹{market.collections_total.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge
                          variant={market.active_sessions > 0 ? 'default' : 'secondary'}
                          className={market.active_sessions > 0 ? 'bg-green-600' : ''}
                        >
                          {market.active_sessions > 0 ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Widgets */}
        <div className="grid gap-6 md:grid-cols-2">
          <LiveMarketsWidget />
          <TaskProgressWidget />
        </div>

        <div className="mt-6">
          <CollectionsWidget />
        </div>
      </main>

      {/* Add Market Location Dialog */}
      <Dialog open={showAddMarketDialog} onOpenChange={(open) => {
        setShowAddMarketDialog(open);
        if (!open) {
          // Reset everything when closing
          setMarketsToSubmit([]);
          setMarketForm({
            name: '',
            location: '',
            address: '',
            city: '',
            contactPersonName: '',
            contactPhone: '',
            contactEmail: '',
            openingDate: '',
            photoFile: null,
          });
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Market Locations</DialogTitle>
            <DialogDescription>
              Add multiple market locations you've scouted. Add each market to the queue, then submit all at once. All locations will be reviewed by admin before activation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Queued Markets List */}
            {marketsToSubmit.length > 0 && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Queued Markets ({marketsToSubmit.length})</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSubmitAllMarkets}
                    disabled={uploadingMarket}
                  >
                    {uploadingMarket ? 'Submitting...' : `Submit All (${marketsToSubmit.length})`}
                  </Button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {marketsToSubmit.map((market, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{market.name}</div>
                        <div className="text-xs text-muted-foreground">{market.location} • {market.city || 'N/A'}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFromQueue(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">New Market Form</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="market-name">Market Name *</Label>
                <Input
                  id="market-name"
                  placeholder="e.g., Main Vegetable Market"
                  value={marketForm.name}
                  onChange={(e) => setMarketForm({ ...marketForm, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="City name"
                  value={marketForm.city}
                  onChange={(e) => setMarketForm({ ...marketForm, city: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location/Area *</Label>
              <Input
                id="location"
                placeholder="e.g., Central Square, Downtown"
                value={marketForm.location}
                onChange={(e) => setMarketForm({ ...marketForm, location: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Full Address *</Label>
              <Textarea
                id="address"
                placeholder="Complete address with street, landmark, etc."
                value={marketForm.address}
                onChange={(e) => setMarketForm({ ...marketForm, address: e.target.value })}
                rows={3}
                required
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-person">Contact Person Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contact-person"
                      placeholder="Full name"
                      className="pl-9"
                      value={marketForm.contactPersonName}
                      onChange={(e) => setMarketForm({ ...marketForm, contactPersonName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Contact Phone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contact-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      className="pl-9"
                      value={marketForm.contactPhone}
                      onChange={(e) => setMarketForm({ ...marketForm, contactPhone: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label htmlFor="contact-email">Contact Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="email@example.com"
                    className="pl-9"
                    value={marketForm.contactEmail}
                    onChange={(e) => setMarketForm({ ...marketForm, contactEmail: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="opening-date">Date of Opening *</Label>
                  <Input
                    id="opening-date"
                    type="date"
                    value={marketForm.openingDate}
                    onChange={(e) => setMarketForm({ ...marketForm, openingDate: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label htmlFor="market-photo">Photo of Finalized Place</Label>
              <div className="mt-2">
                <Input
                  id="market-photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="cursor-pointer"
                />
                {marketForm.photoFile && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Camera className="h-4 w-4" />
                    <span>{marketForm.photoFile.name}</span>
                    <span className="text-xs">({(marketForm.photoFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Upload a photo of the finalized market location (Max 5MB, Image files only)
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddMarketDialog(false);
                setMarketsToSubmit([]);
                setMarketForm({
                  name: '',
                  location: '',
                  address: '',
                  city: '',
                  contactPersonName: '',
                  contactPhone: '',
                  contactEmail: '',
                  openingDate: '',
                  photoFile: null,
                });
              }}
              disabled={uploadingMarket}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={handleAddToQueue}
              disabled={uploadingMarket}
            >
              Add to Queue
            </Button>
            {marketsToSubmit.length > 0 && (
              <Button onClick={handleSubmitAllMarkets} disabled={uploadingMarket}>
                {uploadingMarket ? 'Submitting...' : `Submit All (${marketsToSubmit.length})`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Onboarded Stall Dialog */}
      <Dialog open={showAddStallDialog} onOpenChange={(open) => {
        setShowAddStallDialog(open);
        if (!open) {
          // Reset everything when closing
          setStallsToSubmit([]);
          setStallForm({
            farmerName: '',
            stallName: '',
            contactNumber: '',
            address: '',
            dateOfStartingMarkets: '',
          });
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Onboarded Stalls</DialogTitle>
            <DialogDescription>
              Add multiple stalls onboarded by BDO. Add each stall to the queue, then submit all at once. All stalls will be reviewed by admin.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Queued Stalls List */}
            {stallsToSubmit.length > 0 && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Queued Stalls ({stallsToSubmit.length})</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSubmitAllStalls}
                    disabled={uploadingStall}
                  >
                    {uploadingStall ? 'Submitting...' : `Submit All (${stallsToSubmit.length})`}
                  </Button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {stallsToSubmit.map((stall, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{stall.farmerName} - {stall.stallName}</div>
                        <div className="text-xs text-muted-foreground">{stall.contactNumber} • {stall.address}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStallFromQueue(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">New Stall Form</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="farmer-name">Farmer Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="farmer-name"
                    placeholder="Farmer full name"
                    className="pl-9"
                    value={stallForm.farmerName}
                    onChange={(e) => setStallForm({ ...stallForm, farmerName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stall-name">Stall Name *</Label>
                <Input
                  id="stall-name"
                  placeholder="e.g., Vegetable Stall 1"
                  value={stallForm.stallName}
                  onChange={(e) => setStallForm({ ...stallForm, stallName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-number">Contact Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="contact-number"
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="pl-9"
                  value={stallForm.contactNumber}
                  onChange={(e) => setStallForm({ ...stallForm, contactNumber: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stall-address">Address *</Label>
              <Textarea
                id="stall-address"
                placeholder="Complete address with street, landmark, etc."
                value={stallForm.address}
                onChange={(e) => setStallForm({ ...stallForm, address: e.target.value })}
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-starting">Date of Starting Markets *</Label>
              <Input
                id="date-starting"
                type="date"
                value={stallForm.dateOfStartingMarkets}
                onChange={(e) => setStallForm({ ...stallForm, dateOfStartingMarkets: e.target.value })}
                required
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddStallDialog(false);
                setStallsToSubmit([]);
                setStallForm({
                  farmerName: '',
                  stallName: '',
                  contactNumber: '',
                  address: '',
                  dateOfStartingMarkets: '',
                });
              }}
              disabled={uploadingStall}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={handleAddStallToQueue}
              disabled={uploadingStall}
            >
              Add to Queue
            </Button>
            {stallsToSubmit.length > 0 && (
              <Button onClick={handleSubmitAllStalls} disabled={uploadingStall}>
                {uploadingStall ? 'Submitting...' : `Submit All (${stallsToSubmit.length})`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

