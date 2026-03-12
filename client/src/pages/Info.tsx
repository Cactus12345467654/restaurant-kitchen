import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";

export default function Info() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" asChild className="mb-6 -ml-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("common.back")}
          </Link>
        </Button>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          {t("info.title")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("info.placeholder")}
        </p>
      </div>
    </div>
  );
}
