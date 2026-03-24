import { motion } from "framer-motion";

const steps = ["Reading your PDF...", "Extracting key ideas...", "Generating summary...", "Creating quiz questions..."];

const ProcessingAnimation = ({ step = 0 }: { step?: number }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-8">
      <div className="relative">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border-2 border-primary/30"
            animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
            style={{ width: 64, height: 64 }}
          />
        ))}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-2xl"
        >
          📄
        </motion.div>
      </div>

      <div className="text-center space-y-2">
        <motion.h2
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-heading text-xl font-bold text-foreground"
        >
          {steps[step % steps.length]}
        </motion.h2>
        <p className="text-sm text-muted-foreground">This usually takes 15-30 seconds</p>
      </div>

      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <motion.div
            key={i}
            className="h-1.5 rounded-full"
            animate={{
              width: i <= step ? 32 : 8,
              backgroundColor: i <= step ? "hsl(239 84% 67%)" : "hsl(220 13% 91%)",
            }}
            transition={{ duration: 0.4 }}
          />
        ))}
      </div>
    </div>
  );
};

export default ProcessingAnimation;
