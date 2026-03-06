import { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageTransition } from '@/components/ui/page-transition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeEditor, languageTemplates } from '@/components/coding/CodeEditor';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Code, Loader2, BookOpen, Zap, ChevronRight, CheckCircle2,
  XCircle, ArrowLeft, ArrowRight, Eye, EyeOff, Lightbulb,
  GraduationCap, Brain, Trophy, RotateCcw, Sparkles, Play,
  Terminal, AlertTriangle, Lock
} from 'lucide-react';

// DSA topics with beginner-to-advanced ordering
const dsaTopics = [
  { name: 'Arrays', icon: '📊', level: 'Beginner', description: 'Foundation of all data structures' },
  { name: 'Strings', icon: '🔤', level: 'Beginner', description: 'Text manipulation & pattern matching' },
  { name: 'Hashing', icon: '#️⃣', level: 'Beginner', description: 'Hash maps, sets & frequency counting' },
  { name: 'Two Pointers', icon: '👆', level: 'Beginner', description: 'Efficient array/string traversal' },
  { name: 'Sliding Window', icon: '🪟', level: 'Beginner', description: 'Subarray/substring optimization' },
  { name: 'Binary Search', icon: '🔍', level: 'Intermediate', description: 'Divide and conquer searching' },
  { name: 'Linked List', icon: '🔗', level: 'Intermediate', description: 'Sequential node-based structures' },
  { name: 'Stack & Queue', icon: '📚', level: 'Intermediate', description: 'LIFO & FIFO data structures' },
  { name: 'Recursion', icon: '🔄', level: 'Intermediate', description: 'Self-referencing problem solving' },
  { name: 'Trees', icon: '🌳', level: 'Intermediate', description: 'Hierarchical data structures' },
  { name: 'Heap', icon: '⛰️', level: 'Intermediate', description: 'Priority-based operations' },
  { name: 'Graphs', icon: '🕸️', level: 'Advanced', description: 'Network & relationship modeling' },
  { name: 'Dynamic Programming', icon: '🧮', level: 'Advanced', description: 'Optimal substructure problems' },
  { name: 'Backtracking', icon: '↩️', level: 'Advanced', description: 'Exhaustive search with pruning' },
  { name: 'Greedy', icon: '💰', level: 'Advanced', description: 'Locally optimal choices' },
  { name: 'Tries', icon: '🌲', level: 'Advanced', description: 'Prefix-based string storage' },
];

const languages = [
  { value: 'python', label: 'Python', icon: '🐍' },
  { value: 'java', label: 'Java', icon: '☕' },
  { value: 'c', label: 'C', icon: '⚙️' },
];

const difficultyLevels = [
  { value: 'beginner', label: 'Beginner', color: 'text-success' },
  { value: 'intermediate', label: 'Intermediate', color: 'text-warning' },
  { value: 'advanced', label: 'Advanced', color: 'text-destructive' },
];

interface MCQ {
  id: number;
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation: string;
}

