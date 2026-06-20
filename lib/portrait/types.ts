export interface PortraitNarrative {
  title: string;
  paragraphs: string[];
}

export interface PortraitGenerationResult {
  portrait: PortraitNarrative | null;
  error?: string;
}
