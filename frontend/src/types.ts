// Core BeastlyForge types
export type StyleId =
  | "real-person"
  | "experienced-caregiver"
  | "direct-no-bs"
  | "storyteller"
  | "professional-educator"
  | "newsletter";

export type BlockType =
  | "title"
  | "prologue"
  | "paragraph"
  | "tips"
  | "pros-cons"
  | "key-facts"
  | "image"
  | "table"
  | "chart"
  | "cta"
  | "conclusion"
  | "custom"
  | "resources"
  | "references"
  | "affiliate";

export interface Block {
  id: string;
  type: BlockType;
  label?: string;
  note?: string;
  content?: string;
  imagePrompt?: string;
  imageAlt?: string;
  imageUrl?: string;
  caption?: string;
}

export interface Brief {
  topic: string;
  audience: string;
  length: string;
  keyPoints: string;
  angle: string;
  extra: string;
  focusKeyword: string;
  metaDescription: string;
  categories: string[];
  tags: string[];
}

export interface HeaderImage {
  prompt: string;
  alt: string;
  url?: string;
}

export interface AffiliateConfig {
  enabled: boolean;
  placement: "after-title" | "bottom-section" | "manual";
  text: string;
}

export interface NewsletterPreview {
  id: string;
  title: string;
  summary: string;
  ctaText: string;
  ctaLink: string;
  imagePrompt: string;
  imageAlt: string;
}

export interface Newsletter {
  headerImage: HeaderImage;
  introText: string;
  outroText: string;
  previews: NewsletterPreview[];
  useArticleHeader: boolean;
}

export interface Version {
  id: string;
  ts: number;
  label: string;
  blocks: Block[];
}

export interface Draft {
  id: string;
  createdAt: number;
  updatedAt: number;
  styleId: StyleId;
  brief: Brief;
  blocks: Block[];
  headerImage: HeaderImage;
  affiliate: AffiliateConfig;
  newsletter: Newsletter;
  versions: Version[];
  llmPrompt?: string;
}