interface TestCase {
  id: number;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

interface TestResult {
  testCaseId: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  error: string | null;
}

interface RunResult {
  compiled: boolean;
  compilationError: string | null;
  testResults: TestResult[];
  summary: string;
  suggestions: string[];
}

interface CodingChallenge {
  id: number;
  title: string;
  difficulty: string;
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  testCases?: TestCase[];
  starterCode: string;
  solution: string;
  hints: string[];
}

interface DSAContent {
  explanation: string;
  mcqs: MCQ[];
  codingChallenges: CodingChallenge[];
}

type ViewState = 'topics' | 'learning';
type LearningStep = 'concept' | 'mcq' | 'coding' | 'results';

export default function CodingPractice() {
  const { user } = useAuth();

  // Main state
  const [view, setView] = useState<ViewState>('topics');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [selectedDifficulty, setSelectedDifficulty] = useState('beginner');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<DSAContent | null>(null);

  // Learning flow state
  const [learningStep, setLearningStep] = useState<LearningStep>('concept');

  // MCQ state
  const [currentMcqIndex, setCurrentMcqIndex] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, string>>({});
  const [mcqSubmitted, setMcqSubmitted] = useState<Record<number, boolean>>({});
  const [mcqScore, setMcqScore] = useState(0);

  // Coding state
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [codeSolutions, setCodeSolutions] = useState<Record<number, string>>({});
  const [showSolution, setShowSolution] = useState<Record<number, boolean>>({});
  const [showHints, setShowHints] = useState<Record<number, boolean>>({});
  const [completedChallenges, setCompletedChallenges] = useState<Record<number, boolean>>({});

  // Run/Test state
  const [running, setRunning] = useState(false);
  const [runResults, setRunResults] = useState<Record<number, RunResult>>({});
  const [activeTab, setActiveTab] = useState<string>('testcases');

  const startLearning = useCallback(async (topic: string) => {
    if (!user) return;
    setSelectedTopic(topic);
    setLoading(true);
    setView('learning');
    setLearningStep('concept');
    setCurrentMcqIndex(0);
    setMcqAnswers({});
    setMcqSubmitted({});
    setMcqScore(0);
    setCurrentChallengeIndex(0);
    setCodeSolutions({});
    setShowSolution({});
    setShowHints({});
    setCompletedChallenges({});
    setContent(null);
    setRunResults({});

    try {
      const { data, error } = await supabase.functions.invoke('generate-dsa-content', {
        body: { topic, difficulty: selectedDifficulty, language: selectedLanguage },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setContent(data as DSAContent);

      const starters: Record<number, string> = {};
      (data as DSAContent).codingChallenges?.forEach((c: CodingChallenge, i: number) => {
        starters[i] = c.starterCode || languageTemplates[selectedLanguage];
      });
      setCodeSolutions(starters);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to generate content. Try again.');
      setView('topics');
    } finally {
      setLoading(false);
    }
  }, [user, selectedDifficulty, selectedLanguage]);

  const handleRunCode = async () => {
    if (!content || running) return;
    const challenge = content.codingChallenges[currentChallengeIndex];
    const code = codeSolutions[currentChallengeIndex] || '';

    if (!code.trim()) {
      toast.error('Please write some code before running');
      return;
    }

    setRunning(true);
    setActiveTab('results');

    try {
      const { data, error } = await supabase.functions.invoke('run-code', {
        body: {
          code,
          language: selectedLanguage,
          testCases: challenge.testCases || [],
          problemDescription: challenge.description,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setRunResults((prev) => ({ ...prev, [currentChallengeIndex]: data as RunResult }));

      const result = data as RunResult;
      if (!result.compiled) {
        toast.error('Compilation Error! Check the results tab.');
      } else {
        const passed = result.testResults?.filter((t) => t.passed).length || 0;
        const total = result.testResults?.length || 0;
        if (passed === total) {
          toast.success(`All ${total} test cases passed! 🎉`);
          setCompletedChallenges((prev) => ({ ...prev, [currentChallengeIndex]: true }));
        } else {
          toast.warning(`${passed}/${total} test cases passed`);
        }
      }
    } catch (error: any) {
      console.error('Run error:', error);
      toast.error(error.message || 'Failed to run code');
    } finally {
      setRunning(false);
    }
  };

  const handleMcqAnswer = (questionIndex: number, answer: string) => {
    if (mcqSubmitted[questionIndex]) return;
    setMcqAnswers((prev) => ({ ...prev, [questionIndex]: answer }));
  };

  const submitMcqAnswer = (questionIndex: number) => {
    if (!content) return;
    const mcq = content.mcqs[questionIndex];
    const isCorrect = mcqAnswers[questionIndex] === mcq.correctAnswer;
    if (isCorrect) setMcqScore((prev) => prev + 1);
    setMcqSubmitted((prev) => ({ ...prev, [questionIndex]: true }));
  };

  const markChallengeCompleted = (index: number) => {
    setCompletedChallenges((prev) => ({ ...prev, [index]: true }));
    toast.success('Challenge marked as completed! 🎉');
  };

  const totalMcqs = content?.mcqs?.length || 0;
  const totalChallenges = content?.codingChallenges?.length || 0;
  const allMcqsDone = totalMcqs > 0 && Object.keys(mcqSubmitted).length === totalMcqs;
  const allChallengesDone = totalChallenges > 0 && Object.keys(completedChallenges).length === totalChallenges;

  const goBack = () => {
    setView('topics');
    setContent(null);
  };

  const steps: { key: LearningStep; label: string; icon: any }[] = [
    { key: 'concept', label: 'Learn', icon: BookOpen },
    { key: 'mcq', label: 'Quiz', icon: Brain },
    { key: 'coding', label: 'Code', icon: Code },
    { key: 'results', label: 'Results', icon: Trophy },
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return 'bg-success/10 text-success border-success/20';
      case 'Intermediate': return 'bg-warning/10 text-warning border-warning/20';
      case 'Advanced': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // TOPICS VIEW
  if (view === 'topics') {
    return (
      <AppLayout>
        <PageTransition>
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-3xl font-display font-bold flex items-center gap-3">
                <div className="p-2 rounded-xl gradient-primary">
                  <GraduationCap className="h-6 w-6 text-primary-foreground" />
                </div>
                DSA Learning Path
              </h1>
              <p className="text-muted-foreground mt-2">
                Master Data Structures & Algorithms from beginner to advanced with AI-guided lessons
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Configure:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Language</span>
                      <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                        <SelectTrigger className="w-36 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((l) => (
                            <SelectItem key={l.value} value={l.value}>
                              <span className="flex items-center gap-2">
                                <span>{l.icon}</span>
                                <span>{l.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Level</span>
                      <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                        <SelectTrigger className="w-40 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {difficultyLevels.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {['Beginner', 'Intermediate', 'Advanced'].map((level, levelIdx) => (
              <motion.div
                key={level}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + levelIdx * 0.1 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={getLevelColor(level)}>{level}</Badge>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {dsaTopics
                    .filter((t) => t.level === level)
                    .map((topic) => (
                      <Card
                        key={topic.name}
                        className="card-hover cursor-pointer group"
                        onClick={() => startLearning(topic.name)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{topic.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium group-hover:text-primary transition-colors">
                                {topic.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">{topic.description}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </motion.div>
            ))}
          </div>
        </PageTransition>
      </AppLayout>
    );
  }

  // LEARNING VIEW
  return (
    <AppLayout>
      <PageTransition>
        <div className="space-y-6">
          {/* Top Bar */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 flex-wrap">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xl">{dsaTopics.find((t) => t.name === selectedTopic)?.icon}</span>
              <h1 className="text-xl font-bold">{selectedTopic}</h1>
              <Badge variant="outline">{selectedLanguage.toUpperCase()}</Badge>
              <Badge variant="secondary">{selectedDifficulty}</Badge>
            </div>
          </motion.div>

          {/* Step Progress */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-1">
              {steps.map((step, i) => {
                const isActive = learningStep === step.key;
                const isDone =
                  (step.key === 'concept' && learningStep !== 'concept') ||
                  (step.key === 'mcq' && (learningStep === 'coding' || learningStep === 'results')) ||
                  (step.key === 'coding' && learningStep === 'results');
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <button
                      onClick={() => !loading && content && setLearningStep(step.key)}
                      disabled={loading || !content}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all w-full justify-center ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : isDone
                          ? 'bg-success/10 text-success'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <step.icon className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">{step.label}</span>
                    </button>
                    {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mx-1" />}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Loading State */}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="p-4 rounded-2xl gradient-primary">
                <Loader2 className="h-8 w-8 text-primary-foreground animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-medium">AI is preparing your lesson...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Generating concept explanation, quizzes & coding challenges
                </p>
              </div>
            </motion.div>
          )}

          {/* Content */}
          {content && !loading && (
            <AnimatePresence mode="wait">
              {/* STEP 1: Concept */}
              {learningStep === 'concept' && (
                <motion.div key="concept" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        Concept Explanation
                      </CardTitle>
                      <CardDescription>Read through the concept carefully before attempting the quiz</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{content.explanation}</ReactMarkdown>
                      </div>
                      <div className="flex justify-end mt-6">
                        <Button onClick={() => setLearningStep('mcq')} className="gradient-primary border-0">
                          Continue to Quiz <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* STEP 2: MCQ Quiz */}
              {learningStep === 'mcq' && content.mcqs && (
                <motion.div key="mcq" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          Question {currentMcqIndex + 1} of {totalMcqs}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Score: {mcqScore}/{Object.keys(mcqSubmitted).length}
                        </span>
                      </div>
                      <Progress value={((currentMcqIndex + 1) / totalMcqs) * 100} className="h-2" />
                    </CardContent>
                  </Card>

                  {content.mcqs[currentMcqIndex] && (
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-lg font-medium mb-4">{content.mcqs[currentMcqIndex].question}</h3>
                        <div className="space-y-3">
                          {Object.entries(content.mcqs[currentMcqIndex].options).map(([key, value]) => {
                            const isSelected = mcqAnswers[currentMcqIndex] === key;
                            const isSubmitted = mcqSubmitted[currentMcqIndex];
                            const isCorrect = key === content.mcqs[currentMcqIndex].correctAnswer;
                            let bgClass = 'bg-muted/30 hover:bg-muted/60 border-transparent';
                            if (isSubmitted && isCorrect) bgClass = 'bg-success/10 border-success/30 text-success';
                            else if (isSubmitted && isSelected && !isCorrect)
                              bgClass = 'bg-destructive/10 border-destructive/30 text-destructive';
                            else if (isSelected) bgClass = 'bg-primary/10 border-primary/30';

                            return (
                              <button
                                key={key}
                                onClick={() => handleMcqAnswer(currentMcqIndex, key)}
                                disabled={isSubmitted}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${bgClass}`}
                              >
                                <span className="w-8 h-8 rounded-lg bg-background flex items-center justify-center font-bold text-sm shrink-0">
                                  {key}
                                </span>
                                <span className="flex-1">{value}</span>
                                {isSubmitted && isCorrect && <CheckCircle2 className="h-5 w-5 text-success shrink-0" />}
                                {isSubmitted && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-destructive shrink-0" />}
                              </button>
                            );
                          })}
                        </div>

                        {!mcqSubmitted[currentMcqIndex] && mcqAnswers[currentMcqIndex] && (
                          <Button onClick={() => submitMcqAnswer(currentMcqIndex)} className="mt-4 gradient-primary border-0">
                            Submit Answer
                          </Button>
                        )}
                        {mcqSubmitted[currentMcqIndex] && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 rounded-xl bg-muted/30">
                            <p className="text-sm font-medium mb-1">Explanation:</p>
                            <p className="text-sm text-muted-foreground">{content.mcqs[currentMcqIndex].explanation}</p>
                          </motion.div>
                        )}

                        <div className="flex justify-between mt-6">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentMcqIndex === 0}
                            onClick={() => setCurrentMcqIndex((p) => p - 1)}
                          >
                            <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                          </Button>
                          {currentMcqIndex < totalMcqs - 1 ? (
                            <Button
                              size="sm"
                              onClick={() => setCurrentMcqIndex((p) => p + 1)}
                              disabled={!mcqSubmitted[currentMcqIndex]}
                            >
                              Next <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => setLearningStep('coding')}
                              disabled={!allMcqsDone}
                              className="gradient-primary border-0"
                            >
                              Continue to Coding <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}

              {/* STEP 3: Coding Challenges */}
              {learningStep === 'coding' && content.codingChallenges && (
                <motion.div key="coding" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  {/* Challenge selector */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {content.codingChallenges.map((c, i) => (
                      <Button
                        key={i}
                        variant={currentChallengeIndex === i ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => { setCurrentChallengeIndex(i); setActiveTab('testcases'); }}
                        className={currentChallengeIndex === i ? 'gradient-primary border-0' : ''}
                      >
                        {completedChallenges[i] && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        Challenge {i + 1}
                        <Badge
                          variant="secondary"
                          className={`ml-1 text-[10px] ${
                            c.difficulty === 'easy'
                              ? 'bg-success/10 text-success'
                              : c.difficulty === 'medium'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {c.difficulty}
                        </Badge>
                      </Button>
                    ))}
                  </div>

                  {/* Current Challenge */}
                  {content.codingChallenges[currentChallengeIndex] && (() => {
                    const challenge = content.codingChallenges[currentChallengeIndex];
                    const result = runResults[currentChallengeIndex];
                    const visibleTestCases = challenge.testCases?.filter((tc) => !tc.isHidden) || [];
                    const hiddenCount = (challenge.testCases?.length || 0) - visibleTestCases.length;

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Problem Description */}
                        <Card className="lg:max-h-[75vh] lg:overflow-y-auto">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">{challenge.title}</CardTitle>
                            <Badge
                              className={`w-fit ${
                                challenge.difficulty === 'easy'
                                  ? 'bg-success/10 text-success border-success/20'
                                  : challenge.difficulty === 'medium'
                                  ? 'bg-warning/10 text-warning border-warning/20'
                                  : 'bg-destructive/10 text-destructive border-destructive/20'
                              }`}
                            >
                              {challenge.difficulty}
                            </Badge>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown>{challenge.description}</ReactMarkdown>
                            </div>

                            {/* Examples */}
                            {challenge.examples?.map((ex, i) => (
                              <div key={i} className="p-3 rounded-lg bg-muted/30 space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Example {i + 1}:</p>
                                <p className="text-sm font-mono">
                                  <span className="text-muted-foreground">Input: </span>{ex.input}
                                </p>
                                <p className="text-sm font-mono">
                                  <span className="text-muted-foreground">Output: </span>{ex.output}
                                </p>
                                {ex.explanation && (
                                  <p className="text-xs text-muted-foreground">
                                    <span className="font-medium">Explanation: </span>{ex.explanation}
                                  </p>
                                )}
                              </div>
                            ))}

                            {/* Hints */}
                            <div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowHints((p) => ({ ...p, [currentChallengeIndex]: !p[currentChallengeIndex] }))}
                              >
                                <Lightbulb className="h-4 w-4 mr-1 text-warning" />
                                {showHints[currentChallengeIndex] ? 'Hide Hints' : 'Show Hints'}
                              </Button>
                              {showHints[currentChallengeIndex] && challenge.hints && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 space-y-1">
                                  {challenge.hints.map((hint, i) => (
                                    <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                      <Zap className="h-3 w-3 mt-1 text-warning shrink-0" />
                                      {hint}
                                    </p>
                                  ))}
                                </motion.div>
                              )}
                            </div>

                            {/* Solution Toggle */}
                            <div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowSolution((p) => ({ ...p, [currentChallengeIndex]: !p[currentChallengeIndex] }))}
                              >
                                {showSolution[currentChallengeIndex] ? (
                                  <><EyeOff className="h-4 w-4 mr-1" /> Hide Solution</>
                                ) : (
                                  <><Eye className="h-4 w-4 mr-1" /> Show Solution</>
                                )}
                              </Button>
                              {showSolution[currentChallengeIndex] && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2">
                                  <CodeEditor
                                    code={challenge.solution}
                                    language={selectedLanguage}
                                    onCodeChange={() => {}}
                                    onLanguageChange={() => {}}
                                    readOnly
                                  />
                                </motion.div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Code Editor + Test Panel (LeetCode style) */}
                        <div className="space-y-3">
                          <CodeEditor
                            code={codeSolutions[currentChallengeIndex] || ''}
                            language={selectedLanguage}
                            onCodeChange={(code) => setCodeSolutions((p) => ({ ...p, [currentChallengeIndex]: code }))}
                            onLanguageChange={() => {}}
                            readOnly={false}
                          />

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              onClick={handleRunCode}
                              disabled={running}
                              className="gradient-primary border-0"
                            >
                              {running ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running...</>
                              ) : (
                                <><Play className="h-4 w-4 mr-2" /> Run Code</>
                              )}
                            </Button>
                            {!completedChallenges[currentChallengeIndex] && (
                              <Button variant="outline" onClick={() => markChallengeCompleted(currentChallengeIndex)}>
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Complete
                              </Button>
                            )}
                            {completedChallenges[currentChallengeIndex] && (
                              <Badge className="bg-success/10 text-success border-success/20 py-2 px-4">
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Completed
                              </Badge>
                            )}
                          </div>

                          {/* Test Cases / Results Panel (LeetCode style tabs) */}
                          <Card>
                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                              <div className="border-b px-4 pt-2">
                                <TabsList className="bg-transparent h-auto p-0 gap-4">
                                  <TabsTrigger
                                    value="testcases"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 px-1"
                                  >
                                    <Terminal className="h-4 w-4 mr-1.5" />
                                    Test Cases
                                    {challenge.testCases && (
                                      <Badge variant="secondary" className="ml-1.5 text-[10px]">
                                        {challenge.testCases.length}
                                      </Badge>
                                    )}
                                  </TabsTrigger>
                                  <TabsTrigger
                                    value="results"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 px-1"
                                  >
                                    {result ? (
                                      result.compiled && result.testResults?.every((t) => t.passed) ? (
                                        <CheckCircle2 className="h-4 w-4 mr-1.5 text-success" />
                                      ) : (
                                        <XCircle className="h-4 w-4 mr-1.5 text-destructive" />
                                      )
                                    ) : (
                                      <Play className="h-4 w-4 mr-1.5" />
                                    )}
                                    Results
                                  </TabsTrigger>
                                </TabsList>
                              </div>

                              {/* Test Cases Tab */}
                              <TabsContent value="testcases" className="p-4 mt-0 max-h-64 overflow-y-auto">
                                <div className="space-y-3">
                                  {visibleTestCases.map((tc, i) => (
                                    <div key={tc.id} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline" className="text-[10px]">Case {i + 1}</Badge>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-xs font-mono">
                                          <span className="text-muted-foreground font-sans text-[10px] uppercase tracking-wider">Input: </span>
                                          {tc.input}
                                        </p>
                                        <p className="text-xs font-mono">
                                          <span className="text-muted-foreground font-sans text-[10px] uppercase tracking-wider">Expected: </span>
                                          {tc.expectedOutput}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                  {hiddenCount > 0 && (
                                    <div className="p-3 rounded-lg bg-muted/20 border border-dashed border-border/50 flex items-center gap-2 text-muted-foreground">
                                      <Lock className="h-4 w-4" />
                                      <span className="text-xs">
                                        + {hiddenCount} hidden test case{hiddenCount > 1 ? 's' : ''} (revealed after running)
                                      </span>
                                    </div>
                                  )}
                                  {(!challenge.testCases || challenge.testCases.length === 0) && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                      No test cases available for this challenge
                                    </p>
                                  )}
                                </div>
                              </TabsContent>

                              {/* Results Tab */}
                              <TabsContent value="results" className="p-4 mt-0 max-h-64 overflow-y-auto">
                                {running && (
                                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <p className="text-sm text-muted-foreground">Evaluating your code against test cases...</p>
                                  </div>
                                )}
                                {!running && !result && (
                                  <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
                                    <Play className="h-8 w-8" />
                                    <p className="text-sm">Click "Run Code" to test your solution</p>
                                  </div>
                                )}
                                {!running && result && (
                                  <div className="space-y-3">
                                    {/* Compilation Status */}
                                    {!result.compiled && (
                                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                        <div className="flex items-center gap-2 mb-2">
                                          <AlertTriangle className="h-4 w-4 text-destructive" />
                                          <span className="text-sm font-medium text-destructive">Compilation Error</span>
                                        </div>
                                        <pre className="text-xs font-mono text-destructive/80 whitespace-pre-wrap">
                                          {result.compilationError}
                                        </pre>
                                      </div>
                                    )}

                                    {/* Test Results */}
                                    {result.compiled && result.testResults?.map((tr, i) => (
                                      <div
                                        key={i}
                                        className={`p-3 rounded-lg border ${
                                          tr.passed
                                            ? 'bg-success/5 border-success/20'
                                            : 'bg-destructive/5 border-destructive/20'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            {tr.passed ? (
                                              <CheckCircle2 className="h-4 w-4 text-success" />
                                            ) : (
                                              <XCircle className="h-4 w-4 text-destructive" />
                                            )}
                                            <span className="text-sm font-medium">
                                              Test Case {i + 1}
                                            </span>
                                          </div>
                                          <Badge
                                            variant="secondary"
                                            className={`text-[10px] ${
                                              tr.passed ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                                            }`}
                                          >
                                            {tr.passed ? 'Passed' : 'Failed'}
                                          </Badge>
                                        </div>
                                        <div className="space-y-1 text-xs font-mono">
                                          <p><span className="text-muted-foreground font-sans text-[10px] uppercase">Input: </span>{tr.input}</p>
                                          <p><span className="text-muted-foreground font-sans text-[10px] uppercase">Expected: </span>{tr.expectedOutput}</p>
                                          {!tr.passed && (
                                            <p><span className="text-destructive font-sans text-[10px] uppercase">Got: </span>{tr.actualOutput || 'N/A'}</p>
                                          )}
                                          {tr.error && (
                                            <p className="text-destructive"><span className="font-sans text-[10px] uppercase">Error: </span>{tr.error}</p>
                                          )}
                                        </div>
                                      </div>
                                    ))}

                                    {/* Summary */}
                                    {result.compiled && result.summary && (
                                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                        <p className="text-sm">{result.summary}</p>
                                      </div>
                                    )}

                                    {/* Suggestions */}
                                    {result.suggestions && result.suggestions.length > 0 && (
                                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                                        <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1">
                                          <Lightbulb className="h-3 w-3" /> Suggestions
                                        </p>
                                        <ul className="space-y-1">
                                          {result.suggestions.map((s, i) => (
                                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                              <span className="text-primary mt-0.5">•</span> {s}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </TabsContent>
                            </Tabs>
                          </Card>

                          {allChallengesDone && (
                            <Button onClick={() => setLearningStep('results')} className="w-full gradient-primary border-0">
                              View Results <Trophy className="h-4 w-4 ml-2" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              )}

              {/* STEP 4: Results */}
              {learningStep === 'results' && (
                <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center">
                  <Card className="max-w-lg w-full">
                    <CardContent className="p-8 text-center space-y-6">
                      <div className="p-4 rounded-full gradient-primary w-fit mx-auto">
                        <Trophy className="h-10 w-10 text-primary-foreground" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Module Complete! 🎉</h2>
                        <p className="text-muted-foreground mt-1">{selectedTopic} - {selectedDifficulty}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-muted/30">
                          <Brain className="h-6 w-6 text-primary mx-auto mb-2" />
                          <p className="text-2xl font-bold">{mcqScore}/{totalMcqs}</p>
                          <p className="text-xs text-muted-foreground">Quiz Score</p>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/30">
                          <Code className="h-6 w-6 text-primary mx-auto mb-2" />
                          <p className="text-2xl font-bold">{Object.keys(completedChallenges).length}/{totalChallenges}</p>
                          <p className="text-xs text-muted-foreground">Challenges</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button onClick={goBack} className="gradient-primary border-0">
                          <RotateCcw className="h-4 w-4 mr-2" /> Pick Another Topic
                        </Button>
                        <Button variant="outline" onClick={() => startLearning(selectedTopic)}>
                          Retry This Topic
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </PageTransition>
    </AppLayout>
  );
}
