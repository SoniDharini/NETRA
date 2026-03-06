import { useState } from 'react';
import { Brain, Loader2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { apiService } from '../services/api.service';

interface LoginProps {
  onLogin: (email: string) => void;
  onNavigateToRegister: () => void;
}

export function Login({ onLogin, onNavigateToRegister }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    const response = await apiService.login({ username, password });

    setIsLoading(false);

    if (response.success && response.data.access) {
      localStorage.setItem('accessToken', response.data.access);
      localStorage.setItem('refreshToken', response.data.refresh);
      toast.success('Login successful!');
      onLogin(username);
    } else {
      toast.error(response.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-gray-900">Welcome to Netra</h1>
          <p className="text-gray-600">AI-Powered Machine Learning Analysis Platform</p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label htmlFor="remember" className="cursor-pointer">
                    Remember me
                  </Label>
                </div>
                <Button variant="link" type="button" className="px-0">
                  Forgot password?
                </Button>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              <div className="text-center text-gray-600">
                Don&apos;t have an account?{' '}
                <Button
                  variant="link"
                  type="button"
                  className="px-1"
                  onClick={onNavigateToRegister}
                >
                  Sign up
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Demo Note */}
        {/* <Card className="border-purple-200 bg-purple-50/30">
          <CardContent className="pt-6">
            <p className="text-gray-600 text-center">
              <span className="text-purple-600">Demo Mode:</span> Use any email and password to sign in
            </p>
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
}
