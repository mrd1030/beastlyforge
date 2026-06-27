from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import asyncio
import resend
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
import uuid
from datetime import datetime, timezone

import anthropic as anthropic_sdk
from tavily import TavilyClient
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
    _HAS_EMERGENT = True
except ImportError:
    _HAS_EMERGENT = False

ROOT_DIR = Path(__file__).parent
_env_path = ROOT_DIR.parent / '.env'
load_dotenv(ROOT_DIR / '.env', override=True)
load_dotenv(_env_path, override=True)
print(f"[env] Loading from: {_env_path} (exists={_env_path.exists()})")

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', '')
CLAUDE_MODEL = os.environ.get('CLAUDE_MODEL', 'claude-sonnet-4-6')
TAVILY_API_KEY = os.environ.get('TAVILY_API_KEY', '')
DEFAULT_MODEL = ("anthropic", "claude-sonnet-4-5-20250929")  # used only when falling back to emergentintegrations

# Prefer direct Anthropic key; fall back to emergentintegrations proxy.
USE_ANTHROPIC_DIRECT = bool(ANTHROPIC_API_KEY)

app = FastAPI(title="BeastlyForge API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ============ STYLE PROMPTS ============
# HONESTY RULE applied to all styles:
# Never claim personal ownership of a specific pet ("my cat Luna", "our dog Max").
# Instead use: "I've seen", "many owners find", "in my experience with cats",
# "a cat I was caring for", "readers often tell me", or speak directly to the reader ("your cat").
# The writer is knowledgeable and caring — not a liar. Warm and personal is fine; fabricating
# a specific pet is not.

STYLE_SYSTEM_PROMPTS = {
    "real-person": (
        "You write in a warm, honest first-person voice — knowledgeable from research and "
        "experience around animals, but never falsely claiming to own a specific pet. "
        "Do NOT write 'my cat [name]' or 'our dog did X'. Instead speak from the reader's "
        "perspective ('your cat', 'you might notice') or use honest framings like "
        "'in my experience', 'I've seen this work', 'many owners find'. "
        "Use natural conversational sentences, occasional fragments, gentle humor. "
        "Never sound corporate or AI-generated. Avoid 'it's important to note'. "
        "Speak directly to one reader who cares about their pet."
    ),
    "experienced-caregiver": (
        "You write as a long-time animal caregiver — someone who has worked in rescue, "
        "sanctuary, or vet care and has seen a lot. Tone is grounded, patient, confident. "
        "You can reference 'animals I've worked with' or 'cases I've seen' honestly, "
        "but never invent a specific named pet you personally own. "
        "Give clear, actionable steps rooted in real caregiver knowledge."
    ),
    "direct-no-bs": (
        "You are direct, practical, and unfiltered. No fluff, no padding. Get to the point. "
        "Use short paragraphs, plain words, and clear instructions. Tell readers what to do "
        "and why. Never invent personal pet anecdotes — just give honest, useful guidance. "
        "Still warm, but no nonsense and no fabricated stories."
    ),
    "storyteller": (
        "You are a heart-centered writer who draws readers in with vivid, grounded scenes. "
        "You may open with an observed moment or a relatable scenario ('Picture this…', "
        "'Most cat owners have been here…') but never invent a specific named pet you own. "
        "Weave information into narrative. Use sensory detail sparingly but vividly. "
        "Honest and warm — not fictional."
    ),
    "professional-educator": (
        "You are a knowledgeable but approachable educator. Explain things clearly with "
        "structure. Use accurate terminology but always define it. Tone is friendly, "
        "patient, and trustworthy — never condescending. No fabricated personal anecdotes."
    ),
    "newsletter": (
        "You are writing a friendly pet-care newsletter. Tone is scannable, warm, conversational, "
        "with short paragraphs and clear calls to action. Speak to the reader's pet ('your dog', "
        "'your cat') rather than inventing your own. Keep readers feeling welcomed not sold-to."
    ),
}

BLOCK_INSTRUCTIONS = {
    "title": "Write a single warm, specific article title. Plain text. No quotes.",
    "prologue": "Write a short, intimate 2-3 sentence intro that pulls the reader in with a real moment or honest hook.",
    "paragraph": "Write a single rich, flowing paragraph (3-6 sentences) on the topic below.",
    "tips": "Write 4-6 practical tips as a markdown bullet list. Each bullet is one tight sentence.",
    "pros-cons": "Write a Pros section and Cons section in markdown. 3-4 bullets each.",
    "key-facts": "Write 4-5 key facts as a markdown bullet list. Concise and scannable.",
    "image": "Write a short, evocative image caption (1 sentence).",
    "table": "Output a small useful markdown table (3-5 rows) relevant to the topic.",
    "chart": "Describe in 1-2 sentences what a chart for this topic should show. Then output a JSON snippet ```json {\"labels\":[...],\"values\":[...]} ``` with sample numeric data.",
    "cta": "Write a warm, non-pushy call-to-action paragraph (2-3 sentences).",
    "conclusion": "Write a sincere closing paragraph (3-4 sentences) that ties the article together.",
    "custom": "Write rich, on-topic content for this custom section.",
    "resources": "List 4-6 useful resources (books, sites, communities) as markdown bullets with short descriptions.",
    "references": "List 3-5 credible sources as markdown bullets. Format: - Source Name — short note on what it covers.",
    "affiliate": "Write a short, friendly, honest affiliate disclosure paragraph. Mention products are personally recommended.",
}


def build_system_prompt(style_id: str, brief: Dict[str, Any], style_instructions: Optional[str] = None) -> str:
    base = (style_instructions or "").strip() or STYLE_SYSTEM_PROMPTS.get(style_id, STYLE_SYSTEM_PROMPTS["real-person"])
    facts = (brief.get('factsToUse', '') or '').strip()
    context = (
        f"\n\nARTICLE CONTEXT:\n"
        f"- Topic: {brief.get('topic', '')}\n"
        f"- Target audience: {brief.get('audience', '')}\n"
        f"- Personal angle / lived experience: {brief.get('angle', '')}\n"
        f"- Key points to cover: {brief.get('keyPoints', '')}\n"
        f"- Focus keyword: {brief.get('focusKeyword', '')}\n"
        f"- Categories: {', '.join(brief.get('categories', []))}\n"
        f"- Extra instructions: {brief.get('extra', '')}\n"
    )
    if facts:
        context += (
            f"\nVERIFIED FACTS TO USE (authoritative — rely ONLY on these for specific claims):\n{facts}\n"
        )
    context += (
        f"\nGROUNDING & ACCURACY RULES (critical — follow strictly):\n"
        f"- The writer's Key Points, Personal Angle, and the 'Verified facts to use' above are your PRIMARY source of truth. Build the piece around them.\n"
        f"- Do NOT invent specific statistics, percentages, study results, dates, prices, brand claims, or veterinary/medical assertions. State such specifics ONLY if they appear in the writer's input above.\n"
        f"- When information is uncertain or not provided, stay general and cautious. Prefer practical, experience-based guidance over precise factual claims.\n"
        f"- For any health/medical topic, gently recommend consulting a veterinarian rather than asserting clinical facts.\n"
        f"- Never fabricate sources, citations, studies, or quotes. For references/resources, suggest credible general source TYPES unless specific sources are provided.\n"
        f"- Prioritize lived, practical, honest advice over generic 'fact' padding.\n\n"
        f"HONESTY RULES (critical — never break these):\n"
        f"- NEVER invent a specific pet you personally own. Do not write 'my cat Luna', 'our dog Max', or any named animal as if it belongs to you.\n"
        f"- Instead use: 'your cat', 'many owners find', 'in my experience', 'I've seen this work', 'a cat I was caring for', 'readers often tell me'.\n"
        f"- The Personal Angle field above may suggest scenarios — use them as inspiration for the READER's perspective, not as fabricated personal ownership claims.\n"
        f"- Warm, knowledgeable, and personal is the goal. Honest — not fictional.\n\n"
        f"VOICE RULES:\n"
        f"- Never use phrases like 'in today's fast-paced world', 'navigating', 'embark', 'delve', 'unleash', 'in conclusion'.\n"
        f"- Use natural human cadence. Vary sentence length. Stay true to the chosen writing style above.\n"
        f"- Output ONLY the requested content. No preamble, no explanation, no labels.\n"
    )
    return base + context


async def llm_complete(system: str, user_text: str, max_tokens: int = 2000) -> str:
    if USE_ANTHROPIC_DIRECT:
        try:
            aclient = anthropic_sdk.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
            msg = await aclient.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": user_text}],
            )
            return msg.content[0].text
        except Exception as e:
            logger.exception("Anthropic API call failed")
            raise HTTPException(500, f"Anthropic error: {str(e)}")
    # Fallback: emergentintegrations proxy
    if not _HAS_EMERGENT or not EMERGENT_LLM_KEY:
        raise HTTPException(500, "No LLM key configured. Set ANTHROPIC_API_KEY in backend/.env.")
    session_id = str(uuid.uuid4())
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system,
    ).with_model(*DEFAULT_MODEL)
    try:
        result = await chat.send_message(UserMessage(text=user_text))
        return result if isinstance(result, str) else str(result)
    except Exception as e:
        logger.exception("LLM call failed")
        raise HTTPException(500, f"LLM error: {str(e)}")


