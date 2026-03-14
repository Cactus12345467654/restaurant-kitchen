import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoBackground } from "@/components/InfoBackground";
import { InfoNavCard } from "@/components/InfoNavCard";
import { useTranslation } from "@/i18n";

export default function Digitalization() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 relative">
      <InfoBackground />
      <div className="absolute top-4 right-4 z-10">
        <InfoNavCard />
      </div>
      <div className="max-w-3xl mx-auto space-y-8">
        <Button variant="ghost" asChild className="mb-6 -ml-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("common.back")}
          </Link>
        </Button>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          {t("digitalization.title")}
        </h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-foreground">
          <div className="whitespace-pre-line text-muted-foreground leading-relaxed">
            {t("digitalization.intro")}
          </div>

          <section>
            <h2 className="text-lg font-display font-bold text-foreground mt-8 mb-3">
              {t("digitalization.aiTitle")}
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p>{t("digitalization.aiIntro")}</p>
              <p>{t("digitalization.aiBenefits")}</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-display font-bold text-foreground mt-8 mb-3">
              {t("digitalization.costTitle")}
            </h2>
            <p className="text-muted-foreground">{t("digitalization.costText")}</p>
          </section>

          <section>
            <h2 className="text-lg font-display font-bold text-foreground mt-8 mb-3">
              {t("digitalization.approachTitle")}
            </h2>
            <p className="text-muted-foreground">{t("digitalization.approachText")}</p>
          </section>

          <section>
            <h2 className="text-lg font-display font-bold text-foreground mt-8 mb-3">
              {t("digitalization.conclusionTitle")}
            </h2>
            <p className="text-muted-foreground">{t("digitalization.conclusionText")}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
