-- Create BDO sessions table
CREATE TABLE IF NOT EXISTS public.bdo_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create BDO punch-in table
CREATE TABLE IF NOT EXISTS public.bdo_punchin (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.bdo_sessions(id) ON DELETE CASCADE,
  selfie_url TEXT NOT NULL,
  gps_lat NUMERIC NOT NULL,
  gps_lng NUMERIC NOT NULL,
  punched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create BDO punch-out table
CREATE TABLE IF NOT EXISTS public.bdo_punchout (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.bdo_sessions(id) ON DELETE CASCADE,
  gps_lat NUMERIC NOT NULL,
  gps_lng NUMERIC NOT NULL,
  punched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bdo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bdo_punchin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bdo_punchout ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bdo_sessions
CREATE POLICY "BDOs can create their sessions"
ON public.bdo_sessions
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = user_id 
  AND has_role(auth.uid(), 'bdo'::user_role)
);

CREATE POLICY "BDOs can view their sessions"
ON public.bdo_sessions
FOR SELECT
TO public
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "BDOs can update their sessions"
ON public.bdo_sessions
FOR UPDATE
TO public
USING (auth.uid() = user_id);

-- RLS Policies for bdo_punchin
CREATE POLICY "BDOs can manage punch-in"
ON public.bdo_punchin
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.bdo_sessions
    WHERE bdo_sessions.id = bdo_punchin.session_id
    AND (bdo_sessions.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
  )
);

-- RLS Policies for bdo_punchout
CREATE POLICY "BDOs can manage punch-out"
ON public.bdo_punchout
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.bdo_sessions
    WHERE bdo_sessions.id = bdo_punchout.session_id
    AND (bdo_sessions.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role))
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bdo_sessions_user_date ON public.bdo_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_bdo_punchin_session ON public.bdo_punchin(session_id);
CREATE INDEX IF NOT EXISTS idx_bdo_punchout_session ON public.bdo_punchout(session_id);