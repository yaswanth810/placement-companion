import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageLoader } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/ui/page-transition';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit, Trash2, Code, Flame, Target, Filter, AlertCircle, Loader2,
  Trophy, TrendingUp, Calendar, BookOpen, Zap, Star, CheckCircle2, Clock,
  BarChart3, Award, Bookmark, Hash
} from 'lucide-react';
import { format, differenceInDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay } from 'date-fns';

interface CodingProblem {
  id: string;
  platform: string;
  problem_name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'solved' | 'revision_needed' | 'not_solved';
  date_practiced: string;
  notes: string | null;
  created_at: string;
}

// DSA topics for placement preparation
const dsaTopics = [
  { name: 'Arrays', icon: '📊', target: 30 },
  { name: 'Strings', icon: '🔤', target: 20 },
  { name: 'Linked List', icon: '🔗', target: 15 },
  { name: 'Trees', icon: '🌳', target: 25 },
  { name: 'Graphs', icon: '🕸️', target: 20 },
  { name: 'Dynamic Programming', icon: '🧮', target: 30 },
  { name: 'Backtracking', icon: '↩️', target: 15 },
  { name: 'Binary Search', icon: '🔍', target: 15 },
  { name: 'Stack & Queue', icon: '📚', target: 15 },
  { name: 'Heap', icon: '⛰️', target: 10 },
  { name: 'Greedy', icon: '💰', target: 15 },
  { name: 'Sliding Window', icon: '🪟', target: 10 },
];

const platforms = ['LeetCode', 'HackerRank', 'CodeChef', 'Codeforces', 'GeeksforGeeks', 'Other'];

const difficultyConfig = {
  easy: { color: 'bg-success/10 text-success border-success/20', points: 1 },
  medium: { color: 'bg-warning/10 text-warning border-warning/20', points: 2 },
  hard: { color: 'bg-destructive/10 text-destructive border-destructive/20', points: 3 },
};

const statusConfig = {
  solved: { color: 'bg-success/10 text-success border-success/20', label: 'Solved' },
  revision_needed: { color: 'bg-warning/10 text-warning border-warning/20', label: 'Needs Revision' },
  not_solved: { color: 'bg-muted text-muted-foreground', label: 'Attempted' },
};

