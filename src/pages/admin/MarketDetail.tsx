import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { OrganiserOnDuty } from '@/components/admin/market-detail/OrganiserOnDuty';
import { StallConfirmationsTable } from '@/components/admin/market-detail/StallConfirmationsTable';
import { MediaUploadsSection } from '@/components/admin/market-detail/MediaUploadsSection';
import { NextDayPlanningSection } from '@/components/admin/market-detail/NextDayPlanningSection';
import { StallInspectionsSection } from '@/components/admin/market-detail/StallInspectionsSection';
import { TodaysOffersSection } from '@/components/admin/market-detail/TodaysOffersSection';
import { NonAvailableCommoditiesSection } from '@/components/admin/market-detail/NonAvailableCommoditiesSection';
import { OrganiserFeedbackSection } from '@/components/admin/market-detail/OrganiserFeedbackSection';

interface Market {
  id: string;
  name: string;
  city: string | null;
}

interface Organiser {
  full_name: string;
  phone: string | null;
  email: string | null;
}

export default function MarketDetail() {
  const { marketId } = useParams<{ marketId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [market, setMarket] = useState<Market | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [organiser, setOrganiser] = useState<Organiser | null>(null);
  const [loading, setLoading] = useState(true);

  // Get IST date string
  const getISTDateString = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
  };

  const isToday = getISTDateString(selectedDate) === getISTDateString(new Date());

  useEffect(() => {
    const fetchMarket = async () => {
      if (!marketId) return;
      
      const { data } = await supabase
        .from('markets')
        .select('id, name, city')
        .eq('id', marketId)
        .single();
      
      if (data) setMarket(data);
    };

    fetchMarket().finally(() => setLoading(false));
  }, [marketId]);

  useEffect(() => {
    const fetchOrganiser = async () => {
      if (!marketId) return;

      const dateStr = getISTDateString(selectedDate);

      // Fetch sessions for this market and date (handle both market_date and session_date)
      const { data: s, error: sErr } = await supabase
        .from('sessions')
        .select('id, user_id, punch_in_time, punch_out_time, status')
        .eq('market_id', marketId)
        .or(`market_date.eq.${dateStr},session_date.eq.${dateStr}`)
        .order('punch_in_time', { ascending: false });

      if (sErr) console.error(sErr);

      let selectedUserId: string | null = null;

      // Prefer active session; otherwise latest by punch_in_time
      const organiserSession = (s ?? []).sort((a, b) =>
        (a.status === 'active' ? -1 : 1) ||
        (new Date(b.punch_in_time || 0).getTime() - new Date(a.punch_in_time || 0).getTime())
      )[0];

      if (organiserSession) {
        selectedUserId = organiserSession.user_id;
      } else {
        // Fallback: user with most uploads for this market/date
        const { data: uploads } = await supabase
          .from('media')
          .select('user_id')
          .eq('market_id', marketId)
          .eq('market_date', dateStr);

        if (uploads && uploads.length > 0) {
          const uploadCounts: Record<string, number> = {};
          uploads.forEach(u => {
            if (u.user_id) uploadCounts[u.user_id] = (uploadCounts[u.user_id] || 0) + 1;
          });
          const mostActiveUser = Object.entries(uploadCounts).sort(([, a], [, b]) => b - a)[0];
          if (mostActiveUser) selectedUserId = mostActiveUser[0];
        }
      }

      if (selectedUserId) {
        const { data: emp } = await supabase
          .from('employees')
          .select('id, full_name, phone')
          .eq('id', selectedUserId)
          .maybeSingle();

        if (emp) {
          setOrganiser({ full_name: emp.full_name, phone: emp.phone, email: null });
        } else {
          setOrganiser(null);
        }
      } else {
        setOrganiser(null);
      }
    };

    fetchOrganiser();
  }, [marketId, selectedDate]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-lg">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!market) {
    return (
      <AdminLayout>
        <div className="text-center">Market not found</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => navigate('/admin')} className="hover:text-foreground">
            Admin
          </button>
          <ChevronRight className="h-4 w-4" />
          <button onClick={() => navigate('/admin')} className="hover:text-foreground">
            Markets
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">
            {market.name} ({format(selectedDate, 'MMM dd, yyyy')})
          </span>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Market</label>
                <Select value={marketId} onValueChange={(val) => navigate(`/admin/market/${val}`)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={marketId}>{market.name}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Organiser</label>
                {organiser ? (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <div className="flex-1">
                      <div className="font-medium">{organiser.full_name}</div>
                      {organiser.phone && (
                        <div className="text-xs text-muted-foreground">{organiser.phone}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-2 bg-muted rounded-md text-sm text-muted-foreground">
                    No organiser assigned
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organiser on Duty */}
        <OrganiserOnDuty
          marketId={marketId!}
          marketDate={getISTDateString(selectedDate)}
          isToday={isToday}
        />

        {/* Stall Confirmations */}
        <StallConfirmationsTable
          marketId={marketId!}
          marketDate={getISTDateString(selectedDate)}
          isToday={isToday}
          marketName={market.name}
        />

        {/* Media Uploads */}
        <MediaUploadsSection
          marketId={marketId!}
          marketDate={getISTDateString(selectedDate)}
          isToday={isToday}
        />

        {/* Next Day Planning */}
        <NextDayPlanningSection
          marketId={marketId!}
          marketDate={getISTDateString(selectedDate)}
          isToday={isToday}
        />

        {/* Stall Inspections */}
        <StallInspectionsSection
          marketId={marketId!}
          marketDate={getISTDateString(selectedDate)}
          isToday={isToday}
        />

        {/* Today's Offers */}
        <TodaysOffersSection
          marketId={marketId!}
          marketDate={getISTDateString(selectedDate)}
          isToday={isToday}
        />

        {/* Non-Available Commodities */}
        <NonAvailableCommoditiesSection
          marketId={marketId!}
          marketDate={getISTDateString(selectedDate)}
          isToday={isToday}
        />

        {/* Organiser Feedback */}
        <OrganiserFeedbackSection
          marketId={marketId!}
          marketDate={getISTDateString(selectedDate)}
          isToday={isToday}
        />
      </div>
    </AdminLayout>
  );
}
