import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { useEffect } from 'react';

const formSchema = z.object({
  retention_days: z.number().min(30).max(365),
});

interface DataTabProps {
  onChangeMade: () => void;
}

export function DataTab({ onChangeMade }: DataTabProps) {
  const { settings, updateSettings, loading } = useSettings();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      retention_days: 90,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        retention_days: settings.retention_days,
      });
    }
  }, [settings, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await updateSettings(values);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Management</CardTitle>
        <CardDescription>Configure data retention and backup policies</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="retention_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Retention Period (days)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={(e) => { 
                        field.onChange(parseInt(e.target.value)); 
                        onChangeMade(); 
                      }} 
                    />
                  </FormControl>
                  <FormDescription>
                    How long to keep session data before archiving (30-365 days)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 space-y-2">
              <Button type="button" variant="outline" className="w-full">
                Export All Data
              </Button>
              <Button type="button" variant="outline" className="w-full">
                Schedule Backup
              </Button>
            </div>

            <Button type="submit">Save Data Settings</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
