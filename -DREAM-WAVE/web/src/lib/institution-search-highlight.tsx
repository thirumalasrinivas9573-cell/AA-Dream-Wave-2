import type { ReactNode } from "react";

/** Highlight search matches in directory table cells */
export function highlightSearchMatch(text: string, query: string): ReactNode {
  const term = query.trim();
  if (!term) return text;

  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  const index = lowerText.indexOf(lowerTerm);
  if (index === -1) return text;

  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-primary/20 rounded px-0.5">{text.slice(index, index + term.length)}</mark>
      {text.slice(index + term.length)}
    </>
  );
}
