import { Link } from "wouter";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "@/i18n";

export function InfoButton() {
  const { t } = useTranslation();

  return (
    <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-[40px] w-[40px] p-1 text-primary hover:text-primary hover:bg-primary/15 shrink-0 rounded-xl"
            aria-label={t("common.info")}
          >
            <Link href="/info" className="flex h-full w-full items-center justify-center [&_svg]:!h-[30px] [&_svg]:!w-[30px]">
              <Info className="h-[30px] w-[30px]" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{t("common.info")}</p>
        </TooltipContent>
      </Tooltip>
  );
}
