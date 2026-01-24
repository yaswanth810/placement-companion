import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageTransition } from "@/components/ui/page-transition";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, Clock, CheckCircle2, XCircle, Trophy, 
  Play, RotateCcw, ChevronRight, History, Target,
  BookOpen, Code, MessageSquare, ArrowLeft
} from "lucide-react";

interface Question {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: string;
  explanation: string;
}

interface MockTest {
  id: string;
  category: string;
  subcategory: string | null;
  difficulty: string;
  total_questions: number;
  correct_answers: number;
  time_taken: number | null;
  max_time: number;
  questions: Question[];
  answers: string[];
  status: string;
  score: number;
  created_at: string;
  completed_at: string | null;
}

const categories = [
  { value: "aptitude", label: "Aptitude", icon: Brain, description: "Quantitative & Logical Reasoning" },
  { value: "technical", label: "Technical", icon: Code, description: "DSA, DBMS, OS, Networking" },
  { value: "verbal", label: "Verbal", icon: MessageSquare, description: "English & Communication" },
];

const technicalSubcategories = [
  { value: "dsa", label: "Data Structures & Algorithms" },
  { value: "oop", label: "Object Oriented Programming" },
  { value: "dbms", label: "Database Management" },
  { value: "os", label: "Operating Systems" },
  { value: "cn", label: "Computer Networks" },
];

const difficulties = [
  { value: "easy", label: "Easy", color: "bg-success text-success-foreground" },
  { value: "medium", label: "Medium", color: "bg-warning text-warning-foreground" },
  { value: "hard", label: "Hard", color: "bg-destructive text-destructive-foreground" },
];

