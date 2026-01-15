import type { GigWithPayer } from '../hooks/useGigs';

export function getGigDisplayName(gig: GigWithPayer | { title?: string | null; location?: string | null; payer?: { name: string } | null }): string {
  if (gig.title && gig.title.trim()) {
    return gig.title.trim();
  }
  
  if (gig.location && gig.location.trim()) {
    return gig.location.trim();
  }
  
  if (gig.payer?.name) {
    return gig.payer.name;
  }
  
  return 'Untitled Gig';
}
