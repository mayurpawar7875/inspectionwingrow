import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AppSettings {
  id: string;
  org_name: string;
  org_email: string | null;
  primary_color: string;
  secondary_color: string;
  attendance_start: string;
  attendance_end: string;
  outside_rates_start: string;
  outside_rates_end: string;
  market_video_start: string;
  market_video_end: string;
  eod_due_time: string;
  gps_accuracy_meters: number;
  geofence_radius_meters: number;
  face_recognition_required: boolean;
  grace_minutes: number;
  retention_days: number;
  collection_sheet_url?: string | null;
}

interface SettingsContextType {
  settings: AppSettings | null;
  loading: boolean;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  refetch: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<AppSettings>) => {
    if (!settings) return;

    try {
      const { data, error } = await supabase
        .from('app_settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;

      // Log audit trail
      await supabase.from('settings_audit').insert({
        changed_by: (await supabase.auth.getUser()).data.user?.id,
        table_name: 'app_settings',
        record_id: settings.id,
        changes: updates,
      });

      setSettings(data);
      toast({
        title: 'Success',
        description: 'Settings updated successfully',
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        updateSettings,
        refetch: fetchSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
