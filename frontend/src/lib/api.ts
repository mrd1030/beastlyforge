import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({ baseURL: API, timeout: 120000 });

export async function generateBlock(payload: any): Promise<{ text: string }> {
  const { data } = await client.post("/generate/block", payload);
  return data;
}

export async function generateArticle(payload: any): Promise<{ results: Record<string, string> }> {
  const { data } = await client.post("/generate/article", payload);
  return data;
}

export async function humanize(text: string, styleId: string): Promise<{ text: string }> {
  const { data } = await client.post("/humanize", { text, styleId });
  return data;
}

export async function generateMeta(title: string, content: string, focusKeyword: string): Promise<{ text: string }> {
  const { data } = await client.post("/generate/meta", { title, content, focusKeyword });
  return data;
}

export async function generateImagePrompt(payload: { topic: string; angle?: string; styleId?: string; blockNote?: string }): Promise<{ prompt: string; alt: string }> {
  const { data } = await client.post("/generate/image-prompt", payload);
  return data;
}

export async function generateNewsletterPreview(payload: any) {
  const { data } = await client.post("/generate/newsletter-preview", payload);
  return data;
}

export async function generateSocial(payload: any) {
  const { data } = await client.post("/generate/social", payload);
  return data;
}

export async function generateYoutube(payload: any) {
  const { data } = await client.post("/generate/youtube", payload);
  return data;
}

export async function suggestLayout(payload: any) {
  const { data } = await client.post("/layout/suggest", payload);
  return data;
}
