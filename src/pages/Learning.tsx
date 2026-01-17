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
import { Plus, Edit, Trash2, BookOpen, ExternalLink, Filter, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface LearningGoal {
  id: string;
  skill_name: string;
  topic_name: string;
  status: 'not_started' | 'in_progress' | 'completed';
  start_date: string | null;
  target_date: string | null;
  resource_links: string[] | null;
  notes: string | null;
  created_at: string;
}

const skills = ['DSA', 'Web Development', 'Blockchain', 'SAP', 'Machine Learning', 'System Design', 'Databases', 'Other'];

const statusColors = {
  not_started: 'bg-muted text-muted-foreground',
  in_progress: 'bg-warning/10 text-warning border-warning/20',
  completed: 'bg-success/10 text-success border-success/20',
};

const statusLabels = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export default function Learning() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<LearningGoal | null>(null);
  const [filterSkill, setFilterSkill] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; goalId: string | null }>({ open: false, goalId: null });

  useEffect(() => {
    if (user) fetchGoals();
  }, [user]);

  const fetchGoals = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('learning_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals((data as LearningGoal[]) || []);
    } catch (error) {
      toast.error('Failed to fetch learning goals');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const topicName = (formData.get('topic_name') as string).trim();
    const skillName = formData.get('skill_name') as string;

    if (!topicName) {
      toast.error('Topic name is required');
      setSubmitting(false);
      return;
    }

    if (!skillName) {
      toast.error('Please select a skill');
      setSubmitting(false);
      return;
    }

    const resourceLinksRaw = formData.get('resource_links') as string;
    const resourceLinks = resourceLinksRaw
      ? resourceLinksRaw.split('\n').filter((link) => link.trim())
      : null;

    const goalData = {
      user_id: user.id,
      skill_name: skillName,
      topic_name: topicName,
      status: formData.get('status') as string,
      start_date: (formData.get('start_date') as string) || null,
      target_date: (formData.get('target_date') as string) || null,
      resource_links: resourceLinks,
      notes: (formData.get('notes') as string) || null,
    };

    try {
      if (editingGoal) {
        const { error } = await supabase
          .from('learning_goals')
          .update(goalData)
          .eq('id', editingGoal.id);

        if (error) throw error;
        toast.success('Goal updated successfully');
      } else {
        const { error } = await supabase.from('learning_goals').insert([goalData]);

        if (error) throw error;
        toast.success('Goal created successfully');
      }
      fetchGoals();
      setIsDialogOpen(false);
      setEditingGoal(null);
    } catch (error) {
      toast.error(editingGoal ? 'Failed to update goal' : 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.goalId) return;

    try {
      const { error } = await supabase.from('learning_goals').delete().eq('id', deleteConfirm.goalId);
      if (error) throw error;
      toast.success('Goal deleted');
      fetchGoals();
    } catch (error) {
      toast.error('Failed to delete goal');
    } finally {
      setDeleteConfirm({ open: false, goalId: null });
    }
  };

  const handleEdit = (goal: LearningGoal) => {
    setEditingGoal(goal);
    setIsDialogOpen(true);
  };

  const filteredGoals = goals.filter((goal) => {
    if (filterSkill !== 'all' && goal.skill_name !== filterSkill) return false;
    if (filterStatus !== 'all' && goal.status !== filterStatus) return false;
    return true;
  });

  // Calculate progress per skill
  const skillProgress = skills
    .map((skill) => {
      const skillGoals = goals.filter((g) => g.skill_name === skill);
      if (skillGoals.length === 0) return null;
      const completed = skillGoals.filter((g) => g.status === 'completed').length;
      return {
        skill,
        total: skillGoals.length,
        completed,
        percentage: Math.round((completed / skillGoals.length) * 100),
      };
    })
    .filter(Boolean);

  if (loading) {
    return (
      <AppLayout>
        <PageLoader text="Loading your learning goals..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageTransition>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold">Learning Tracker</h1>
              <p className="text-muted-foreground mt-1">
                Track your learning goals and progress
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingGoal(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingGoal ? 'Edit Goal' : 'Add New Goal'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="skill_name">Skill *</Label>
                      <Select name="skill_name" defaultValue={editingGoal?.skill_name || ''} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select skill" />
                        </SelectTrigger>
                        <SelectContent>
                          {skills.map((skill) => (
                            <SelectItem key={skill} value={skill}>
                              {skill}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select name="status" defaultValue={editingGoal?.status || 'not_started'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="topic_name">Topic *</Label>
                    <Input
                      id="topic_name"
                      name="topic_name"
                      placeholder="e.g., Binary Trees, React Hooks"
                      defaultValue={editingGoal?.topic_name || ''}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        name="start_date"
                        type="date"
                        defaultValue={editingGoal?.start_date || ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="target_date">Target Date</Label>
                      <Input
                        id="target_date"
                        name="target_date"
                        type="date"
                        defaultValue={editingGoal?.target_date || ''}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resource_links">Resource Links (one per line)</Label>
                    <Textarea
                      id="resource_links"
                      name="resource_links"
                      placeholder="https://..."
                      rows={3}
                      defaultValue={editingGoal?.resource_links?.join('\n') || ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      placeholder="Additional notes..."
                      rows={2}
                      defaultValue={editingGoal?.notes || ''}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {editingGoal ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        editingGoal ? 'Update' : 'Create'
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Skill Progress */}
          {skillProgress.length > 0 && (
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {skillProgress.map((sp) => sp && (
                <StaggerItem key={sp.skill}>
                  <Card className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{sp.skill}</span>
                        <span className="text-xs text-muted-foreground">
                          {sp.completed}/{sp.total}
                        </span>
                      </div>
                      <Progress value={sp.percentage} className="h-2" />
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterSkill} onValueChange={setFilterSkill}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Skills" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Skills</SelectItem>
                  {skills.map((skill) => (
                    <SelectItem key={skill} value={skill}>
                      {skill}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Goals Grid */}
          {filteredGoals.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No learning goals yet"
              description="Start tracking your learning journey by adding your first goal."
              action={{
                label: "Add Your First Goal",
                onClick: () => {
                  setEditingGoal(null);
                  setIsDialogOpen(true);
                },
              }}
            />
          ) : (
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGoals.map((goal) => (
                <StaggerItem key={goal.id}>
                  <Card className="hover:shadow-md transition-all duration-200 group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{goal.topic_name}</CardTitle>
                          <Badge variant="outline" className="mt-1">
                            {goal.skill_name}
                          </Badge>
                        </div>
                        <Badge className={statusColors[goal.status]}>
                          {statusLabels[goal.status]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(goal.start_date || goal.target_date) && (
                        <div className="text-sm text-muted-foreground">
                          {goal.start_date && (
                            <span>Started: {format(new Date(goal.start_date), 'MMM d, yyyy')}</span>
                          )}
                          {goal.start_date && goal.target_date && <span> • </span>}
                          {goal.target_date && (
                            <span>Target: {format(new Date(goal.target_date), 'MMM d, yyyy')}</span>
                          )}
                        </div>
                      )}
                      {goal.notes && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{goal.notes}</p>
                      )}
                      {goal.resource_links && goal.resource_links.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {goal.resource_links.slice(0, 2).map((link, i) => (
                            <a
                              key={i}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Resource {i + 1}
                            </a>
                          ))}
                          {goal.resource_links.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{goal.resource_links.length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex justify-end gap-2 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(goal)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm({ open: true, goalId: goal.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </PageTransition>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
        title="Delete Learning Goal"
        description="Are you sure you want to delete this goal? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </AppLayout>
  );
}
