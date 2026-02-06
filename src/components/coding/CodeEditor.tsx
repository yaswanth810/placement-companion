import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Code, Copy, Check, Maximize2, Minimize2 } from 'lucide-react';
import { toast } from 'sonner';

interface CodeEditorProps {
  code: string;
  language: string;
  onCodeChange: (code: string) => void;
  onLanguageChange: (language: string) => void;
  readOnly?: boolean;
}

const languages = [
  { value: 'python', label: 'Python', icon: '🐍' },
  { value: 'java', label: 'Java', icon: '☕' },
  { value: 'c', label: 'C', icon: '⚙️' },
];

const languageTemplates: Record<string, string> = {
  python: `# Write your solution here
def solution():
    pass

# Example usage
if __name__ == "__main__":
    solution()
`,
  java: `// Write your solution here
public class Solution {
    public static void main(String[] args) {
        // Your code here
    }
    
    public static void solution() {
        // Implement your solution
    }
}
`,
  c: `// Write your solution here
#include <stdio.h>

int main() {
    // Your code here
    return 0;
}
`,
};

export function CodeEditor({ 
  code, 
  language, 
  onCodeChange, 
  onLanguageChange,
  readOnly = false 
}: CodeEditorProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  const handleLanguageChange = (newLang: string) => {
    onLanguageChange(newLang);
    // If code is empty or is a template, replace with new template
    if (!code || Object.values(languageTemplates).some(t => t.trim() === code.trim())) {
      onCodeChange(languageTemplates[newLang]);
    }
  };

  const getMonacoLanguage = (lang: string) => {
    switch (lang) {
      case 'python': return 'python';
      case 'java': return 'java';
      case 'c': return 'c';
      default: return 'plaintext';
    }
  };

  return (
    <Card className={`overflow-hidden transition-all ${expanded ? 'fixed inset-4 z-50' : ''}`}>
      <CardHeader className="py-3 px-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Code className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">Code Editor</CardTitle>
            <Badge variant="outline" className="text-xs">
              {languages.find(l => l.value === language)?.icon} {languages.find(l => l.value === language)?.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={handleLanguageChange} disabled={readOnly}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    <span className="flex items-center gap-2">
                      <span>{lang.icon}</span>
                      <span>{lang.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Editor
          height={expanded ? 'calc(100vh - 120px)' : '300px'}
          language={getMonacoLanguage(language)}
          value={code}
          onChange={(value) => onCodeChange(value || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            wordWrap: 'on',
            readOnly,
            padding: { top: 12, bottom: 12 },
          }}
        />
      </CardContent>
    </Card>
  );
}

export { languageTemplates };
