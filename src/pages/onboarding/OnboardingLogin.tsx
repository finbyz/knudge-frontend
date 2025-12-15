import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Chrome, Linkedin, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

export default function OnboardingLogin() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [loading, setLoading] = useState<'google' | 'linkedin' | 'email' | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [identifier, setIdentifier] = useState(''); // Email or Username for Login, Email for Signup
  const [username, setUsername] = useState(''); // Only for Signup
  const [password, setPassword] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'signup') {
        if (!username || !identifier || !password) {
            toast.error("Please fill in all fields");
            return;
        }
    } else {
        if (!identifier || !password) {
            toast.error("Please enter both username/email and password");
            return;
        }
    }

    setLoading('email');
    try {
      let response;
      if (mode === 'signup') {
          response = await authApi.signup({ username, email: identifier, password });
          toast.success("Account created successfully!");
      } else {
          response = await authApi.login({ username: identifier, password });
          toast.success("Welcome back!");
      }
      
      setAuth(response.access_token, {
          id: response.user_id,
          username: response.username,
          synapse_user_id: response.synapse_user_id
      });
      navigate('/onboarding/goal');
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message || `Failed to ${mode === 'login' ? 'login' : 'sign up'}. Please try again.`);
    } finally {
      setLoading(null);
    }
  };


  const handleSocialLogin = async (provider: 'google' | 'linkedin') => {
    setLoading(provider);
    // TODO: Implement actual social login
    await new Promise((resolve) => setTimeout(resolve, 1500));
    navigate('/onboarding/goal');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-purple-500 to-secondary relative overflow-hidden flex items-center justify-center">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-64 h-64 bg-white/5 rounded-3xl"
            initial={{ 
              x: Math.random() * 400 - 200, 
              y: Math.random() * 400 - 200,
              rotate: Math.random() * 45,
            }}
            animate={{ 
              x: [null, Math.random() * 100 - 50],
              y: [null, Math.random() * 100 - 50],
              rotate: [null, Math.random() * 30 - 15],
            }}
            transition={{ 
              duration: 8 + i * 2, 
              repeat: Infinity, 
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
            style={{
              left: `${20 + i * 15}%`,
              top: `${10 + i * 15}%`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-6 text-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-16 h-16 mx-auto mb-8 rounded-2xl gradient-primary flex items-center justify-center shadow-lg"
        >
          <Zap className="h-8 w-8 text-white" />
        </motion.div>

        {/* Headlines */}
        <h1 className="text-4xl font-bold text-white mb-2">
          Stop drowning in messages.
        </h1>
        <p className="text-xl text-white/90 mb-8">
          Start Knudging.
        </p>

        {/* Login/Signup Form */}
        <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 mb-6">
            <div className="flex gap-4 mb-6">
                <button 
                  onClick={() => setMode('login')}
                  className={`flex-1 pb-2 text-sm font-medium transition-colors relative ${mode === 'login' ? 'text-white' : 'text-white/60 hover:text-white/80'}`}
                >
                  Sign In
                  {mode === 'login' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />}
                </button>
                <button 
                  onClick={() => setMode('signup')}
                  className={`flex-1 pb-2 text-sm font-medium transition-colors relative ${mode === 'signup' ? 'text-white' : 'text-white/60 hover:text-white/80'}`}
                >
                  Sign Up
                  {mode === 'signup' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />}
                </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-4">
                    {mode === 'signup' && (
                        <Input 
                            type="text" 
                            placeholder="Username" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="bg-white/20 border-white/10 text-white placeholder:text-white/60 focus-visible:ring-white/30"
                        />
                    )}
                    <Input 
                        type="text" 
                        placeholder={mode === 'login' ? "Email or Username" : "Email"} 
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="bg-white/20 border-white/10 text-white placeholder:text-white/60 focus-visible:ring-white/30"
                    />
                    <Input 
                        type="password" 
                        placeholder="Password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-white/20 border-white/10 text-white placeholder:text-white/60 focus-visible:ring-white/30"
                    />
                </div>
                <Button
                    type="submit"
                    disabled={loading !== null}
                    className="w-full h-12 rounded-xl font-semibold text-base bg-white text-gray-900 hover:bg-gray-100"
                >
                    {loading === 'email' ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        {mode === 'login' ? 'Logging in...' : 'Creating account...'}
                      </>
                    ) : (mode === 'login' ? 'Sign In' : 'Create Account')}
                </Button>
            </form>
        </div>

        <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-transparent px-2 text-white/60">Or continue with</span>
            </div>
        </div>

        {/* Auth buttons */}
        <div className="space-y-3">
          <Button
            type="button"
            onClick={() => handleSocialLogin('google')}
            disabled={loading !== null}
            className="w-full h-12 rounded-xl font-semibold text-sm bg-white/10 text-white hover:bg-white/20 border border-white/20 flex items-center justify-center gap-3 backdrop-blur-sm"
          >
            {loading === 'google' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Chrome className="h-4 w-4" />
            )}
             Google
          </Button>

          <Button
            type="button"
            onClick={() => handleSocialLogin('linkedin')}
            disabled={loading !== null}
            className="w-full h-12 rounded-xl font-semibold text-sm bg-[#0077b5]/80 text-white hover:bg-[#0077b5] border border-white/20 flex items-center justify-center gap-3 backdrop-blur-sm"
          >
            {loading === 'linkedin' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Linkedin className="h-4 w-4" />
            )}
             LinkedIn
          </Button>
        </div>

        {/* Bottom text */}
        <p className="text-sm text-white/70 mt-8">
          No credit card required
        </p>
      </motion.div>
    </div>
  );
}
