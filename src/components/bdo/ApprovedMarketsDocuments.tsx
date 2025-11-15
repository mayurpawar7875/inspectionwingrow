import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle, FileText, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface ApprovedMarket {
  id: string;
  name: string;
  location: string;
  address: string;
  city: string | null;
  opening_date: string;
  reviewed_at: string | null;
  documents_status: string;
  service_agreement_url: string | null;
  stalls_accommodation_count: number | null;
}

export default function ApprovedMarketsDocuments() {
  const [markets, setMarkets] = useState<ApprovedMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState<ApprovedMarket | null>(null);
  const [uploading, setUploading] = useState(false);
  const [serviceAgreementFile, setServiceAgreementFile] = useState<File | null>(null);
  const [stallsCount, setStallsCount] = useState<number>(0);

  useEffect(() => {
    fetchApprovedMarkets();

    const channel = supabase
      .channel('approved-markets-docs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bdo_market_submissions' }, () => {
        fetchApprovedMarkets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchApprovedMarkets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bdo_market_submissions')
        .select('id, name, location, address, city, opening_date, reviewed_at, documents_status, service_agreement_url, stalls_accommodation_count')
        .eq('submitted_by', user.id)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false });

      if (error) throw error;
      setMarkets(data || []);
    } catch (error) {
      console.error('Error fetching approved markets:', error);
      toast.error('Failed to load approved markets');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocuments = async () => {
    if (!selectedMarket || (!serviceAgreementFile && !stallsCount)) {
      toast.error('Please provide service agreement or stalls count');
      return;
    }

    setUploading(true);
    try {
      let serviceAgreementUrl = selectedMarket.service_agreement_url;
      let stallsAccommodationCount = selectedMarket.stalls_accommodation_count;

      // Upload service agreement if provided
      if (serviceAgreementFile) {
        const fileName = `service-agreement-${selectedMarket.id}-${Date.now()}.${serviceAgreementFile.name.split('.').pop()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('employee-media')
          .upload(`bdo-documents/${fileName}`, serviceAgreementFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('employee-media')
          .getPublicUrl(`bdo-documents/${fileName}`);

        serviceAgreementUrl = publicUrl;
      }

      // Update stalls count if provided
      if (stallsCount > 0) {
        stallsAccommodationCount = stallsCount;
      }

      // Check if both are now provided
      const documentsComplete = serviceAgreementUrl && stallsAccommodationCount;

      // Update the submission
      const { error: updateError } = await supabase
        .from('bdo_market_submissions')
        .update({
          service_agreement_url: serviceAgreementUrl,
          stalls_accommodation_count: stallsAccommodationCount,
          documents_uploaded_at: documentsComplete ? new Date().toISOString() : null,
          documents_status: documentsComplete ? 'uploaded' : 'pending',
        })
        .eq('id', selectedMarket.id);

      if (updateError) throw updateError;

      toast.success(documentsComplete ? 'All information submitted successfully!' : 'Information updated successfully!');
      setSelectedMarket(null);
      setServiceAgreementFile(null);
      setStallsCount(0);
      fetchApprovedMarkets();
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast.error('Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  const getDocumentStatus = (market: ApprovedMarket) => {
    if (market.documents_status === 'uploaded') {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Complete</Badge>;
    }
    if (market.service_agreement_url || market.stalls_accommodation_count) {
      return <Badge className="bg-amber-500"><AlertCircle className="h-3 w-3 mr-1" />Partial</Badge>;
    }
    return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading approved markets...</div>;
  }

  if (markets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Approved Markets - Document Upload
          </CardTitle>
          <CardDescription>Upload required documents for approved market locations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No approved markets requiring documents at this time.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Approved Markets - Document Upload
          </CardTitle>
          <CardDescription>
            Upload service agreement and provide stalls count for approved markets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Opening Date</TableHead>
                  <TableHead>Approved On</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {markets.map((market) => (
                  <TableRow key={market.id}>
                    <TableCell className="font-medium">{market.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {market.location}
                        {market.city && <span className="text-muted-foreground"> ({market.city})</span>}
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(market.opening_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      {market.reviewed_at ? format(new Date(market.reviewed_at), 'MMM dd, HH:mm') : 'N/A'}
                    </TableCell>
                    <TableCell>{getDocumentStatus(market)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={market.documents_status === 'uploaded' ? 'outline' : 'default'}
                        onClick={() => setSelectedMarket(market)}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        {market.documents_status === 'uploaded' ? 'View/Update' : 'Upload'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={!!selectedMarket} onOpenChange={(open) => !open && setSelectedMarket(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit Information - {selectedMarket?.name}</DialogTitle>
            <DialogDescription>
              Please upload the service agreement with landowner and provide the number of stalls
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Service Agreement */}
            <div className="space-y-2">
              <Label htmlFor="service-agreement">
                Service Agreement with Landowner {selectedMarket?.service_agreement_url && '✓'}
              </Label>
              {selectedMarket?.service_agreement_url && (
                <div className="text-sm text-muted-foreground mb-2">
                  <a href={selectedMarket.service_agreement_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    View current document
                  </a>
                </div>
              )}
              <Input
                id="service-agreement"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => setServiceAgreementFile(e.target.files?.[0] || null)}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                Accepted formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB)
              </p>
            </div>

            {/* Stalls Count */}
            <div className="space-y-2">
              <Label htmlFor="stalls-count">
                Number of Stalls {selectedMarket?.stalls_accommodation_count && '✓'}
              </Label>
              {selectedMarket?.stalls_accommodation_count && (
                <div className="text-sm text-muted-foreground mb-2">
                  Current count: {selectedMarket.stalls_accommodation_count} stalls
                </div>
              )}
              <Input
                id="stalls-count"
                type="number"
                min="1"
                placeholder="Enter number of stalls"
                value={stallsCount || ''}
                onChange={(e) => setStallsCount(parseInt(e.target.value) || 0)}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                Enter the total number of stalls for this market
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMarket(null)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUploadDocuments} disabled={uploading || (!serviceAgreementFile && !stallsCount)}>
              {uploading ? 'Submitting...' : 'Submit Information'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
