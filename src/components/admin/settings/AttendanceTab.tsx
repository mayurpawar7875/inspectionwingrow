import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { useEffect } from 'react';

const formSchema = z.object({
  gps_accuracy_meters: z.number().min(10).max(500),
  geofence_radius_meters: z.number().min(50).max(1000),
  face_recognition_required: z.boolean(),
  grace_minutes: z.number().min(0).max(60),
});

interface AttendanceTabProps {
  onChangeMade: () => void;
}

export function AttendanceTab({ onChangeMade }: AttendanceTabProps) {
  const { settings, updateSettings, loading } = useSettings();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gps_accuracy_meters: 50,
      geofence_radius_meters: 100,
      face_recognition_required: false,
      grace_minutes: 15,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        gps_accuracy_meters: settings.gps_accuracy_meters,
        geofence_radius_meters: settings.geofence_radius_meters,
        face_recognition_required: settings.face_recognition_required,
        grace_minutes: settings.grace_minutes,
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
        <CardTitle>Attendance Settings</CardTitle>
        <CardDescription>Configure GPS, geofencing, and attendance policies</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="gps_accuracy_meters"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GPS Accuracy (meters)</FormLabel>
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
                  <FormDescription>Minimum required GPS accuracy for attendance</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="geofence_radius_meters"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geofence Radius (meters)</FormLabel>
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
                  <FormDescription>Radius around market location for valid punch-in</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="grace_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grace Period (minutes)</FormLabel>
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
                  <FormDescription>Late arrival grace period before marking as late</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="face_recognition_required"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Face Recognition Required</FormLabel>
                    <FormDescription>
                      Require face verification for attendance punch-in
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        onChangeMade();
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit">Save Attendance Settings</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