# ============ MODELS ============
class BriefIn(BaseModel):
    topic: str = ""
    audience: str = ""
    length: str = ""
    keyPoints: str = ""
    angle: str = ""
    extra: str = ""
    focusKeyword: str = ""
    factsToUse: str = ""
    categories: List[str] = []
    tags: List[str] = []


class GenerateBlockIn(BaseModel):
    styleId: str = "real-person"
    brief: BriefIn
    blockType: str
    blockNote: Optional[str] = ""
    targetLength: Optional[str] = "medium"
    styleInstructions: Optional[str] = ""


class HumanizeIn(BaseModel):
    text: str
    styleId: str = "real-person"
    styleInstructions: Optional[str] = ""


class SeoIn(BaseModel):
    title: str = ""
    topic: str = ""
    content: str = ""
    focusKeyword: Optional[str] = ""


class EmailRequest(BaseModel):
    recipient_email: EmailStr
    subject: str
    html_content: str


class MetaIn(BaseModel):
    title: str
    content: str
    focusKeyword: Optional[str] = ""


class ImagePromptIn(BaseModel):
    topic: str
    angle: Optional[str] = ""
    styleId: str = "real-person"
    blockNote: Optional[str] = ""


class NewsletterPreviewIn(BaseModel):
    title: str
    metaDescription: str
    keyPoints: str = ""
    headerImagePrompt: str = ""
    styleId: str = "newsletter"


