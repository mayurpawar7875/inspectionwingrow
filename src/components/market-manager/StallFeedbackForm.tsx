import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { MessageSquare, Video, X, Circle } from 'lucide-react';
import { TaskHistoryView } from './TaskHistoryView';

interface StallFeedbackFormProps {
  sessionId: string;
  onComplete: () => void;
}

export function StallFeedbackForm({ sessionId, onComplete }: StallFeedbackFormProps) {
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [marketId, setMarketId] = useState('');
  const [markets, setMarkets] = useState<any[]>([]);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState([3]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMarkets();
  }, []);

  const fetchMarkets = async () => {
    const { data } = await supabase
      .from('markets')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setMarkets(data || []);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const file = new File([blob], `feedback_${Date.now()}.webm`, { type: 'video/webm' });
        setVideoFile(file);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast.error('Failed to access camera');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const clearVideo = () => {
    setVideoFile(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !marketId || !feedback.trim()) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);

    let videoUrl = null;
    if (videoFile) {
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${sessionId}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('employee-media')
        .upload(`feedbacks/${fileName}`, videoFile);

      if (uploadError) {
        toast.error('Failed to upload video');
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('employee-media')
        .getPublicUrl(`feedbacks/${fileName}`);
      
      videoUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from('bms_stall_feedbacks').insert({
      session_id: sessionId,
      customer_name: customerName.trim(),
      market_id: marketId,
      feedback_text: feedback.trim(),
      rating: rating[0],
      video_url: videoUrl,
    });

    setLoading(false);
    if (error) {
      toast.error('Failed to save feedback');
      return;
    }

    toast.success('Feedback saved successfully');
    setCustomerName('');
    setMarketId('');
    setFeedback('');
    setRating([3]);
    setVideoFile(null);
    onComplete();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            BMS Stall Feedbacks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Customer Name</Label>
              <Input
                id="customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="market">Market Name</Label>
              <Select value={marketId} onValueChange={setMarketId}>
                <SelectTrigger id="market">
                  <SelectValue placeholder="Select market" />
                </SelectTrigger>
                <SelectContent>
                  {markets.map((market) => (
                    <SelectItem key={market.id} value={market.id}>
                      {market.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rating">Rating: {rating[0]}/5</Label>
              <Slider
                id="rating"
                min={1}
                max={5}
                step={1}
                value={rating}
                onValueChange={setRating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Enter your feedback"
                rows={4}
              />
            </div>

            <div className="space-y-3">
              <Label>Video Feedback (Optional)</Label>
              
              {!videoFile ? (
                <div className="space-y-2">
                  {!isRecording ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={startRecording}
                        className="h-20 flex flex-col gap-2"
                      >
                        <Circle className="h-6 w-6 text-red-500" />
                        <span className="text-xs">Record Video</span>
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => videoInputRef.current?.click()}
                        className="h-20 flex flex-col gap-2"
                      >
                        <Video className="h-6 w-6" />
                        <span className="text-xs">Upload Video</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 p-4 border rounded-lg bg-red-50">
                      <Circle className="h-8 w-8 text-red-500 animate-pulse" fill="currentColor" />
                      <span className="text-sm font-medium">Recording...</span>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={stopRecording}
                      >
                        Stop Recording
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="h-5 w-5" />
                      <span className="text-sm">{videoFile.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={clearVideo}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={(e) => e.target.files?.[0] && setVideoFile(e.target.files[0])}
                className="hidden"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Saving...' : 'Save Feedback'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-semibold mb-3">History</h3>
        <TaskHistoryView
          sessionId={sessionId}
          taskType="bms_stall_feedbacks"
          columns={[
            { key: 'customer_name', label: 'Customer' },
            { key: 'market_id', label: 'Market', render: (_, row) => markets.find(m => m.id === row.market_id)?.name || '-' },
            { key: 'rating', label: 'Rating', render: (val) => `${val}/5` },
            { key: 'feedback_text', label: 'Feedback' },
            { key: 'video_url', label: 'Video', render: (val) => val ? '📹' : '-' },
          ]}
        />
      </div>
    </div>
  );
}
