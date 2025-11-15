-- Allow BDOs to update document fields on their own approved submissions
CREATE POLICY "BDOs can update documents on their approved submissions"
ON bdo_market_submissions
FOR UPDATE
TO public
USING (
  auth.uid() = submitted_by 
  AND has_role(auth.uid(), 'bdo'::user_role)
  AND status = 'approved'
)
WITH CHECK (
  auth.uid() = submitted_by 
  AND has_role(auth.uid(), 'bdo'::user_role)
  AND status = 'approved'
);

COMMENT ON POLICY "BDOs can update documents on their approved submissions" ON bdo_market_submissions IS 
'Allows BDOs to update service_agreement_url, stalls_accommodation_count, documents_status, and documents_uploaded_at on their approved market submissions';