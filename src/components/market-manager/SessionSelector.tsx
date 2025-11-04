import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';

interface SessionSelectorProps {
  onSessionCreate: (sessionDate: string, dayOfWeek: number) => void;
}

export function SessionSelector({ onSessionCreate }: SessionSelectorProps) {
  const getISTDateString = (date: Date) => {
    const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [selectedDate, setSelectedDate] = useState(getISTDateString(new Date()));

  const handleStart = () => {
    const date = new Date(selectedDate);
    const dayOfWeek = date.getDay();
    onSessionCreate(selectedDate, dayOfWeek);
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Start Market Manager Session
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="session-date">Select Date</Label>
          <Input
            id="session-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        <Button onClick={handleStart} className="w-full">
          Start Session
        </Button>
      </CardContent>
    </Card>
  );
}