export default function CodingPractice() {
  const { user } = useAuth();
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<CodingProblem | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; problemId: string | null }>({ open: false, problemId: null });
  const [activeTab, setActiveTab] = useState<'problems' | 'topics' | 'calendar'>('problems');

  useEffect(() => {
    if (user) fetchProblems();
  }, [user]);

  const fetchProblems = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coding_problems')
        .select('*')
        .eq('user_id', user.id)
        .order('date_practiced', { ascending: false });

      if (error) throw error;
      setProblems((data as CodingProblem[]) || []);
    } catch (error) {
      toast.error('Failed to fetch problems');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    total: problems.length,
    solved: problems.filter((p) => p.status === 'solved').length,
    revision: problems.filter((p) => p.status === 'revision_needed').length,
    easy: problems.filter((p) => p.difficulty === 'easy' && p.status === 'solved').length,
    medium: problems.filter((p) => p.difficulty === 'medium' && p.status === 'solved').length,
    hard: problems.filter((p) => p.difficulty === 'hard' && p.status === 'solved').length,
  };

  // Calculate streak
  const calculateStreak = () => {
    if (problems.length === 0) return 0;
    const dates = [...new Set(problems.map((p) => p.date_practiced))].sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    
    for (let i = 0; i < dates.length; i++) {
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expected = expectedDate.toISOString().split('T')[0];
      
      if (dates[i] === expected || (i === 0 && dates[i] === today)) {
        streak++;
      } else if (i === 0 && dates[0] !== today) {
        // Check if yesterday was practiced
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (dates[0] === yesterday.toISOString().split('T')[0]) {
          streak++;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();

  // Calculate points (LeetCode style)
  const totalPoints = problems
    .filter(p => p.status === 'solved')
    .reduce((acc, p) => acc + difficultyConfig[p.difficulty].points, 0);

  // Calculate weekly activity
  const getWeeklyActivity = () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = problems.filter(p => p.date_practiced === dayStr).length;
      return { day, count, isToday: isToday(day) };
    });
  };

  const weeklyActivity = getWeeklyActivity();

  // Get topic progress
  const getTopicProgress = (topicName: string) => {
    const topicProblems = problems.filter(p => 
      p.notes?.toLowerCase().includes(topicName.toLowerCase()) ||
      p.problem_name.toLowerCase().includes(topicName.toLowerCase())
    );
    return {
      solved: topicProblems.filter(p => p.status === 'solved').length,
      total: topicProblems.length,
    };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const problemName = (formData.get('problem_name') as string).trim();
    const platform = formData.get('platform') as string;
    const datePracticed = formData.get('date_practiced') as string;

    if (!problemName || !platform || !datePracticed) {
      toast.error('Please fill all required fields');
      setSubmitting(false);
      return;
    }

    const problemData = {
      user_id: user.id,
      platform,
      problem_name: problemName,
      difficulty: formData.get('difficulty') as string,
      status: formData.get('status') as string,
      date_practiced: datePracticed,
      notes: (formData.get('notes') as string) || null,
    };

    try {
      if (editingProblem) {
        const { error } = await supabase
          .from('coding_problems')
          .update(problemData)
          .eq('id', editingProblem.id);
        if (error) throw error;
        toast.success('Problem updated!');
      } else {
        const { error } = await supabase.from('coding_problems').insert([problemData]);
        if (error) throw error;
        toast.success('Problem logged! 🎉');
      }
      fetchProblems();
      setIsDialogOpen(false);
      setEditingProblem(null);
    } catch (error) {
      toast.error(editingProblem ? 'Failed to update' : 'Failed to log problem');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.problemId) return;
    try {
      const { error } = await supabase.from('coding_problems').delete().eq('id', deleteConfirm.problemId);
      if (error) throw error;
      toast.success('Problem deleted');
      fetchProblems();
    } catch (error) {
      toast.error('Failed to delete');
    } finally {
      setDeleteConfirm({ open: false, problemId: null });
    }
  };

  const filteredProblems = problems.filter((problem) => {
    if (filterPlatform !== 'all' && problem.platform !== filterPlatform) return false;
    if (filterDifficulty !== 'all' && problem.difficulty !== filterDifficulty) return false;
    return true;
  });

  if (loading) {
    return (
      <AppLayout>
        <PageLoader text="Loading your coding practice..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageTransition>
        <div className="space-y-6">
          {/* Header with LeetCode-style stats */}
          <motion.div 
            className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h1 className="text-3xl font-display font-bold flex items-center gap-3">
                <div className="p-2 rounded-xl gradient-primary">
                  <Code className="h-6 w-6 text-primary-foreground" />
                </div>
                Coding Practice
              </h1>
              <p className="text-muted-foreground mt-2">Track your DSA journey for placements</p>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingProblem(null)} className="gradient-primary border-0 shadow-soft">
                  <Plus className="h-4 w-4 mr-2" />
                  Log Problem
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-primary" />
                    {editingProblem ? 'Edit Problem' : 'Log New Problem'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Platform *</Label>
                      <Select name="platform" defaultValue={editingProblem?.platform || ''} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          {platforms.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Difficulty</Label>
                      <Select name="difficulty" defaultValue={editingProblem?.difficulty || 'medium'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">🟢 Easy (+1 pt)</SelectItem>
                          <SelectItem value="medium">🟡 Medium (+2 pts)</SelectItem>
                          <SelectItem value="hard">🔴 Hard (+3 pts)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Problem Name *</Label>
                    <Input
                      name="problem_name"
                      placeholder="e.g., Two Sum, Merge Intervals"
                      defaultValue={editingProblem?.problem_name || ''}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select name="status" defaultValue={editingProblem?.status || 'solved'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solved">✅ Solved</SelectItem>
                          <SelectItem value="revision_needed">🔄 Needs Revision</SelectItem>
                          <SelectItem value="not_solved">⏳ Attempted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date *</Label>
                      <Input
                        name="date_practiced"
                        type="date"
                        defaultValue={editingProblem?.date_practiced || new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Topic / Approach Notes</Label>
                    <Textarea
                      name="notes"
                      placeholder="e.g., Arrays, Two Pointer, HashMap approach..."
                      rows={3}
                      defaultValue={editingProblem?.notes || ''}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting} className="gradient-primary border-0">
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {editingProblem ? 'Update' : 'Log Problem'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </motion.div>

          {/* Stats Dashboard - LeetCode Style */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="card-hover overflow-hidden">
                <CardContent className="p-4 relative">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.solved}</p>
                      <p className="text-xs text-muted-foreground">Problems Solved</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="card-hover overflow-hidden">
                <CardContent className="p-4 relative">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-warning/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-warning/10">
                      <Flame className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{streak}</p>
                      <p className="text-xs text-muted-foreground">Day Streak 🔥</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="card-hover overflow-hidden">
                <CardContent className="p-4 relative">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-success/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-success/10">
                      <Trophy className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalPoints}</p>
                      <p className="text-xs text-muted-foreground">Total Points</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="card-hover overflow-hidden">
                <CardContent className="p-4 relative">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-destructive/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-destructive/10">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.revision}</p>
                      <p className="text-xs text-muted-foreground">Need Revision</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="card-hover overflow-hidden col-span-2 lg:col-span-1">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">By Difficulty</span>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 text-center">
                      <p className="text-lg font-bold text-success">{stats.easy}</p>
                      <p className="text-[10px] text-muted-foreground">Easy</p>
                    </div>
                    <div className="flex-1 text-center border-x border-border">
                      <p className="text-lg font-bold text-warning">{stats.medium}</p>
                      <p className="text-[10px] text-muted-foreground">Med</p>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-lg font-bold text-destructive">{stats.hard}</p>
                      <p className="text-[10px] text-muted-foreground">Hard</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Weekly Activity Heatmap */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="card-hover">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  This Week's Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between gap-2">
                  {weeklyActivity.map(({ day, count, isToday }) => (
                    <div key={day.toISOString()} className="flex-1 text-center">
                      <p className="text-[10px] text-muted-foreground mb-1">
                        {format(day, 'EEE')}
                      </p>
                      <div 
                        className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                          isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                        } ${
                          count === 0 
                            ? 'bg-muted/50 text-muted-foreground' 
                            : count <= 2 
                              ? 'bg-success/20 text-success' 
                              : count <= 5 
                                ? 'bg-success/40 text-success' 
                                : 'bg-success text-success-foreground'
                        }`}
                      >
                        {count}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-border pb-2">
            {[
              { id: 'problems', label: 'Problems', icon: Code },
              { id: 'topics', label: 'DSA Topics', icon: BookOpen },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={activeTab === tab.id ? 'gradient-primary border-0' : ''}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </Button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'problems' && (
              <motion.div
                key="problems"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                      <SelectTrigger className="w-36 h-9">
                        <SelectValue placeholder="Platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Platforms</SelectItem>
                        {platforms.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                    <SelectTrigger className="w-36 h-9">
                      <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="easy">🟢 Easy</SelectItem>
                      <SelectItem value="medium">🟡 Medium</SelectItem>
                      <SelectItem value="hard">🔴 Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Problems List */}
                {filteredProblems.length === 0 ? (
                  <EmptyState
                    icon={Code}
                    title="No problems logged yet"
                    description="Start solving DSA problems and track your progress for placements!"
                    action={{
                      label: "Log Your First Problem",
                      onClick: () => {
                        setEditingProblem(null);
                        setIsDialogOpen(true);
                      },
                    }}
                  />
                ) : (
                  <div className="space-y-2">
                    {filteredProblems.map((problem, index) => (
                      <motion.div
                        key={problem.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <Card className="card-hover group">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              {/* Problem Number */}
                              <div className="hidden sm:flex w-10 h-10 rounded-lg bg-muted/50 items-center justify-center">
                                <Hash className="h-4 w-4 text-muted-foreground" />
                              </div>
                              
                              {/* Problem Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium truncate">{problem.problem_name}</p>
                                  <Badge variant="outline" className="text-xs">
                                    {problem.platform}
                                  </Badge>
                                </div>
                                {problem.notes && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                    {problem.notes}
                                  </p>
                                )}
                              </div>
                              
                              {/* Badges */}
                              <div className="hidden md:flex items-center gap-2">
                                <Badge className={difficultyConfig[problem.difficulty].color}>
                                  {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                                </Badge>
                                <Badge className={statusConfig[problem.status].color}>
                                  {statusConfig[problem.status].label}
                                </Badge>
                              </div>
                              
                              {/* Date */}
                              <div className="hidden lg:block text-sm text-muted-foreground">
                                {format(new Date(problem.date_practiced), 'MMM d')}
                              </div>
                              
                              {/* Actions */}
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setEditingProblem(problem);
                                    setIsDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteConfirm({ open: true, problemId: problem.id })}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'topics' && (
              <motion.div
                key="topics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dsaTopics.map((topic, index) => {
                    const progress = getTopicProgress(topic.name);
                    const percentage = topic.target > 0 ? Math.min((progress.solved / topic.target) * 100, 100) : 0;
                    
                    return (
                      <motion.div
                        key={topic.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="card-hover">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-2xl">{topic.icon}</span>
                              <div className="flex-1">
                                <p className="font-medium">{topic.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {progress.solved} / {topic.target} target
                                </p>
                              </div>
                              {percentage >= 100 && (
                                <Award className="h-5 w-5 text-warning" />
                              )}
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PageTransition>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
        title="Delete Problem"
        description="Are you sure you want to delete this problem? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </AppLayout>
  );
}
