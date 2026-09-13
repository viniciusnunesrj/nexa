import React, { useState } from 'react';
import { getCardImageSources, getCardTemplateId } from '../../utils/cardImage';

interface CardImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  asset?: unknown;
  templateId?: unknown;
  src?: string;
}

function ResolvedImage({ sources, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { sources: string[] }) {
  const [index, setIndex] = useState(0);
  return <img {...props} src={sources[index]} onError={(event) => {
    if (index < sources.length - 1) setIndex(index + 1);
    props.onError?.(event);
  }} />;
}

// A new identity resets the fallback chain; a broken placeholder never loops.
export function CardImage({ asset, templateId, src, ...props }: CardImageProps) {
  const sources = getCardImageSources(templateId ?? getCardTemplateId(asset), src);
  return <ResolvedImage key={JSON.stringify(sources)} {...props} sources={sources} />;
}
