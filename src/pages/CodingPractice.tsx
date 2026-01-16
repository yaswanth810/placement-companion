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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Code, Flame, Target, Filter, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

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

const platforms = ['LeetCode', 'HackerRank', 'CodeChef', 'Codeforces', 'GeeksforGeeks', 'Other'];

const difficultyColors = {
  easy: 'bg-success/10 text-success border-success/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  hard: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusColors = {
  solved: 'bg-success/10 text-success border-success/20',
  revision_needed: 'bg-warning/10 text-warning border-warning/20',
  not_solved: 'bg-muted text-muted-foreground',
};

const statusLabels = {
  solved: 'Solved',
  revision_needed: 'Needs Revision',
  not_solved: 'Not Solved',
};

export default function CodingPractice() {
  const { user } = useAuth();
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<CodingProblem | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (user) fetchProblems();
  }, [user]);

  const fetchProblems = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('coding_problems')
      .select('*')
      .eq('user_id', user.id)
      .order('date_practiced', { ascending: false });

    if (error) {
      toast.error('Failed to fetch problems');
    } else {
      setProblems((data as CodingProblem[]) || []);
      calculateStreak((data as CodingProblem[]) || []);
    }
    setLoading(false);
  };

  const calculateStreak = (problemList: CodingProblem[]) => {
    if (problemList.length === 0) {
      setStreak(0);
      return;
    }

    const dates = [...new Set(problemList.map((p) => p.date_practiced))].sort().reverse();
    let currentStreak = 0;

    for (let i = 0; i < dates.length; i++) {
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expected = expectedDate.toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      if (dates[i] === expected || (i === 0 && dates[i] === today)) {
        currentStreak++;
      } else {
        break;
      }
    }

    setStreak(currentStreak);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);

    const problemData = {
      user_id: user.id,
      platform: formData.get('platform') as string,
      problem_name: formData.get('problem_name') as string,
      difficulty: formData.get('difficulty') as string,
      status: formData.get('status') as string,
      date_practiced: formData.get('date_practiced') as string,
      notes: (formData.get('notes') as string) || null,
    };

    if (editingProblem) {
      const { error } = await supabase
        .from('coding_problems')
        .update(problemData)
        .eq('id', editingProblem.id);

      if (error) {
        toast.error('Failed to update problem');
      } else {
        toast.success('Problem updated successfully');
        fetchProblems();
      }
    } else {
      const { error } = await supabase.from('coding_problems').insert([problemData]);

      if (error) {
        toast.error('Failed to add problem');
      } else {
        toast.success('Problem added successfully');
        fetchProblems();
      }
    }

    setIsDialogOpen(false);
    setEditingProblem(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('coding_problems').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete problem');
    } else {
      toast.success('Problem deleted');
      fetchProblems();
    }
  };

  const handleEdit = (problem: CodingProblem) => {
    setEditingProblem(problem);
    setIsDialogOpen(true);
  };

  const filteredProblems = problems.filter((problem) => {
    if (filterPlatform !== 'all' && problem.platform !== filterPlatform) return false;
    if (filterDifficulty !== 'all' && problem.difficulty !== filterDifficulty) return false;
    return true;
  });

  const stats = {
    total: problems.length,
    solved: problems.filter((p) => p.status === 'solved').length,
    revision: problems.filter((p) => p.status === 'revision_needed').length,
    easy: problems.filter((p) => p.difficulty === 'easy' && p.status === 'solved').length,
    medium: problems.filter((p) => p.difficulty === 'medium' && p.status === 'solved').length,
    hard: problems.filter((p) => p.difficulty === 'hard' && p.status === 'solved').length,
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Coding Practice</h1>
            <p className="text-muted-foreground mt-1">Track your problem-solving journey</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingProblem(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Log Problem
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProblem ? 'Edit Problem' : 'Log New Problem'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
                    <Select name="platform" defaultValue={editingProblem?.platform || ''} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {platforms.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select name="difficulty" defaultValue={editingProblem?.difficulty || 'medium'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="problem_name">Problem Name</Label>
                  <Input
                    id="problem_name"
                    name="problem_name"
                    placeholder="e.g., Two Sum"
                    defaultValue={editingProblem?.problem_name || ''}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue={editingProblem?.status || 'solved'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solved">Solved</SelectItem>
                        <SelectItem value="revision_needed">Needs Revision</SelectItem>
                        <SelectItem value="not_solved">Not Solved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_practiced">Date</Label>
                    <Input
                      id="date_practiced"
                      name="date_practiced"
                      type="date"
                      defaultValue={editingProblem?.date_practiced || new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Approach / Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Describe your approach..."
                    rows={3}
                    defaultValue={editingProblem?.notes || ''}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingProblem ? 'Update' : 'Log Problem'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <Code className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Solved</p>
                <p className="text-2xl font-bold">{stats.solved}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/10 text-warning">
                <Flame className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Streak</p>
                <p className="text-2xl font-bold">{streak} days</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10 text-success">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">By Difficulty</p>
                <div className="flex gap-2 text-sm">
                  <span className="text-success">{stats.easy}E</span>
                  <span className="text-warning">{stats.medium}M</span>
                  <span className="text-destructive">{stats.hard}H</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Need Revision</p>
                <p className="text-2xl font-bold">{stats.revision}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {platforms.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Difficulties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Problems Table */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filteredProblems.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Code className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No problems logged yet. Start practicing!</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Problem</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProblems.map((problem) => (
                    <TableRow key={problem.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{problem.problem_name}</p>
                          {problem.notes && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{problem.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{problem.platform}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={difficultyColors[problem.difficulty]}>
                          {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[problem.status]}>
                          {statusLabels[problem.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(problem.date_practiced), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(problem)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(problem.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
