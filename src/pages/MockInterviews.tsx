import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageTransition } from "@/components/ui/page-transition";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Bot, Send, Mic, MicOff, Play, Square, History,
  MessageSquare, Briefcase, Users, ArrowLeft, Star,
  ThumbsUp, AlertCircle, Lightbulb, CheckCircle2, Volume2, VolumeX,
  Video, VideoOff, Phone, PhoneOff, FileText, Camera
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

interface ResumeOption {
  id: string;
  resume_name: string;
  target_role: string | null;
  file_url: string | null;
  notes: string | null;
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

// AI avatar animation component
function AIAvatar({ isSpeaking, isThinking }: { isSpeaking: boolean; isThinking: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 rounded-2xl overflow-hidden">
      {/* Background animated circles */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-primary/10 blur-2xl"
          animate={{ scale: isSpeaking ? [1, 1.3, 1] : 1, opacity: isSpeaking ? [0.3, 0.6, 0.3] : 0.2 }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-24 h-24 rounded-full bg-accent/10 blur-2xl"
          animate={{ scale: isSpeaking ? [1.2, 1, 1.2] : 1, opacity: isSpeaking ? [0.4, 0.2, 0.4] : 0.15 }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      {/* AI face */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <motion.div
          className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-2xl"
          animate={isSpeaking ? { scale: [1, 1.05, 1] } : isThinking ? { rotate: [0, 5, -5, 0] } : {}}
          transition={{ duration: isSpeaking ? 0.5 : 2, repeat: Infinity }}
        >
          <Bot className="w-12 h-12 md:w-16 md:h-16 text-primary-foreground" />
        </motion.div>

        {/* Sound waves when speaking */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1"
            >
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-primary rounded-full"
                  animate={{ height: [8, 24, 8] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </motion.div>
          )}
          {isThinking && !isSpeaking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-1.5"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2.5 h-2.5 bg-primary/60 rounded-full"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-sm font-medium text-muted-foreground">
          {isSpeaking ? "Speaking..." : isThinking ? "Thinking..." : "AI Interviewer"}
        </p>
      </div>
    </div>
  );
}

// Webcam component
function WebcamFeed({ isActive }: { isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isActive) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          // Camera not available, fail silently
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive]);

  if (!isActive) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded-xl">
        <div className="text-center">
          <VideoOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Camera off</p>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className="w-full h-full object-cover rounded-xl mirror"
      style={{ transform: "scaleX(-1)" }}
    />
  );
}

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
  
  // Resume state
  const [resumes, setResumes] = useState<ResumeOption[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [resumeText, setResumeText] = useState("");
  
  // Video call state
  const [cameraOn, setCameraOn] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Speech recognition
  const {
    isListening,
    isSupported: speechSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    language: 'en-US',
    onError: (error) => {
      toast.error(error);
    },
  });

  // Append transcript to input
  useEffect(() => {
    if (transcript) {
      setInputMessage((prev) => {
        const separator = prev && !prev.endsWith(' ') ? ' ' : '';
        return prev + separator + transcript;
      });
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  const toggleVoiceInput = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // TTS using ElevenLabs - now returns binary audio
  const speakText = useCallback(async (text: string) => {
    if (!ttsEnabled || !text) return;
    
    try {
      setIsSpeaking(true);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: text.slice(0, 2000) }),
        }
      );

      if (!response.ok) {
        console.error("TTS failed:", response.status);
        setIsSpeaking(false);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        audioRef.current = null;
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
        audioRef.current = null;
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } catch (error) {
      console.error("TTS error:", error);
      setIsSpeaking(false);
    }
  }, [ttsEnabled]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  // Fetch resumes for selection
  useEffect(() => {
    if (!user) return;
    supabase
      .from("resumes")
      .select("id, resume_name, target_role, file_url, notes")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        if (data) setResumes(data);
      });
  }, [user]);

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

  // When resume is selected, fetch its notes as context
  useEffect(() => {
    if (!selectedResumeId) {
      setResumeText("");
      return;
    }
    const resume = resumes.find(r => r.id === selectedResumeId);
    if (resume?.notes) {
      setResumeText(resume.notes);
    }
    if (resume?.target_role && !targetRole) {
      setTargetRole(resume.target_role);
    }
  }, [selectedResumeId, resumes]);

  const startInterview = async () => {
    if (!user) return;
    setLoading(true);
    try {
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
            resumeText,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start interview");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiMessage = "";
      
      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          
          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            
            if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
            try {
              const json = JSON.parse(line.slice(6));
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                aiMessage += content;
                setMessages([{ role: "assistant", content: aiMessage }]);
              }
            } catch {}
          }
        }
      }

