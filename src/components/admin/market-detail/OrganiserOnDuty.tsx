import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface OrganiserData {
  id?: string;
  user_id: string;
  punch_in_time?: string | null;
  punch_out_time?: string | null;
  status?: string;
  profiles: {
    full_name: string;
    phone: string | null;
  };
}

interface Props {
  marketId: string;
  marketDate: string;
  isToday: boolean;
}

export function OrganiserOnDuty({ marketId, marketDate, isToday }: Props) {
  const [organiser, setOrganiser] = useState<OrganiserData | null>(null);
  const [lastActivity, setLastActivity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganiser();

    if (isToday) {
      const sessionsChannel = supabase
        .channel(`sessions-${marketId}-${marketDate}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sessions',
            filter: `market_id=eq.${marketId}`,
          },
          () => fetchOrganiser()
        )
        .subscribe();

      const mediaChannel = supabase
        .channel(`media-organiser-${marketId}-${marketDate}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'media',
            filter: `market_id=eq.${marketId}`,
          },
          () => fetchOrganiser()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(sessionsChannel);
        supabase.removeChannel(mediaChannel);
      };
    }
  }, [marketId, marketDate, isToday]);

  const fetchOrganiser = async () => {
    setLoading(true);
    
    // Fetch sessions (status can be: active, finalized, locked)
    // Match by market_date OR session_date to handle older sessions without market_date set
    const { data: s, error: sErr } = await supabase
      .from('sessions')
      .select('id, user_id, punch_in_time, punch_out_time, status')
      .eq('market_id', marketId)
      .or(`market_date.eq.${marketDate},session_date.eq.${marketDate}`)
      .order('punch_in_time', { ascending: false });

    if (sErr) console.error(sErr);

    let selectedUserId: string | null = null;
    let sessionData: any = null;

    // Pick organiser = active session first, else latest
    const organiserSession = (s ?? []).sort((a, b) => 
      (a.status === 'active' ? -1 : 1) || 
      (new Date(b.punch_in_time || 0).getTime() - new Date(a.punch_in_time || 0).getTime())
    )[0];

    if (organiserSession) {
      selectedUserId = organiserSession.user_id;
      sessionData = organiserSession;
    } else {
      // Fallback: find employee with most uploads for this market/date
      const { data: uploads } = await supabase
        .from('media')
        .select('user_id')
        .eq('market_id', marketId)
        .eq('market_date', marketDate);

      if (uploads && uploads.length > 0) {
        // Count uploads per user
        const uploadCounts: Record<string, number> = {};
        uploads.forEach(u => {
          if (u.user_id) {
            uploadCounts[u.user_id] = (uploadCounts[u.user_id] || 0) + 1;
          }
        });

        // Find user with most uploads
        const mostActiveUser = Object.entries(uploadCounts)
          .sort(([, a], [, b]) => b - a)[0];
        
        if (mostActiveUser) {
          selectedUserId = mostActiveUser[0];
        }
      }
    }

    if (selectedUserId) {
      // Fetch the employee profile
      const { data: emp } = await supabase
        .from('employees')
        .select('id, full_name, phone')
        .eq('id', selectedUserId)
        .maybeSingle();

      if (emp) {
        setOrganiser({
          ...sessionData,
          user_id: selectedUserId,
          profiles: {
            full_name: emp.full_name,
            phone: emp.phone
          }
        } as any);

        // Fetch last activity
        const { data: mediaData } = await supabase
          .from('media')
          .select('captured_at')
          .eq('user_id', selectedUserId)
          .eq('market_id', marketId)
          .eq('market_date', marketDate)
          .order('captured_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (mediaData) {
          setLastActivity(mediaData.captured_at);
        }
      } else {
        setOrganiser(null);
      }
    } else {
      setOrganiser(null);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organiser on Duty</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!organiser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organiser on Duty</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            No session for this market/date. Ensure Punch-In created a session for ({marketId}, {marketDate}).
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organiser on Duty</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="text-2xl font-bold">{organiser.profiles.full_name}</div>
            {organiser.profiles.phone && (
              <div className="text-sm text-muted-foreground">{organiser.profiles.phone}</div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Punch In</div>
              <div className="text-lg">
                {organiser.punch_in_time
                  ? format(new Date(organiser.punch_in_time), 'hh:mm a')
                  : '—'}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Punch Out</div>
              <div className="text-lg">
                {organiser.punch_out_time
                  ? format(new Date(organiser.punch_out_time), 'hh:mm a')
                  : '—'}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground">Last Activity</div>
              <div className="text-lg">
                {lastActivity
                  ? format(new Date(lastActivity), 'hh:mm a')
                  : 'No activity'}
              </div>
            </div>
          </div>

          {organiser.status && (
            <div>
              <Badge variant={organiser.status === 'active' ? 'default' : 'secondary'}>
                {organiser.status}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