class SocialSnippetsIn(BaseModel):
    title: str
    metaDescription: str
    content: str
    styleId: str = "real-person"


class YoutubeScriptIn(BaseModel):
    title: str
    content: str
    styleId: str = "storyteller"


class LayoutSuggestIn(BaseModel):
    brief: BriefIn
    styleId: str = "real-person"


class BriefGenerateIn(BaseModel):
    topic: str
    styleId: str = "real-person"


# ============ ROUTES ============
@api_router.get("/")
async def root():
    return {"app": "BeastlyForge", "model": DEFAULT_MODEL[1]}


@api_router.post("/generate/block")
async def generate_block(body: GenerateBlockIn):
    system = build_system_prompt(body.styleId, body.brief.model_dump(), body.styleInstructions)
    instr = BLOCK_INSTRUCTIONS.get(body.blockType, BLOCK_INSTRUCTIONS["paragraph"])
    user = f"BLOCK TYPE: {body.blockType}\nLENGTH: {body.targetLength}\nNOTE: {body.blockNote or '(none)'}\n\n{instr}"
    text = await llm_complete(system, user, max_tokens=1500)
    return {"text": text.strip()}


@api_router.post("/generate/block/stream")
async def generate_block_stream(body: GenerateBlockIn):
    """Token-by-token SSE stream for a single block."""
    system = build_system_prompt(body.styleId, body.brief.model_dump(), body.styleInstructions)
    instr = BLOCK_INSTRUCTIONS.get(body.blockType, BLOCK_INSTRUCTIONS["paragraph"])
    user = f"BLOCK TYPE: {body.blockType}\nLENGTH: {body.targetLength}\nNOTE: {body.blockNote or '(none)'}\n\n{instr}"

    async def event_gen():
        try:
            if USE_ANTHROPIC_DIRECT:
                aclient = anthropic_sdk.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
                async with aclient.messages.stream(
                    model=CLAUDE_MODEL,
                    max_tokens=1500,
                    system=system,
                    messages=[{"role": "user", "content": user}],
                ) as stream:
                    async for text in stream.text_stream:
                        yield f"data: {json.dumps({'delta': text})}\n\n"
            else:
                if not _HAS_EMERGENT or not EMERGENT_LLM_KEY:
                    yield f"data: {json.dumps({'error': 'No LLM key configured. Set ANTHROPIC_API_KEY in backend/.env.'})}\n\n"
                    return
                chat = LlmChat(
                    api_key=EMERGENT_LLM_KEY,
                    session_id=str(uuid.uuid4()),
                    system_message=system,
                ).with_model(*DEFAULT_MODEL)
                async for ev in chat.stream_message(UserMessage(text=user)):
                    if isinstance(ev, TextDelta):
                        yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                    elif isinstance(ev, StreamDone):
                        break
        except Exception as e:
            logger.exception("Stream failed")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@api_router.post("/generate/article")
