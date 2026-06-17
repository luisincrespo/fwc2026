// Primary (home) and alt (away) flag colors per ISO country code.
// Black and near-white primaries use a distinguishable secondary flag color.
type TC = { p: string; alt: string };

const COLORS: Record<string, TC> = {
  // CONMEBOL
  'ar': { p: '#74ACDF', alt: '#F6B40E' },  // light blue / gold (sun)
  'br': { p: '#FFDF00', alt: '#009C3B' },  // yellow / green
  'uy': { p: '#5EB6E4', alt: '#FFFFFF' },  // light blue / white – alt unused on dark bg, fallback handled below
  'co': { p: '#FCD116', alt: '#003087' },  // yellow / blue
  'ec': { p: '#FFD100', alt: '#003DA5' },  // yellow / blue
  've': { p: '#CF142B', alt: '#003DA5' },  // red / blue (flag stripes)
  'cl': { p: '#D52B1E', alt: '#003DA5' },  // red / blue (flag canton)
  'py': { p: '#D52B1E', alt: '#003DA5' },  // red / blue (flag stripe)
  'bo': { p: '#D52B1E', alt: '#F4BC00' },  // red / yellow
  'pe': { p: '#D91023', alt: '#8B0000' },  // red / dark red (only two colors)

  // CONCACAF
  'us': { p: '#B22234', alt: '#002868' },  // red / blue (flag)
  'mx': { p: '#30A060', alt: '#CC0000' },  // green / red (flag)
  'ca': { p: '#FF0000', alt: '#003087' },  // red / blue (kit)
  'pa': { p: '#DA121A', alt: '#003DA5' },  // red / blue (flag)
  'cr': { p: '#003DA5', alt: '#DA121A' },  // blue / red (flag)
  'hn': { p: '#3A6BC4', alt: '#5FFFFF' },  // blue / light blue (stars)
  'sv': { p: '#3A6BC4', alt: '#003087' },  // blue / dark blue
  'jm': { p: '#FED100', alt: '#007A3D' },  // gold / black-star green (kit)
  'gt': { p: '#4997D0', alt: '#FFFFFF' },  // blue / (two-color, see below)
  'ht': { p: '#1A4FAF', alt: '#CC0000' },  // blue / red (flag)
  'cu': { p: '#1A3FAF', alt: '#CC0000' },  // blue / red (flag)
  'ni': { p: '#3E6ED8', alt: '#FFFFFF' },  // blue
  'tt': { p: '#CE1126', alt: '#003087' },  // red / blue (kit)

  // UEFA
  'fr': { p: '#1E60CF', alt: '#E1000F' },  // blue / red (tricolor)
  'gb-eng': { p: '#CF101A', alt: '#1D3470' },  // red / dark blue (kit)
  'es': { p: '#AA151B', alt: '#F1BF00' },  // red / gold (flag)
  'de': { p: '#FFCE00', alt: '#CC0000' },  // gold / red (flag — not black)
  'pt': { p: '#3AAA35', alt: '#CC0000' },  // green / red (flag)
  'nl': { p: '#FF6600', alt: '#1A3FAF' },  // orange / blue (kit)
  'be': { p: '#FAE042', alt: '#CC0000' },  // yellow / red (flag)
  'hr': { p: '#FF0000', alt: '#003DA5' },  // red / blue (checkerboard)
  'it': { p: '#1A56C8', alt: '#009246' },  // blue / green (tricolor)
  'ch': { p: '#FF0000', alt: '#003087' },  // red / blue (kit)
  'pl': { p: '#DC143C', alt: '#003087' },  // red / blue (kit)
  'dk': { p: '#C60C30', alt: '#003087' },  // red / blue (nordic cross)
  'se': { p: '#006AA7', alt: '#FECC02' },  // blue / yellow (flag)
  'no': { p: '#EF2B2D', alt: '#003087' },  // red / blue (nordic cross)
  'rs': { p: '#C6363C', alt: '#003DA5' },  // red / blue (flag stripe)
  'gb-sct': { p: '#1A4FAF', alt: '#C09A00' },  // blue / gold (lion rampant)
  'gb-wls': { p: '#C8102E', alt: '#007A3D' },  // red / green (dragon field)
  'at': { p: '#ED2939', alt: '#003087' },  // red / blue (kit)
  'ua': { p: '#005BBB', alt: '#FFD500' },  // blue / yellow (flag)
  'tr': { p: '#E30A17', alt: '#003087' },  // red / blue (kit)
  'al': { p: '#CE2028', alt: '#000000' },  // red / (two-color, dark)
  'ge': { p: '#FF0000', alt: '#003087' },  // red / blue (kit)
  'cz': { p: '#D7141A', alt: '#003DA5' },  // red / blue (flag)
  'sk': { p: '#1A5DAD', alt: '#CC0000' },  // blue / red (flag)
  'si': { p: '#1A4FAF', alt: '#CC0000' },  // blue / red (flag)
  'ro': { p: '#002B7F', alt: '#CC0000' },  // blue / red (flag)
  'hu': { p: '#CE2939', alt: '#009246' },  // red / green (flag)
  'fi': { p: '#1A4FA8', alt: '#FECC02' },  // blue / yellow (kit)
  'gr': { p: '#0D5EAF', alt: '#FFFFFF' },  // blue / white (flag)
  'ie': { p: '#169B62', alt: '#FF7900' },  // green / orange (tricolor)
  'is': { p: '#1A4FAF', alt: '#CC0000' },  // blue / red (flag)
  'mk': { p: '#CE2028', alt: '#F7CE00' },  // red / yellow (sun)
  'ba': { p: '#1A4FAF', alt: '#FECC02' },  // blue / yellow (star/stripe)
  'me': { p: '#D4AF37', alt: '#CC0000' },  // gold / red (flag)
  'cy': { p: '#1A4FAF', alt: '#CC0000' },  // blue / red
  'lu': { p: '#EF3340', alt: '#009FCA' },  // red / light blue (flag stripe)
  'mt': { p: '#CF0921', alt: '#C0C0C0' },  // red / silver (cross)
  'kv': { p: '#1A4FAF', alt: '#F7CE00' },  // blue / gold (stars)

  // CAF
  'ma': { p: '#C1272D', alt: '#006233' },  // red / green (flag star + emblem)
  'sn': { p: '#00A550', alt: '#FFCB00' },  // green / yellow (star)
  'dz': { p: '#00A550', alt: '#CC0000' },  // green / red (flag)
  'eg': { p: '#CE1126', alt: '#C09A00' },  // red / gold (eagle)
  'cm': { p: '#007A5E', alt: '#CC0000' },  // green / red (flag)
  'ng': { p: '#008751', alt: '#003087' },  // green / blue (kit)
  'ci': { p: '#F77F00', alt: '#009A44' },  // orange / green (flag)
  'za': { p: '#007A4D', alt: '#FFB81C' },  // green / gold (flag)
  'gh': { p: '#FCD116', alt: '#006B3F' },  // gold / green (flag)
  'tn': { p: '#E70013', alt: '#003087' },  // red / blue (kit)
  'cd': { p: '#007FFF', alt: '#FFCB00' },  // blue / yellow (flag)
  'ml': { p: '#14B53A', alt: '#CC0000' },  // green / red (flag)
  'gn': { p: '#CE1126', alt: '#FCD116' },  // red / yellow (flag)
  'ke': { p: '#006600', alt: '#CC0000' },  // green / red (flag)
  'tz': { p: '#1EB53A', alt: '#009FCA' },  // green / blue (flag stripe)
  'ao': { p: '#CC0000', alt: '#000000' },  // red / (dark)
  'zm': { p: '#198A00', alt: '#FF6600' },  // green / orange (eagle)
  'bw': { p: '#75AADB', alt: '#003087' },  // light blue / dark blue
  'ug': { p: '#FCDC04', alt: '#CC0000' },  // yellow / red (flag)
  'et': { p: '#078930', alt: '#FCDC04' },  // green / yellow (flag)
  'bi': { p: '#CE1126', alt: '#1EB53A' },  // red / green (flag)

  // AFC
  'jp': { p: '#BC002D', alt: '#003087' },  // red / blue (kit)
  'kr': { p: '#CD2E3A', alt: '#003DA5' },  // red / blue (flag trigrams)
  'ir': { p: '#30A060', alt: '#CC0000' },  // green / red (flag)
  'sa': { p: '#00813A', alt: '#C09A00' },  // green / gold (kit)
  'au': { p: '#FFD700', alt: '#003DA5' },  // gold / blue (union jack in flag)
  'qa': { p: '#8D1B3D', alt: '#C09A00' },  // maroon / gold (kit)
  'uz': { p: '#1EB53A', alt: '#1EB6E7' },  // green / sky blue (flag stripes)
  'iq': { p: '#CE1126', alt: '#007A3D' },  // red / green (flag)
  'jo': { p: '#30A060', alt: '#CC0000' },  // green / red (flag)
  'cn': { p: '#DE2910', alt: '#FFDE00' },  // red / yellow (flag)
  'ae': { p: '#00732F', alt: '#CC0000' },  // green / red (flag)
  'th': { p: '#A51931', alt: '#003087' },  // red / blue (flag stripe)
  'vn': { p: '#DA251D', alt: '#FFCD00' },  // red / yellow (star)
  'id': { p: '#CE1126', alt: '#003087' },  // red / blue (kit)
  'in': { p: '#FF9933', alt: '#138808' },  // orange / green (flag)
  'ph': { p: '#1A4FAF', alt: '#CE1126' },  // blue / red (flag)
  'bh': { p: '#CE1126', alt: '#FFFFFF' },  // red
  'kw': { p: '#30A060', alt: '#CC0000' },  // green / red (flag)
  'om': { p: '#DB161B', alt: '#007A3D' },  // red / green (flag)
  'ps': { p: '#30A060', alt: '#CC0000' },  // green / red (flag)
  'sy': { p: '#CE1126', alt: '#007A3D' },  // red / green (flag)
  'lb': { p: '#CD1126', alt: '#007A3D' },  // red / green (cedar)

  // OFC
  'nz': { p: '#1A4FAF', alt: '#CC0000' },  // blue / red (southern cross)
  'fj': { p: '#68BFE5', alt: '#003DA5' },  // light blue / dark blue
};

const FALLBACK: TC = { p: '#64748b', alt: '#94a3b8' };

export function teamColor(code: string, role: 'home' | 'away'): string {
  const tc = COLORS[code] ?? FALLBACK;
  return role === 'home' ? tc.p : tc.alt;
}
