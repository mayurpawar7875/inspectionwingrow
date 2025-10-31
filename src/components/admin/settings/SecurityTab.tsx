import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle } from 'lucide-react';

interface SecurityTabProps {
  onChangeMade: () => void;
}

export function SecurityTab({ onChangeMade }: SecurityTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Security Overview</CardTitle>
          <CardDescription>Monitor and manage security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">Protect admin accounts</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-50">Enabled</Badge>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">SSL Certificate</p>
                <p className="text-sm text-muted-foreground">Secure data transmission</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-50">Active</Badge>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="font-medium">Session Timeout</p>
                <p className="text-sm text-muted-foreground">Auto-logout after inactivity</p>
              </div>
            </div>
            <Badge variant="outline">30 minutes</Badge>
          </div>

          <div className="pt-4">
            <Button variant="outline" className="w-full">
              View Security Logs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