async def generate_article(body: dict):
    """Generate content for an ordered list of blocks in one shot.
    body: { styleId, brief, blocks: [{id, type, note}] }
    Returns: { results: { blockId: text } }
    """
    style_id = body.get("styleId", "real-person")
    brief = body.get("brief", {})
    blocks = body.get("blocks", [])
    if not blocks:
        raise HTTPException(400, "No blocks provided")
    system = build_system_prompt(style_id, brief, body.get("styleInstructions"))

    plan_lines = []
    for i, b in enumerate(blocks, 1):
        instr = BLOCK_INSTRUCTIONS.get(b["type"], BLOCK_INSTRUCTIONS["paragraph"])
        note = b.get("note") or ""
        plan_lines.append(f"{i}. [{b['id']}] TYPE={b['type']} NOTE={note}\n   TASK: {instr}")

    user = (
        "Write the full article by producing content for EACH block below in order. "
        "Return a single JSON object mapping block id -> content string. "
        "DO NOT wrap in markdown code fences. Output ONLY raw JSON.\n\n"
        "BLOCKS:\n" + "\n".join(plan_lines) +
        "\n\nJSON FORMAT EXAMPLE:\n{\"block-id-1\": \"...content...\", \"block-id-2\": \"...content...\"}"
    )
    raw = await llm_complete(system, user, max_tokens=8000)
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    try:
        results = json.loads(raw)
    except Exception:
        # fallback: try to extract JSON object
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            try:
                results = json.loads(raw[start:end+1])
            except Exception:
                raise HTTPException(500, "Failed to parse model output")
        else:
            raise HTTPException(500, "Failed to parse model output")
    return {"results": results}


@api_router.post("/humanize")
async def humanize(body: HumanizeIn):
    base = (body.styleInstructions or "").strip() or STYLE_SYSTEM_PROMPTS.get(body.styleId, STYLE_SYSTEM_PROMPTS["real-person"])
    system = (
        base +
        "\n\nYour ONLY task: rewrite the given text so it sounds clearly written by one real person. "
        "Remove AI tells (em-dashes overuse, 'delve', 'navigating', 'in today's world', 'it's important to note', "
        "'unleash', 'embark', 'tapestry', 'realm', 'landscape of'). Vary sentence length. Keep the meaning and any "
        "specific facts EXACTLY as given — never add new statistics, claims, or sources. "
        "Output ONLY the rewritten text — no preamble."
    )
    text = await llm_complete(system, body.text, max_tokens=2000)
    return {"text": text.strip()}


