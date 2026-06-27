import type { StyleId, BlockType, Block } from "@/types";

export const WRITING_STYLES: { id: StyleId; name: string; tagline: string; vibe: string; color: string }[] = [
  {
    id: "real-person",
    name: "Real Person — Lived It",
    tagline: "First-hand, honest, lived experience.",
    vibe: "Like a friend who actually went through it.",
    color: "amber",
  },
  {
    id: "experienced-caregiver",
    name: "Experienced Caregiver",
    tagline: "Grounded know-how from years of hands-on experience.",
    vibe: "Patient, confident, practical.",
    color: "teal",
  },
  {
    id: "direct-no-bs",
    name: "Direct & No-BS Practical",
    tagline: "Straight talk. No filler. Just what works.",
    vibe: "Plain, short, useful.",
    color: "rose",
  },
  {
    id: "storyteller",
    name: "Storyteller with Heart",
    tagline: "A small scene that pulls you in.",
    vibe: "Warm, narrative, sensory.",
    color: "violet",
  },
  {
    id: "professional-educator",
    name: "Professional Educator",
    tagline: "Clear, accurate, friendly explanations.",
    vibe: "Trustworthy expert next door.",
    color: "blue",
  },
  {
    id: "newsletter",
    name: "Newsletter / Email Style",
    tagline: "Scannable, friendly, preview-card ready.",
    vibe: "Inbox-perfect writing.",
    color: "emerald",
  },
];

// Color tokens per style — used in sidebar + style library
export const STYLE_COLORS: Record<string, { bg: string; border: string; text: string; ring: string; badge: string }> = {
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/50",
    text: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/30",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  teal: {
    bg: "bg-teal-500/10",
    border: "border-teal-500/50",
    text: "text-teal-600 dark:text-teal-400",
    ring: "ring-teal-500/30",
    badge: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  },
  rose: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/50",
    text: "text-rose-600 dark:text-rose-400",
    ring: "ring-rose-500/30",
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
  violet: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/50",
    text: "text-violet-600 dark:text-violet-400",
    ring: "ring-violet-500/30",
    badge: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/50",
    text: "text-blue-600 dark:text-blue-400",
    ring: "ring-blue-500/30",
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/50",
    text: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500/30",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
};

// Content niches with their own category lists
export const NICHES: Record<string, { label: string; emoji: string; categories: string[] }> = {
  "Pet Care": {
    label: "Pet Care",
    emoji: "🐾",
    categories: [
      "Amphibians", "Aquatic Life", "Birds", "Cats", "Dogs",
      "Fun Facts", "Invertebrates", "Pet Care", "Product Picks",
      "Reptiles", "Small & Exotic Pets", "Wild Animals", "Reptile Care", "Site News",
    ],
  },
  "Health & Wellness": {
    label: "Health & Wellness",
    emoji: "💪",
    categories: [
      "Fitness", "Mental Health", "Nutrition", "Sleep", "Supplements",
      "Weight Loss", "Holistic Health", "Disease Prevention",
      "Women's Health", "Men's Health", "Recovery", "Mindfulness",
    ],
  },
  "Food & Recipes": {
    label: "Food & Recipes",
    emoji: "🍳",
    categories: [
      "Breakfast", "Lunch", "Dinner", "Desserts", "Snacks",
      "Vegan", "Vegetarian", "Gluten-Free", "Quick Meals",
      "Meal Prep", "Drinks & Cocktails", "Baking", "Grilling",
    ],
  },
  "Travel": {
    label: "Travel",
    emoji: "✈️",
    categories: [
      "Destinations", "Budget Travel", "Solo Travel", "Family Travel",
      "Adventure", "Hotels & Stays", "Food Tourism", "Digital Nomad",
      "Road Trips", "Travel Tips", "Packing", "City Guides",
    ],
  },
  "Technology": {
    label: "Technology",
    emoji: "💻",
    categories: [
      "AI & Machine Learning", "Gadgets", "Apps & Software", "Cybersecurity",
      "Web Development", "Smartphones", "Gaming", "Smart Home",
      "Productivity", "Social Media", "Startups", "Reviews",
    ],
  },
  "Finance": {
    label: "Finance",
    emoji: "💰",
    categories: [
      "Budgeting", "Investing", "Side Hustles", "Saving",
      "Debt Payoff", "Credit", "Real Estate", "Retirement",
      "Taxes", "Financial Freedom", "Passive Income", "Frugal Living",
    ],
  },
  "Lifestyle": {
    label: "Lifestyle",
    emoji: "🌿",
    categories: [
      "Home & Decor", "Fashion", "Beauty", "Relationships",
      "Parenting", "Hobbies", "Self-Improvement", "Minimalism",
      "Sustainability", "Organization", "Productivity", "Entertainment",
    ],
  },
};

