import { CARD_ART, CARD_PLACEHOLDER } from '../config/cardArt';

const imageString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

export function getCardTemplateId(source: unknown): string | undefined {
  if (!source || typeof source !== 'object') return undefined;
  const value = source as Record<string, unknown>;
  return imageString(value.templateId) || imageString(value.template_id);
}

export function getCardImageSources(templateId: unknown, fallbackImage?: unknown): string[] {
  const id = imageString(templateId);
  const official = id && Object.prototype.hasOwnProperty.call(CARD_ART, id) ? imageString(CARD_ART[id]) : undefined;
  return [...new Set([official, imageString(fallbackImage), CARD_PLACEHOLDER].filter((url): url is string => Boolean(url)))];
}

export function getCardImage(templateId: unknown, fallbackImage?: unknown): string {
  return getCardImageSources(templateId, fallbackImage)[0];
}