@api_router.post("/generate/seo")
async def generate_seo(body: SeoIn):
    system = (
        "You are an SEO assistant for warm, authentic pet-care articles. "
        "Output STRICT JSON (no code fences, no preamble) with exactly these keys: "
        "focusKeyword (a 2-4 word primary search keyword phrase, lowercase), "
        "metaDescription (a warm, specific description between 150 and 160 characters that naturally includes the focus keyword). "
        "Do not invent statistics or claims."
    )
    user = (
        f"TITLE/TOPIC: {body.title or body.topic}\n"
        f"EXISTING FOCUS KEYWORD (improve if weak): {body.focusKeyword}\n\n"
        f"ARTICLE EXCERPT:\n{(body.content or '')[:2000]}"
    )
    raw = await llm_complete(system, user, max_tokens=300)
    raw = raw.strip().strip("`")
    if raw.lower().startswith("json"):
        raw = raw[4:].strip()
    try:
        data = json.loads(raw)
    except Exception:
        try:
            start = raw.find("{"); end = raw.rfind("}")
            data = json.loads(raw[start:end+1])
        except Exception:
            raise HTTPException(500, "Failed to parse SEO output")
    return {
        "focusKeyword": str(data.get("focusKeyword", "")).strip(),
        "metaDescription": str(data.get("metaDescription", "")).strip().strip('"'),
    }


@api_router.post("/generate/meta")
async def generate_meta(body: MetaIn):
    system = (
        "You write SEO meta descriptions for pet-care articles. "
        "Output a single meta description between 150 and 160 characters. "
        "Warm, specific, includes the focus keyword naturally if provided. "
        "No quotes. No preamble. Just the description."
    )
    user = f"TITLE: {body.title}\nFOCUS KEYWORD: {body.focusKeyword}\n\nARTICLE EXCERPT:\n{body.content[:2000]}"
    text = await llm_complete(system, user, max_tokens=200)
    text = text.strip().strip('"').strip("'")
    return {"text": text}


@api_router.post("/generate/image-prompt")
async def generate_image_prompt(body: ImagePromptIn):
    system = (
        "You craft rich, vivid image-generation prompts for pet-care article header images. "
        "Output ONE detailed prompt (60-90 words) describing scene, subject, lighting, mood, "
        "composition, lens, and style. Then on a new line output: ALT: <alt text 8-14 words>. "
        "No other commentary."
    )
    user = f"TOPIC: {body.topic}\nANGLE: {body.angle}\nNOTE: {body.blockNote}"
    text = await llm_complete(system, user, max_tokens=400)
    lines = text.strip().split("\n")
    prompt = ""
    alt = ""
    for line in lines:
        if line.strip().upper().startswith("ALT:"):
            alt = line.split(":", 1)[1].strip()
        else:
            prompt += (" " + line.strip())
    return {"prompt": prompt.strip(), "alt": alt or body.topic}


@api_router.post("/generate/newsletter-preview")
async def generate_newsletter_preview(body: NewsletterPreviewIn):
    system = (
        STYLE_SYSTEM_PROMPTS["newsletter"] +
        "\n\nYou produce a single newsletter preview card. Output strict JSON with keys: "
        "title (catchy, ~8-12 words), summary (2-3 friendly sentences, 200-320 chars), "
        "ctaText (3-5 words like 'Read the full guide'), imagePrompt (a rich image prompt for this preview), "
        "imageAlt (8-14 words alt text). Output ONLY raw JSON, no fences, no preamble."
    )
    user = (
        f"ARTICLE TITLE: {body.title}\n"
        f"META DESCRIPTION: {body.metaDescription}\n"
        f"KEY POINTS: {body.keyPoints}\n"
        f"HEADER IMAGE PROMPT: {body.headerImagePrompt}\n"
    )
    raw = await llm_complete(system, user, max_tokens=500)
    raw = raw.strip().strip("`")
    if raw.startswith("json"):
        raw = raw[4:].strip()
    try:
        data = json.loads(raw)
    except Exception:
        try:
            start = raw.find("{"); end = raw.rfind("}")
            data = json.loads(raw[start:end+1])
        except Exception:
            raise HTTPException(500, "Failed to parse model output")
    return data


