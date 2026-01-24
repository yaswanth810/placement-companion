import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/loading-spinner';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/ui/page-transition';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Code,
  Briefcase,
  Trophy,
  Flame,
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
    { title: 'Learning Goals', value: stats.totalLearningGoals, icon: BookOpen, colorClass: 'icon-container-primary', href: '/learning' },
    { title: 'Skills Completed', value: stats.completedSkills, icon: Trophy, colorClass: 'icon-container-success', href: '/learning' },
    { title: 'Problems Solved', value: stats.problemsSolved, icon: Code, colorClass: 'icon-container-info', href: '/coding' },
    { title: 'Current Streak', value: `${stats.currentStreak} days`, icon: Flame, colorClass: 'icon-container-warning', href: '/coding' },
    { title: 'Applications', value: stats.applicationsSent, icon: Briefcase, colorClass: 'icon-container-primary', href: '/applications' },
    { title: 'Interviews', value: stats.interviewsAttended, icon: Calendar, colorClass: 'icon-container-success', href: '/applications' },
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
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-display font-bold">
              Welcome back, <span className="text-gradient">{user?.user_metadata?.full_name?.split(' ')[0] || 'Student'}</span>! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's an overview of your placement preparation journey.
            </p>
          </motion.div>

          {/* Quote Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <Card className="gradient-border overflow-hidden relative">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-info/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
              <CardContent className="p-6 relative">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl gradient-primary shadow-glow-sm">
                    <Sparkles className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-medium italic leading-relaxed">"{quote}"</p>
                    <p className="text-sm text-muted-foreground mt-2">— Daily Motivation</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Grid */}
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statCards.map((stat, index) => (
              <StaggerItem key={stat.title}>
                <Link to={stat.href}>
                  <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                    <Card className="group card-hover cursor-pointer overflow-hidden">
                      <CardContent className="p-6 relative">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="flex items-center justify-between relative">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                            <p className="text-3xl font-bold mt-1">{stat.value}</p>
                          </div>
                          <div className={`icon-container p-3 ${stat.colorClass} transition-transform duration-300 group-hover:scale-110`}>
                            <stat.icon className="h-6 w-6" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-4 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                          <span>View details</span>
                          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Activity */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="icon-container icon-container-primary p-2">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    Weekly Practice Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyActivity}>
                        <defs>
                          <linearGradient id="colorProblems" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                        <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                            boxShadow: '0 4px 20px -4px hsl(var(--primary) / 0.1)',
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
            </motion.div>

            {/* Application Status */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="icon-container icon-container-primary p-2">
                      <Briefcase className="h-4 w-4" />
                    </div>
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
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '12px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center">
                        <div className="icon-container icon-container-primary p-4 mx-auto mb-4">
                          <Briefcase className="h-8 w-8" />
                        </div>
                        <p className="text-muted-foreground text-sm">No applications yet</p>
                        <Link to="/applications">
                          <Button variant="link" size="sm" className="mt-2 group">
                            Start applying 
                            <ArrowRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-1" />
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
