-- Create storage policies for the story-files bucket to allow edge functions to access files

-- Policy to allow service role to download files from story-files bucket
CREATE POLICY "Allow service role to download story files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'story-files');

-- Policy to allow authenticated users to upload to story-files bucket
CREATE POLICY "Allow authenticated users to upload story files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'story-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy to allow authenticated users to view their own story files
CREATE POLICY "Allow users to view their own story files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'story-files' AND auth.uid()::text = (storage.foldername(name))[1]);