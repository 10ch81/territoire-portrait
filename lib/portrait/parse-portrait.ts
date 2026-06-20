import type { PortraitNarrative } from "./types";

function cleanMarkdownLine(line: string): string {
  return line.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
}

/**
 * Parse une réponse Mistral en titre + paragraphes.
 * Tolère le markdown simple et les séparations par ligne simple ou double.
 */
export function parsePortraitContent(content: string): PortraitNarrative {
  const normalized = content.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return { title: "", paragraphs: [] };
  }

  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    const singleLines = normalized
      .split("\n")
      .map(cleanMarkdownLine)
      .filter(Boolean);
    if (singleLines.length === 0) {
      return { title: "", paragraphs: [] };
    }
    return {
      title: singleLines[0],
      paragraphs: singleLines.slice(1),
    };
  }

  const title = cleanMarkdownLine(blocks[0]);
  const paragraphs = blocks.slice(1).map((block) =>
    block
      .split("\n")
      .map(cleanMarkdownLine)
      .filter(Boolean)
      .join(" "),
  );

  if (paragraphs.length === 0 && blocks.length === 1) {
    const lines = blocks[0]
      .split("\n")
      .map(cleanMarkdownLine)
      .filter(Boolean);
    if (lines.length > 1) {
      return {
        title: lines[0],
        paragraphs: lines.slice(1),
      };
    }
  }

  return { title, paragraphs };
}
