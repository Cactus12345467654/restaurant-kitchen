import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { InfoBackground } from "@/components/InfoBackground";
import { InfoNavCard } from "@/components/InfoNavCard";
import { useTranslation } from "@/i18n";

const WHATSAPP_PHONE = "37129995620";

export default function Info() {
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
          {t("info.title")}
        </h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-foreground">
          <div className="whitespace-pre-line text-muted-foreground leading-relaxed">
            {t("info.unisoloIntro")}
          </div>

          <section>
            <h2 className="text-lg font-display font-bold text-foreground mt-8 mb-3">
              {t("info.whoForTitle")}
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p><strong className="text-foreground">{t("info.whoForManagers")}</strong></p>
              <p className="pl-4">{t("info.whoForManagersList")}</p>
              <p><strong className="text-foreground">{t("info.whoForWaiters")}</strong></p>
              <p className="pl-4">{t("info.whoForWaitersList")}</p>
              <p><strong className="text-foreground">{t("info.whoForKitchen")}</strong></p>
              <p className="pl-4">{t("info.whoForKitchenList")}</p>
              <p><strong className="text-foreground">{t("info.whoForClients")}</strong></p>
              <p className="pl-4">{t("info.whoForClientsList")}</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-display font-bold text-foreground mt-8 mb-3">
              {t("info.callSystemTitle")}
            </h2>
            <p className="text-muted-foreground mb-4">{t("info.callSystemIntro")}</p>
            <div className="space-y-3 text-muted-foreground">
              <p><strong className="text-foreground">{t("info.pagerModeTitle")}</strong></p>
              <p className="pl-4">{t("info.pagerModeText")}</p>
              <p><strong className="text-foreground">{t("info.digitalNumbersTitle")}</strong></p>
              <p className="pl-4">{t("info.digitalNumbersText")}</p>
              <p className="pl-4">{t("info.digitalNumbersConclusion")}</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-display font-bold text-foreground mt-8 mb-3">
              {t("info.mobileTitle")}
            </h2>
            <p className="text-muted-foreground">{t("info.mobileText")}</p>
          </section>

          <section>
            <h2 className="text-lg font-display font-bold text-foreground mt-8 mb-3">
              {t("info.valueTitle")}
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p>{t("info.valueControl")}</p>
              <p>{t("info.valueKitchen")}</p>
              <p>{t("info.valueTime")}</p>
              <p>{t("info.valueData")}</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-display font-bold text-foreground mt-8 mb-3">
              {t("info.conclusionTitle")}
            </h2>
            <p className="text-muted-foreground">{t("info.conclusionText")}</p>
          </section>

          <section className="mt-10 pt-6 border-t border-border/50">
            <h2 className="text-lg font-display font-bold text-foreground mb-4">
              {t("info.contactsTitle")}
            </h2>
            <div className="space-y-2 text-muted-foreground">
              <p className="flex items-center gap-2">
                <span className="font-medium text-foreground">{t("info.phone")}:</span>
                <a
                  href={`https://wa.me/${WHATSAPP_PHONE}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#25D366] hover:underline"
                >
                  <SiWhatsapp className="w-5 h-5" />
                  29995620
                </a>
              </p>
              <p className="flex items-center gap-2">
                <span className="font-medium text-foreground">{t("info.email")}:</span>
                <a
                  href="mailto:picapex@inbox.lv"
                  className="text-primary hover:underline"
                >
                  picapex@inbox.lv
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
