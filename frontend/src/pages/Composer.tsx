import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sparkles, X, Plus, Image as ImageIcon, RefreshCw, ChevronDown, ChevronRight, Send } from "lucide-react";
import { CATEGORIES, WRITING_STYLES, PLACEMENT_OPTIONS, STARTER_BLOCKS_BY_STYLE, BLOCK_LIBRARY } from "@/lib/templates";
import { getDraft, newDraft, upsertDraft, setCurrentDraftId, loadCustomCategories, saveCustomCategories, uid } from "@/lib/storage";
import { generateImagePrompt, generateMeta } from "@/lib/api";
import type { Draft, StyleId, Block } from "@/types";
import LayoutBuilder from "@/components/composer/LayoutBuilder";
import EditPreview from "@/components/composer/EditPreview";
import NewsletterBuilder from "@/components/composer/NewsletterBuilder";
import RightSidebar from "@/components/composer/RightSidebar";

export default function Composer() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [activeTab, setActiveTab] = useState("layout");
  const [leftOpen, setLeftOpen] = useState(true);
  const [customCats, setCustomCats] = useState<string[]>(loadCustomCategories());
  const [newCat, setNewCat] = useState("");
  const [newTag, setNewTag] = useState("");
  const [openSection, setOpenSection] = useState<string>("style");

  // Initialize draft
  useEffect(() => {
    if (id) {
      const d = getDraft(id);
      if (d) { setDraft(d); setCurrentDraftId(d.id); return; }
    }
    const d = newDraft("real-person");
    upsertDraft(d);
    setCurrentDraftId(d.id);
    setDraft(d);
    if (!id) navigate(`/edit/${d.id}`, { replace: true });
    // eslint-disable-next-line
  }, [id]);

  // Persist whenever draft changes (debounced via microtask is fine)
  useEffect(() => {
    if (!draft) return;
    upsertDraft(draft);
  }, [draft]);

  // External save event
  useEffect(() => {
    const fn = () => { if (draft) upsertDraft(draft); };
    window.addEventListener("bf:save-draft", fn);
    return () => window.removeEventListener("bf:save-draft", fn);
  }, [draft]);

  const allCats = useMemo(() => [...CATEGORIES, ...customCats], [customCats]);

  if (!draft) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  // --- helpers ---
  const update = (patch: Partial<Draft>) => setDraft(prev => prev ? { ...prev, ...patch } : prev);
  const updateBrief = (patch: Partial<Draft["brief"]>) => setDraft(prev => prev ? { ...prev, brief: { ...prev.brief, ...patch } } : prev);
  const updateAffiliate = (patch: Partial<Draft["affiliate"]>) => setDraft(prev => prev ? { ...prev, affiliate: { ...prev.affiliate, ...patch } } : prev);
  const updateHeader = (patch: Partial<Draft["headerImage"]>) => setDraft(prev => prev ? { ...prev, headerImage: { ...prev.headerImage, ...patch } } : prev);

  const toggleCategory = (c: string) => {
    const has = draft.brief.categories.includes(c);
    updateBrief({ categories: has ? draft.brief.categories.filter(x => x !== c) : [...draft.brief.categories, c] });
  };
  const addCustomCat = () => {
    const v = newCat.trim();
    if (!v) return;
    if (allCats.includes(v)) { toast.message("Category already exists"); return; }
    const next = [...customCats, v];
    setCustomCats(next); saveCustomCategories(next);
    toggleCategory(v); setNewCat("");
  };
  const addTag = () => {
    const v = newTag.trim().toLowerCase().replace(/\s+/g, "-");
    if (!v) return;
    if (draft.brief.tags.includes(v)) return;
    updateBrief({ tags: [...draft.brief.tags, v] });
    setNewTag("");
  };
  const removeTag = (t: string) => updateBrief({ tags: draft.brief.tags.filter(x => x !== t) });

  const onStyleChange = (sid: StyleId) => {
    update({ styleId: sid });
    // If newsletter and no previews yet, auto-switch to newsletter tab
    if (sid === "newsletter") setActiveTab("newsletter");
  };

  const seedStarterBlocks = () => {
    const types = STARTER_BLOCKS_BY_STYLE[draft.styleId];
    const blocks: Block[] = types.map(t => ({ id: uid("blk"), type: t, label: BLOCK_LIBRARY.find(b => b.type === t)?.label }));
    update({ blocks });
    toast.success("Starter layout added", { description: `${blocks.length} blocks for ${WRITING_STYLES.find(s => s.id === draft.styleId)?.name}` });
  };

  const onGenerateHeaderPrompt = async () => {
    if (!draft.brief.topic) { toast.error("Add a topic first"); return; }
    const t = toast.loading("Generating header image prompt…");
    try {
      const r = await generateImagePrompt({ topic: draft.brief.topic, angle: draft.brief.angle, styleId: draft.styleId });
      updateHeader({ prompt: r.prompt, alt: r.alt });
      toast.success("Header prompt ready", { id: t });
    } catch (e: any) { toast.error("Failed to generate", { id: t, description: e?.message }); }
  };

  const onAutoMeta = async () => {
    const content = draft.blocks.map(b => b.content || "").join("\n\n");
    const title = draft.blocks.find(b => b.type === "title")?.content || draft.brief.topic;
    if (!title) { toast.error("Add a title or topic first"); return; }
    const t = toast.loading("Generating meta description…");
    try {
      const r = await generateMeta(title, content, draft.brief.focusKeyword);
      updateBrief({ metaDescription: r.text });
      toast.success("Meta description ready", { id: t });
    } catch (e: any) { toast.error("Failed", { id: t, description: e?.message }); }
  };

  const metaLen = draft.brief.metaDescription.length;
  const metaOk = metaLen >= 150 && metaLen <= 160;

  // Section toggle
  const Sec = ({ k, title, children }: { k: string; title: string; children: React.ReactNode }) => {
    const open = openSection === k;
    return (
      <div className="border-b border-border/60 last:border-b-0">
        <button
          onClick={() => setOpenSection(open ? "" : k)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
          data-testid={`sidebar-section-${k}-toggle`}>
          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-medium">{title}</span>
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>
        {open && <div className="px-4 pb-5 space-y-4">{children}</div>}
      </div>
    );
  };

  return (
    <div className="relative">
      <div className="max-w-[1500px] mx-auto px-3 sm:px-4 lg:px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT SIDEBAR */}
          <aside className={`lg:col-span-3 ${leftOpen ? "" : "hidden lg:block"} order-2 lg:order-1`}>
            <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-border bg-card/80">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="font-display text-lg">Article Brief</div>
                <Button size="icon" variant="ghost" className="lg:hidden" onClick={() => setLeftOpen(false)} data-testid="close-left-sidebar-btn">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="bf-scroll overflow-y-auto max-h-[calc(100vh-9rem)]">

                <Sec k="style" title="Writing Style">
                  <div className="grid grid-cols-1 gap-2">
                    {WRITING_STYLES.map(s => (
                      <button key={s.id}
                        onClick={() => onStyleChange(s.id)}
                        data-testid={`style-card-${s.id}`}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          draft.styleId === s.id
                            ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                            : "border-border hover:border-primary/40 bg-card"
                        }`}>
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">{s.name}</div>
                          {draft.styleId === s.id && <Sparkles className="w-3.5 h-3.5 text-primary" />}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{s.tagline}</div>
                      </button>
                    ))}
                  </div>
                </Sec>

                <Sec k="brief" title="Brief & Metadata">
                  <div>
                    <Label htmlFor="topic">Topic / Working Title</Label>
                    <Input id="topic" value={draft.brief.topic} onChange={e => updateBrief({ topic: e.target.value })} placeholder="e.g. First-week kitten care" data-testid="brief-topic-input" />
                  </div>
                  <div>
                    <Label htmlFor="audience">Target Audience</Label>
                    <Input id="audience" value={draft.brief.audience} onChange={e => updateBrief({ audience: e.target.value })} placeholder="New cat parents" data-testid="brief-audience-input" />
                  </div>
                  <div>
                    <Label>Target Length</Label>
                    <Select value={draft.brief.length} onValueChange={v => updateBrief({ length: v })}>
                      <SelectTrigger data-testid="brief-length-select"><SelectValue placeholder="Choose length" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short (~500 words)</SelectItem>
                        <SelectItem value="medium">Medium (~1000 words)</SelectItem>
                        <SelectItem value="long">Long (~1800 words)</SelectItem>
                        <SelectItem value="deep-dive">Deep dive (~2500+ words)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="keyp">Key Points</Label>
                    <Textarea id="keyp" rows={3} value={draft.brief.keyPoints} onChange={e => updateBrief({ keyPoints: e.target.value })} placeholder="Bullet the must-cover points" data-testid="brief-keypoints-input" />
                  </div>
                  <div>
                    <Label htmlFor="angle">Personal Angle / Experience</Label>
                    <Textarea id="angle" rows={3} value={draft.brief.angle} onChange={e => updateBrief({ angle: e.target.value })} placeholder="What did you actually live through?" data-testid="brief-angle-input" />
                  </div>
                  <div>
                    <Label htmlFor="extra">Extra Instructions</Label>
                    <Textarea id="extra" rows={2} value={draft.brief.extra} onChange={e => updateBrief({ extra: e.target.value })} placeholder="Anything specific?" data-testid="brief-extra-input" />
                  </div>
                </Sec>

                <Sec k="seo" title="SEO & Metadata">
                  <div>
                    <Label htmlFor="kw">Focus Keyword</Label>
                    <Input id="kw" value={draft.brief.focusKeyword} onChange={e => updateBrief({ focusKeyword: e.target.value })} placeholder="bearded dragon diet" data-testid="seo-keyword-input" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label htmlFor="meta">Meta Description <span className="text-destructive">*</span></Label>
                      <span className={`text-xs font-mono ${metaOk ? "text-secondary" : metaLen > 160 ? "text-destructive" : "text-muted-foreground"}`} data-testid="meta-char-counter">
                        {metaLen}/160
                      </span>
                    </div>
                    <Textarea id="meta" rows={3} value={draft.brief.metaDescription}
                      onChange={e => updateBrief({ metaDescription: e.target.value })}
                      placeholder="A warm, specific 150–160 character description for search results."
                      data-testid="seo-meta-input"
                    />
                    {(draft.blocks.length > 0 || draft.brief.metaDescription) && (
                      <Button variant="outline" size="sm" className="mt-2" onClick={onAutoMeta} data-testid="auto-meta-btn">
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Auto-generate from content
                      </Button>
                    )}
                  </div>
                </Sec>

                <Sec k="categories" title="Categories">
                  <div className="flex flex-wrap gap-1.5" data-testid="categories-chip-list">
                    {allCats.map(c => {
                      const active = draft.brief.categories.includes(c);
                      return (
                        <button key={c} onClick={() => toggleCategory(c)}
                          data-testid={`category-chip-${c.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            active ? "bg-primary text-primary-foreground border-primary" : "border-border bg-muted/50 text-muted-foreground hover:border-primary/40"
                          }`}>{c}</button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Add custom category"
                      onKeyDown={e => e.key === "Enter" && addCustomCat()} data-testid="add-category-input" />
                    <Button size="icon" variant="outline" onClick={addCustomCat} data-testid="add-category-btn"><Plus className="w-4 h-4" /></Button>
                  </div>
                </Sec>

                <Sec k="tags" title="Tags">
                  <div className="flex flex-wrap gap-1.5">
                    {draft.brief.tags.map(t => (
                      <Badge key={t} variant="secondary" className="rounded-full pl-2.5 pr-1 py-0.5 gap-1" data-testid={`tag-${t}`}>
                        {t}
                        <button onClick={() => removeTag(t)} className="ml-1 opacity-60 hover:opacity-100" data-testid={`remove-tag-${t}-btn`}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="bearded-dragon, hydration…"
                      onKeyDown={e => e.key === "Enter" && addTag()} data-testid="add-tag-input" />
                    <Button size="icon" variant="outline" onClick={addTag} data-testid="add-tag-btn"><Plus className="w-4 h-4" /></Button>
                  </div>
                </Sec>

                <Sec k="header" title="Header / Featured Image">
                  <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center">
                    {draft.headerImage.url ? (
                      <img src={draft.headerImage.url} alt={draft.headerImage.alt} className="rounded-lg w-full mb-2" />
                    ) : (
                      <div className="aspect-[16/9] grid place-items-center text-muted-foreground/60">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                    <Button variant="outline" size="sm" onClick={onGenerateHeaderPrompt} className="mt-2 w-full" data-testid="header-generate-prompt-btn">
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate Header Image Prompt
                    </Button>
                  </div>
                  {(draft.headerImage.prompt || draft.headerImage.alt) && (
                    <>
                      <div>
                        <Label>Image Prompt</Label>
                        <Textarea rows={4} value={draft.headerImage.prompt} onChange={e => updateHeader({ prompt: e.target.value })} data-testid="header-prompt-input" />
                      </div>
                      <div>
                        <Label>Alt Text</Label>
                        <Input value={draft.headerImage.alt} onChange={e => updateHeader({ alt: e.target.value })} data-testid="header-alt-input" />
                      </div>
                      <div>
                        <Label>Image URL (optional)</Label>
                        <Input value={draft.headerImage.url || ""} onChange={e => updateHeader({ url: e.target.value })} placeholder="https://…" data-testid="header-url-input" />
                      </div>
                    </>
                  )}
                </Sec>

                <Sec k="affiliate" title="Affiliate Disclosure">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="aff">Include disclosure</Label>
                    <Switch id="aff" checked={draft.affiliate.enabled} onCheckedChange={v => updateAffiliate({ enabled: v })} data-testid="affiliate-enabled-switch" />
                  </div>
                  {draft.affiliate.enabled && (
                    <>
                      <div>
                        <Label>Placement</Label>
                        <Select value={draft.affiliate.placement} onValueChange={(v: any) => updateAffiliate({ placement: v })}>
                          <SelectTrigger data-testid="affiliate-placement-select"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PLACEMENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Disclosure Text</Label>
                        <Textarea rows={4} value={draft.affiliate.text} onChange={e => updateAffiliate({ text: e.target.value })} data-testid="affiliate-text-input" />
                      </div>
                    </>
                  )}
                </Sec>
              </div>
            </div>
          </aside>

          {/* CANVAS */}
          <section className="lg:col-span-6 order-1 lg:order-2">
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="bg-card/60">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Working on</div>
                      <div className="font-display text-2xl">{draft.brief.topic || "Untitled article"}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setLeftOpen(true)} className="lg:hidden" data-testid="open-left-sidebar-btn">
                        Brief
                      </Button>
                      <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={() => navigate(`/finalize/${draft.id}`)} data-testid="composer-finalize-btn">
                        <Send className="w-4 h-4 mr-1.5" /> Finalize Article
                      </Button>
                    </div>
                  </div>

                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList data-testid="composer-tabs">
                      <TabsTrigger value="layout" data-testid="tab-layout">Layout Builder</TabsTrigger>
                      <TabsTrigger value="edit" data-testid="tab-edit">Edit &amp; Preview</TabsTrigger>
                      <TabsTrigger value="newsletter" data-testid="tab-newsletter">Newsletter</TabsTrigger>
                    </TabsList>
                    <TabsContent value="layout" className="mt-4">
                      <LayoutBuilder draft={draft} setDraft={setDraft} seedStarter={seedStarterBlocks} />
                    </TabsContent>
                    <TabsContent value="edit" className="mt-4">
                      <EditPreview draft={draft} setDraft={setDraft} />
                    </TabsContent>
                    <TabsContent value="newsletter" className="mt-4">
                      <NewsletterBuilder draft={draft} setDraft={setDraft} />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.div>
          </section>

          {/* RIGHT SIDEBAR */}
          <aside className="lg:col-span-3 order-3">
            <RightSidebar draft={draft} setDraft={setDraft} />
          </aside>
        </div>
      </div>
    </div>
  );
}
