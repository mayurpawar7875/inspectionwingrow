-- Create table for organiser feedback and difficulties
CREATE TABLE public.organiser_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID,
  market_id UUID NOT NULL,
  market_date DATE NOT NULL DEFAULT CURRENT_DATE,
  difficulties TEXT,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organiser_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own organiser feedback"
  ON public.organiser_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own organiser feedback"
  ON public.organiser_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own organiser feedback"
  ON public.organiser_feedback
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own organiser feedback"
  ON public.organiser_feedback
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all organiser feedback"
  ON public.organiser_feedback
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Add trigger for updated_at
CREATE TRIGGER update_organiser_feedback_updated_at
  BEFORE UPDATE ON public.organiser_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index for performance
CREATE INDEX idx_organiser_feedback_user_date ON public.organiser_feedback(user_id, market_date);
CREATE INDEX idx_organiser_feedback_market_date ON public.organiser_feedback(market_id, market_date);