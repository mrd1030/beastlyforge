import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WRITING_STYLES } from "@/lib/templates";
import { Sparkles, Heart, ShieldCheck, BookOpen, GraduationCap, Mail } from "lucide-react";

const ICONS: Record<string, any> = {
  "real-person": Heart,
  "experienced-caregiver": ShieldCheck,
  "direct-no-bs": Sparkles,
  "storyteller": BookOpen,
  "professional-educator": GraduationCap,
  "newsletter": Mail,
};

const EXAMPLES: Record<string, string> = {
  "real-person": "\"Honestly, the first night with our rescue beagle, nobody slept. Here's what I wish someone had told me about those first 72 hours.\"",
  "experienced-caregiver": "\"After fostering 200+ kittens, I've learned the bottle angle matters more than the formula brand. Here's the position that has saved the smallest ones.\"",
  "direct-no-bs": "\"Skip the diffusers. Cats need vertical space, hiding spots, and consistency. That's it. Buy a cat tree and a cardboard box.\"",
  "storyteller": "\"It was the kind of summer morning where the dew sticks to your shins. I found him under the porch — a tiny tortoise no bigger than my palm.\"",
  "professional-educator": "\"Bearded dragons are diurnal reptiles requiring UVB exposure. In simpler terms: they need real sunlight or a special bulb that mimics it.\"",
  "newsletter": "\"Hi friends — three quick pet-care reads for you this week. Settle in with your tea (and your cat, probably).\"",
};

export default function StyleLibrary() {
  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 max-w-2xl">
        <h1 className="font-display text-3xl sm:text-4xl mb-2">Style Library</h1>
        <p className="text-muted-foreground">Six voices, all rooted in care. Use them as starting points — your real voice always comes through.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {WRITING_STYLES.map(s => {
          const Icon = ICONS[s.id] || Sparkles;
          return (
            <Card key={s.id} className="hover:border-primary/40 hover:shadow-md transition-all" data-testid={`style-lib-${s.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-display text-xl">{s.name}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">{s.vibe}</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{s.tagline}</p>
                <blockquote className="bg-muted/50 border-l-4 border-primary/40 rounded-r-lg p-4 text-sm italic leading-relaxed">
                  {EXAMPLES[s.id]}
                </blockquote>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Badge variant="outline" className="text-[10px]">Tone-locked</Badge>
                  <Badge variant="outline" className="text-[10px]">Anti-AI tells</Badge>
                  <Badge variant="outline" className="text-[10px]">Human cadence</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
