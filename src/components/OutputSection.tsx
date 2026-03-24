import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, ListChecks, HelpCircle, Download, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PDFDocument, QuizQuestion } from "@/lib/types";

interface OutputSectionProps {
  document: PDFDocument;
  onReset: () => void;
}

const QuizCard = ({ q, index }: { q: QuizQuestion; index: number }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleSelect = (opt: string) => {
    if (revealed) return;
    setSelected(opt);
    setRevealed(true);
  };

  return (
    <div className="p-4 rounded-xl bg-secondary/50 space-y-3">
      <p className="font-heading font-semibold text-sm text-foreground">
        {index + 1}. {q.question}
      </p>
      <div className="grid gap-2">
        {q.options.map((opt) => {
          const isCorrect = opt === q.answer;
          const isSelected = opt === selected;
          return (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              className={`text-left text-sm px-3 py-2 rounded-lg border transition-all ${
                revealed
                  ? isCorrect
                    ? "border-success bg-success/10 text-foreground"
                    : isSelected
                    ? "border-destructive bg-destructive/10 text-foreground"
                    : "border-border text-muted-foreground"
                  : "border-border hover:border-primary/50 text-foreground cursor-pointer"
              }`}
            >
              <span className="flex items-center gap-2">
                {revealed && isCorrect && <Check className="w-3.5 h-3.5 text-success shrink-0" />}
                {revealed && isSelected && !isCorrect && <X className="w-3.5 h-3.5 text-destructive shrink-0" />}
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const OutputSection = ({ document: doc, onReset }: OutputSectionProps) => {
  const [expandedSection, setExpandedSection] = useState<string | null>("summary");

  const toggle = (section: string) =>
    setExpandedSection(expandedSection === section ? null : section);

  const downloadText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(window.document.createElement("a"), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  };

  const sections = [
    {
      id: "summary",
      icon: FileText,
      title: "Summary",
      content: (
        <p className="text-sm leading-relaxed text-foreground/90">{doc.summary}</p>
      ),
      downloadAction: () => downloadText(doc.summary || "", `${doc.file_name}-summary.txt`),
    },
    {
      id: "notes",
      icon: ListChecks,
      title: "Key Notes",
      content: (
        <ul className="space-y-2">
          {doc.notes?.map((note, i) => (
            <li key={i} className="flex gap-2 text-sm text-foreground/90">
              <span className="text-primary mt-0.5">•</span>
              {note}
            </li>
          ))}
        </ul>
      ),
      downloadAction: () =>
        downloadText((doc.notes || []).map((n) => `• ${n}`).join("\n"), `${doc.file_name}-notes.txt`),
    },
    {
      id: "questions",
      icon: HelpCircle,
      title: "Quiz Questions",
      content: (
        <div className="space-y-4">
          {doc.questions?.map((q, i) => (
            <QuizCard key={i} q={q} index={i} />
          ))}
        </div>
      ),
      downloadAction: () =>
        downloadText(
          (doc.questions || [])
            .map((q, i) => `${i + 1}. ${q.question}\n${q.options.map((o) => `   - ${o}`).join("\n")}\n   Answer: ${q.answer}`)
            .join("\n\n"),
          `${doc.file_name}-quiz.txt`
        ),
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-1"
      >
        <h1 className="font-heading text-2xl font-bold text-foreground">
          ✅ Analysis Complete
        </h1>
        <p className="text-sm text-muted-foreground">{doc.file_name}</p>
      </motion.div>

      {sections.map((section, idx) => (
        <motion.div
          key={section.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <Card className="overflow-hidden border-border/60">
            <CardHeader
              className="cursor-pointer flex flex-row items-center justify-between py-4"
              onClick={() => toggle(section.id)}
            >
              <CardTitle className="flex items-center gap-2 text-base font-heading">
                <section.icon className="w-5 h-5 text-primary" />
                {section.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    section.downloadAction();
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Download className="w-4 h-4" />
                </Button>
                {expandedSection === section.id ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            {expandedSection === section.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent className="pt-0 pb-5">{section.content}</CardContent>
              </motion.div>
            )}
          </Card>
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center pt-4"
      >
        <Button variant="outline" onClick={onReset} className="rounded-xl font-heading">
          📄 Analyze Another PDF
        </Button>
      </motion.div>
    </div>
  );
};

export default OutputSection;
