import type { StyleId, BlockType } from "@/types";

export const WRITING_STYLES: { id: StyleId; name: string; tagline: string; vibe: string }[] = [
  { id: "real-person", name: "Real Person — Lived It", tagline: "First-hand, honest, lived experience.", vibe: "Like a friend who actually went through it." },
  { id: "experienced-caregiver", name: "Experienced Animal Caregiver", tagline: "Grounded know-how from years of care.", vibe: "Patient, confident, practical." },
  { id: "direct-no-bs", name: "Direct & No-BS Practical", tagline: "Straight talk. No filler. Just what works.", vibe: "Plain, short, useful." },
  { id: "storyteller", name: "Storyteller with Heart", tagline: "A small scene that pulls you in.", vibe: "Warm, narrative, sensory." },
  { id: "professional-educator", name: "Professional but Approachable Educator", tagline: "Clear, accurate, friendly explanations.", vibe: "Trustworthy expert next door." },
  { id: "newsletter", name: "Newsletter / Email Style", tagline: "Scannable, friendly, preview-card ready.", vibe: "Inbox-perfect care notes." },
];

export const CATEGORIES = [
  "Amphibians", "Aquatic Life", "Birds", "Cats", "Dogs",
  "Fun Facts", "Invertebrates", "Pet Care", "Product Picks",
  "Reptiles", "Small & Exotic Pets", "Wild Animals", "Reptile Care", "Site News",
];

export const BLOCK_LIBRARY: { type: BlockType; label: string; hint: string }[] = [
  { type: "title",      label: "Title / Header",     hint: "The article's working title" },
  { type: "prologue",   label: "Prologue / Intro",   hint: "Warm, intimate opener" },
  { type: "paragraph",  label: "Paragraph",          hint: "Flowing body paragraph" },
  { type: "tips",       label: "Tips / Bullet List", hint: "Scannable practical bullets" },
  { type: "pros-cons",  label: "Pros & Cons",        hint: "Side-by-side honest weigh-in" },
  { type: "key-facts",  label: "Key Facts Box",      hint: "Quick scannable facts" },
  { type: "image",      label: "Image + Caption",    hint: "In-article visual with caption" },
  { type: "table",      label: "Data Table",         hint: "Comparison or reference table" },
  { type: "chart",      label: "Chart / Graph",      hint: "Visualize data points" },
  { type: "cta",        label: "Call to Action",     hint: "Warm invitation to act" },
  { type: "conclusion", label: "Conclusion",         hint: "Heartfelt close" },
  { type: "custom",     label: "Custom Section",     hint: "Anything else you need" },
  { type: "resources",  label: "Resources",          hint: "Books, communities, tools" },
  { type: "references", label: "References / Sources", hint: "Credible source list" },
  { type: "affiliate",  label: "Affiliate Note",     hint: "Honest disclosure block" },
];

export const DEFAULT_AFFILIATE_TEXT =
  "Heads up — some links here are affiliate links. If you buy something through them, I may earn a small commission at no extra cost to you. I only recommend things I've actually used or would happily give to my own pets. Thanks for supporting honest pet writing.";

export const STARTER_BLOCKS_BY_STYLE: Record<StyleId, BlockType[]> = {
  "real-person":            ["title", "prologue", "paragraph", "tips", "key-facts", "conclusion"],
  "experienced-caregiver":  ["title", "prologue", "paragraph", "tips", "pros-cons", "resources", "conclusion"],
  "direct-no-bs":           ["title", "tips", "key-facts", "pros-cons", "cta"],
  "storyteller":            ["title", "prologue", "paragraph", "image", "paragraph", "conclusion"],
  "professional-educator":  ["title", "prologue", "paragraph", "key-facts", "table", "references", "conclusion"],
  "newsletter":             ["title", "prologue", "tips", "cta", "conclusion"],
};

export const PLACEMENT_OPTIONS = [
  { value: "after-title", label: "After title" },
  { value: "bottom-section", label: "Dedicated section near bottom" },
  { value: "manual", label: "Manual placement" },
] as const;
