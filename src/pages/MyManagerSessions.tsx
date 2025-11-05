import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, X, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface Session {
  id: string;
  session_date: string;
  day_of_week: number;
  status: string;
  created_at: string;
  updated_at: string;
  task_counts: {
    employee_allocations: number;
    punch_in: number;
    land_search: number;
    stall_search: number;
    money_recovery: number;
    assets_usage: number;
    feedbacks: number;
    inspections: number;
    punch_out: number;
  };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function MyManagerSessions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('all');
  const [markets, setMarkets] = useState<any[]>([]);
  const [selectedTaskType, setSelectedTaskType] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [taskDetails, setTaskDetails] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSessions();
      fetchMarkets();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [sessions, startDate, endDate, selectedMarket]);

  const fetchMarkets = async () => {
    const { data } = await supabase
      .from('markets')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setMarkets(data || []);
  };

  const fetchSessions = async () => {
    if (!user) return;

    setLoading(true);
    const { data: sessionData } = await supabase
      .from('market_manager_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('session_date', { ascending: false });

    if (sessionData) {
      // Fetch task counts for each session
      const sessionsWithCounts = await Promise.all(
        sessionData.map(async (session) => {
          const [
            employeeAllocations,
            punchIn,
            landSearch,
            stallSearch,
            moneyRecovery,
            assetsUsage,
            feedbacks,
            inspections,
            punchOut,
          ] = await Promise.all([
            supabase.from('employee_allocations').select('*', { count: 'exact', head: true }).eq('session_id', session.id),
            supabase.from('market_manager_punchin').select('*', { count: 'exact', head: true }).eq('session_id', session.id),
            supabase.from('market_land_search').select('*', { count: 'exact', head: true }).eq('session_id', session.id),
            supabase.from('stall_searching_updates').select('*', { count: 'exact', head: true }).eq('session_id', session.id),
            supabase.from('assets_money_recovery').select('*', { count: 'exact', head: true }).eq('session_id', session.id),
            supabase.from('assets_usage').select('*', { count: 'exact', head: true }).eq('session_id', session.id),
            supabase.from('bms_stall_feedbacks').select('*', { count: 'exact', head: true }).eq('session_id', session.id),
            supabase.from('market_inspection_updates').select('*', { count: 'exact', head: true }).eq('session_id', session.id),
            supabase.from('market_manager_punchout').select('*', { count: 'exact', head: true }).eq('session_id', session.id),
          ]);

          return {
            ...session,
            task_counts: {
              employee_allocations: employeeAllocations.count || 0,
              punch_in: punchIn.count || 0,
              land_search: landSearch.count || 0,
              stall_search: stallSearch.count || 0,
              money_recovery: moneyRecovery.count || 0,
              assets_usage: assetsUsage.count || 0,
              feedbacks: feedbacks.count || 0,
              inspections: inspections.count || 0,
              punch_out: punchOut.count || 0,
            },
          };
        })
      );

      setSessions(sessionsWithCounts);
      setFilteredSessions(sessionsWithCounts);
    }

    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...sessions];

    // Date filters
    if (startDate) {
      filtered = filtered.filter(s => s.session_date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(s => s.session_date <= endDate);
    }

    // Market filter - we need to check which markets were used in this session
    if (selectedMarket && selectedMarket !== 'all') {
      // For now, we can't filter by market since sessions don't have market_id
      // This would require checking employee_allocations or other related tables
      // For simplicity, we'll skip this for now or you can add market_id to sessions table
    }

    setFilteredSessions(filtered);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedMarket('all');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge className="bg-green-500">Active</Badge>;
    }
    return <Badge variant="secondary">Completed</Badge>;
  };

  const getTotalTasks = (counts: Session['task_counts']) => {
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  };

  const taskTypeMap: Record<string, { table: string; label: string }> = {
    employee_allocations: { table: 'employee_allocations', label: 'Employee Allocations' },
    punch_in: { table: 'market_manager_punchin', label: 'Punch-In' },
    land_search: { table: 'market_land_search', label: 'Land Search' },
    stall_search: { table: 'stall_searching_updates', label: 'Stall Searching Updates' },
    money_recovery: { table: 'assets_money_recovery', label: 'Money Recovery' },
    assets_usage: { table: 'assets_usage', label: 'Assets Usage' },
    feedbacks: { table: 'bms_stall_feedbacks', label: 'BMS Stall Feedbacks' },
    inspections: { table: 'market_inspection_updates', label: 'Market Inspection Updates' },
    punch_out: { table: 'market_manager_punchout', label: 'Punch-Out' },
  };

  const getVideoSignedUrl = async (videoUrl: string | null): Promise<string | null> => {
    if (!videoUrl) return null;
    
    console.log('[Video URL Debug] Original URL:', videoUrl);
    
    try {
      let videoPath = videoUrl;
      
      // If it's already a full URL, extract the path
      if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
        // Try to extract path from various URL formats
        const publicMatch = videoUrl.match(/\/storage\/v1\/object\/public\/employee-media\/(.+)$/);
        const signedMatch = videoUrl.match(/\/storage\/v1\/object\/sign\/employee-media\/(.+)\?/);
        const pathMatch = videoUrl.match(/employee-media\/(.+)$/);
        
        console.log('[Video URL Debug] Match results:', { publicMatch, signedMatch, pathMatch });
        
        if (publicMatch) {
          videoPath = publicMatch[1];
        } else if (signedMatch) {
          videoPath = signedMatch[1];
        } else if (pathMatch) {
          videoPath = pathMatch[1];
        } else {
          // If we can't extract path, return the original URL
          console.log('[Video URL Debug] Could not extract path, returning original URL');
          return videoUrl;
        }
      }
      
      console.log('[Video URL Debug] Extracted path:', videoPath);
      
      // Generate signed URL (valid for 1 hour)
      const { data, error } = await supabase.storage
        .from('employee-media')
        .createSignedUrl(videoPath, 3600);
      
      if (error) {
        console.error('[Video URL Debug] Error generating signed URL:', error);
        return null;
      }
      
      console.log('[Video URL Debug] Generated signed URL:', data.signedUrl);
      return data.signedUrl;
    } catch (error) {
      console.error('[Video URL Debug] Exception:', error);
      return null;
    }
  };

  const fetchTaskDetails = async (sessionId: string, taskType: string) => {
    if (!taskTypeMap[taskType]) return;

    setLoadingDetails(true);
    try {
      const { table } = taskTypeMap[taskType];
      const { data, error } = await supabase
        .from(table as any)
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch market names for entries that have market_id and fix video URLs
      const detailsWithMarkets = await Promise.all(
        (data || []).map(async (item: any) => {
          let processedItem = { ...item };
          
          if (item.market_id) {
            const market = markets.find(m => m.id === item.market_id);
            processedItem.market_name = market?.name || 'Unknown Market';
          }
          
          // Fix video URL if it exists
          if (item.video_url) {
            processedItem.video_url = await getVideoSignedUrl(item.video_url);
          }
          
          return processedItem;
        })
      );

      setTaskDetails(detailsWithMarkets);
    } catch (error) {
      console.error('Error fetching task details:', error);
      setTaskDetails([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleTaskClick = (sessionId: string, taskType: string) => {
    setSelectedSessionId(sessionId);
    setSelectedTaskType(taskType);
    fetchTaskDetails(sessionId, taskType);
  };

  const renderTaskDetails = () => {
    if (!selectedTaskType || !taskTypeMap[selectedTaskType]) return null;

    const { label } = taskTypeMap[selectedTaskType];

    if (loadingDetails) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (taskDetails.length === 0) {
      return <p className="text-center py-8 text-muted-foreground">No data found for this task.</p>;
    }

    switch (selectedTaskType) {
      case 'employee_allocations':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskDetails.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.employee_name}</TableCell>
                  <TableCell>{item.market_name || 'N/A'}</TableCell>
                  <TableCell>{format(new Date(item.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'punch_in':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GPS Location</TableHead>
                <TableHead>Punched At</TableHead>
                <TableHead>Selfie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskDetails.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <a
                      href={`https://maps.google.com/?q=${item.gps_lat},${item.gps_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {item.gps_lat}, {item.gps_lng}
                    </a>
                  </TableCell>
                  <TableCell>{format(new Date(item.punched_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>
                    {item.selfie_url ? (
                      <a href={item.selfie_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        View Selfie
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'land_search':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Place Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Contact Name</TableHead>
                <TableHead>Contact Phone</TableHead>
                <TableHead>Opening Date</TableHead>
                <TableHead>Finalized</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskDetails.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.place_name}</TableCell>
                  <TableCell>{item.address}</TableCell>
                  <TableCell>{item.contact_name}</TableCell>
                  <TableCell>{item.contact_phone || 'N/A'}</TableCell>
                  <TableCell>{item.opening_date ? format(new Date(item.opening_date), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                  <TableCell>{item.is_finalized ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'stall_search':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Farmer Name</TableHead>
                <TableHead>Stall Name</TableHead>
                <TableHead>Contact Phone</TableHead>
                <TableHead>Interested</TableHead>
                <TableHead>Joining Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskDetails.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.farmer_name}</TableCell>
                  <TableCell>{item.stall_name}</TableCell>
                  <TableCell>{item.contact_phone}</TableCell>
                  <TableCell>{item.is_interested ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                  <TableCell>{item.joining_date ? format(new Date(item.joining_date), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'money_recovery':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Farmer Name</TableHead>
                <TableHead>Stall Name</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Received Amount</TableHead>
                <TableHead>Pending Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskDetails.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.farmer_name}</TableCell>
                  <TableCell>{item.stall_name}</TableCell>
                  <TableCell>{item.item_name}</TableCell>
                  <TableCell>₹{Number(item.received_amount || 0).toFixed(2)}</TableCell>
                  <TableCell>₹{Number(item.pending_amount || 0).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'assets_usage':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Asset Name</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Return Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskDetails.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.employee_name}</TableCell>
                  <TableCell>{item.market_name || 'N/A'}</TableCell>
                  <TableCell>{item.asset_name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.return_date ? format(new Date(item.return_date), 'dd/MM/yyyy') : 'Not returned'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'feedbacks':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead>Video</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskDetails.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.customer_name || 'N/A'}</TableCell>
                  <TableCell>{item.market_name || 'N/A'}</TableCell>
                  <TableCell>
                    {item.rating ? (
                      <Badge variant={item.rating >= 4 ? 'default' : item.rating >= 3 ? 'secondary' : 'destructive'}>
                        {item.rating}/5
                      </Badge>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>{item.feedback_text || 'No feedback'}</TableCell>
                  <TableCell>
                    {item.video_url ? (
                      <a 
                        href={item.video_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline"
                      >
                        View Video
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'inspections':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Market</TableHead>
                <TableHead>Update Notes</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskDetails.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.market_name || 'N/A'}</TableCell>
                  <TableCell>{item.update_notes}</TableCell>
                  <TableCell>{format(new Date(item.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'punch_out':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GPS Location</TableHead>
                <TableHead>Punched At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskDetails.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <a
                      href={`https://maps.google.com/?q=${item.gps_lat},${item.gps_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {item.gps_lat}, {item.gps_lng}
                    </a>
                  </TableCell>
                  <TableCell>{format(new Date(item.punched_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      default:
        return <p className="text-center py-8 text-muted-foreground">No details available for this task type.</p>;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/manager-dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">My Sessions</h1>
              <p className="text-sm text-muted-foreground">View your session history and status</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="market">Market</Label>
                <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                  <SelectTrigger id="market">
                    <SelectValue placeholder="All markets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Markets</SelectItem>
                    {markets.map((market) => (
                      <SelectItem key={market.id} value={market.id}>
                        {market.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(startDate || endDate || selectedMarket !== 'all') && (
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredSessions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  {sessions.length === 0 ? 'No sessions found' : 'No sessions match the selected filters'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredSessions.map((session) => (
              <Card key={session.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {format(new Date(session.session_date), 'dd MMMM yyyy')}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {DAY_NAMES[session.day_of_week]}
                      </p>
                    </div>
                    {getStatusBadge(session.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Tasks Completed:</span>
                      <span className="font-semibold">{getTotalTasks(session.task_counts)}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        onClick={() => handleTaskClick(session.id, 'employee_allocations')}
                        className={`flex justify-between p-2 rounded transition-colors ${
                          session.task_counts.employee_allocations > 0
                            ? 'bg-muted hover:bg-muted/80 cursor-pointer'
                            : 'bg-muted/50 cursor-not-allowed opacity-50'
                        }`}
                        disabled={session.task_counts.employee_allocations === 0}
                      >
                        <span>Employee Allocations:</span>
                        <span className="font-medium flex items-center gap-1">
                          {session.task_counts.employee_allocations}
                          {session.task_counts.employee_allocations > 0 && <Eye className="h-3 w-3" />}
                        </span>
                      </button>
                      <button
                        onClick={() => handleTaskClick(session.id, 'punch_in')}
                        className={`flex justify-between p-2 rounded transition-colors ${
                          session.task_counts.punch_in > 0
                            ? 'bg-muted hover:bg-muted/80 cursor-pointer'
                            : 'bg-muted/50 cursor-not-allowed opacity-50'
                        }`}
                        disabled={session.task_counts.punch_in === 0}
                      >
                        <span>Punch-In:</span>
                        <span className="font-medium flex items-center gap-1">
                          {session.task_counts.punch_in}
                          {session.task_counts.punch_in > 0 && <Eye className="h-3 w-3" />}
                        </span>
                      </button>
                      <button
                        onClick={() => handleTaskClick(session.id, 'land_search')}
                        className={`flex justify-between p-2 rounded transition-colors ${
                          session.task_counts.land_search > 0
                            ? 'bg-muted hover:bg-muted/80 cursor-pointer'
                            : 'bg-muted/50 cursor-not-allowed opacity-50'
                        }`}
                        disabled={session.task_counts.land_search === 0}
                      >
                        <span>Land Search:</span>
                        <span className="font-medium flex items-center gap-1">
                          {session.task_counts.land_search}
                          {session.task_counts.land_search > 0 && <Eye className="h-3 w-3" />}
                        </span>
                      </button>
                      <button
                        onClick={() => handleTaskClick(session.id, 'stall_search')}
                        className={`flex justify-between p-2 rounded transition-colors ${
                          session.task_counts.stall_search > 0
                            ? 'bg-muted hover:bg-muted/80 cursor-pointer'
                            : 'bg-muted/50 cursor-not-allowed opacity-50'
                        }`}
                        disabled={session.task_counts.stall_search === 0}
                      >
                        <span>Stall Search:</span>
                        <span className="font-medium flex items-center gap-1">
                          {session.task_counts.stall_search}
                          {session.task_counts.stall_search > 0 && <Eye className="h-3 w-3" />}
                        </span>
                      </button>
                      <button
                        onClick={() => handleTaskClick(session.id, 'money_recovery')}
                        className={`flex justify-between p-2 rounded transition-colors ${
                          session.task_counts.money_recovery > 0
                            ? 'bg-muted hover:bg-muted/80 cursor-pointer'
                            : 'bg-muted/50 cursor-not-allowed opacity-50'
                        }`}
                        disabled={session.task_counts.money_recovery === 0}
                      >
                        <span>Money Recovery:</span>
                        <span className="font-medium flex items-center gap-1">
                          {session.task_counts.money_recovery}
                          {session.task_counts.money_recovery > 0 && <Eye className="h-3 w-3" />}
                        </span>
                      </button>
                      <button
                        onClick={() => handleTaskClick(session.id, 'assets_usage')}
                        className={`flex justify-between p-2 rounded transition-colors ${
                          session.task_counts.assets_usage > 0
                            ? 'bg-muted hover:bg-muted/80 cursor-pointer'
                            : 'bg-muted/50 cursor-not-allowed opacity-50'
                        }`}
                        disabled={session.task_counts.assets_usage === 0}
                      >
                        <span>Assets Usage:</span>
                        <span className="font-medium flex items-center gap-1">
                          {session.task_counts.assets_usage}
                          {session.task_counts.assets_usage > 0 && <Eye className="h-3 w-3" />}
                        </span>
                      </button>
                      <button
                        onClick={() => handleTaskClick(session.id, 'feedbacks')}
                        className={`flex justify-between p-2 rounded transition-colors ${
                          session.task_counts.feedbacks > 0
                            ? 'bg-muted hover:bg-muted/80 cursor-pointer'
                            : 'bg-muted/50 cursor-not-allowed opacity-50'
                        }`}
                        disabled={session.task_counts.feedbacks === 0}
                      >
                        <span>Feedbacks:</span>
                        <span className="font-medium flex items-center gap-1">
                          {session.task_counts.feedbacks}
                          {session.task_counts.feedbacks > 0 && <Eye className="h-3 w-3" />}
                        </span>
                      </button>
                      <button
                        onClick={() => handleTaskClick(session.id, 'inspections')}
                        className={`flex justify-between p-2 rounded transition-colors ${
                          session.task_counts.inspections > 0
                            ? 'bg-muted hover:bg-muted/80 cursor-pointer'
                            : 'bg-muted/50 cursor-not-allowed opacity-50'
                        }`}
                        disabled={session.task_counts.inspections === 0}
                      >
                        <span>Inspections:</span>
                        <span className="font-medium flex items-center gap-1">
                          {session.task_counts.inspections}
                          {session.task_counts.inspections > 0 && <Eye className="h-3 w-3" />}
                        </span>
                      </button>
                      <button
                        onClick={() => handleTaskClick(session.id, 'punch_out')}
                        className={`flex justify-between p-2 rounded transition-colors ${
                          session.task_counts.punch_out > 0
                            ? 'bg-muted hover:bg-muted/80 cursor-pointer'
                            : 'bg-muted/50 cursor-not-allowed opacity-50'
                        }`}
                        disabled={session.task_counts.punch_out === 0}
                      >
                        <span>Punch-Out:</span>
                        <span className="font-medium flex items-center gap-1">
                          {session.task_counts.punch_out}
                          {session.task_counts.punch_out > 0 && <Eye className="h-3 w-3" />}
                        </span>
                      </button>
                    </div>

                    <div className="pt-2 border-t text-xs text-muted-foreground">
                      Created: {format(new Date(session.created_at), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Task Details Dialog */}
      <Dialog open={selectedTaskType !== null} onOpenChange={(open) => !open && setSelectedTaskType(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTaskType && taskTypeMap[selectedTaskType] ? taskTypeMap[selectedTaskType].label : 'Task Details'}
            </DialogTitle>
            <DialogDescription>
              Detailed information for {selectedTaskType && taskTypeMap[selectedTaskType] ? taskTypeMap[selectedTaskType].label.toLowerCase() : 'this task'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {renderTaskDetails()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
