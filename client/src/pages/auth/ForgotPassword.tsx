import { useState } from "react";
import { Link } from "wouter";
import { ChefHat, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import { useTranslation } from "@/i18n";

export default function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(api.auth.forgotPassword.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || t("auth.requestFailed"));
      }

      toast({
        title: t("auth.checkEmail"),
        description: t("auth.resetLinkSent"),
      });
    } catch (err: any) {
      toast({
        title: t("auth.requestFailed"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4 text-center">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="w-full max-w-md">
        <div className="glass-panel p-8 md:p-10 rounded-3xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20">
              <ChefHat className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {t("auth.forgotTitle")}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {t("auth.forgotSubtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 text-left">
              <Label htmlFor="username" className="text-muted-foreground">
                {t("auth.email")}
              </Label>
              <Input
                id="username"
                type="text"
                placeholder={t("auth.emailPlaceholder")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-12 bg-black/20 border-border/50 focus:border-primary focus:ring-primary/20 transition-all rounded-xl"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-md font-semibold bg-gradient-to-r from-primary to-primary/80 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t("auth.sendingLink")}
                </>
              ) : (
                t("auth.sendResetLink")
              )}
            </Button>

            <p className="text-xs text-muted-foreground mt-3">
              <Link
                href="/login"
                className="text-primary hover:underline font-medium"
              >
                {t("auth.backToLogin")}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
