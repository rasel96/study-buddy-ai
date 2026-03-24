import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import FileUploadZone from "@/components/FileUploadZone";
import ProcessingAnimation from "@/components/ProcessingAnimation";
import OutputSection from "@/components/OutputSection";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PDFDocument } from "@/lib/types";

type AppState = "upload" | "processing" | "result";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [currentDoc, setCurrentDoc] = useState<PDFDocument | null>(null);

  // Animate processing steps
  useEffect(() => {
    if (appState !== "processing") return;
    const interval = setInterval(() => {
      setProcessingStep((s) => (s < 3 ? s + 1 : s));
    }, 4000);
    return () => clearInterval(interval);
  }, [appState]);

  // Poll for completion
  const pollForResult = useCallback(async (docId: string) => {
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 3000));

      const { data, error } = await supabase
        .from("pdfs")
        .select("*")
        .eq("id", docId)
        .single();

      if (error) continue;

      if (data.status === "completed") {
        setCurrentDoc({
          id: data.id,
          file_name: data.file_name,
          upload_date: data.upload_date,
          parsed_text: data.parsed_text,
          summary: data.summary,
          notes: data.notes as unknown as string[] | null,
          questions: data.questions as unknown as PDFDocument["questions"],
          status: "completed",
        });
        setAppState("result");
        return;
      }

      if (data.status === "error") {
        toast.error("Something went wrong processing your PDF. Please try again.");
        setAppState("upload");
        return;
      }
    }
    toast.error("Processing timed out. Please try again.");
    setAppState("upload");
  }, []);

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    try {
      // 1. Upload file to storage
      const filePath = `${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("pdfs")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Create DB record
      const { data: doc, error: dbError } = await supabase
        .from("pdfs")
        .insert({
          file_name: file.name,
          storage_path: filePath,
          status: "processing",
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 3. Call edge function to trigger n8n webhook
      const { error: fnError } = await supabase.functions.invoke("process-pdf", {
        body: { documentId: doc.id, storagePath: filePath },
      });

      if (fnError) throw fnError;

      setAppState("processing");
      setProcessingStep(0);
      pollForResult(doc.id);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload PDF");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setAppState("upload");
    setCurrentDoc(null);
    setProcessingStep(0);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <h1 className="font-heading text-xl font-bold text-foreground">StudyAI</h1>
          </div>
          <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full font-medium">
            Beta
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          key={appState}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {appState === "upload" && (
            <div className="space-y-8">
              <div className="text-center space-y-3">
                <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
                  Turn any PDF into <br />
                  <span className="text-primary">study-ready notes</span>
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Upload a PDF and get an AI-generated summary, bullet-point notes, and quiz questions in seconds.
                </p>
              </div>
              <FileUploadZone onFileSelect={handleFileSelect} isUploading={isUploading} />
            </div>
          )}

          {appState === "processing" && <ProcessingAnimation step={processingStep} />}

          {appState === "result" && currentDoc && (
            <OutputSection document={currentDoc} onReset={handleReset} />
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Index;
