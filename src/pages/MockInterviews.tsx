import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageTransition } from "@/components/ui/page-transition";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Bot, Send, Mic, MicOff, Play, Square, History,
  MessageSquare, Briefcase, Users, ArrowLeft, Star,
  ThumbsUp, AlertCircle, Lightbulb, CheckCircle2
} from "lucide-react";
import { Json } from "@/integrations/supabase/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface InterviewFeedback {
  overallRating: number;
  strengths: string[];
  improvements: string[];
  questionFeedback: { question: string; rating: number; feedback: string }[];
  tips: string[];
  summary: string;
}

interface MockInterview {
  id: string;
  interview_type: string;
  target_role: string | null;
  difficulty: string;
  messages: Message[];
  questions_asked: number;
  feedback: InterviewFeedback | null;
  overall_rating: number | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

const interviewTypes = [
  { value: "technical", label: "Technical Interview", icon: Briefcase, description: "DSA, System Design, Coding" },
  { value: "hr", label: "HR Interview", icon: Users, description: "Background, Goals, Culture Fit" },
  { value: "behavioral", label: "Behavioral Interview", icon: MessageSquare, description: "STAR Method, Past Experiences" },
];

const difficulties = [
  { value: "easy", label: "Entry Level" },
  { value: "medium", label: "Mid Level" },
  { value: "hard", label: "Senior Level" },
];

export default function MockInterviews() {
  const { user } = useAuth();
  const [view, setView] = useState<"setup" | "interview" | "feedback" | "history">("setup");
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [interviewHistory, setInterviewHistory] = useState<MockInterview[]>([]);
  const [currentInterview, setCurrentInterview] = useState<MockInterview | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  
  // Setup state
  const [interviewType, setInterviewType] = useState("technical");
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [difficulty, setDifficulty] = useState("medium");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchInterviewHistory = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("mock_interviews")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setInterviewHistory((data || []) as unknown as MockInterview[]);
    } catch (error) {
      console.error("Error fetching interview history:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchInterviewHistory();
  }, [fetchInterviewHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startInterview = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Create interview in database
      const { data: interviewData, error: insertError } = await supabase
        .from("mock_interviews")
        .insert({
          user_id: user.id,
          interview_type: interviewType,
          target_role: targetRole,
          difficulty,
          messages: [],
          status: "in_progress",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Get initial greeting from AI
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mock-interview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [],
            interviewType,
            targetRole,
            difficulty,
            action: "start",
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start interview");
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiMessage = "";
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  aiMessage += content;
                  setMessages([{ role: "assistant", content: aiMessage }]);
                }
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }
      }

      const initialMessages: Message[] = [{ role: "assistant", content: aiMessage }];
      setMessages(initialMessages);
      
      // Update interview with initial message
      await supabase
        .from("mock_interviews")
        .update({ 
          messages: initialMessages as unknown as Json,
          questions_asked: 1 
        })
        .eq("id", interviewData.id);

      setCurrentInterview(interviewData as unknown as MockInterview);
      setView("interview");
      toast.success("Interview started! Good luck!");
    } catch (error: unknown) {
      console.error("Error starting interview:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start interview");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentInterview || sendingMessage) return;
    