@api_router.post("/generate/social")
async def generate_social(body: SocialSnippetsIn):
    system = (
        STYLE_SYSTEM_PROMPTS.get(body.styleId, STYLE_SYSTEM_PROMPTS["real-person"]) +
        "\n\nProduce three social posts in strict JSON with keys: x (<=270 chars), instagram (caption + 5 hashtags), "
        "facebook (2-3 sentences). Output ONLY raw JSON."
    )
    user = f"TITLE: {body.title}\nMETA: {body.metaDescription}\n\nEXCERPT:\n{body.content[:2000]}"
    raw = await llm_complete(system, user, max_tokens=700)
    raw = raw.strip().strip("`")
    if raw.startswith("json"):
        raw = raw[4:].strip()
    try:
        data = json.loads(raw)
    except Exception:
        try:
            start = raw.find("{"); end = raw.rfind("}")
            data = json.loads(raw[start:end+1])
        except Exception:
            raise HTTPException(500, "Failed to parse model output")
    return data


@api_router.post("/generate/youtube")
async def generate_youtube(body: YoutubeScriptIn):
    system = (
        STYLE_SYSTEM_PROMPTS.get(body.styleId, STYLE_SYSTEM_PROMPTS["storyteller"]) +
        "\n\nWrite a 60-90 second YouTube Shorts script for a pet-care creator. "
        "Sections: [HOOK] 1-2 lines. [BODY] 4-6 short beats. [CTA] one warm closing line. "
        "Plain text. No JSON. No camera directions in brackets except section labels above."
    )
    user = f"TITLE: {body.title}\n\nARTICLE:\n{body.content[:3000]}"
    text = await llm_complete(system, user, max_tokens=900)
    return {"text": text.strip()}


@api_router.post("/layout/suggest")
async def suggest_layout(body: LayoutSuggestIn):
    system = (
        "You suggest an article block layout for pet-care content. "
        "Output strict JSON: { blocks: [ { type, note } ] }. Types must be from: "
        "title, prologue, paragraph, tips, pros-cons, key-facts, image, table, chart, "
        "cta, conclusion, custom, resources, references, affiliate. "
        "Include 6-10 blocks tailored to the brief. Output ONLY raw JSON."
    )
    user = json.dumps(body.brief.model_dump())
    raw = await llm_complete(system, user, max_tokens=900)
    raw = raw.strip().strip("`")
    if raw.startswith("json"):
        raw = raw[4:].strip()
    try:
        data = json.loads(raw)
    except Exception:
        try:
            start = raw.find("{"); end = raw.rfind("}")
            data = json.loads(raw[start:end+1])
        except Exception:
            raise HTTPException(500, "Failed to parse model output")
    return data


async def _search_facts(topic: str) -> str:
    """Run a Tavily search and return a clean bullet list of sourced facts."""
    if not TAVILY_API_KEY:
        return ""
    try:
        tavily = TavilyClient(api_key=TAVILY_API_KEY)
        results = await asyncio.to_thread(
            tavily.search,
            query=f"{topic} pet care facts",
            search_depth="advanced",
            max_results=5,
            include_answer=True,
        )
        lines = []
        # Include the synthesized answer if present
        if results.get("answer"):
            lines.append(f"- {results['answer'].strip()}")
        # Pull key sentences from each result
        for r in results.get("results", []):
            content = (r.get("content") or "").strip()
            if content:
                # Take first 2 sentences as a fact bullet
                sentences = [s.strip() for s in content.replace("\n", " ").split(".") if len(s.strip()) > 30]
                for s in sentences[:2]:
                    lines.append(f"- {s}. (Source: {r.get('url', '')})")
        return "\n".join(lines[:10])  # cap at 10 bullets
    except Exception as e:
        logger.warning(f"Tavily search failed: {e}")
        return ""


