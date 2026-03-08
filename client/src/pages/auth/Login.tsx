import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ChefHat, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoggingIn } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await login({ username, password });
      toast({
        title: "Welcome back",
        description: `Logged in as ${user.role.replace('_', ' ')}`,
      });
      if (user.role === 'kitchen_staff') {
        setLocation("/kitchen");
      } else {
        setLocation("/");
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4 text-center">
      {/* Abstract Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="w-full max-w-md">
        <div className="glass-panel p-8 md:p-10 rounded-3xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20">
              <ChefHat className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">Welcome to Brio</h1>
            <p className="text-muted-foreground mt-2">Sign in to manage your kitchens</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-muted-foreground">Email / Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin@brio.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-12 bg-black/20 border-border/50 focus:border-primary focus:ring-primary/20 transition-all rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-muted-foreground">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 bg-black/20 border-border/50 focus:border-primary focus:ring-primary/20 transition-all rounded-xl"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl text-md font-semibold bg-gradient-to-r from-primary to-primary/80 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Authenticating...</>
              ) : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
