import { Construction } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { InstitutionPageHeader } from "@/components/institution/institution-ui";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type InstitutionPlaceholderPageProps = {
  title: string;
  description: string;
  nextRelease: string;
};

/**
 * Routed module boundary used until a dedicated institution workflow ships.
 */
export function InstitutionPlaceholderPage({
  title,
  description,
  nextRelease,
}: InstitutionPlaceholderPageProps) {
  return (
    <div className="container-app flex flex-1 flex-col gap-6 py-6 sm:py-8">
      <InstitutionPageHeader
        title={title}
        description={description}
        actions={<Badge variant="outline">Foundation ready</Badge>}
      />
      <Card className="bg-card/80 backdrop-blur-sm">
        <EmptyState
          title={`${title} workspace is ready`}
          description={`Routing, responsive layout, navigation, loading, and access control are prepared. ${nextRelease} will add the operational workflows.`}
          illustration={<Construction className="size-8" />}
          className="border-0"
        />
      </Card>
    </div>
  );
}
