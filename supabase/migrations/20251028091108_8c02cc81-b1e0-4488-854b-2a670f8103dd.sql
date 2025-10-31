-- Create app_settings table for organization configuration
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name text NOT NULL DEFAULT 'Wingrow',
  org_email text,
  primary_color text NOT NULL DEFAULT '#3B82F6',
  secondary_color text NOT NULL DEFAULT '#10B981',
  
  -- Time windows (stored as time without time zone)
  attendance_start time NOT NULL DEFAULT '11:00:00',
  attendance_end time NOT NULL DEFAULT '11:30:00',
  outside_rates_start time NOT NULL DEFAULT '14:00:00',
  outside_rates_end time NOT NULL DEFAULT '14:15:00',
  market_video_start time NOT NULL DEFAULT '16:00:00',
  market_video_end time NOT NULL DEFAULT '16:15:00',
  eod_due_time time NOT NULL DEFAULT '23:30:00',
  
  -- GPS and attendance settings
  gps_accuracy_meters integer NOT NULL DEFAULT 50,
  geofence_radius_meters integer NOT NULL DEFAULT 100,
  face_recognition_required boolean NOT NULL DEFAULT false,
  grace_minutes integer NOT NULL DEFAULT 15,
  
  -- Data retention
  retention_days integer NOT NULL DEFAULT 90,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "Admins can manage app settings"
ON public.app_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- Everyone can view settings (for app configuration)
CREATE POLICY "Authenticated users can view app settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);

-- Insert default settings
INSERT INTO public.app_settings (org_name, org_email) 
VALUES ('Wingrow', 'admin@wingrow.com');

-- Create notification_templates table
CREATE TABLE public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  channel text NOT NULL DEFAULT 'push',
  title text NOT NULL,
  body text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage notification templates
CREATE POLICY "Admins can manage notification templates"
ON public.notification_templates
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- Everyone can view templates
CREATE POLICY "Authenticated users can view notification templates"
ON public.notification_templates
FOR SELECT
TO authenticated
USING (true);

-- Insert default notification templates
INSERT INTO public.notification_templates (key, channel, title, body, enabled) VALUES
('late_upload', 'push', 'Late Upload Reminder', 'Please upload your media within the allowed time window.', true),
('missing_eod', 'push', 'Missing EOD Report', 'Your end-of-day report is pending. Please complete it before {{eod_time}}.', true);

-- Create settings_audit table for tracking changes
CREATE TABLE public.settings_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  table_name text NOT NULL,
  record_id uuid,
  changes jsonb NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settings_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view settings audit"
ON public.settings_audit
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Update markets table to add geolocation if not exists
ALTER TABLE public.markets 
ADD COLUMN IF NOT EXISTS lat numeric,
ADD COLUMN IF NOT EXISTS lng numeric,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS day_of_week integer;