"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Wrench, MessageCircle, FileText } from "lucide-react";
import { McpToolRunner } from "./McpToolRunner";
import { McpPromptRunner } from "./McpPromptRunner";
import { McpResourceReader } from "./McpResourceReader";
import type { McpServerCapabilities } from "@/types/mcp";

interface McpInspectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverName: string;
  serverId: string;
  capabilities: McpServerCapabilities;
}

export function McpInspectorDialog({
  open,
  onOpenChange,
  serverName,
  serverId,
  capabilities,
}: McpInspectorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Inspector — {serverName}</DialogTitle>
          <DialogDescription>
            연결된 MCP 서버의 tools, prompts, resources를 테스트합니다.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="tools" className="flex-1 min-h-0">
          <TabsList>
            <TabsTrigger value="tools">
              <Wrench className="size-3.5" />
              Tools
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {capabilities.tools.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="prompts">
              <MessageCircle className="size-3.5" />
              Prompts
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {capabilities.prompts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="resources">
              <FileText className="size-3.5" />
              Resources
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {capabilities.resources.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tools" className="mt-3 min-h-0 overflow-hidden">
            <McpToolRunner serverId={serverId} tools={capabilities.tools} />
          </TabsContent>

          <TabsContent
            value="prompts"
            className="mt-3 min-h-0 overflow-hidden"
          >
            <McpPromptRunner
              serverId={serverId}
              prompts={capabilities.prompts}
            />
          </TabsContent>

          <TabsContent
            value="resources"
            className="mt-3 min-h-0 overflow-hidden"
          >
            <McpResourceReader
              serverId={serverId}
              resources={capabilities.resources}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
