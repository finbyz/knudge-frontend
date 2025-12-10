import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, FileText, Globe, Upload, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { FixedBottomContainer } from '@/components/FixedBottomContainer';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface UploadedFile {
  name: string;
  size: string;
  uploading: boolean;
}

export default function OnboardingKnowledge() {
  const navigate = useNavigate();
  const { setKnowledge, setStep } = useOnboardingStore();
  const [productName, setProductName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFile = useCallback(async (file: File) => {
    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload PDF, DOCX, or TXT files only.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB.',
        variant: 'destructive',
      });
      return;
    }

    const newFile: UploadedFile = {
      name: file.name,
      size: formatFileSize(file.size),
      uploading: true,
    };

    setFiles((prev) => [...prev, newFile]);

    // Simulate upload
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setFiles((prev) =>
      prev.map((f) =>
        f.name === file.name ? { ...f, uploading: false } : f
      )
    );
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const handleNext = () => {
    setKnowledge({
      files: files.map((f) => f.name),
      productName,
      websiteUrl,
    });
    setStep(5);
    navigate('/onboarding/connections');
  };

  const handleSkip = () => {
    setStep(5);
    navigate('/onboarding/connections');
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/onboarding/voice')}
            className="text-muted-foreground"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Back
          </Button>
          <span className="text-sm text-muted-foreground">Step 4 of 7</span>
          <div className="w-16" />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">
            What are you selling or promoting?
          </h1>
          <p className="text-lg text-muted-foreground mb-2">
            Help AI draft better messages
          </p>
          <p className="text-sm text-muted-foreground mb-8">(Optional)</p>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all mb-6',
              isDragging
                ? 'border-primary bg-primary/10 scale-105'
                : 'border-border bg-muted hover:border-primary/50 hover:bg-muted/80'
            )}
          >
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleInputChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-base font-medium text-foreground">
                Drop files here
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to upload
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                PDF, DOCX, TXT • Max 10MB
              </p>
            </label>
          </div>

          {/* Uploaded files */}
          {files.length > 0 && (
            <div className="space-y-3 mb-6">
              {files.map((file) => (
                <div
                  key={file.name}
                  className="bg-card rounded-xl p-4 border border-border flex items-center gap-3"
                >
                  <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    <p className="text-sm text-muted-foreground">{file.size}</p>
                  </div>
                  {file.uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <div className="flex items-center gap-1 text-success">
                        <Check className="h-4 w-4" />
                        <span className="text-sm">Uploaded</span>
                      </div>
                      <button
                        onClick={() => removeFile(file.name)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Input fields */}
          <div className="space-y-4 mb-6">
            <Input
              placeholder="Product/Service Name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="h-14 rounded-xl border-2 border-border focus:border-primary"
            />

            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="url"
                placeholder="Website URL"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="pl-12 h-14 rounded-xl border-2 border-border focus:border-primary"
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-8">
            Don't have a PDF? Just paste your website URL, we'll read it.
          </p>
        </motion.div>
      </main>

      {/* Fixed bottom buttons */}
      <FixedBottomContainer show={true}>
        <div className="flex gap-3 w-full">
          <Button
            onClick={handleSkip}
            variant="ghost"
            className="flex-1 h-12 rounded-xl"
          >
            Skip
          </Button>
          <Button
            onClick={handleNext}
            className="flex-1 h-12 rounded-xl gradient-primary text-primary-foreground"
          >
            Next →
          </Button>
        </div>
      </FixedBottomContainer>
    </div>
  );
}
