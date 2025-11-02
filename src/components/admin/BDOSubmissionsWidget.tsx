import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Building, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface BDOMarketSubmission {
  id: string;
  name: string;
  location: string;
  address: string;
  city: string | null;
  contact_person_name: string;
  contact_phone: string;
  contact_email: string | null;
  opening_date: string;
  photo_url: string | null;
  submitted_by: string;
  submitted_at: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

interface BDOStallSubmission {
  id: string;
  farmer_name: string;
  stall_name: string;
  contact_number: string;
  address: string;
  date_of_starting_markets: string;
  submitted_by: string;
  submitted_at: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

export default function BDOSubmissionsWidget() {
  const [marketSubmissions, setMarketSubmissions] = useState<BDOMarketSubmission[]>([]);
  const [stallSubmissions, setStallSubmissions] = useState<BDOStallSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState<BDOMarketSubmission | null>(null);
  const [selectedStall, setSelectedStall] = useState<BDOStallSubmission | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    fetchSubmissions();

    // Real-time updates
    const channel = supabase
      .channel('bdo-submissions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bdo_market_submissions' }, () => {
        fetchSubmissions();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bdo_stall_submissions' }, () => {
        fetchSubmissions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);

      const [marketsRes, stallsRes] = await Promise.all([
        supabase
          .from('bdo_market_submissions')
          .select('*')
          .order('submitted_at', { ascending: false })
          .limit(10),
        supabase
          .from('bdo_stall_submissions')
          .select('*')
          .order('submitted_at', { ascending: false })
          .limit(10),
      ]);

      if (marketsRes.error) throw marketsRes.error;
      if (stallsRes.error) throw stallsRes.error;

      setMarketSubmissions(marketsRes.data || []);
      setStallSubmissions(stallsRes.data || []);
    } catch (error) {
      console.error('Error fetching BDO submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewMarket = async (status: 'approved' | 'rejected') => {
    if (!selectedMarket) return;

    try {
      setReviewing(true);

      const { error } = await supabase
        .from('bdo_market_submissions')
        .update({
          status,
          review_notes: reviewNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedMarket.id);

      if (error) throw error;

      toast.success(`Market ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      setSelectedMarket(null);
      setReviewNotes('');
      fetchSubmissions();
    } catch (error) {
      console.error('Error reviewing market:', error);
      toast.error('Failed to review market');
    } finally {
      setReviewing(false);
    }
  };

  const handleReviewStall = async (status: 'approved' | 'rejected') => {
    if (!selectedStall) return;

    try {
      setReviewing(true);

      const { error } = await supabase
        .from('bdo_stall_submissions')
        .update({
          status,
          review_notes: reviewNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedStall.id);

      if (error) throw error;

      toast.success(`Stall ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      setSelectedStall(null);
      setReviewNotes('');
      fetchSubmissions();
    } catch (error) {
      console.error('Error reviewing stall:', error);
      toast.error('Failed to review stall');
    } finally {
      setReviewing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const pendingMarkets = marketSubmissions.filter(m => m.status === 'pending');
  const pendingStalls = stallSubmissions.filter(s => s.status === 'pending');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              BDO Market Submissions
              {pendingMarkets.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingMarkets.length} Pending
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Recent market location submissions from BDOs</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : marketSubmissions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No market submissions yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Opening Date</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marketSubmissions.map((market) => (
                  <TableRow key={market.id}>
                    <TableCell className="font-medium">{market.name}</TableCell>
                    <TableCell>{market.city || 'N/A'}</TableCell>
                    <TableCell>{format(new Date(market.opening_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{format(new Date(market.submitted_at), 'MMM dd, HH:mm')}</TableCell>
                    <TableCell>{getStatusBadge(market.status)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedMarket(market)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              BDO Stall Submissions
              {pendingStalls.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingStalls.length} Pending
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Recent stall onboarding submissions from BDOs</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : stallSubmissions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No stall submissions yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stall Name</TableHead>
                  <TableHead>Farmer Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stallSubmissions.map((stall) => (
                  <TableRow key={stall.id}>
                    <TableCell className="font-medium">{stall.stall_name}</TableCell>
                    <TableCell>{stall.farmer_name}</TableCell>
                    <TableCell>{stall.contact_number}</TableCell>
                    <TableCell>{format(new Date(stall.submitted_at), 'MMM dd, HH:mm')}</TableCell>
                    <TableCell>{getStatusBadge(stall.status)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedStall(stall)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Market Review Dialog */}
      <Dialog open={!!selectedMarket} onOpenChange={() => setSelectedMarket(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Market Submission</DialogTitle>
            <DialogDescription>
              Review and approve/reject this market location submission
            </DialogDescription>
          </DialogHeader>
          {selectedMarket && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Market Name</p>
                  <p className="text-sm text-muted-foreground">{selectedMarket.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">City</p>
                  <p className="text-sm text-muted-foreground">{selectedMarket.city || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Opening Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedMarket.opening_date), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Contact Person</p>
                  <p className="text-sm text-muted-foreground">{selectedMarket.contact_person_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Contact Phone</p>
                  <p className="text-sm text-muted-foreground">{selectedMarket.contact_phone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Contact Email</p>
                  <p className="text-sm text-muted-foreground">{selectedMarket.contact_email || 'N/A'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-sm text-muted-foreground">{selectedMarket.address}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Location Link</p>
                <a
                  href={selectedMarket.location}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  View on Map
                </a>
              </div>
              {selectedMarket.photo_url && (
                <div>
                  <p className="text-sm font-medium mb-2">Photo</p>
                  <img
                    src={selectedMarket.photo_url}
                    alt="Market location"
                    className="max-h-64 rounded-lg"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Review Notes</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes for this review..."
                  className="mt-2"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMarket(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleReviewMarket('rejected')}
              disabled={reviewing}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button onClick={() => handleReviewMarket('approved')} disabled={reviewing}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stall Review Dialog */}
      <Dialog open={!!selectedStall} onOpenChange={() => setSelectedStall(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Stall Submission</DialogTitle>
            <DialogDescription>
              Review and approve/reject this stall onboarding submission
            </DialogDescription>
          </DialogHeader>
          {selectedStall && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Stall Name</p>
                  <p className="text-sm text-muted-foreground">{selectedStall.stall_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Farmer Name</p>
                  <p className="text-sm text-muted-foreground">{selectedStall.farmer_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Contact Number</p>
                  <p className="text-sm text-muted-foreground">{selectedStall.contact_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Starting Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedStall.date_of_starting_markets), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-sm text-muted-foreground">{selectedStall.address}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Review Notes</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes for this review..."
                  className="mt-2"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedStall(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleReviewStall('rejected')}
              disabled={reviewing}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button onClick={() => handleReviewStall('approved')} disabled={reviewing}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
