import { supabase } from '@/integrations/supabase/client';

/**
 * Gets a signed URL for a private storage file
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 * @param expiresIn - URL expiration time in seconds (default 1 hour)
 * @returns signed URL or null if error
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data?.signedUrl || null;
  } catch (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }
}

/**
 * Gets multiple signed URLs at once
 * @param bucket - Storage bucket name
 * @param paths - Array of file paths
 * @param expiresIn - URL expiration time in seconds
 * @returns array of signed URLs in same order as paths
 */
export async function getSignedUrls(
  bucket: string,
  paths: string[],
  expiresIn: number = 3600
): Promise<(string | null)[]> {
  const promises = paths.map(path => getSignedUrl(bucket, path, expiresIn));
  return Promise.all(promises);
}

/**
 * Downloads a file from storage via signed URL
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 */
export async function downloadFile(bucket: string, path: string): Promise<void> {
  const url = await getSignedUrl(bucket, path);
  if (url) {
    window.open(url, '_blank');
  }
}
