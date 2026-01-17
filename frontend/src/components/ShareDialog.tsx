import { useState } from 'react';
import { Share2, Copy, Mail, Check, Users, Link2, UserPlus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Separator } from './ui/separator';
import { toast } from 'sonner@2.0.3';

interface Collaborator {
  id: string;
  email: string;
  role: 'viewer' | 'editor' | 'owner';
  status: 'active' | 'pending';
}

interface ShareDialogProps {
  projectName?: string;
  currentUserEmail?: string;
}

export function ShareDialog({ projectName = 'Untitled Project', currentUserEmail }: ShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [linkCopied, setLinkCopied] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    {
      id: '1',
      email: currentUserEmail || 'you@example.com',
      role: 'owner',
      status: 'active',
    },
  ]);

  // Generate a shareable link (mock)
  const shareableLink = `https://netra.app/project/${Math.random().toString(36).substr(2, 9)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setLinkCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleAddCollaborator = () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Check if already added
    if (collaborators.some(c => c.email === email)) {
      toast.error('This user is already a collaborator');
      return;
    }

    const newCollaborator: Collaborator = {
      id: Date.now().toString(),
      email,
      role,
      status: 'pending',
    };

    setCollaborators([...collaborators, newCollaborator]);
    toast.success(`Invitation sent to ${email}`);
    setEmail('');
  };

  const handleRemoveCollaborator = (id: string) => {
    setCollaborators(collaborators.filter(c => c.id !== id));
    toast.info('Collaborator removed');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700';
      case 'editor':
        return 'bg-blue-100 text-blue-700';
      case 'viewer':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
          <DialogDescription>
            Collaborate with your team on "{projectName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Share Link Section */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <Link2 className="w-4 h-4" />
              <span>Share Link</span>
            </Label>
            <div className="flex space-x-2">
              <Input
                value={shareableLink}
                readOnly
                className="flex-1"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-gray-600">Anyone with this link can view the project</p>
          </div>

          <Separator />

          {/* Add Collaborator Section */}
          <div className="space-y-3">
            <Label className="flex items-center space-x-2">
              <UserPlus className="w-4 h-4" />
              <span>Add People</span>
            </Label>
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCollaborator();
                  }
                }}
              />
              <RadioGroup value={role} onValueChange={(v) => setRole(v as 'viewer' | 'editor')}>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="viewer" id="viewer" />
                    <Label htmlFor="viewer" className="cursor-pointer">
                      Viewer
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="editor" id="editor" />
                    <Label htmlFor="editor" className="cursor-pointer">
                      Editor
                    </Label>
                  </div>
                </div>
              </RadioGroup>
              <Button onClick={handleAddCollaborator} className="w-full" size="sm">
                <Mail className="w-4 h-4 mr-2" />
                Send Invitation
              </Button>
            </div>
          </div>

          <Separator />

          {/* Collaborators List */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>People with Access</span>
            </Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {collaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-gray-200 bg-gray-50"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white shrink-0">
                      {collaborator.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 truncate">{collaborator.email}</p>
                      <div className="flex items-center space-x-2">
                        <Badge className={getRoleBadgeColor(collaborator.role)}>
                          {collaborator.role}
                        </Badge>
                        {collaborator.status === 'pending' && (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {collaborator.role !== 'owner' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveCollaborator(collaborator.id)}
                      className="shrink-0"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
