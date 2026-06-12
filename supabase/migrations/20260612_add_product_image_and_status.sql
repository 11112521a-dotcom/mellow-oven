-- 1. Add missing columns to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Create the Storage Bucket for Product Images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage Access Policies (assuming RLS is enabled on storage.objects)

-- Allow public read access to product images
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'product-images' );

-- Allow authenticated users to insert new images
CREATE POLICY "Auth Insert" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'product-images' );

-- Allow authenticated users to update their images
CREATE POLICY "Auth Update" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'product-images' );

-- Allow authenticated users to delete images
CREATE POLICY "Auth Delete" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'product-images' );
