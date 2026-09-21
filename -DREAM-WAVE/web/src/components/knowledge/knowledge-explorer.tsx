"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import {
  BookGrid,
  KnowledgePageHeader,
} from "@/components/knowledge/book-card";
import { KnowledgeNav } from "@/components/knowledge/knowledge-nav";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AI_RECOMMENDED_TOPICS,
  KNOWLEDGE_GRAPH_EDGES,
  KNOWLEDGE_GRAPH_NODES,
  KNOWLEDGE_ROUTES,
} from "@/constants/knowledge";
import {
  getBookById,
  getRecommendedForTopic,
} from "@/constants/knowledge-catalog";
import { cn } from "@/lib/utils";
import { useKnowledgeStore } from "@/store/knowledge-store";

export function KnowledgeExplorerPage() {
  const searchParams = useSearchParams();
  const topicParam = searchParams.get("topic");
  const hydrated = useKnowledgeStore((s) => s.hydrated);
  const hydrate = useKnowledgeStore((s) => s.hydrate);
  const initialTopic =
    topicParam && AI_RECOMMENDED_TOPICS.some((topic) => topic.id === topicParam)
      ? topicParam
      : (AI_RECOMMENDED_TOPICS[0]?.id ?? "topic-habits");
  const [activeTopicId, setActiveTopicId] = useState(initialTopic);
  const [syncedTopicParam, setSyncedTopicParam] = useState(topicParam);
  if (topicParam !== syncedTopicParam) {
    setSyncedTopicParam(topicParam);
    if (
      topicParam &&
      AI_RECOMMENDED_TOPICS.some((topic) => topic.id === topicParam)
    ) {
      setActiveTopicId(topicParam);
    }
  }
  const [selectedNodeId, setSelectedNodeId] = useState(
    KNOWLEDGE_GRAPH_NODES[0]?.id ?? "n-habits",
  );

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  const activeTopic = useMemo(
    () =>
      AI_RECOMMENDED_TOPICS.find((topic) => topic.id === activeTopicId) ??
      AI_RECOMMENDED_TOPICS[0],
    [activeTopicId],
  );

  const relatedBooks = useMemo(
    () => (activeTopic ? getRecommendedForTopic(activeTopic.id) : []),
    [activeTopic],
  );

  const nextTopics = useMemo(() => {
    if (!activeTopic) return [];
    return activeTopic.nextTopicIds
      .map((id) => AI_RECOMMENDED_TOPICS.find((topic) => topic.id === id))
      .filter(Boolean);
  }, [activeTopic]);

  const selectedNode = useMemo(
    () => KNOWLEDGE_GRAPH_NODES.find((node) => node.id === selectedNodeId),
    [selectedNodeId],
  );

  const relatedEdges = useMemo(
    () =>
      KNOWLEDGE_GRAPH_EDGES.filter(
        (edge) =>
          edge.from === selectedNodeId || edge.to === selectedNodeId,
      ),
    [selectedNodeId],
  );

  const conceptTree = useMemo(() => {
    const roots = KNOWLEDGE_GRAPH_NODES.filter((node) => node.kind === "topic");
    return roots.map((root) => {
      const children = KNOWLEDGE_GRAPH_EDGES.filter(
        (edge) => edge.from === root.id,
      ).map((edge) => {
        const node = KNOWLEDGE_GRAPH_NODES.find((item) => item.id === edge.to);
        return node
          ? { edge, node }
          : null;
      }).filter(Boolean) as Array<{
        edge: (typeof KNOWLEDGE_GRAPH_EDGES)[number];
        node: (typeof KNOWLEDGE_GRAPH_NODES)[number];
      }>;
      return { root, children };
    });
  }, []);

  if (!hydrated) {
    return (
      <div className="container-app space-y-6 py-8 md:py-10">
        <KnowledgePageHeader title="Knowledge Explorer" />
        <div className="bg-muted/30 h-64 animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="container-app flex flex-1 flex-col gap-8 py-8 md:py-10">
      <KnowledgePageHeader
        title="Knowledge Explorer"
        description="Concept trees, topic maps, learning graphs, and recommended next topics."
      />
      <KnowledgeNav />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Topic map</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {AI_RECOMMENDED_TOPICS.map((topic) => (
            <button
              key={topic.id}
              type="button"
              className={cn(
                "border-border rounded-2xl border p-4 text-left transition",
                activeTopicId === topic.id
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/40",
              )}
              aria-pressed={activeTopicId === topic.id}
              onClick={() => setActiveTopicId(topic.id)}
            >
              <p className="font-medium">{topic.title}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {topic.description}
              </p>
            </button>
          ))}
        </div>
      </section>

      {activeTopic ? (
        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Recommended next topics</CardTitle>
              <CardDescription>
                After {activeTopic.title}, explore these connected paths.
              </CardDescription>
              <div className="mt-4 flex flex-wrap gap-2">
                {nextTopics.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No further topics mapped yet.
                  </p>
                ) : (
                  nextTopics.map((topic) =>
                    topic ? (
                      <Button
                        key={topic.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTopicId(topic.id)}
                      >
                        {topic.title}
                      </Button>
                    ) : null,
                  )
                )}
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Books for this topic</CardTitle>
              <CardDescription>{activeTopic.description}</CardDescription>
            </CardHeader>
          </Card>
        </section>
      ) : null}

      {relatedBooks.length > 0 ? (
        <BookGrid books={relatedBooks} />
      ) : (
        <EmptyState
          title="No books mapped"
          description="Pick another topic to explore related titles."
        />
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Concept tree</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {conceptTree.map(({ root, children }) => (
            <Card key={root.id}>
              <CardHeader>
                <CardTitle className="text-base">{root.label}</CardTitle>
                <ul className="mt-3 space-y-2 text-sm">
                  {children.map(({ edge, node }) => (
                    <li
                      key={`${edge.from}-${edge.to}`}
                      className="border-border flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                    >
                      <span>
                        <span className="text-muted-foreground">
                          {edge.relation}
                        </span>{" "}
                        {node.label}
                      </span>
                      {node.bookId ? (
                        <Link
                          href={KNOWLEDGE_ROUTES.detail(node.bookId)}
                          className="text-xs underline-offset-4 hover:underline"
                        >
                          Open
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Learning graph</h2>
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div
            className="border-border grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 md:grid-cols-3"
            aria-label="Knowledge graph nodes"
          >
            {KNOWLEDGE_GRAPH_NODES.map((node) => (
              <button
                key={node.id}
                type="button"
                className={cn(
                  "rounded-xl border px-3 py-3 text-left text-sm transition",
                  selectedNodeId === node.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40",
                )}
                aria-pressed={selectedNodeId === node.id}
                onClick={() => setSelectedNodeId(node.id)}
              >
                <span className="text-muted-foreground text-xs uppercase">
                  {node.kind}
                </span>
                <p className="mt-1 font-medium">{node.label}</p>
              </button>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Relationships</CardTitle>
              <CardDescription>
                {selectedNode
                  ? `Connections for ${selectedNode.label}`
                  : "Select a node"}
              </CardDescription>
              <ul className="mt-3 space-y-2 text-sm">
                {relatedEdges.length === 0 ? (
                  <li className="text-muted-foreground">No edges found.</li>
                ) : (
                  relatedEdges.map((edge) => {
                    const from = KNOWLEDGE_GRAPH_NODES.find(
                      (node) => node.id === edge.from,
                    );
                    const to = KNOWLEDGE_GRAPH_NODES.find(
                      (node) => node.id === edge.to,
                    );
                    return (
                      <li
                        key={`${edge.from}-${edge.to}-${edge.relation}`}
                        className="border-border rounded-lg border px-3 py-2"
                      >
                        {from?.label}{" "}
                        <span className="text-muted-foreground">
                          {edge.relation}
                        </span>{" "}
                        {to?.label}
                      </li>
                    );
                  })
                )}
              </ul>
              {selectedNode?.bookId && getBookById(selectedNode.bookId) ? (
                <Link
                  href={KNOWLEDGE_ROUTES.detail(selectedNode.bookId)}
                  className="mt-4 inline-block text-sm underline-offset-4 hover:underline"
                >
                  Open {getBookById(selectedNode.bookId)?.title}
                </Link>
              ) : null}
            </CardHeader>
          </Card>
        </div>
      </section>
    </div>
  );
}
