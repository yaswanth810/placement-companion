import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Target, Map, Trash2, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';

interface SkillPriority {
  skill: string;
  priority: 'high' | 'medium' | 'low';
}

interface MonthlyGoal {
  month: string;
  goals: string[];
}

interface Roadmap {
  id: string;
  target_role: string | null;
  company_type: 'product' | 'service' | 'startup' | null;
  monthly_goals: MonthlyGoal[];
  skill_priorities: SkillPriority[];
  weaknesses: string | null;
}

const priorityColors = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low: 'bg-muted text-muted-foreground',
};

const priorityIcons = {
  high: ArrowUp,
  medium: ArrowRight,
  low: ArrowDown,
};

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function RoadmapPage() {
  const { user } = useAuth();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [targetRole, setTargetRole] = useState('');
  const [companyType, setCompanyType] = useState<'product' | 'service' | 'startup' | ''>('');
  const [skillPriorities, setSkillPriorities] = useState<SkillPriority[]>([]);
  const [monthlyGoals, setMonthlyGoals] = useState<MonthlyGoal[]>([]);
  const [weaknesses, setWeaknesses] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newSkillPriority, setNewSkillPriority] = useState<'high' | 'medium' | 'low'>('medium');

  useEffect(() => {
    if (user) fetchRoadmap();
  }, [user]);

  const fetchRoadmap = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('roadmap')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      toast.error('Failed to fetch roadmap');
    } else if (data) {
      const typedData = data as unknown as Roadmap;
      setRoadmap(typedData);
      setTargetRole(typedData.target_role || '');
      setCompanyType((typedData.company_type as '' | 'product' | 'service' | 'startup') || '');
      setSkillPriorities((typedData.skill_priorities as SkillPriority[]) || []);
      setMonthlyGoals((typedData.monthly_goals as MonthlyGoal[]) || []);
      setWeaknesses(typedData.weaknesses || '');
    }
    setLoading(false);
  };

  const saveRoadmap = async () => {
    if (!user) return;
    setSaving(true);

    const roadmapData = {
      user_id: user.id,
      target_role: targetRole || null,
      company_type: companyType || null,
      skill_priorities: JSON.parse(JSON.stringify(skillPriorities)),
      monthly_goals: JSON.parse(JSON.stringify(monthlyGoals)),
      weaknesses: weaknesses || null,
    };

    if (roadmap) {
      const { error } = await supabase
        .from('roadmap')
        .update(roadmapData)
        .eq('id', roadmap.id);

      if (error) {
        toast.error('Failed to update roadmap');
      } else {
        toast.success('Roadmap saved');
        fetchRoadmap();
      }
    } else {
      const { error } = await supabase.from('roadmap').insert([roadmapData]);

      if (error) {
        toast.error('Failed to create roadmap');
      } else {
        toast.success('Roadmap created');
        fetchRoadmap();
      }
    }
    setSaving(false);
  };

  const addSkillPriority = () => {
    if (!newSkill.trim()) return;
    setSkillPriorities([...skillPriorities, { skill: newSkill, priority: newSkillPriority }]);
    setNewSkill('');
  };

  const removeSkillPriority = (index: number) => {
    setSkillPriorities(skillPriorities.filter((_, i) => i !== index));
  };

  const addMonthlyGoal = (month: string) => {
    const existing = monthlyGoals.find((m) => m.month === month);
    if (existing) {
      setMonthlyGoals(
        monthlyGoals.map((m) =>
          m.month === month ? { ...m, goals: [...m.goals, ''] } : m
        )
      );
    } else {
      setMonthlyGoals([...monthlyGoals, { month, goals: [''] }]);
    }
  };

  const updateGoal = (month: string, goalIndex: number, value: string) => {
    setMonthlyGoals(
      monthlyGoals.map((m) =>
        m.month === month
          ? { ...m, goals: m.goals.map((g, i) => (i === goalIndex ? value : g)) }
          : m
      )
    );
  };

  const removeGoal = (month: string, goalIndex: number) => {
    setMonthlyGoals(
      monthlyGoals
        .map((m) =>
          m.month === month
            ? { ...m, goals: m.goals.filter((_, i) => i !== goalIndex) }
            : m
        )
        .filter((m) => m.goals.length > 0)
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Placement Roadmap</h1>
            <p className="text-muted-foreground mt-1">
              Define your goals and plan your preparation journey
            </p>
          </div>
          <Button onClick={saveRoadmap} disabled={saving}>
            {saving ? 'Saving...' : 'Save Roadmap'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Goals Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Target & Company Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Placement Goal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target_role">Target Role</Label>
                    <Input
                      id="target_role"
                      placeholder="e.g., Software Engineer"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_type">Company Type</Label>
                    <Select value={companyType} onValueChange={(v) => setCompanyType(v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product">Product Company</SelectItem>
                        <SelectItem value="service">Service Company</SelectItem>
                        <SelectItem value="startup">Startup</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Goals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Monthly Preparation Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {months.slice(0, 6).map((month) => (
                    <Button
                      key={month}
                      variant="outline"
                      size="sm"
                      onClick={() => addMonthlyGoal(month)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {month.slice(0, 3)}
                    </Button>
                  ))}
                </div>

                {monthlyGoals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Click a month above to add goals
                  </p>
                ) : (
                  <div className="space-y-4">
                    {monthlyGoals
                      .sort((a, b) => months.indexOf(a.month) - months.indexOf(b.month))
                      .map((monthGoal) => (
                        <div key={monthGoal.month} className="space-y-2">
                          <h4 className="font-medium text-sm">{monthGoal.month}</h4>
                          <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                            {monthGoal.goals.map((goal, idx) => (
                              <div key={idx} className="flex gap-2">
                                <Input
                                  placeholder="Enter goal..."
                                  value={goal}
                                  onChange={(e) => updateGoal(monthGoal.month, idx, e.target.value)}
                                  className="flex-1"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => removeGoal(monthGoal.month, idx)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => addMonthlyGoal(monthGoal.month)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add goal
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Side Section */}
          <div className="space-y-6">
            {/* Skill Priorities */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Skill Priorities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Skill name"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={newSkillPriority} onValueChange={(v) => setNewSkillPriority(v as any)}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="icon" onClick={addSkillPriority}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {skillPriorities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Add skills to prioritize
                  </p>
                ) : (
                  <div className="space-y-2">
                    {skillPriorities.map((sp, idx) => {
                      const Icon = priorityIcons[sp.priority];
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span className="text-sm">{sp.skill}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={priorityColors[sp.priority]}>
                              {sp.priority}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => removeSkillPriority(idx)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weaknesses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Areas to Improve</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Note down your weaknesses and areas that need improvement..."
                  value={weaknesses}
                  onChange={(e) => setWeaknesses(e.target.value)}
                  rows={5}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
