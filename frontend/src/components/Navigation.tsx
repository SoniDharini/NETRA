import { Home, Upload, Settings, Brain, BarChart3, FileText, User, LogOut, UserCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ThemeToggle } from './ThemeToggle';
import { ShareDialog } from './ShareDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface NavigationProps {
  currentSection: string;
  onNavigate: (section: any) => void;
  completedSteps: Set<string>;
  userEmail?: string;
  onLogout?: () => void;
}

export function Navigation({ currentSection, onNavigate, completedSteps, userEmail, onLogout }: NavigationProps) {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'upload', label: 'Data Upload', icon: Upload, step: 'upload' },
    { id: 'preprocessing', label: 'Preprocessing', icon: Settings, step: 'preprocessing' },
    { id: 'training', label: 'Model Training', icon: Brain, step: 'training' },
    { id: 'visualization', label: 'Visualizations', icon: BarChart3, step: 'visualization' },
    { id: 'report', label: 'Report', icon: FileText, step: 'report' },
  ];

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50 transition-colors">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-foreground">Netra</span>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              const isCompleted = item.step && completedSteps.has(item.step);

              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onNavigate(item.id)}
                  className="relative"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                  {isCompleted && !isActive && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                      ✓
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-2">
            <ShareDialog currentUserEmail={userEmail} />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p>My Account</p>
                    {userEmail && (
                      <p className="text-gray-600">{userEmail}</p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <UserCircle className="w-4 h-4 mr-2" />
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onLogout}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}