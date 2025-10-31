import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface MediaUpload {
  id: string;
  captured_at: string;
  media_type: 'outside_rates' | 'selfie_gps' | 'rate_board' | 'market_video' | 'cleaning_video' | 'customer_feedback';
  is_late: boolean;
  file_url: string;
  user_id: string;
  profiles: {
    full_name: string;
  };
}

interface Props {
  marketId: string;
  marketDate: string;
  isToday: boolean;
}

export function MediaUploadsSection({ marketId, marketDate, isToday }: Props) {
  const [uploads, setUploads] = useState<MediaUpload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUploads();

    if (isToday) {
      const channel = supabase
        .channel(`media-${marketId}-${marketDate}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'media',
            filter: `market_id=eq.${marketId}`,
          },
          () => fetchUploads()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [marketId, marketDate, isToday]);

  const fetchUploads = async () => {
    setLoading(true);

    // Fetch media uploads
    const { data: u, error: uErr } = await supabase
      .from('media')
      .select('id, captured_at, media_type, is_late, file_url, user_id')
      .eq('market_id', marketId)
      .eq('market_date', marketDate)
      .order('captured_at', { ascending: false });

    if (uErr) console.error(uErr);

    const uUserIds = [...new Set((u ?? []).map(r => r.user_id).filter(Boolean))];

    // Fetch employees
    const { data: uEmps, error: uEmpErr } = await supabase
      .from('employees')
      .select('id, full_name')
      .in('id', uUserIds.length ? uUserIds : ['00000000-0000-0000-0000-000000000000']);

    if (uEmpErr) console.error(uEmpErr);

    const uEmpById: Record<string, string> = Object.fromEntries(
      (uEmps ?? []).map(e => [e.id, e.full_name])
    );

    // Merge data
    const media = (u ?? []).map(r => ({
      ...r,
      profiles: { full_name: uEmpById[r.user_id] ?? '—' }
    }));

    setUploads(media as any);
    setLoading(false);
  };

  const handleView = (url: string) => {
    window.open(url, '_blank');
  };

  const handleDownload = async (url: string, fileName: string) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(blobUrl);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media Uploads</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground">Loading...</div>
        ) : uploads.length === 0 ? (
          <div className="text-center text-muted-foreground">No media uploads yet</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>File Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell>{format(new Date(upload.captured_at), 'hh:mm a')}</TableCell>
                    <TableCell>{upload.profiles.full_name}</TableCell>
                    <TableCell className="uppercase">{upload.media_type}</TableCell>
                    <TableCell>
                      {upload.is_late && (
                        <Badge variant="destructive">Late</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(upload.file_url)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(upload.file_url, `media-${upload.id}`)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
