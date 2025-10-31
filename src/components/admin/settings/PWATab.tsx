import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Download } from 'lucide-react';

interface PWATabProps {
  onChangeMade: () => void;
}

export function PWATab({ onChangeMade }: PWATabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Progressive Web App</CardTitle>
        <CardDescription>Configure PWA settings and installation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5" />
            <div>
              <p className="font-medium">PWA Status</p>
              <p className="text-sm text-muted-foreground">App is installable</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-green-50">Active</Badge>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">App Information</h4>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">Wingrow Reporting</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Version</dt>
              <dd className="font-medium">1.0.0</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last Updated</dt>
              <dd className="font-medium">2 hours ago</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cache Status</dt>
              <dd className="font-medium">Active</dd>
            </div>
          </dl>
        </div>

        <div className="pt-4 space-y-2">
          <Button variant="outline" className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Generate Install Instructions
          </Button>
          <Button variant="outline" className="w-full">
            Clear App Cache
          </Button>
          <Button variant="outline" className="w-full">
            Update Service Worker
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
