"use client";

import { Wrench, MessageCircle, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { McpServerCapabilities } from "@/types/mcp";

interface McpCapabilitiesProps {
  capabilities: McpServerCapabilities;
}

export function McpCapabilities({ capabilities }: McpCapabilitiesProps) {
  const { tools, prompts, resources } = capabilities;

  return (
    <div className="grid gap-3">
      <CapabilitySection
        icon={<Wrench className="size-3.5" />}
        label="Tools"
        count={tools.length}
      >
        {tools.map((t) => (
          <div key={t.name} className="flex flex-col gap-0.5">
            <span className="font-mono text-xs font-medium">{t.name}</span>
            {t.description && (
              <span className="text-xs text-muted-foreground">
                {t.description}
              </span>
            )}
          </div>
        ))}
      </CapabilitySection>

      <CapabilitySection
        icon={<MessageCircle className="size-3.5" />}
        label="Prompts"
        count={prompts.length}
      >
        {prompts.map((p) => (
          <div key={p.name} className="flex flex-col gap-0.5">
            <span className="font-mono text-xs font-medium">{p.name}</span>
            {p.description && (
              <span className="text-xs text-muted-foreground">
                {p.description}
              </span>
            )}
            {p.arguments && p.arguments.length > 0 && (
              <div className="mt-0.5 flex flex-wrap gap-1">
                {p.arguments.map((a) => (
                  <Badge key={a.name} variant="outline" className="text-[10px]">
                    {a.name}
                    {a.required && " *"}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </CapabilitySection>

      <CapabilitySection
        icon={<FileText className="size-3.5" />}
        label="Resources"
        count={resources.length}
      >
        {resources.map((r) => (
          <div key={r.uri} className="flex flex-col gap-0.5">
            <span className="font-mono text-xs font-medium">{r.name}</span>
            <span className="truncate text-[10px] text-muted-foreground">
              {r.uri}
            </span>
            {r.mimeType && (
              <Badge variant="outline" className="w-fit text-[10px]">
                {r.mimeType}
              </Badge>
            )}
          </div>
        ))}
      </CapabilitySection>
    </div>
  );
}

function CapabilitySection({
  icon,
  label,
  count,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
        <Badge variant="secondary" className="text-[10px]">
          {count}
        </Badge>
      </div>
      {count === 0 ? (
        <p className="pl-5 text-xs text-muted-foreground/60">없음</p>
      ) : (
        <div className="grid gap-2 pl-5">{children}</div>
      )}
    </div>
  );
}
