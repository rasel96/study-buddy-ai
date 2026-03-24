export interface PDFDocument {
  id: string;
  file_name: string;
  upload_date: string;
  parsed_text: string | null;
  summary: string | null;
  notes: string[] | null;
  questions: QuizQuestion[] | null;
  status: 'uploading' | 'processing' | 'completed' | 'error';
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}
