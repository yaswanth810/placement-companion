import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/ui/page-transition';
import { Bell, BookOpen, Code, Brain, Sparkles, Heart, Quote } from 'lucide-react';

const motivationalQuotes = [
  { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { quote: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { quote: "Your limitation—it's only your imagination.", author: "Unknown" },
  { quote: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { quote: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { quote: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
];

const reflectionPrompts = [
  "What was your biggest learning this week?",
  "Which problem-solving approach worked well?",
  "What would you do differently?",
  "Which skill needs more focus next week?",
  "What achievement are you proud of?",
];

export default function Reminders() {
  const [dailyLearning, setDailyLearning] = useState(true);
  const [dailyPractice, setDailyPractice] = useState(true);
  const [weeklyReflection, setWeeklyReflection] = useState(true);
  const [quote] = useState(() => motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  const [prompt] = useState(() => reflectionPrompts[Math.floor(Math.random() * reflectionPrompts.length)]);

  const reminders = [
    {
      id: 'daily_learning',
      title: 'Daily Learning Reminder',
      description: 'Get reminded to complete your learning goals',
      icon: BookOpen,
      enabled: dailyLearning,
      setEnabled: setDailyLearning,
      color: 'text-primary bg-primary/10',
    },
    {
      id: 'daily_practice',
      title: 'Daily Coding Practice',
      description: 'Stay consistent with your coding practice',
      icon: Code,
      enabled: dailyPractice,
      setEnabled: setDailyPractice,
      color: 'text-success bg-success/10',
    },
    {
      id: 'weekly_reflection',
      title: 'Weekly Reflection',
      description: 'Reflect on your progress every week',
      icon: Brain,
      enabled: weeklyReflection,
      setEnabled: setWeeklyReflection,
      color: 'text-warning bg-warning/10',
    },
  ];

  return (
    <AppLayout>
      <PageTransition>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-display font-bold">Reminders & Motivation</h1>
            <p className="text-muted-foreground mt-1">Stay motivated and on track with your preparation</p>
          </div>

          <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quote of the Day */}
            <StaggerItem className="lg:col-span-2">
              <Card className="bg-gradient-to-br from-primary/5 via-accent/5 to-success/5 border-0 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-success/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <Sparkles className="h-5 w-5 text-warning" />
                    </div>
                    Quote of the Day
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <Quote className="h-8 w-8 text-muted-foreground/20 absolute -top-2 -left-1" />
                  <blockquote className="text-xl font-medium italic pl-6 leading-relaxed">
                    {quote.quote}
                  </blockquote>
                  <p className="text-muted-foreground mt-4 pl-6">— {quote.author}</p>
                </CardContent>
              </Card>
            </StaggerItem>

            {/* Reminders */}
            <StaggerItem>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Reminder Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${reminder.color}`}>
                          <reminder.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{reminder.title}</p>
                          <p className="text-sm text-muted-foreground">{reminder.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={reminder.enabled}
                        onCheckedChange={reminder.setEnabled}
                      />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Note: Browser notifications require permission
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>

            {/* Weekly Reflection */}
            <StaggerItem>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Weekly Reflection Prompt
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-8 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 text-center border-2 border-dashed border-muted-foreground/10">
                    <p className="text-lg font-medium leading-relaxed">{prompt}</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Take a moment to reflect on your progress this week
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>

            {/* Motivation Tips */}
            <StaggerItem className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-destructive" />
                    Motivation Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { title: 'Set Small Goals', desc: 'Break down big tasks into smaller, achievable milestones', emoji: '🎯' },
                      { title: 'Track Progress', desc: 'Celebrate small wins to stay motivated', emoji: '📈' },
                      { title: 'Stay Consistent', desc: 'Practice a little every day rather than cramming', emoji: '⚡' },
                      { title: 'Take Breaks', desc: "Rest is important for productivity and mental health", emoji: '🧘' },
                    ].map((tip, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg bg-muted/30 border hover:shadow-sm hover:border-primary/20 transition-all duration-200 group"
                      >
                        <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">{tip.emoji}</span>
                        <h4 className="font-medium mb-1">{tip.title}</h4>
                        <p className="text-sm text-muted-foreground">{tip.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </PageTransition>
    </AppLayout>
  );
}
