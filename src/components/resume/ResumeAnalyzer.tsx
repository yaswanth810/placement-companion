import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Target,
  FileText,
  TrendingUp,
  Lightbulb,
  Upload,
  File
} from 'lucide-react';

interface ResumeAnalysis {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  atsScore: number;
  atsNotes: string;
  contentAnalysis: {
    quantifiedAchievements: boolean;
    actionOriented: boolean;
    skillsHighlighted: boolean;
    notes: string;
  };
  formatNotes: string;
  recommendations: string[];
}

interface ResumeAnalyzerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetRole?: string;
}

export function ResumeAnalyzer({ open, onOpenChange, targetRole }: ResumeAnalyzerProps) {
  const [resumeText, setResumeText] = useState('');
  const [customTargetRole, setCustomTargetRole] = useState(targetRole || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inputMethod, setInputMethod] = useState<'paste' | 'upload'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('pdf')) {
        toast.error('Please upload a PDF file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setResumeText('');
    }
  };

  const handleParsePdf = async () => {
    if (!selectedFile) {
      toast.error('Please select a PDF file');
      return;
    }

    setParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const { data, error } = await supabase.functions.invoke('parse-resume-pdf', {
        body: formData,
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setResumeText(data.text);
      toast.success('PDF parsed successfully! Click "Analyze Resume" to continue.');
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Failed to parse PDF. Please try pasting text instead.');
    } finally {
      setParsing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim()) {
      if (selectedFile && inputMethod === 'upload') {
        await handleParsePdf();
        if (!resumeText.trim()) return;
      } else {
        toast.error('Please paste your resume content or upload a PDF');
        return;
      }
    }

    setAnalyzing(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-resume', {
        body: { resumeText, targetRole: customTargetRole }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setAnalysis(data);
      toast.success('Resume analyzed successfully!');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze resume. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyzeWithParse = async () => {
    if (inputMethod === 'upload' && selectedFile && !resumeText.trim()) {
      setParsing(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const { data, error } = await supabase.functions.invoke('parse-resume-pdf', {
          body: formData,
        });

        if (error) throw error;

        if (data.error) {
          toast.error(data.error);
          setParsing(false);
          return;
        }

        setResumeText(data.text);
        setParsing(false);
        
        // Now analyze with the parsed text
        setAnalyzing(true);
        const analysisResponse = await supabase.functions.invoke('analyze-resume', {
          body: { resumeText: data.text, targetRole: customTargetRole }
        });

        if (analysisResponse.error) throw analysisResponse.error;

        if (analysisResponse.data.error) {
          toast.error(analysisResponse.data.error);
          return;
        }

        setAnalysis(analysisResponse.data);
        toast.success('Resume analyzed successfully!');
      } catch (error) {
        console.error('Error:', error);
        toast.error('Failed to process resume. Please try again.');
      } finally {
        setParsing(false);
        setAnalyzing(false);
      }
    } else {
      await handleAnalyze();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Work';
  };

  const resetAnalysis = () => {
    setAnalysis(null);
    setResumeText('');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const canAnalyze = inputMethod === 'upload' ? !!selectedFile : !!resumeText.trim();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetAnalysis();
    }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Resume Analyzer
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)]">
          <div className="space-y-6 pr-4">
            {!analysis ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="targetRole">Target Role (Optional)</Label>
                  <Input
                    id="targetRole"
                    placeholder="e.g., Senior Software Engineer at Google"
                    value={customTargetRole}
                    onChange={(e) => setCustomTargetRole(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Adding a target role helps tailor the feedback to your specific goals
                  </p>
                </div>

                <Tabs value={inputMethod} onValueChange={(v) => setInputMethod(v as 'paste' | 'upload')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload PDF
                    </TabsTrigger>
                    <TabsTrigger value="paste" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Paste Text
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="space-y-4 mt-4">
                    <div 
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      {selectedFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <File className="h-12 w-12 text-primary" />
                          <p className="font-medium">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                              setResumeText('');
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="h-12 w-12 text-muted-foreground" />
                          <p className="font-medium">Click to upload your resume</p>
                          <p className="text-sm text-muted-foreground">
                            PDF files only, max 10MB
                          </p>
                        </div>
                      )}
                    </div>

                    {resumeText && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-success mb-2">
                          <CheckCircle2 className="h-4 w-4" />
                          PDF content extracted
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {resumeText.substring(0, 200)}...
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="paste" className="space-y-2 mt-4">
                    <Label htmlFor="resumeText">Resume Content *</Label>
                    <Textarea
                      id="resumeText"
                      placeholder="Paste your resume content here... (Copy all text from your resume PDF/Word document)"
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      rows={12}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Tip: Open your resume file and select all text (Ctrl+A / Cmd+A), then paste here
                    </p>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAnalyzeWithParse} 
                    disabled={analyzing || parsing || !canAnalyze}
                  >
                    {parsing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Parsing PDF...
                      </>
                    ) : analyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Analyze Resume
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                {/* Score Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Overall Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className={`text-4xl font-bold ${getScoreColor(analysis.score)}`}>
                          {analysis.score}
                        </div>
                        <div className="flex-1">
                          <Progress value={analysis.score} className="h-2" />
                          <p className={`text-sm mt-1 ${getScoreColor(analysis.score)}`}>
                            {getScoreLabel(analysis.score)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        ATS Compatibility
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className={`text-4xl font-bold ${getScoreColor(analysis.atsScore)}`}>
                          {analysis.atsScore}
                        </div>
                        <div className="flex-1">
                          <Progress value={analysis.atsScore} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {analysis.atsNotes}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{analysis.summary}</p>
                  </CardContent>
                </Card>

                {/* Content Analysis */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Content Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        {analysis.contentAnalysis.quantifiedAchievements ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="text-sm">Quantified Achievements</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {analysis.contentAnalysis.actionOriented ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="text-sm">Action-Oriented</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {analysis.contentAnalysis.skillsHighlighted ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="text-sm">Skills Highlighted</span>
                      </div>
                    </div>
                    {analysis.contentAnalysis.notes && (
                      <p className="text-sm text-muted-foreground">{analysis.contentAnalysis.notes}</p>
                    )}
                  </CardContent>
                </Card>

                {/* Strengths & Improvements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.strengths.map((strength, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-success mt-0.5">•</span>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-warning" />
                        Areas for Improvement
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.improvements.map((improvement, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-warning mt-0.5">•</span>
                            {improvement}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Format Notes */}
                {analysis.formatNotes && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Format & Structure</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{analysis.formatNotes}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Recommendations */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Badge variant="outline" className="mt-0.5 shrink-0">
                            {idx + 1}
                          </Badge>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetAnalysis}>
                    Analyze Another Resume
                  </Button>
                  <Button onClick={() => onOpenChange(false)}>
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