    const userMessage: Message = { role: "user", content: inputMessage.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage("");
    setSendingMessage(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mock-interview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
            interviewType: currentInterview.interview_type,
            targetRole: currentInterview.target_role,
            difficulty: currentInterview.difficulty,
            action: "continue",
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get response");
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiMessage = "";
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  aiMessage += content;
                  setMessages([...updatedMessages, { role: "assistant", content: aiMessage }]);
                }
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }
      }

      const finalMessages: Message[] = [...updatedMessages, { role: "assistant", content: aiMessage }];
      setMessages(finalMessages);
      
      // Count questions asked (simplified - count assistant messages)
      const questionsAsked = finalMessages.filter(m => m.role === "assistant").length;
      
      // Update interview in database
      await supabase
        .from("mock_interviews")
        .update({ 
          messages: finalMessages as unknown as Json,
          questions_asked: questionsAsked
        })
        .eq("id", currentInterview.id);

    } catch (error: unknown) {
      console.error("Error sending message:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const endInterview = async () => {
    if (!currentInterview) return;
    
    setLoading(true);
    try {
      // Get feedback from AI
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mock-interview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            interviewType: currentInterview.interview_type,
            targetRole: currentInterview.target_role,
            difficulty: currentInterview.difficulty,
            action: "feedback",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get feedback");
      }

      const feedbackData: InterviewFeedback = await response.json();
      setFeedback(feedbackData);
      
      // Update interview in database
      await supabase
        .from("mock_interviews")
        .update({
          feedback: feedbackData as unknown as Json,
          overall_rating: feedbackData.overallRating,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", currentInterview.id);

      setView("feedback");
      toast.success("Interview completed!");
    } catch (error: unknown) {
      console.error("Error ending interview:", error);
      toast.error("Failed to get feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetInterview = () => {
    setCurrentInterview(null);
    setMessages([]);
    setFeedback(null);
    setView("setup");
    fetchInterviewHistory();
  };

  const viewHistoryInterview = (interview: MockInterview) => {
    setCurrentInterview(interview);
    setMessages(interview.messages);
    if (interview.feedback) {
      setFeedback(interview.feedback);
      setView("feedback");
    } else {
      setView("interview");
    }
  };

  return (
    <AppLayout>
      <PageTransition>
        <div className="p-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Mock Interviews</h1>
              <p className="text-muted-foreground">Practice with AI-powered interviews</p>
            </div>
            {view === "setup" && (
              <Button variant="outline" onClick={() => setView("history")}>
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
            )}
            {(view === "history" || view === "feedback") && (
              <Button variant="outline" onClick={resetInterview}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                New Interview
              </Button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {view === "setup" && (
              <motion.div
                key="setup"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Interview Type Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {interviewTypes.map((type) => (
                    <Card
                      key={type.value}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        interviewType === type.value ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setInterviewType(type.value)}
                    >
                      <CardContent className="p-6 text-center">
                        <type.icon className={`w-12 h-12 mx-auto mb-3 ${
                          interviewType === type.value ? "text-primary" : "text-muted-foreground"
                        }`} />
                        <h3 className="font-semibold text-lg">{type.label}</h3>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Interview Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Target Role</label>
                        <Input
                          value={targetRole}
                          onChange={(e) => setTargetRole(e.target.value)}
                          placeholder="e.g., Software Engineer, Data Analyst"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Experience Level</label>
                        <Select value={difficulty} onValueChange={setDifficulty}>
                          <SelectTrigger>
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
                    </div>

                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={startInterview}
                      disabled={loading || !targetRole.trim()}
                    >
                      {loading ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : (
                        <Play className="w-5 h-5 mr-2" />
                      )}
                      {loading ? "Starting Interview..." : "Start Interview"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Stats */}
                {interviewHistory.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <p className="text-2xl font-bold">{interviewHistory.length}</p>
                        <p className="text-sm text-muted-foreground">Interviews</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Star className="w-8 h-8 mx-auto mb-2 text-warning" />
                        <p className="text-2xl font-bold">
                          {interviewHistory.filter(i => i.overall_rating).length > 0 
                            ? (interviewHistory.reduce((acc, i) => acc + (i.overall_rating || 0), 0) / 
                               interviewHistory.filter(i => i.overall_rating).length).toFixed(1)
                            : "-"}
                        </p>
                        <p className="text-sm text-muted-foreground">Avg Rating</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Briefcase className="w-8 h-8 mx-auto mb-2 text-info" />
                        <p className="text-2xl font-bold">
                          {interviewHistory.filter(i => i.interview_type === "technical").length}
                        </p>
                        <p className="text-sm text-muted-foreground">Technical</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Users className="w-8 h-8 mx-auto mb-2 text-success" />
                        <p className="text-2xl font-bold">
                          {interviewHistory.filter(i => i.interview_type !== "technical").length}
                        </p>
                        <p className="text-sm text-muted-foreground">HR/Behavioral</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </motion.div>
            )}

            {view === "interview" && currentInterview && (
              <motion.div
                key="interview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <Card className="h-[60vh] flex flex-col">
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="capitalize">{currentInterview.interview_type} Interview</CardTitle>
                        <CardDescription>{currentInterview.target_role}</CardDescription>
                      </div>
                      <Button variant="destructive" size="sm" onClick={endInterview} disabled={loading}>
                        {loading ? <LoadingSpinner size="sm" /> : (
                          <>
                            <Square className="w-4 h-4 mr-2" />
                            End Interview
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}>
                          {message.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                        </div>
                        <div className={`max-w-[80%] p-4 rounded-2xl ${
                          message.role === "user" 
                            ? "bg-primary text-primary-foreground rounded-br-md" 
                            : "bg-muted rounded-bl-md"
                        }`}>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </motion.div>
                    ))}
                    {sendingMessage && (
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div className="bg-muted p-4 rounded-2xl rounded-bl-md">
                          <LoadingSpinner size="sm" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </CardContent>

                  <div className="border-t p-4">
                    <div className="flex gap-2">
                      <Textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Type your answer..."
                        className="resize-none"
                        rows={2}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                      />
                      <Button 
                        onClick={sendMessage} 
                        disabled={!inputMessage.trim() || sendingMessage}
                        size="lg"
                      >
                        <Send className="w-5 h-5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Press Enter to send, Shift+Enter for new line
                    </p>
                  </div>
                </Card>
              </motion.div>
            )}

            {view === "feedback" && feedback && (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Overall Rating */}
                <Card className="text-center">
                  <CardContent className="py-8">
                    <div className="flex justify-center gap-1 mb-4">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                        <Star
                          key={star}
                          className={`w-8 h-8 ${
                            star <= feedback.overallRating
                              ? "text-warning fill-warning"
                              : "text-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <h2 className="text-3xl font-bold mb-2">{feedback.overallRating}/10</h2>
                    <p className="text-muted-foreground">{feedback.summary}</p>
                  </CardContent>
                </Card>

                {/* Strengths & Improvements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-success">
                        <ThumbsUp className="w-5 h-5" />
                        Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {feedback.strengths.map((strength, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-warning">
                        <AlertCircle className="w-5 h-5" />
                        Areas to Improve
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {feedback.improvements.map((improvement, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                            <span>{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Tips */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-info" />
                      Tips for Future Interviews
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {feedback.tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Lightbulb className="w-5 h-5 text-info shrink-0 mt-0.5" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Question Breakdown */}
                {feedback.questionFeedback && feedback.questionFeedback.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Question-by-Question Feedback</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {feedback.questionFeedback.map((qf, index) => (
                        <div key={index} className="p-4 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">{qf.question}</p>
                            <Badge variant={qf.rating >= 7 ? "default" : qf.rating >= 4 ? "secondary" : "destructive"}>
                              {qf.rating}/10
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{qf.feedback}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Button onClick={resetInterview} className="w-full" size="lg">
                  Start New Interview
                </Button>
              </motion.div>
            )}

            {view === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {interviewHistory.length === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title="No Interview History"
                    description="You haven't done any mock interviews yet. Start practicing!"
                    action={{
                      label: "Start Interview",
                      onClick: () => setView("setup"),
                    }}
                  />
                ) : (
                  <div className="space-y-4">
                    {interviewHistory.map((interview) => (
                      <Card 
                        key={interview.id} 
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => viewHistoryInterview(interview)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                                interview.interview_type === "technical" ? "bg-primary/20 text-primary" :
                                interview.interview_type === "hr" ? "bg-success/20 text-success" :
                                "bg-warning/20 text-warning"
                              }`}>
                                {interview.interview_type === "technical" ? <Briefcase className="w-6 h-6" /> :
                                 interview.interview_type === "hr" ? <Users className="w-6 h-6" /> :
                                 <MessageSquare className="w-6 h-6" />}
                              </div>
                              <div>
                                <h3 className="font-semibold capitalize">
                                  {interview.interview_type} Interview
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {interview.target_role} • {interview.questions_asked} questions
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {interview.overall_rating && (
                                <div className="flex items-center gap-1 mb-1">
                                  <Star className="w-4 h-4 text-warning fill-warning" />
                                  <span className="font-semibold">{interview.overall_rating}/10</span>
                                </div>
                              )}
                              <Badge variant={interview.status === "completed" ? "default" : "secondary"}>
                                {interview.status}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(interview.created_at).toLocaleDateString()}
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