      const initialMessages: Message[] = [{ role: "assistant", content: aiMessage }];
      setMessages(initialMessages);
      
      await supabase
        .from("mock_interviews")
        .update({ messages: initialMessages as unknown as Json, questions_asked: 1 })
        .eq("id", interviewData.id);

      setCurrentInterview(interviewData as unknown as MockInterview);
      setView("interview");
      toast.success("Interview started! Good luck!");
      
      if (aiMessage) speakText(aiMessage);
    } catch (error: unknown) {
      console.error("Error starting interview:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start interview");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentInterview || sendingMessage) return;
    
    // Stop listening when sending
    if (isListening) stopListening();
    
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
            resumeText,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiMessage = "";
      
      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          
          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            
            if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
            try {
              const json = JSON.parse(line.slice(6));
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                aiMessage += content;
                setMessages([...updatedMessages, { role: "assistant", content: aiMessage }]);
              }
            } catch {}
          }
        }
      }

      const finalMessages: Message[] = [...updatedMessages, { role: "assistant", content: aiMessage }];
      setMessages(finalMessages);
      
      const questionsAsked = finalMessages.filter(m => m.role === "assistant").length;
      
      await supabase
        .from("mock_interviews")
        .update({ messages: finalMessages as unknown as Json, questions_asked: questionsAsked })
        .eq("id", currentInterview.id);

      if (aiMessage) speakText(aiMessage);
    } catch (error: unknown) {
      console.error("Error sending message:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const endInterview = async () => {
    if (!currentInterview) return;
    stopSpeaking();
    if (isListening) stopListening();
    
    setLoading(true);
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
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            interviewType: currentInterview.interview_type,
            targetRole: currentInterview.target_role,
            difficulty: currentInterview.difficulty,
            action: "feedback",
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to get feedback");

      const feedbackData: InterviewFeedback = await response.json();
      setFeedback(feedbackData);
      
      await supabase
        .from("mock_interviews")
        .update({
          feedback: feedbackData as unknown as Json,
          overall_rating: feedbackData.overallRating,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", currentInterview.id);

      setCameraOn(false);
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
    setCameraOn(true);
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

  // Auto-send on voice when user pauses
  useEffect(() => {
    if (!isListening && inputMessage.trim() && view === "interview" && !sendingMessage) {
      const timer = setTimeout(() => {
        if (inputMessage.trim()) sendMessage();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isListening, inputMessage, view]);

  return (
    <AppLayout>
      <PageTransition>
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Mock Interviews</h1>
              <p className="text-muted-foreground">
                {view === "interview" ? "Live Interview Session" : "AI-powered interview practice"}
              </p>
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
            {/* ============ SETUP VIEW ============ */}
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
                        interviewType === type.value ? "ring-2 ring-primary shadow-lg" : ""
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
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Camera className="w-5 h-5 text-primary" />
                      Interview Configuration
                    </CardTitle>
                    <CardDescription>Set up your live interview session</CardDescription>
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

                    {/* Resume Selection */}
                    <div>
                      <label className="text-sm font-medium mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        Select Resume (AI will personalize questions)
                      </label>
                      <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a resume (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No resume</SelectItem>
                          {resumes.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.resume_name} {r.target_role ? `• ${r.target_role}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedResumeId && selectedResumeId !== "none" && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-success" />
                          Resume loaded — AI will ask questions based on your experience
                        </p>
                      )}
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
                        <Video className="w-5 h-5 mr-2" />
                      )}
                      {loading ? "Connecting..." : "Start Live Interview"}
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

            {/* ============ LIVE INTERVIEW VIEW ============ */}
            {view === "interview" && currentInterview && (
              <motion.div
                key="interview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Video Call Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[70vh]">
                  {/* AI Interviewer - Main */}
                  <div className="lg:col-span-2 relative">
                    <AIAvatar isSpeaking={isSpeaking} isThinking={sendingMessage} />
                    
                    {/* Interview info overlay */}
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                        <span className="w-2 h-2 rounded-full bg-destructive animate-pulse mr-2" />
                        Live
                      </Badge>
                      <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm capitalize">
                        {currentInterview.interview_type}
                      </Badge>
                    </div>

                    {/* User webcam pip */}
                    <div className="absolute bottom-4 right-4 w-32 h-24 md:w-48 md:h-36 rounded-xl overflow-hidden shadow-2xl border-2 border-background">
                      <WebcamFeed isActive={cameraOn} />
                    </div>
                  </div>

                  {/* Chat / Transcript Panel */}
                  <div className="flex flex-col bg-card rounded-2xl border overflow-hidden">
                    <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Transcript</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Q{messages.filter(m => m.role === "assistant").length}
                      </Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                      {messages.map((message, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex gap-2 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                            message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}>
                            {message.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                          </div>
                          <div className={`max-w-[85%] p-3 rounded-xl text-sm ${
                            message.role === "user" 
                              ? "bg-primary text-primary-foreground rounded-br-sm" 
                              : "bg-muted rounded-bl-sm"
                          }`}>
                            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          </div>
                        </motion.div>
                      ))}
                      {sendingMessage && (
                        <div className="flex gap-2">
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                            <Bot className="w-3.5 h-3.5" />
                          </div>
                          <div className="bg-muted p-3 rounded-xl rounded-bl-sm">
                            <LoadingSpinner size="sm" />
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input area */}
                    <div className="border-t p-3 space-y-2">
                      <AnimatePresence>
                        {isListening && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 text-primary text-xs">
                              <div className="flex gap-0.5">
                                {[0, 1, 2].map(i => (
                                  <span key={i} className="w-0.5 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                                ))}
                              </div>
                              <span className="font-medium">Listening...</span>
                              {interimTranscript && (
                                <span className="text-muted-foreground italic truncate max-w-[120px]">
                                  "{interimTranscript}"
                                </span>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex gap-2">
                        <Textarea
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          placeholder={isListening ? "Speak now..." : "Type or use voice..."}
                          className="resize-none text-sm min-h-[40px]"
                          rows={1}
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
                          size="icon"
                          className="shrink-0"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Call Controls Bar */}
                <div className="flex items-center justify-center gap-3 py-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isListening ? "default" : "outline"}
                        size="lg"
                        className={`rounded-full w-14 h-14 ${isListening ? "bg-primary animate-pulse" : ""}`}
                        onClick={toggleVoiceInput}
                        disabled={!speechSupported}
                      >
                        {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {!speechSupported ? "Not supported" : isListening ? "Mute" : "Unmute"}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={cameraOn ? "outline" : "secondary"}
                        size="lg"
                        className="rounded-full w-14 h-14"
                        onClick={() => setCameraOn(!cameraOn)}
                      >
                        {cameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{cameraOn ? "Turn off camera" : "Turn on camera"}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={ttsEnabled ? "outline" : "secondary"}
                        size="lg"
                        className="rounded-full w-14 h-14"
                        onClick={() => {
                          if (isSpeaking) stopSpeaking();
                          setTtsEnabled(!ttsEnabled);
                        }}
                      >
                        {ttsEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{ttsEnabled ? "Mute AI voice" : "Unmute AI voice"}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="destructive"
                        size="lg"
                        className="rounded-full w-14 h-14"
                        onClick={endInterview}
                        disabled={loading}
                      >
                        {loading ? <LoadingSpinner size="sm" /> : <PhoneOff className="w-6 h-6" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>End Interview</TooltipContent>
                  </Tooltip>
                </div>
              </motion.div>
            )}

            {/* ============ FEEDBACK VIEW ============ */}
            {view === "feedback" && feedback && (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
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

            {/* ============ HISTORY VIEW ============ */}
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
