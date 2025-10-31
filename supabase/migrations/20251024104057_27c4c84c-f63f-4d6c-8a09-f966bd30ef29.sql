-- Add INSERT policy to profiles table to prevent unauthorized profile creation
-- This ensures users can only create profiles for themselves (though in practice, 
-- profiles are created automatically by the handle_new_user() trigger)
CREATE POLICY "Users can only insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);