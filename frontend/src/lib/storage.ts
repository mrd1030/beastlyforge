import type { Draft, Brief, AffiliateConfig, HeaderImage, Newsletter, StyleId } from "@/types";
import { DEFAULT_AFFILIATE_TEXT } from "@/lib/templates";

const KEYS = {
  DRAFTS: "bf.drafts.v1",
  CURRENT: "bf.currentDraftId.v1",
  THEME: "bf.theme.v1",
  CUSTOM_CATEGORIES: "bf.customCategories.v1",
};

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

export function emptyBrief(): Brief {
  return {
    topic: "", audience: "", length: "medium",
    keyPoints: "", angle: "", extra: "",
    focusKeyword: "", metaDescription: "",
    categories: [], tags: [],
  };
}

export function emptyHeader(): HeaderImage { return { prompt: "", alt: "", url: "" }; }

export function emptyAffiliate(): AffiliateConfig {
  return { enabled: true, placement: "bottom-section", text: DEFAULT_AFFILIATE_TEXT };
}

export function emptyNewsletter(): Newsletter {
  return {
    headerImage: emptyHeader(),
    introText: "",
    outroText: "",
    previews: [],
    useArticleHeader: true,
  };
}

export function newDraft(styleId: StyleId = "real-person"): Draft {
  const now = Date.now();
  return {
    id: uid("draft"),
    createdAt: now, updatedAt: now,
    styleId,
    brief: emptyBrief(),
    blocks: [],
    headerImage: emptyHeader(),
    affiliate: emptyAffiliate(),
    newsletter: emptyNewsletter(),
    versions: [],
  };
}

export function loadDrafts(): Draft[] {
  try {
    const raw = localStorage.getItem(KEYS.DRAFTS);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function saveDrafts(drafts: Draft[]) {
  localStorage.setItem(KEYS.DRAFTS, JSON.stringify(drafts));
}

export function upsertDraft(draft: Draft) {
  const list = loadDrafts();
  const idx = list.findIndex(d => d.id === draft.id);
  draft.updatedAt = Date.now();
  if (idx >= 0) list[idx] = draft; else list.unshift(draft);
  saveDrafts(list);
}

export function deleteDraft(id: string) {
  const list = loadDrafts().filter(d => d.id !== id);
  saveDrafts(list);
  if (getCurrentDraftId() === id) setCurrentDraftId(null);
}

export function getDraft(id: string): Draft | null {
  return loadDrafts().find(d => d.id === id) || null;
}

export function getCurrentDraftId(): string | null {
  return localStorage.getItem(KEYS.CURRENT);
}
export function setCurrentDraftId(id: string | null) {
  if (id) localStorage.setItem(KEYS.CURRENT, id);
  else localStorage.removeItem(KEYS.CURRENT);
}

export function loadCustomCategories(): string[] {
  try {
    const raw = localStorage.getItem(KEYS.CUSTOM_CATEGORIES);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
export function saveCustomCategories(c: string[]) {
  localStorage.setItem(KEYS.CUSTOM_CATEGORIES, JSON.stringify(c));
}

export const THEME_KEY = KEYS.THEME;
