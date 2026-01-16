import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Edit, Trash2, Briefcase, ExternalLink, Filter, Calendar } from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';

interface Application {
  id: string;
  company_name: string;
  role: string;
  job_type: 'internship' | 'full_time';
  status: 'applied' | 'oa' | 'interview' | 'rejected' | 'selected';
  application_link: string | null;
  apply_date: string;
  interview_date: string | null;
  notes: string | null;
  created_at: string;
}

const statusColors = {
  applied: 'bg-info/10 text-info border-info/20',
  oa: 'bg-primary/10 text-primary border-primary/20',
  interview: 'bg-warning/10 text-warning border-warning/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  selected: 'bg-success/10 text-success border-success/20',
};

const statusLabels = {
  applied: 'Applied',
  oa: 'Online Assessment',
  interview: 'Interview',
  rejected: 'Rejected',
  selected: 'Selected 🎉',
};

export default function Applications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (user) fetchApplications();
  }, [user]);

  const fetchApplications = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id)
      .order('apply_date', { ascending: false });

    if (error) {
      toast.error('Failed to fetch applications');
    } else {
      setApplications((data as Application[]) || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);

    const appData = {
      user_id: user.id,
      company_name: formData.get('company_name') as string,
      role: formData.get('role') as string,
      job_type: formData.get('job_type') as string,
      status: formData.get('status') as string,
      application_link: (formData.get('application_link') as string) || null,
      apply_date: formData.get('apply_date') as string,
      interview_date: (formData.get('interview_date') as string) || null,
      notes: (formData.get('notes') as string) || null,
    };

    if (editingApp) {
      const { error } = await supabase
        .from('applications')
        .update(appData)
        .eq('id', editingApp.id);

      if (error) {
        toast.error('Failed to update application');
      } else {
        toast.success('Application updated');
        fetchApplications();
      }
    } else {
      const { error } = await supabase.from('applications').insert([appData]);

      if (error) {
        toast.error('Failed to add application');
      } else {
        toast.success('Application added');
        fetchApplications();
      }
    }

    setIsDialogOpen(false);
    setEditingApp(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('applications').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete application');
    } else {
      toast.success('Application deleted');
      fetchApplications();
    }
  };

  const handleEdit = (app: Application) => {
    setEditingApp(app);
    setIsDialogOpen(true);
  };

  const filteredApps = applications.filter((app) => {
    if (filterStatus !== 'all' && app.status !== filterStatus) return false;
    if (filterType !== 'all' && app.job_type !== filterType) return false;
    return true;
  });

  const upcomingInterviews = applications.filter(
    (app) =>
      app.interview_date &&
      app.status === 'interview' &&
      isAfter(new Date(app.interview_date), new Date()) &&
      isBefore(new Date(app.interview_date), addDays(new Date(), 7))
  );

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Application Tracker</h1>
            <p className="text-muted-foreground mt-1">
              Manage your job and internship applications
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingApp(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Application
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingApp ? 'Edit Application' : 'Add Application'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company</Label>
                    <Input
                      id="company_name"
                      name="company_name"
                      placeholder="e.g., Google"
                      defaultValue={editingApp?.company_name || ''}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      name="role"
                      placeholder="e.g., SDE Intern"
                      defaultValue={editingApp?.role || ''}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="job_type">Type</Label>
                    <Select name="job_type" defaultValue={editingApp?.job_type || 'internship'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internship">Internship</SelectItem>
                        <SelectItem value="full_time">Full-time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue={editingApp?.status || 'applied'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="applied">Applied</SelectItem>
                        <SelectItem value="oa">Online Assessment</SelectItem>
                        <SelectItem value="interview">Interview</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="selected">Selected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="apply_date">Apply Date</Label>
                    <Input
                      id="apply_date"
                      name="apply_date"
                      type="date"
                      defaultValue={editingApp?.apply_date || new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interview_date">Interview Date</Label>
                    <Input
                      id="interview_date"
                      name="interview_date"
                      type="date"
                      defaultValue={editingApp?.interview_date || ''}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="application_link">Application Link</Label>
                  <Input
                    id="application_link"
                    name="application_link"
                    type="url"
                    placeholder="https://..."
                    defaultValue={editingApp?.application_link || ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Experience, questions asked, feedback..."
                    rows={3}
                    defaultValue={editingApp?.notes || ''}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingApp ? 'Update' : 'Add'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Upcoming Interviews Alert */}
        {upcomingInterviews.length > 0 && (
          <Card className="border-warning bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium">Upcoming Interviews</p>
                  <p className="text-sm text-muted-foreground">
                    {upcomingInterviews.map((app) => (
                      <span key={app.id}>
                        {app.company_name} - {format(new Date(app.interview_date!), 'MMM d')}
                        {upcomingInterviews.indexOf(app) < upcomingInterviews.length - 1 && ' • '}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="oa">Online Assessment</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="selected">Selected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
              <SelectItem value="full_time">Full-time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Applications Table */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filteredApps.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No applications yet. Start applying!</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Interview</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApps.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{app.company_name}</span>
                          {app.application_link && (
                            <a
                              href={app.application_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        {app.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{app.notes}</p>
                        )}
                      </TableCell>
                      <TableCell>{app.role}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {app.job_type === 'full_time' ? 'Full-time' : 'Internship'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[app.status]}>
                          {statusLabels[app.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(app.apply_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {app.interview_date
                          ? format(new Date(app.interview_date), 'MMM d, yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(app)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(app.id)}
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
