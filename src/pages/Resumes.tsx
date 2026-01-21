import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { PageLoader } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/ui/page-transition';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, FileText, Download, CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-react';
import { ResumeAnalyzer } from '@/components/resume/ResumeAnalyzer';
import { format } from 'date-fns';

interface Resume {
  id: string;
  resume_name: string;
  version_number: number;
  target_role: string | null;
  file_url: string | null;
  notes: string | null;
  checklist: {
    one_page: boolean;
    ats_friendly: boolean;
    updated_projects: boolean;
    updated_skills: boolean;
  };
  created_at: string;
}

const checklistItems = [
  { key: 'one_page', label: 'One Page' },
  { key: 'ats_friendly', label: 'ATS Friendly' },
  { key: 'updated_projects', label: 'Updated Projects' },
  { key: 'updated_skills', label: 'Updated Skills' },
];

export default function Resumes() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResume, setEditingResume] = useState<Resume | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; resumeId: string | null }>({ open: false, resumeId: null });
  const [analyzerOpen, setAnalyzerOpen] = useState(false);
  const [analyzerTargetRole, setAnalyzerTargetRole] = useState<string | undefined>();
  const [checklist, setChecklist] = useState({
    one_page: false,
    ats_friendly: false,
    updated_projects: false,
    updated_skills: false,
  });

  useEffect(() => {
    if (user) fetchResumes();
  }, [user]);

  const fetchResumes = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', user.id)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setResumes((data as unknown as Resume[]) || []);
    } catch (error) {
      toast.error('Failed to fetch resumes');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File): Promise<string | null> => {
    if (!user) return null;
    setUploadingFile(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    try {
      const { error } = await supabase.storage.from('resumes').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('resumes').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      toast.error('Failed to upload file');
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const resumeName = (formData.get('resume_name') as string).trim();

    if (!resumeName) {
      toast.error('Resume name is required');
      setSubmitting(false);
      return;
    }

    const fileInput = e.currentTarget.querySelector<HTMLInputElement>('input[type="file"]');
    const file = fileInput?.files?.[0];

    let fileUrl = editingResume?.file_url || null;
    if (file) {
      const uploadedUrl = await handleFileUpload(file);
      if (uploadedUrl) fileUrl = uploadedUrl;
    }

    const resumeData = {
      user_id: user.id,
      resume_name: resumeName,
      version_number: parseInt(formData.get('version_number') as string) || 1,
      target_role: (formData.get('target_role') as string) || null,
      file_url: fileUrl,
      notes: (formData.get('notes') as string) || null,
      checklist: checklist as unknown as Record<string, boolean>,
    };

    try {
      if (editingResume) {
        const { error } = await supabase.from('resumes').update(resumeData).eq('id', editingResume.id);
        if (error) throw error;
        toast.success('Resume updated');
      } else {
        const { error } = await supabase.from('resumes').insert([resumeData]);
        if (error) throw error;
        toast.success('Resume added');
      }
      fetchResumes();
      setIsDialogOpen(false);
      setEditingResume(null);
      setChecklist({ one_page: false, ats_friendly: false, updated_projects: false, updated_skills: false });
    } catch (error) {
      toast.error(editingResume ? 'Failed to update resume' : 'Failed to add resume');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.resumeId) return;
    try {
      const { error } = await supabase.from('resumes').delete().eq('id', deleteConfirm.resumeId);
      if (error) throw error;
      toast.success('Resume deleted');
      fetchResumes();
    } catch (error) {
      toast.error('Failed to delete resume');
    } finally {
      setDeleteConfirm({ open: false, resumeId: null });
    }
  };

  const handleEdit = (resume: Resume) => {
    setEditingResume(resume);
    setChecklist(resume.checklist || { one_page: false, ats_friendly: false, updated_projects: false, updated_skills: false });
    setIsDialogOpen(true);
  };

  const openDialog = () => {
    setEditingResume(null);
    setChecklist({ one_page: false, ats_friendly: false, updated_projects: false, updated_skills: false });
    setIsDialogOpen(true);
  };

  const openAnalyzer = (targetRole?: string) => {
    setAnalyzerTargetRole(targetRole);
    setAnalyzerOpen(true);
  };

  if (loading) {
    return <AppLayout><PageLoader text="Loading your resumes..." /></AppLayout>;
  }

  return (
    <AppLayout>
      <PageTransition>
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold">Resume Manager</h1>
              <p className="text-muted-foreground mt-1">Manage and version your resumes</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => openAnalyzer()}>
                <Sparkles className="h-4 w-4 mr-2" />AI Analyzer
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openDialog}><Plus className="h-4 w-4 mr-2" />Add Resume</Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>{editingResume ? 'Edit Resume' : 'Add Resume'}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="resume_name">Resume Name *</Label>
                      <Input id="resume_name" name="resume_name" placeholder="e.g., SDE Resume" defaultValue={editingResume?.resume_name || ''} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="version_number">Version</Label>
                      <Input id="version_number" name="version_number" type="number" min="1" defaultValue={editingResume?.version_number || 1} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target_role">Target Role/Company</Label>
                    <Input id="target_role" name="target_role" placeholder="e.g., SDE at Google" defaultValue={editingResume?.target_role || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="file">Upload Resume (PDF)</Label>
                    <Input id="file" name="file" type="file" accept=".pdf,.doc,.docx" />
                    {editingResume?.file_url && <p className="text-xs text-muted-foreground">Current file will be kept if no new file is uploaded</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Resume Checklist</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {checklistItems.map((item) => (
                        <label key={item.key} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <Checkbox checked={checklist[item.key as keyof typeof checklist]} onCheckedChange={(checked) => setChecklist((prev) => ({ ...prev, [item.key]: checked === true }))} />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (what changed)</Label>
                    <Textarea id="notes" name="notes" placeholder="Changes in this version..." rows={2} defaultValue={editingResume?.notes || ''} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={submitting || uploadingFile}>
                      {(submitting || uploadingFile) ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{uploadingFile ? 'Uploading...' : editingResume ? 'Updating...' : 'Adding...'}</> : editingResume ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          {resumes.length === 0 ? (
            <EmptyState icon={FileText} title="No resumes yet" description="Upload and manage your resume versions to stay organized during applications." action={{ label: "Add Your First Resume", onClick: openDialog }} />
          ) : (
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resumes.map((resume) => (
                <StaggerItem key={resume.id}>
                  <Card className="hover:shadow-md transition-all duration-200 group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{resume.resume_name}</CardTitle>
                            <p className="text-sm text-muted-foreground">Version {resume.version_number}</p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {resume.target_role && <p className="text-sm"><span className="text-muted-foreground">Target: </span>{resume.target_role}</p>}
                      
                      <div className="grid grid-cols-2 gap-2">
                        {checklistItems.map((item) => (
                          <div key={item.key} className="flex items-center gap-1.5 text-xs">
                            {resume.checklist?.[item.key as keyof typeof resume.checklist] ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />
                            )}
                            <span className={resume.checklist?.[item.key as keyof typeof resume.checklist] ? '' : 'text-muted-foreground'}>{item.label}</span>
                          </div>
                        ))}
                      </div>

                      {resume.notes && <p className="text-sm text-muted-foreground line-clamp-2">{resume.notes}</p>}
                      <p className="text-xs text-muted-foreground">Uploaded {format(new Date(resume.created_at), 'MMM d, yyyy')}</p>

                      <div className="flex justify-between pt-2 border-t">
                        {resume.file_url ? (
                          <a href={resume.file_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Download</Button>
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground self-center">No file uploaded</span>
                        )}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(resume)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteConfirm({ open: true, resumeId: resume.id })}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </PageTransition>
      <ConfirmDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })} title="Delete Resume" description="Are you sure you want to delete this resume?" confirmLabel="Delete" onConfirm={handleDelete} variant="destructive" />
      <ResumeAnalyzer open={analyzerOpen} onOpenChange={setAnalyzerOpen} targetRole={analyzerTargetRole} />
    </AppLayout>
  );
}
