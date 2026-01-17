import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/loading-spinner';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/ui/page-transition';
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
  ArrowRight,
  Sparkles,
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
  const [loading, setLoading] = useState(true);
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
    setLoading(true);

    try {
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
        { name: 'Applied', value: statusCounts.applied, color: 'hsl(var(--info))' },
        { name: 'OA', value: statusCounts.oa, color: 'hsl(var(--primary))' },
        { name: 'Interview', value: statusCounts.interview, color: 'hsl(var(--warning))' },
        { name: 'Rejected', value: statusCounts.rejected, color: 'hsl(var(--destructive))' },
        { name: 'Selected', value: statusCounts.selected, color: 'hsl(var(--success))' },
      ].filter((s) => s.value > 0));
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Learning Goals', value: stats.totalLearningGoals, icon: BookOpen, color: 'text-primary bg-primary/10', href: '/learning' },
    { title: 'Skills Completed', value: stats.completedSkills, icon: Trophy, color: 'text-success bg-success/10', href: '/learning' },
    { title: 'Problems Solved', value: stats.problemsSolved, icon: Code, color: 'text-info bg-info/10', href: '/coding' },
    { title: 'Current Streak', value: `${stats.currentStreak} days`, icon: Flame, color: 'text-warning bg-warning/10', href: '/coding' },
    { title: 'Applications', value: stats.applicationsSent, icon: Briefcase, color: 'text-primary bg-primary/10', href: '/applications' },
    { title: 'Interviews', value: stats.interviewsAttended, icon: Calendar, color: 'text-success bg-success/10', href: '/applications' },
  ];

  if (loading) {
    return (
      <AppLayout>
        <PageLoader text="Loading your dashboard..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageTransition>
        <div className="space-y-8">
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
          <Card className="bg-gradient-to-r from-primary/10 via-accent to-primary/5 border-0 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-6 relative">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium italic leading-relaxed">"{quote}"</p>
                  <p className="text-sm text-muted-foreground mt-2">— Daily Motivation</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statCards.map((stat) => (
              <StaggerItem key={stat.title}>
                <Link to={stat.href}>
                  <Card className="group hover:shadow-md transition-all duration-200 hover:border-primary/20 cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                          <p className="text-3xl font-bold mt-1">{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-xl ${stat.color} transition-transform duration-200 group-hover:scale-110`}>
                          <stat.icon className="h-6 w-6" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                        <span>View details</span>
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Weekly Practice Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyActivity}>
                      <defs>
                        <linearGradient id="colorProblems" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
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
                        stroke="hsl(var(--primary))"
                        fill="url(#colorProblems)"
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
                  <Briefcase className="h-5 w-5 text-primary" />
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
                    <div className="text-center">
                      <Briefcase className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">No applications yet</p>
                      <Link to="/applications">
                        <Button variant="link" size="sm" className="mt-2">
                          Start applying <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
