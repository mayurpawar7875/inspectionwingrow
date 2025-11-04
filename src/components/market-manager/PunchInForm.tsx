import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Camera, MapPin, X } from 'lucide-react';

interface PunchInFormProps {
  sessionId: string;
  onComplete: () => void;
}

export function PunchInForm({ sessionId, onComplete }: PunchInFormProps) {
  const [loading, setLoading] = useState(false);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelfieFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearPhoto = () => {
    setSelfieFile(null);
    setPreviewUrl(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handlePunchIn = async () => {
    if (!selfieFile) {
      toast.error('Please capture selfie');
      return;
    }

    setLoading(true);

    // Get GPS location
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Upload selfie
        const fileExt = selfieFile.name.split('.').pop();
        const fileName = `${sessionId}_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('employee-media')
          .upload(`punchin/${fileName}`, selfieFile);

        if (uploadError) {
          toast.error('Failed to upload selfie');
          setLoading(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('employee-media')
          .getPublicUrl(`punchin/${fileName}`);

        // Save punch-in record
        const { error } = await supabase.from('market_manager_punchin').insert({
          session_id: sessionId,
          selfie_url: urlData.publicUrl,
          gps_lat: latitude,
          gps_lng: longitude,
        });

        setLoading(false);
        if (error) {
          toast.error('Failed to save punch-in');
          return;
        }

        toast.success('Punched in successfully');
        onComplete();
      },
      (error) => {
        setLoading(false);
        toast.error('Failed to get GPS location');
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Punch-In
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <label className="block text-sm font-medium">Selfie</label>
          
          {!selfieFile ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              className="w-full h-32 flex flex-col gap-2"
            >
              <Camera className="h-8 w-8" />
              <span>Take Photo</span>
            </Button>
          ) : (
            <div className="relative">
              <img 
                src={previewUrl || ''} 
                alt="Selfie preview" 
                className="w-full h-48 object-cover rounded-lg border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={clearPhoto}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          GPS location will be captured automatically
        </div>

        <Button onClick={handlePunchIn} disabled={loading || !selfieFile} className="w-full">
          {loading ? 'Processing...' : 'Punch In'}
        </Button>
      </CardContent>
    </Card>
  );
}