export default function MockTests() {
  const { user } = useAuth();
  const [view, setView] = useState<"setup" | "test" | "result" | "history">("setup");
  const [loading, setLoading] = useState(false);
  const [testHistory, setTestHistory] = useState<MockTest[]>([]);
  const [currentTest, setCurrentTest] = useState<MockTest | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  // Setup state
  const [category, setCategory] = useState("aptitude");
  const [subcategory, setSubcategory] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [numQuestions, setNumQuestions] = useState(10);

  const fetchTestHistory = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("mock_tests")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setTestHistory((data || []) as unknown as MockTest[]);
    } catch (error) {
      console.error("Error fetching test history:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchTestHistory();
  }, [fetchTestHistory]);

  // Timer effect
  useEffect(() => {
    if (view !== "test" || !currentTest || timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [view, currentTest, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startTest = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-test`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            category,
            subcategory: category === "technical" ? subcategory : null,
            difficulty,
            numQuestions,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate test");
      }

      const { questions } = await response.json();
      
      // Create test in database
      const maxTime = numQuestions * 60; // 1 minute per question
      const { data: testData, error: insertError } = await supabase
        .from("mock_tests")
        .insert({
          user_id: user.id,
          category,
          subcategory: category === "technical" ? subcategory : null,
          difficulty,
          total_questions: numQuestions,
          max_time: maxTime,
          questions: questions,
          status: "in_progress",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setCurrentTest(testData as unknown as MockTest);
      setSelectedAnswers(new Array(questions.length).fill(""));
      setCurrentQuestionIndex(0);
      setTimeRemaining(maxTime);
      setView("test");
      toast.success("Test started! Good luck!");
    } catch (error: unknown) {
      console.error("Error starting test:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start test");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answer;
    setSelectedAnswers(newAnswers);
  };

  const handleSubmitTest = async () => {
    if (!currentTest || !user) return;
    
    setLoading(true);
    try {
      const questions = currentTest.questions;
      let correctCount = 0;
      
      questions.forEach((q, index) => {
        if (selectedAnswers[index] === q.correctAnswer) {
          correctCount++;
        }
      });

      const score = (correctCount / questions.length) * 100;
      const timeTaken = currentTest.max_time - timeRemaining;

      const { error } = await supabase
        .from("mock_tests")
        .update({
          correct_answers: correctCount,
          time_taken: timeTaken,
          answers: selectedAnswers,
          status: "completed",
          score,
          completed_at: new Date().toISOString(),
        })
        .eq("id", currentTest.id);

      if (error) throw error;

      setCurrentTest({
        ...currentTest,
        correct_answers: correctCount,
        time_taken: timeTaken,
        answers: selectedAnswers,
        status: "completed",
        score,
      });
      
      setView("result");
      toast.success("Test completed!");
    } catch (error) {
      console.error("Error submitting test:", error);
      toast.error("Failed to submit test");
    } finally {
      setLoading(false);
    }
  };

  const resetTest = () => {
    setCurrentTest(null);
    setSelectedAnswers([]);
    setCurrentQuestionIndex(0);
    setTimeRemaining(0);
    setView("setup");
    fetchTestHistory();
  };

  const currentQuestion = currentTest?.questions[currentQuestionIndex];

  return (
    <AppLayout>
      <PageTransition>
        <div className="max-w-5xl mx-auto">
          <motion.div 
            className="flex items-center justify-between mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h1 className="text-3xl font-bold">Mock Tests</h1>
              <p className="text-muted-foreground mt-1">Practice with AI-generated questions</p>
            </div>
            {view === "setup" && (
              <Button variant="outline" onClick={() => setView("history")} className="shadow-sm hover:shadow-md transition-shadow">
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
            )}
            {(view === "history" || view === "result") && (
              <Button variant="outline" onClick={resetTest} className="shadow-sm hover:shadow-md transition-shadow">
                <ArrowLeft className="w-4 h-4 mr-2" />
                New Test
              </Button>
            )}
          </motion.div>

          <AnimatePresence mode="wait">
            {view === "setup" && (
              <motion.div
                key="setup"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Category Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {categories.map((cat, index) => (
                    <motion.div
                      key={cat.value}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card
                        className={`cursor-pointer card-interactive ${
                          category === cat.value 
                            ? "ring-2 ring-primary shadow-glow-sm border-primary/30" 
                            : "hover:border-primary/20"
                        }`}
                        onClick={() => {
                          setCategory(cat.value);
                          if (cat.value !== "technical") setSubcategory("");
                        }}
                      >
                        <CardContent className="p-6 text-center">
                          <div className={`w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center transition-all duration-300 ${
                            category === cat.value 
                              ? "gradient-primary shadow-soft" 
                              : "bg-muted"
                          }`}>
                            <cat.icon className={`w-7 h-7 ${
                              category === cat.value ? "text-primary-foreground" : "text-muted-foreground"
                            }`} />
                          </div>
                          <h3 className="font-semibold text-lg">{cat.label}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{cat.description}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Technical Subcategory */}
                {category === "technical" && (
                  <Card className="card-hover">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Code className="h-5 w-5 text-primary" />
                        Select Topic
                      </CardTitle>
                      <CardDescription>Choose a technical topic to practice</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {technicalSubcategories.map((sub) => (
                          <Button
                            key={sub.value}
                            variant={subcategory === sub.value ? "default" : "outline"}
                            className={`h-auto py-4 px-4 text-left justify-start transition-all duration-200 ${
                              subcategory === sub.value 
                                ? "shadow-soft ring-2 ring-primary/20" 
                                : "hover:bg-accent hover:border-primary/30"
                            }`}
                            onClick={() => setSubcategory(sub.value)}
                          >
                            <span className="truncate">{sub.label}</span>
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Test Configuration */}
                <Card className="card-hover">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      Test Configuration
                    </CardTitle>
                    <CardDescription>Customize your test settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium block">Difficulty</label>
                        <Select value={difficulty} onValueChange={setDifficulty}>
                          <SelectTrigger className="bg-background/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {difficulties.map((d) => (
                              <SelectItem key={d.value} value={d.value}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium block">Number of Questions</label>
                        <Select value={numQuestions.toString()} onValueChange={(v) => setNumQuestions(parseInt(v))}>
                          <SelectTrigger className="bg-background/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 Questions (5 min)</SelectItem>
                            <SelectItem value="10">10 Questions (10 min)</SelectItem>
                            <SelectItem value="15">15 Questions (15 min)</SelectItem>
                            <SelectItem value="20">20 Questions (20 min)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button 
                      className="w-full btn-glow gradient-primary border-0" 
                      size="lg"
                      onClick={startTest}
                      disabled={loading || (category === "technical" && !subcategory)}
                    >
                      {loading ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : (
                        <Play className="w-5 h-5 mr-2" />
                      )}
                      {loading ? "Generating Questions..." : "Start Test"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                {testHistory.length > 0 && (
                  <motion.div 
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Card className="card-hover overflow-hidden">
                      <CardContent className="p-5 text-center relative">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="icon-container icon-container-primary w-12 h-12 mx-auto mb-3">
                          <Target className="w-6 h-6" />
                        </div>
                        <p className="text-2xl font-bold">{testHistory.length}</p>
                        <p className="text-sm text-muted-foreground">Tests Taken</p>
                      </CardContent>
                    </Card>
                    <Card className="card-hover overflow-hidden">
                      <CardContent className="p-5 text-center relative">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-warning/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="icon-container icon-container-warning w-12 h-12 mx-auto mb-3">
                          <Trophy className="w-6 h-6" />
                        </div>
                        <p className="text-2xl font-bold">
                          {Math.round(testHistory.reduce((acc, t) => acc + t.score, 0) / testHistory.length)}%
                        </p>
                        <p className="text-sm text-muted-foreground">Avg Score</p>
                      </CardContent>
                    </Card>
                    <Card className="card-hover overflow-hidden">
                      <CardContent className="p-5 text-center relative">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-success/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="icon-container icon-container-success w-12 h-12 mx-auto mb-3">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <p className="text-2xl font-bold">
                          {testHistory.reduce((acc, t) => acc + t.correct_answers, 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">Correct Answers</p>
                      </CardContent>
                    </Card>
                    <Card className="card-hover overflow-hidden">
                      <CardContent className="p-5 text-center relative">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-info/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="icon-container icon-container-info w-12 h-12 mx-auto mb-3">
                          <Clock className="w-6 h-6" />
                        </div>
                        <p className="text-2xl font-bold">
                          {Math.round(testHistory.reduce((acc, t) => acc + (t.time_taken || 0), 0) / 60)}m
                        </p>
                        <p className="text-sm text-muted-foreground">Time Spent</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </motion.div>
            )}

            {view === "test" && currentTest && currentQuestion && (
              <motion.div
                key="test"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Timer and Progress */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="text-lg px-4 py-1">
                          Question {currentQuestionIndex + 1} / {currentTest.total_questions}
                        </Badge>
                        <Badge className={difficulties.find(d => d.value === currentTest.difficulty)?.color}>
                          {currentTest.difficulty}
                        </Badge>
                      </div>
                      <div className={`flex items-center gap-2 text-lg font-mono ${
                        timeRemaining < 60 ? "text-destructive" : ""
                      }`}>
                        <Clock className="w-5 h-5" />
                        {formatTime(timeRemaining)}
                      </div>
                    </div>
                    <Progress value={(currentQuestionIndex + 1) / currentTest.total_questions * 100} />
                  </CardContent>
                </Card>

                {/* Question */}
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-medium mb-6">{currentQuestion.question}</h2>
                    <div className="space-y-3">
                      {Object.entries(currentQuestion.options).map(([key, value]) => (
                        <Button
                          key={key}
                          variant={selectedAnswers[currentQuestionIndex] === key ? "default" : "outline"}
                          className="w-full justify-start text-left h-auto py-4 px-5"
                          onClick={() => handleAnswerSelect(key)}
                        >
                          <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-4 font-semibold">
                            {key}
                          </span>
                          {value}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0}
                  >
                    Previous
                  </Button>
                  <div className="flex gap-2">
                    {currentQuestionIndex < currentTest.total_questions - 1 ? (
                      <Button onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}>
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    ) : (
                      <Button onClick={handleSubmitTest} disabled={loading} className="bg-success hover:bg-success/90">
                        {loading ? <LoadingSpinner size="sm" /> : "Submit Test"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Question Navigator */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {currentTest.questions.map((_, index) => (
                        <Button
                          key={index}
                          variant={currentQuestionIndex === index ? "default" : selectedAnswers[index] ? "secondary" : "outline"}
                          size="sm"
                          className="w-10 h-10"
                          onClick={() => setCurrentQuestionIndex(index)}
                        >
                          {index + 1}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {view === "result" && currentTest && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Score Card */}
                <Card className="text-center">
                  <CardContent className="py-12">
                    <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center text-4xl font-bold mb-4 ${
                      currentTest.score >= 70 ? "bg-success/20 text-success" :
                      currentTest.score >= 40 ? "bg-warning/20 text-warning" :
                      "bg-destructive/20 text-destructive"
                    }`}>
                      {Math.round(currentTest.score)}%
                    </div>
                    <h2 className="text-2xl font-bold mb-2">
                      {currentTest.score >= 70 ? "Excellent!" :
                       currentTest.score >= 40 ? "Good Effort!" : "Keep Practicing!"}
                    </h2>
                    <p className="text-muted-foreground">
                      You answered {currentTest.correct_answers} out of {currentTest.total_questions} questions correctly
                    </p>
                    <div className="flex justify-center gap-4 mt-6">
                      <Badge variant="outline" className="text-base px-4 py-2">
                        <Clock className="w-4 h-4 mr-2" />
                        {formatTime(currentTest.time_taken || 0)}
                      </Badge>
                      <Badge className={difficulties.find(d => d.value === currentTest.difficulty)?.color + " text-base px-4 py-2"}>
                        {currentTest.difficulty}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Review */}
                <Card>
                  <CardHeader>
                    <CardTitle>Question Review</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {currentTest.questions.map((q, index) => {
                      const userAnswer = currentTest.answers[index];
                      const isCorrect = userAnswer === q.correctAnswer;
                      
                      return (
                        <div key={q.id} className={`p-4 rounded-lg border ${
                          isCorrect ? "border-success/50 bg-success/5" : "border-destructive/50 bg-destructive/5"
                        }`}>
                          <div className="flex items-start gap-3">
                            {isCorrect ? (
                              <CheckCircle2 className="w-6 h-6 text-success shrink-0 mt-1" />
                            ) : (
                              <XCircle className="w-6 h-6 text-destructive shrink-0 mt-1" />
                            )}
                            <div className="flex-1">
                              <p className="font-medium mb-2">Q{index + 1}: {q.question}</p>
                              <div className="text-sm space-y-1">
                                <p className="text-muted-foreground">
                                  Your answer: <span className={isCorrect ? "text-success" : "text-destructive"}>
                                    {userAnswer ? `${userAnswer}) ${q.options[userAnswer as keyof typeof q.options]}` : "Not answered"}
                                  </span>
                                </p>
                                {!isCorrect && (
                                  <p className="text-success">
                                    Correct answer: {q.correctAnswer}) {q.options[q.correctAnswer as keyof typeof q.options]}
                                  </p>
                                )}
                                <p className="text-muted-foreground mt-2 italic">{q.explanation}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <div className="flex gap-4">
                  <Button onClick={resetTest} className="flex-1">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Take Another Test
                  </Button>
                </div>
              </motion.div>
            )}

            {view === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {testHistory.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title="No Test History"
                    description="You haven't taken any tests yet. Start your first test!"
                    action={{
                      label: "Take a Test",
                      onClick: () => setView("setup"),
                    }}
                  />
                ) : (
                  <div className="space-y-4">
                    {testHistory.map((test) => (
                      <Card key={test.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold ${
                                test.score >= 70 ? "bg-success/20 text-success" :
                                test.score >= 40 ? "bg-warning/20 text-warning" :
                                "bg-destructive/20 text-destructive"
                              }`}>
                                {Math.round(test.score)}%
                              </div>
                              <div>
                                <h3 className="font-semibold capitalize">
                                  {test.category} {test.subcategory ? `- ${test.subcategory.toUpperCase()}` : ""}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {test.correct_answers}/{test.total_questions} correct • {formatTime(test.time_taken || 0)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className={difficulties.find(d => d.value === test.difficulty)?.color}>
                                {test.difficulty}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-2">
                                {new Date(test.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
