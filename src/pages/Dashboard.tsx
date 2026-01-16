import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  BookOpen,
  Code,
  Briefcase,
  Trophy,
  Flame,
  Target,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  totalLearningGoals: number;
  completedSkills: number;
  problemsSolved: number;
  currentStreak: number;
  applicationsSent: number;
  interviewsAttended: number;
}

const motivationalQuotes = [
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "The only way to do great work is to love what you do.",
  "Believe you can and you're halfway there.",
  "Hard work beats talent when talent doesn't work hard.",
  "Your limitation—it's only your imagination.",
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalLearningGoals: 0,
    completedSkills: 0,
    problemsSolved: 0,
    currentStreak: 0,
    applicationsSent: 0,
    interviewsAttended: 0,
  });
  const [weeklyActivity, setWeeklyActivity] = useState<{ name: string; problems: number }[]>([]);
  const [applicationStatus, setApplicationStatus] = useState<{ name: string; value: number; color: string }[]>([]);
  const [quote] = useState(() => motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    // Fetch learning goals
    const { data: learningGoals } = await supabase
      .from('learning_goals')
      .select('status')
      .eq('user_id', user.id);

    // Fetch coding problems
    const { data: codingProblems } = await supabase
      .from('coding_problems')
      .select('status, date_practiced')
      .eq('user_id', user.id);

    // Fetch applications
    const { data: applications } = await supabase
      .from('applications')
      .select('status')
      .eq('user_id', user.id);

    const totalLearningGoals = learningGoals?.length || 0;
    const completedSkills = learningGoals?.filter((g) => g.status === 'completed').length || 0;
    const problemsSolved = codingProblems?.filter((p) => p.status === 'solved').length || 0;
    const applicationsSent = applications?.length || 0;
    const interviewsAttended = applications?.filter((a) => a.status === 'interview' || a.status === 'selected').length || 0;

    // Calculate streak
    let streak = 0;
    if (codingProblems && codingProblems.length > 0) {
      const sortedDates = [...new Set(codingProblems.map((p) => p.date_practiced))].sort().reverse();
      const today = new Date().toISOString().split('T')[0];
      
      for (let i = 0; i < sortedDates.length; i++) {
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() - i);
        const expected = expectedDate.toISOString().split('T')[0];
        
        if (sortedDates[i] === expected || (i === 0 && sortedDates[i] === today)) {
          streak++;
        } else {
          break;
        }
      }
    }

    setStats({
      totalLearningGoals,
      completedSkills,
      problemsSolved,
      currentStreak: streak,
      applicationsSent,
      interviewsAttended,
    });

    // Weekly activity
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.toISOString().split('T')[0],
        problems: 0,
      };
    });

    codingProblems?.forEach((p) => {
      const day = last7Days.find((d) => d.date === p.date_practiced);
      if (day) day.problems++;
    });

    setWeeklyActivity(last7Days.map(({ name, problems }) => ({ name, problems })));

    // Application status distribution
    const statusCounts = {
      applied: applications?.filter((a) => a.status === 'applied').length || 0,
      oa: applications?.filter((a) => a.status === 'oa').length || 0,
      interview: applications?.filter((a) => a.status === 'interview').length || 0,
      rejected: applications?.filter((a) => a.status === 'rejected').length || 0,
      selected: applications?.filter((a) => a.status === 'selected').length || 0,
    };

    setApplicationStatus([
      { name: 'Applied', value: statusCounts.applied, color: 'hsl(221, 83%, 53%)' },
      { name: 'OA', value: statusCounts.oa, color: 'hsl(199, 89%, 48%)' },
      { name: 'Interview', value: statusCounts.interview, color: 'hsl(38, 92%, 50%)' },
      { name: 'Rejected', value: statusCounts.rejected, color: 'hsl(0, 84%, 60%)' },
      { name: 'Selected', value: statusCounts.selected, color: 'hsl(142, 76%, 36%)' },
    ].filter((s) => s.value > 0));
  };

  const statCards = [
    { title: 'Learning Goals', value: stats.totalLearningGoals, icon: BookOpen, color: 'text-primary' },
    { title: 'Skills Completed', value: stats.completedSkills, icon: Trophy, color: 'text-success' },
    { title: 'Problems Solved', value: stats.problemsSolved, icon: Code, color: 'text-info' },
    { title: 'Current Streak', value: `${stats.currentStreak} days`, icon: Flame, color: 'text-warning' },
    { title: 'Applications', value: stats.applicationsSent, icon: Briefcase, color: 'text-primary' },
    { title: 'Interviews', value: stats.interviewsAttended, icon: Calendar, color: 'text-success' },
  ];

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold">
            Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'Student'}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's an overview of your placement preparation journey.
          </p>
        </div>

        {/* Quote Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-accent border-0">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Target className="h-6 w-6 text-primary mt-1" />
              <div>
                <p className="text-lg font-medium italic">"{quote}"</p>
                <p className="text-sm text-muted-foreground mt-2">— Daily Motivation</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat, index) => (
            <Card key={stat.title} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-muted ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Weekly Practice Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyActivity}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="problems"
                      stroke="hsl(221, 83%, 53%)"
                      fill="hsl(221, 83%, 53%, 0.2)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Application Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Application Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                {applicationStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={applicationStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {applicationStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center">
                    No applications yet. Start applying to see your progress!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