@api_router.post("/generate/brief")
async def generate_brief(body: BriefGenerateIn):
    """Auto-fill all brief fields from a topic/title in one shot, with real web facts."""
    # Run web search and brief generation in parallel
    facts_task = asyncio.create_task(_search_facts(body.topic))

    system = (
        "You are a content strategist for BeastlyFacts.com, a warm, authentic pet-care blog. "
        "Given a topic/title and writing style, return a complete article brief as strict JSON. "
        "Output ONLY raw JSON with exactly these keys:\n"
        "- audience (string): 1-sentence description of who will read this\n"
        "- keyPoints (string): 4-6 bullet points (markdown list) covering what the article must address\n"
        "- angle (string): 2-3 sentences describing a personal, lived-experience angle the writer can take\n"
        "- focusKeyword (string): a 2-4 word lowercase SEO keyword phrase\n"
        "- metaDescription (string): a warm, specific 150-160 character meta description that includes the focus keyword\n"
        "- categories (array of strings): 1-3 relevant categories from this list only — "
        "Amphibians, Aquatic Life, Birds, Cats, Dogs, Fun Facts, Invertebrates, Pet Care, "
        "Product Picks, Reptiles, Small & Exotic Pets, Wild Animals, Reptile Care, Site News\n"
        "- tags (array of strings): 3-6 lowercase hyphenated tags (e.g. 'bearded-dragon', 'gut-loading')\n"
        "Do NOT invent statistics. Be specific to the topic. Output ONLY raw JSON, no fences, no preamble."
    )
    style_hint = STYLE_SYSTEM_PROMPTS.get(body.styleId, "")
    user = f"TOPIC: {body.topic}\nWRITING STYLE CONTEXT: {style_hint[:300]}"

    raw, facts = await asyncio.gather(
        llm_complete(system, user, max_tokens=800),
        facts_task,
    )
    raw = raw.strip().strip("`")
    if raw.lower().startswith("json"):
        raw = raw[4:].strip()
    try:
        data = json.loads(raw)
    except Exception:
        try:
            start = raw.find("{"); end = raw.rfind("}")
            data = json.loads(raw[start:end+1])
        except Exception:
            raise HTTPException(500, "Failed to parse brief output")
    return {
        "audience": str(data.get("audience", "")).strip(),
        "keyPoints": str(data.get("keyPoints", "")).strip(),
        "angle": str(data.get("angle", "")).strip(),
        "focusKeyword": str(data.get("focusKeyword", "")).strip(),
        "metaDescription": str(data.get("metaDescription", "")).strip().strip('"'),
        "categories": [str(c) for c in data.get("categories", []) if isinstance(c, str)],
        "tags": [str(t).lower().replace(" ", "-") for t in data.get("tags", []) if isinstance(t, str)],
        "factsToUse": facts,
    }


@api_router.post("/generate/facts")
async def generate_facts(body: BriefGenerateIn):
    """Search the web for sourced facts about a topic on demand."""
    if not TAVILY_API_KEY:
        raise HTTPException(400, "TAVILY_API_KEY not configured")
    facts = await _search_facts(body.topic)
    if not facts:
        raise HTTPException(500, "No results returned from search")
    return {"factsToUse": facts}


@api_router.post("/send-email")
async def send_email(request: EmailRequest):
    if not RESEND_API_KEY or not SENDER_EMAIL:
        raise HTTPException(400, "Email not configured. Set RESEND_API_KEY and SENDER_EMAIL.")
    resend.api_key = RESEND_API_KEY
    params = {
        "from": SENDER_EMAIL,
        "to": [request.recipient_email],
        "subject": request.subject or "Your BeastlyForge newsletter",
        "html": request.html_content,
    }
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        return {"status": "success", "message": f"Test email sent to {request.recipient_email}", "email_id": email.get("id")}
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        raise HTTPException(500, f"Failed to send email: {str(e)}")


# Mount router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
