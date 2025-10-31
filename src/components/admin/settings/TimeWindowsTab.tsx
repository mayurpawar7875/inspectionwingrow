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
  attendance_start: z.string(),
  attendance_end: z.string(),
  outside_rates_start: z.string(),
  outside_rates_end: z.string(),
  market_video_start: z.string(),
  market_video_end: z.string(),
  eod_due_time: z.string(),
});

interface TimeWindowsTabProps {
  onChangeMade: () => void;
}

export function TimeWindowsTab({ onChangeMade }: TimeWindowsTabProps) {
  const { settings, updateSettings, loading } = useSettings();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      attendance_start: '11:00:00',
      attendance_end: '11:30:00',
      outside_rates_start: '14:00:00',
      outside_rates_end: '14:15:00',
      market_video_start: '16:00:00',
      market_video_end: '16:15:00',
      eod_due_time: '23:30:00',
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        attendance_start: settings.attendance_start,
        attendance_end: settings.attendance_end,
        outside_rates_start: settings.outside_rates_start,
        outside_rates_end: settings.outside_rates_end,
        market_video_start: settings.market_video_start,
        market_video_end: settings.market_video_end,
        eod_due_time: settings.eod_due_time,
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
        <CardTitle>Time Windows</CardTitle>
        <CardDescription>Configure time windows for various activities</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="attendance_start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attendance Window Start</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} onChange={(e) => { field.onChange(e); onChangeMade(); }} />
                    </FormControl>
                    <FormDescription>Default: 11:00 AM</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="attendance_end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attendance Window End</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} onChange={(e) => { field.onChange(e); onChangeMade(); }} />
                    </FormControl>
                    <FormDescription>Default: 11:30 AM</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="outside_rates_start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outside Rates Start</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} onChange={(e) => { field.onChange(e); onChangeMade(); }} />
                    </FormControl>
                    <FormDescription>Default: 2:00 PM</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="outside_rates_end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outside Rates End</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} onChange={(e) => { field.onChange(e); onChangeMade(); }} />
                    </FormControl>
                    <FormDescription>Default: 2:15 PM</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="market_video_start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Market Video Start</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} onChange={(e) => { field.onChange(e); onChangeMade(); }} />
                    </FormControl>
                    <FormDescription>Default: 4:00 PM</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="market_video_end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Market Video End</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} onChange={(e) => { field.onChange(e); onChangeMade(); }} />
                    </FormControl>
                    <FormDescription>Default: 4:15 PM</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="eod_due_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End of Day Report Due Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} onChange={(e) => { field.onChange(e); onChangeMade(); }} />
                  </FormControl>
                  <FormDescription>Default: 11:30 PM</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit">Save Time Windows</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
