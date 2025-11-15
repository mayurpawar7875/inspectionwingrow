-- Add UPDATE policy for users to update their own stall confirmations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'stall_confirmations' 
    AND policyname = 'Users can update their own confirmations'
  ) THEN
    CREATE POLICY "Users can update their own confirmations"
    ON public.stall_confirmations
    FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);
  END IF;
END $$;

-- Add DELETE policy for users to delete their own stall confirmations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'stall_confirmations' 
    AND policyname = 'Users can delete their own confirmations'
  ) THEN
    CREATE POLICY "Users can delete their own confirmations"
    ON public.stall_confirmations
    FOR DELETE
    USING (auth.uid() = created_by);
  END IF;
END $$;