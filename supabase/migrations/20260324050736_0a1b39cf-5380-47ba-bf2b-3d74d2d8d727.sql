-- Create PDFs table
CREATE TABLE public.pdfs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  parsed_text TEXT,
  summary TEXT,
  notes JSONB,
  questions JSONB,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('uploading', 'processing', 'completed', 'error')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pdfs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access (no auth)
CREATE POLICY "Allow anonymous insert" ON public.pdfs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous select" ON public.pdfs FOR SELECT USING (true);
CREATE POLICY "Allow anonymous update" ON public.pdfs FOR UPDATE USING (true);

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('pdfs', 'pdfs', false);

-- Storage policies
CREATE POLICY "Allow anonymous upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pdfs');
CREATE POLICY "Allow anonymous read" ON storage.objects FOR SELECT USING (bucket_id = 'pdfs');