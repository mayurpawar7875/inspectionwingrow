import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';

interface NotificationTemplate {
  id: string;
  key: string;
  title: string;
  body: string;
  enabled: boolean;
}

interface NotificationsTabProps {
  onChangeMade: () => void;
}

export function NotificationsTab({ onChangeMade }: NotificationsTabProps) {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [sendTitle, setSendTitle] = useState('');
  const [sendBody, setSendBody] = useState('');
  const [sending, setSending] = useState(false);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('key');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const updateTemplate = async (id: string, updates: Partial<NotificationTemplate>) => {
    try {
      const { error } = await supabase
        .from('notification_templates')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await fetchTemplates();
      onChangeMade();
      toast({
        title: 'Success',
        description: 'Template updated successfully',
      });
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive',
      });
    }
  };

  const sendTestNotification = (template: NotificationTemplate) => {
    toast({
      title: template.title,
      description: template.body,
    });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Send Notification</CardTitle>
          <CardDescription>Broadcast a message to all employees</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={sendTitle} onChange={(e) => setSendTitle(e.target.value)} placeholder="Reminder to update tasks" />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea value={sendBody} onChange={(e) => setSendBody(e.target.value)} rows={3} placeholder="Please update your stall confirmations and media uploads by 5 PM." />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={async () => {
                if (!sendTitle.trim() || !sendBody.trim()) {
                  toast({ title: 'Missing fields', description: 'Title and message are required', variant: 'destructive' });
                  return;
                }
                setSending(true);
                try {
                  const { error } = await supabase
                    .from('notifications')
                    .insert({ title: sendTitle.trim(), body: sendBody.trim(), target_user_id: null });
                  if (error) throw error;
                  setSendTitle('');
                  setSendBody('');
                  toast({ title: 'Sent', description: 'Notification sent to all employees' });
                } catch (err) {
                  console.error('Error sending notification:', err);
                  toast({ title: 'Error', description: 'Failed to send notification', variant: 'destructive' });
                } finally {
                  setSending(false);
                }
              }}
              disabled={sending}
            >
              {sending ? 'Sending...' : 'Send to All'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {templates.map((template) => (
        <Card key={template.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg capitalize">
                  {template.key.replace(/_/g, ' ')}
                </CardTitle>
                <CardDescription>Configure notification template</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`enabled-${template.id}`}>Enabled</Label>
                  <Switch
                    id={`enabled-${template.id}`}
                    checked={template.enabled}
                    onCheckedChange={(checked) => 
                      updateTemplate(template.id, { enabled: checked })
                    }
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sendTestNotification(template)}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Test
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={template.title}
                onChange={(e) => updateTemplate(template.id, { title: e.target.value })}
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={template.body}
                onChange={(e) => updateTemplate(template.id, { body: e.target.value })}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {'{{variable}}'} for dynamic values
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
