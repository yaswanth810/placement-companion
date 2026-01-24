import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Code,
  ClipboardCheck,
  MessageSquare,
  FileText,
  Briefcase,
  Map,
  Bell,
  LogOut,
  User,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Learning', href: '/learning', icon: BookOpen },
  { name: 'Coding Practice', href: '/coding', icon: Code },
  { name: 'Mock Tests', href: '/mock-tests', icon: ClipboardCheck },
  { name: 'Mock Interviews', href: '/mock-interviews', icon: MessageSquare },
  { name: 'Resumes', href: '/resumes', icon: FileText },
  { name: 'Applications', href: '/applications', icon: Briefcase },
  { name: 'Roadmap', href: '/roadmap', icon: Map },
  { name: 'Reminders', href: '/reminders', icon: Bell },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <aside className="flex h-screen w-64 flex-col glass-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border/50">
        <motion.div 
          className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-glow-sm"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Briefcase className="h-4 w-4 text-primary-foreground" />
        </motion.div>
        <span className="font-display font-bold text-lg text-sidebar-foreground">
          Placement
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1.5">
          {navigation.map((item, index) => {
            const isActive = location.pathname === item.href;
            return (
              <motion.li 
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-soft'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground hover:shadow-sm'
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                    isActive && "drop-shadow-sm"
                  )} />
                  {item.name}
                  {isActive && (
                    <motion.div
                      className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-foreground"
                      layoutId="activeIndicator"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    />
                  )}
                </Link>
              </motion.li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border/50 p-4">
        <motion.div 
          className="flex items-center gap-3 rounded-xl bg-sidebar-accent/50 p-3"
          whileHover={{ backgroundColor: 'hsl(var(--sidebar-accent) / 0.7)' }}
        >
          <Avatar className="h-9 w-9 ring-2 ring-primary/20 ring-offset-2 ring-offset-sidebar">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm font-medium">
              {user?.email ? getInitials(user.email) : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {user?.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </aside>
  );
}
