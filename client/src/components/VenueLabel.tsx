import type { Venue } from '../types';

export function VenueLabel({ venue }: { venue: Venue }) {
  return (
    <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>
      📍 {venue.name}{venue.city ? ` · ${venue.city}` : ''}
    </div>
  );
}
