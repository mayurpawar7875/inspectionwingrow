import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface PreviewDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  data: Record<string, any>;
  loading?: boolean;
}

export function PreviewDialog({ open, onClose, onConfirm, title, data, loading }: PreviewDialogProps) {
  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined || value === '') return '-';
    
    if (key.includes('date') && value) {
      return format(new Date(value), 'dd/MM/yyyy');
    }
    
    if (key.includes('url') && value) {
      return '📹 Video attached';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (typeof value === 'number') {
      if (key.includes('amount')) return `₹${value}`;
      return value.toString();
    }
    
    return value.toString();
  };

  const formatLabel = (key: string): string => {
    return key
      .split(/(?=[A-Z])|_/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Preview {title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex justify-between items-start gap-4 pb-2 border-b">
              <span className="text-sm font-medium text-muted-foreground">
                {formatLabel(key)}:
              </span>
              <span className="text-sm text-right flex-1">
                {formatValue(key, value)}
              </span>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Edit
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? 'Submitting...' : 'Confirm & Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
