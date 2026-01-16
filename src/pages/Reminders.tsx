import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Bell, BookOpen, Code, Brain, Sparkles, Heart } from 'lucide-react';

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
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold">Reminders & Motivation</h1>
          <p className="text-muted-foreground mt-1">
            Stay motivated and on track with your preparation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quote of the Day */}
          <Card className="lg:col-span-2 bg-gradient-to-br from-primary/5 via-accent/5 to-success/5 border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-warning" />
                Quote of the Day
              </CardTitle>
            </CardHeader>
            <CardContent>
              <blockquote className="text-xl font-medium italic">
                "{quote.quote}"
              </blockquote>
              <p className="text-muted-foreground mt-3">— {quote.author}</p>
            </CardContent>
          </Card>

          {/* Reminders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Reminder Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
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

          {/* Weekly Reflection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Weekly Reflection Prompt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-6 rounded-xl bg-muted/50 text-center">
                <p className="text-lg font-medium">{prompt}</p>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Take a moment to reflect on your progress this week
              </p>
            </CardContent>
          </Card>

          {/* Motivation Tips */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-destructive" />
                Motivation Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { title: 'Set Small Goals', desc: 'Break down big tasks into smaller, achievable milestones' },
                  { title: 'Track Progress', desc: 'Celebrate small wins to stay motivated' },
                  { title: 'Stay Consistent', desc: 'Practice a little every day rather than cramming' },
                  { title: 'Take Breaks', desc: "Rest is important for productivity and mental health" },
                ].map((tip, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg bg-muted/30 border"
                  >
                    <h4 className="font-medium mb-1">{tip.title}</h4>
                    <p className="text-sm text-muted-foreground">{tip.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
