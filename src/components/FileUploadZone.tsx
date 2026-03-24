import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
}

const FileUploadZone = ({ onFileSelect, isUploading }: FileUploadZoneProps) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file?.type === "application/pdf") {
        setSelectedFile(file);
      }
    },
    []
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type === "application/pdf") {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) onFileSelect(selectedFile);
  };

  const clearFile = () => setSelectedFile(null);

  return (
    <div className="w-full max-w-lg mx-auto">
      <motion.div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        animate={{
          scale: dragOver ? 1.02 : 1,
          borderColor: dragOver ? "hsl(239 84% 67%)" : "hsl(220 13% 91%)",
        }}
        className="relative rounded-2xl border-2 border-dashed p-12 text-center transition-colors bg-card"
      >
        <AnimatePresence mode="wait">
          {!selectedFile ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"
              >
                <Upload className="w-8 h-8 text-primary" />
              </motion.div>
              <div>
                <p className="font-heading text-lg font-semibold text-foreground">
                  Drop your PDF here
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse files
                </p>
              </div>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </motion.div>
          ) : (
            <motion.div
              key="selected"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <div className="mx-auto w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center">
                <FileText className="w-8 h-8 text-success" />
              </div>
              <div className="flex items-center justify-center gap-2">
                <p className="font-heading font-semibold text-foreground truncate max-w-xs">
                  {selectedFile.name}
                </p>
                <button onClick={clearFile} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {selectedFile && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center"
        >
          <Button
            size="lg"
            onClick={handleUpload}
            disabled={isUploading}
            className="rounded-xl px-8 font-heading font-semibold"
          >
            {isUploading ? "Uploading..." : "✨ Analyze PDF"}
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default FileUploadZone;