export const NICHE_KEYS = Object.keys(NICHES);

// Fallback flat list (Pet Care default) for code that imports CATEGORIES directly
export const CATEGORIES = NICHES["Pet Care"].categories;

export const BLOCK_LIBRARY: { type: BlockType; label: string; hint: string }[] = [
  { type: "title",      label: "Title / Header",       hint: "The article's working title" },
  { type: "prologue",   label: "Prologue / Intro",     hint: "Warm, intimate opener" },
  { type: "paragraph",  label: "Paragraph",            hint: "Flowing body paragraph" },
  { type: "tips",       label: "Tips / Bullet List",   hint: "Scannable practical bullets" },
  { type: "pros-cons",  label: "Pros & Cons",          hint: "Side-by-side honest weigh-in" },
  { type: "key-facts",  label: "Key Facts Box",        hint: "Quick scannable facts" },
  { type: "image",      label: "Image + Caption",      hint: "In-article visual with caption" },
  { type: "table",      label: "Data Table",           hint: "Comparison or reference table" },
  { type: "chart",      label: "Chart / Graph",        hint: "Visualize data points" },
  { type: "cta",        label: "Call to Action",       hint: "Warm invitation to act" },
  { type: "conclusion", label: "Conclusion",           hint: "Heartfelt close" },
  { type: "custom",     label: "Custom Section",       hint: "Anything else you need" },
  { type: "resources",  label: "Resources",            hint: "Books, communities, tools" },
  { type: "references", label: "References / Sources", hint: "Credible source list" },
  { type: "affiliate",  label: "Affiliate Note",       hint: "Honest disclosure block" },
];

export const DEFAULT_AFFILIATE_TEXT =
  "Heads up — some links here are affiliate links. If you buy something through them, I may earn a small commission at no extra cost to you. I only recommend things I've actually used or found genuinely useful. Thanks for supporting honest writing.";

export const STARTER_BLOCKS_BY_STYLE: Record<StyleId, BlockType[]> = {
  "real-person":            ["title", "prologue", "paragraph", "tips", "key-facts", "conclusion"],
  "experienced-caregiver":  ["title", "prologue", "paragraph", "tips", "pros-cons", "resources", "conclusion"],
  "direct-no-bs":           ["title", "tips", "key-facts", "pros-cons", "cta"],
  "storyteller":            ["title", "prologue", "paragraph", "image", "paragraph", "conclusion"],
  "professional-educator":  ["title", "prologue", "paragraph", "key-facts", "table", "references", "conclusion"],
  "newsletter":             ["title", "prologue", "tips", "cta", "conclusion"],
};

export const PLACEMENT_OPTIONS = [
  { value: "after-title",     label: "After title" },
  { value: "bottom-section",  label: "Dedicated section near bottom" },
  { value: "manual",          label: "Manual placement" },
] as const;

export const TYPE_OPTIONS = [
  { value: "amazon", label: "Amazon" },
  { value: "chewy",  label: "Chewy" },
  { value: "other",  label: "Other / General" },
] as const;

export const getAffiliateDisclosureText = (type: "amazon" | "chewy" | "other"): string => {
  switch (type) {
    case "amazon":
      return "Heads up — some links are Amazon affiliate links. If you buy something through them, I may earn a small commission at no extra cost to you.";
    case "chewy":
      return "Heads up — some links are Chewy affiliate links. If you buy something through them, I may earn a small commission at no extra cost to you.";
    default:
      return "Heads up — some links are affiliate links. If you buy something through them, I may earn a small commission at no extra cost to you.";
  }
};
