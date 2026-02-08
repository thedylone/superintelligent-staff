import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Mic,
  Image,
  FileText,
  X,
  Loader2,
  Send,
} from "lucide-react";
import { useCreateSubmission } from "@/hooks/useSubmissions";
import { toast } from "sonner";
import { RealtimeTranscription } from "@/components/submit/RealtimeTranscription";

export default function Submit() {
  const [title, setTitle] = useState("");
  const [textInput, setTextInput] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const createSubmission = useCreateSubmission();

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        toast.error('Please select an audio file');
        return;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error('Audio file must be under 50MB');
        return;
      }
      setAudioFile(file);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });
    
    setImageFiles(prev => [...prev, ...validFiles].slice(0, 10)); // Max 10 images
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please provide a title for your submission');
      return;
    }
    if (!textInput.trim() && !audioFile && imageFiles.length === 0) {
      toast.error('Please provide at least some content to submit');
      return;
    }

    await createSubmission.mutateAsync({
      title: title.trim(),
      textInput: textInput.trim(),
      audioFile,
      imageFiles,
    });

    // Reset form on success
    setTitle("");
    setTextInput("");
    setAudioFile(null);
    setImageFiles([]);
    toast.success('Submitted successfully!');
  };

  const hasContent = textInput.trim() || audioFile || imageFiles.length > 0;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Upload className="h-8 w-8" />
          Submit Content
        </h1>
        <p className="text-muted-foreground mt-1">
          Submit meeting notes, emails, or other content for AI analysis and action item extraction.
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <FileText className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-sm">How it works</p>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>Submit your content (text, audio, or images)</li>
                <li>Audio files are automatically transcribed</li>
                <li>AI filters and structures the information</li>
                <li>Action items are created for Founder approval</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Title Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Submission Title
          </CardTitle>
          <CardDescription>
            Give your submission a clear, descriptive title
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="e.g., Q1 Strategy Meeting Notes, Client Feedback Summary..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-base"
          />
        </CardContent>
      </Card>

      {/* Text Input */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Text Content
              </CardTitle>
              <CardDescription>
                Paste meeting notes, email content, or use live transcription
              </CardDescription>
            </div>
            <RealtimeTranscription
              onTranscript={setTextInput}
              existingText={textInput}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter meeting notes, email content, or other organizational information here..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="min-h-[200px] resize-y"
          />
          {textInput.trim() && (
            <p className="text-xs text-muted-foreground mt-2">
              {textInput.length} characters
            </p>
          )}
        </CardContent>
      </Card>

      {/* Audio Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Audio Recording
          </CardTitle>
          <CardDescription>
            Upload an audio file for automatic transcription (mp3, wav, m4a, webm)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={handleAudioSelect}
            className="hidden"
          />
          
          {audioFile ? (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Mic className="h-5 w-5 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{audioFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAudioFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => audioInputRef.current?.click()}
              className="w-full h-20 border-dashed"
            >
              <div className="flex flex-col items-center gap-2">
                <Mic className="h-6 w-6" />
                <span>Click to upload audio file</span>
              </div>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Image Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Image className="h-5 w-5" />
            Images
          </CardTitle>
          <CardDescription>
            Attach screenshots, documents, or other images (max 10)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          
          {imageFiles.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {imageFiles.map((file, index) => (
                <div key={index} className="relative group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-24 object-cover rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {imageFiles.length < 10 && (
            <Button
              variant="outline"
              onClick={() => imageInputRef.current?.click()}
              className="w-full h-16 border-dashed"
            >
              <div className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                <span>Add images ({imageFiles.length}/10)</span>
              </div>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {textInput.trim() && (
                <Badge variant="secondary">
                  <FileText className="h-3 w-3 mr-1" />
                  Text
                </Badge>
              )}
              {audioFile && (
                <Badge variant="secondary">
                  <Mic className="h-3 w-3 mr-1" />
                  Audio
                </Badge>
              )}
              {imageFiles.length > 0 && (
                <Badge variant="secondary">
                  <Image className="h-3 w-3 mr-1" />
                  {imageFiles.length} image(s)
                </Badge>
              )}
              {!hasContent && (
                <span className="text-sm text-muted-foreground">
                  No content added yet
                </span>
              )}
            </div>
            
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={!title.trim() || !hasContent || createSubmission.isPending}
            >
              {createSubmission.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Analysis
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}