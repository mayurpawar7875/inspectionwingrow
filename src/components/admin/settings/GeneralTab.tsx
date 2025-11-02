import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { useEffect } from 'react';

const formSchema = z.object({
  org_name: z.string().min(1, 'Organization name is required'),
  org_email: z.string().email('Invalid email address').optional().or(z.literal('')),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  // Allow template tokens like {YYYY}, {YY}, {MM}, {MMM}
  collection_sheet_url: z.string().optional().or(z.literal('')),
});

interface GeneralTabProps {
  onChangeMade: () => void;
}

export function GeneralTab({ onChangeMade }: GeneralTabProps) {
  const { settings, updateSettings, loading } = useSettings();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      org_name: '',
      org_email: '',
      primary_color: '#3B82F6',
      secondary_color: '#10B981',
      collection_sheet_url: '',
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        org_name: settings.org_name,
        org_email: settings.org_email || '',
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        collection_sheet_url: settings.collection_sheet_url || '',
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
        <CardTitle>General Settings</CardTitle>
        <CardDescription>Manage your organization's basic information and branding</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="org_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input {...field} onChange={(e) => { field.onChange(e); onChangeMade(); }} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="org_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} onChange={(e) => { field.onChange(e); onChangeMade(); }} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="collection_sheet_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Market Collections Google Sheet URL</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="https://docs.google.com/spreadsheets/d/... (supports {YYYY}, {YY}, {MM}, {MMM})" 
                      {...field} 
                      onChange={(e) => { field.onChange(e); onChangeMade(); }} 
                    />
                  </FormControl>
                  {field.value && (
                    <div className="text-xs text-muted-foreground pt-1">
                      Preview (this month):{' '}
                      <span className="underline break-all">
                        {(() => {
                          const now = new Date();
                          const yyyy = String(now.getFullYear());
                          const yy = yyyy.slice(-2);
                          const mm = String(now.getMonth() + 1).padStart(2, '0');
                          const mmm = now.toLocaleString(undefined, { month: 'short' });
                          return field.value
                            .replace(/{YYYY}/g, yyyy)
                            .replace(/{YY}/g, yy)
                            .replace(/{MM}/g, mm)
                            .replace(/{MMM}/g, mmm);
                        })()}
                      </span>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="primary_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Color</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input type="color" {...field} className="w-20" onChange={(e) => { field.onChange(e); onChangeMade(); }} />
                        <Input {...field} onChange={(e) => { field.onChange(e); onChangeMade(); }} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secondary_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary Color</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input type="color" {...field} className="w-20" onChange={(e) => { field.onChange(e); onChangeMade(); }} />
                        <Input {...field} onChange={(e) => { field.onChange(e); onChangeMade(); }} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit">Save General Settings</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
