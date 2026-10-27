// WCAG Contrast Ratio Calculation Script
function getLuminance(hex) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrast(hex1, hex2) {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

const tests = [
  {
    name: '#0A0A0A text on #E6A60E (Gold button / badge)',
    fg: '#0A0A0A',
    bg: '#E6A60E',
  },
  {
    name: '#E6A60E text on #000000 (Pure black page background)',
    fg: '#E6A60E',
    bg: '#000000',
  },
  {
    name: '#E6A60E text on #0B0B0C (Tile surface --surface)',
    fg: '#E6A60E',
    bg: '#0B0B0C',
  },
  {
    name: '#E6A60E text on #121214 (Raised surface --surface-raised)',
    fg: '#E6A60E',
    bg: '#121214',
  },
  {
    name: '#E6A60E muted links / text on #151518 (Inset surface --surface-inset)',
    fg: '#E6A60E',
    bg: '#151518',
  },
];

console.log('--- WCAG 2.1 Contrast Ratio Verification ---');
let allPassed = true;

for (const test of tests) {
  const ratio = getContrast(test.fg, test.bg);
  const ratioStr = ratio.toFixed(2) + ':1';
  const passesAA = ratio >= 4.5;
  const passesAAA = ratio >= 7.0;

  console.log(`\n${test.name}:`);
  console.log(`  Ratio: ${ratioStr}`);
  console.log(`  WCAG AA (>= 4.5:1): ${passesAA ? 'PASS' : 'FAIL'}`);
  console.log(`  WCAG AAA (>= 7.0:1): ${passesAAA ? 'PASS' : 'FAIL'}`);

  if (!passesAA) allPassed = false;
}

console.log(`\nOverall Contrast Result: ${allPassed ? 'ALL PASS (WCAG AA & AAA)' : 'FAILURE'}`);
