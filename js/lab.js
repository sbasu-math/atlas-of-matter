/* What If Lab: drag atoms together and watch them react.
   Chemistry comes from a hand-written table of famous reactions, with general rules
   (electronegativity, metal/nonmetal, full shells) for every other pair. */
const Lab = (() => {
  const box = $('#chamberBox'), cv = $('#chamber'), ctx = cv.getContext('2d');
  let W = 0, H = 0, running = false, last = 0, uid = 0, booted = false;
  let things = [], parts = [], rings = [], reactions = [];
  let flash = 0, flashColor = '#ffffff', shake = 0, mode = 'room', drag = null, hover = null;
  const mouse = { x: -999, y: -999 };
  const found = new Map();

  /* ---------- helpers ---------- */
  const SUBS = '₀₁₂₃₄₅₆₇₈₉';
  const sub = s => s.replace(/\d/g, d => SUBS[d]);
  const subHTML = s => s.replace(/(\d+)/g, '<sub>$1</sub>');
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const pairKey = (a, b) => [a, b].sort().join('+');
  const rand = (a, b) => a + Math.random() * (b - a);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  function mixHex(a, b, t) {
    const A = hex2rgb(a), B = hex2rgb(b);
    return rgb2hex(A.map((v, i) => lerp(v, B[i], t)));
  }
  const col = sym => BY_SYM[sym].color;

  /* ---------- product shapes ---------- */
  const mol = (center, sats, geo) => ({ ptype: 'molecule', center, sats, geo });
  const lat = (a, b, tint) => ({ ptype: 'lattice', a, b, tint });
  const alloy = (a, b, ratio) => ({ ptype: 'alloy', a, b, ratio });

  /* ---------- famous reactions ---------- */
  const SPECIAL = {
    'Cl+Na': { type: 'ionic', formula: 'NaCl', name: 'Sodium chloride', boom: true, spec: lat('Na', 'Cl'), tags: ['Ionic bond', 'Violent', 'Table salt'],
      text: 'Sodium burns in chlorine with a fierce yellow flame. Its one outer electron jumps to chlorine, and the ions lock into a cubic crystal. Two dangerous elements become the salt on your fries.' },
    'H+O': { type: 'covalent', formula: 'H2O', name: 'Water', boom: true, spec: mol('O', ['H', 'H'], 'bent'), tags: ['Polar covalent', 'Explosive', 'Essential for life'],
      text: 'Mix the gases, add a spark, and they explode with a sharp bang. This reaction powered the Space Shuttle\'s main engines. Oxygen pulls the shared electrons toward itself, which bends water and makes it polar enough to dissolve almost anything.' },
    'H+H': { type: 'covalent', formula: 'H2', name: 'Hydrogen gas', spec: mol('H', ['H'], 'linear'), tags: ['Covalent', 'Single bond'],
      text: 'Each hydrogen has one electron and wants two. By sharing, both get what they want: the simplest chemical bond in the universe. (Switch to "Inside a star" to fuse them instead.)' },
    'O+O': { type: 'covalent', formula: 'O2', name: 'Oxygen gas', spec: mol('O', ['O'], 'linear'), tags: ['Double bond', 'What you breathe'],
      text: 'Two oxygens share two pairs of electrons in a double bond. Leftover unpaired electrons make liquid oxygen stick to a magnet.' },
    'N+N': { type: 'covalent', formula: 'N2', name: 'Nitrogen gas', spec: mol('N', ['N'], 'linear'), tags: ['Triple bond', '78% of air'],
      text: 'A triple bond, one of the strongest in chemistry. That is why the nitrogen in the air barely reacts with anything, and why breaking it to make fertilizer took a Nobel Prize.' },
    'C+O': { type: 'combustion', formula: 'CO2', name: 'Carbon dioxide', flame: '#ff8c2e', spec: mol('C', ['O', 'O'], 'linear'), tags: ['Combustion', 'Greenhouse gas'],
      text: 'Burning carbon releases the energy plants captured from sunlight, sometimes millions of years ago. The product traps heat in the atmosphere.' },
    'Fe+O': { type: 'rust', formula: 'Fe2O3', name: 'Rust', spec: lat('Fe', 'O', '#a8432a'), tags: ['Slow oxidation', 'Exothermic'],
      text: 'Iron slowly hands electrons to oxygen and crumbles into flaky red iron oxide. A hand warmer runs the same reaction with iron powder, fast enough to feel the heat.' },
    'Mg+O': { type: 'combustion', formula: 'MgO', name: 'Magnesium oxide', flame: '#ffffff', boom: true, spec: lat('Mg', 'O'), tags: ['Combustion', 'Blinding light'],
      text: 'Magnesium burns at around 3,100 °C with a white light bright enough to hurt your eyes. Early photographers used it as a flash.' },
    'C+Fe': { type: 'alloy', formula: 'Fe + C', name: 'Steel', spec: alloy('Fe', 'C', 0.1), tags: ['Alloy', 'Under 2% carbon'],
      text: 'A pinch of carbon wedged between iron atoms stops their layers from sliding past each other. The result is far harder and stronger than pure iron. Civilization runs on it.' },
    'Cu+Sn': { type: 'alloy', formula: 'Cu + Sn', name: 'Bronze', spec: alloy('Cu', 'Sn', 0.14), tags: ['Alloy', 'Gave its name to an age'],
      text: 'About 88% copper and 12% tin. Harder than either metal alone, bronze made better tools and weapons, and started the Bronze Age around 3300 BCE.' },
    'Cu+Zn': { type: 'alloy', formula: 'Cu + Zn', name: 'Brass', spec: alloy('Cu', 'Zn', 0.35), tags: ['Alloy', 'Golden'],
      text: 'Copper plus zinc: golden, easy to shape, and bright-sounding. Trumpets, door handles and bullet casings are brass.' },
    'Au+Hg': { type: 'alloy', formula: 'AuHg', name: 'Gold amalgam', spec: alloy('Au', 'Hg', 0.5), tags: ['Amalgam', 'Liquid metal dissolves solid'],
      text: 'Mercury dissolves gold the way water dissolves sugar. Small-scale miners still use it to collect gold, then boil the mercury off into the air and rivers.' },
    'Ag+Hg': { type: 'alloy', formula: 'AgHg', name: 'Dental amalgam', spec: alloy('Ag', 'Hg', 0.5), tags: ['Amalgam'],
      text: 'Silver, tin and mercury filled hundreds of millions of teeth. The mercury is locked into the alloy, which hardens within minutes.' },
    'O+Si': { type: 'covalent', formula: 'SiO2', name: 'Quartz (silica)', spec: lat('Si', 'O'), tags: ['Covalent network', 'Sand and glass'],
      text: 'Each silicon bonds to four oxygens in an endless 3-D network. As crystals it is quartz; as grains it is most of the sand on Earth; melted and cooled fast, it is glass.' },
    'H+N': { type: 'covalent', formula: 'NH3', name: 'Ammonia', spec: mol('N', ['H', 'H', 'H'], 'trigonal'), tags: ['Covalent', 'Feeds billions'],
      text: 'The Haber–Bosch process makes ammonia from air and hydrogen. Fertilizer made from it grows the food for roughly half of humanity.' },
    'C+H': { type: 'covalent', formula: 'CH4', name: 'Methane', spec: mol('C', ['H', 'H', 'H', 'H'], 'tetra'), tags: ['Covalent', 'Natural gas'],
      text: 'Carbon shares one electron pair with each of four hydrogens, pointing them to the corners of a tetrahedron. It is the main fuel in natural gas, and a potent greenhouse gas.' },
    'Cl+H': { type: 'covalent', formula: 'HCl', name: 'Hydrogen chloride', boom: true, spec: mol('Cl', ['H'], 'linear'), tags: ['Polar covalent', 'Explodes in sunlight'],
      text: 'A mix of the two gases explodes when sunlight hits it. Dissolved in water, the product is hydrochloric acid, the same acid your stomach uses to digest food.' },
    'F+H': { type: 'covalent', formula: 'HF', name: 'Hydrogen fluoride', boom: true, spec: mol('F', ['H'], 'linear'), tags: ['Very polar', 'Etches glass'],
      text: 'Reacts explosively even in the dark. Hydrofluoric acid etches glass and can seep through skin to attack bone.' },
    'O+S': { type: 'combustion', formula: 'SO2', name: 'Sulfur dioxide', flame: '#5a7bff', spec: mol('S', ['O', 'O'], 'bent'), tags: ['Combustion', 'Acid rain'],
      text: 'Sulfur burns with a ghostly blue flame, giving off the choking smell of a struck match. In the air it turns into acid rain.' },
    'Ca+O': { type: 'combustion', formula: 'CaO', name: 'Quicklime', flame: '#ff6a2a', spec: lat('Ca', 'O'), tags: ['Ionic', 'Limelight'],
      text: 'Heated quicklime glows a brilliant white. Nineteenth-century theaters lit their stars this way: the original limelight.' },
    'F+Xe': { type: 'covalent', formula: 'XeF2', name: 'Xenon difluoride', spec: mol('Xe', ['F', 'F'], 'linear'), tags: ['"Impossible" compound', '1962'],
      text: 'Noble gases are not completely noble. Xenon\'s outer electrons sit far from its nucleus, so fluorine can pry them loose. Chemists first managed it in 1962.' },
    'K+Na': { type: 'alloy', formula: 'NaK', name: 'NaK', spec: alloy('Na', 'K', 0.5), tags: ['Liquid alloy', 'Reactor coolant'],
      text: 'Two solid metals that make a liquid. NaK stays liquid at room temperature and cools some nuclear reactors. It catches fire in air.' },
    'Al+O': { type: 'combustion', formula: 'Al2O3', name: 'Corundum', flame: '#ffffff', spec: lat('Al', 'O'), tags: ['Ionic', 'Ruby and sapphire'],
      text: 'One of the hardest minerals. Add a trace of chromium and it is ruby; iron and titanium make blue sapphire. A thin skin of it protects every aluminium can.' },
    'O+Ti': { type: 'ionic', formula: 'TiO2', name: 'Titanium dioxide', spec: lat('Ti', 'O', '#f4f4f4'), tags: ['Ionic', 'Whitest white'],
      text: 'The brilliant white pigment in paint, toothpaste, paper and sunscreen.' },
    'Hg+S': { type: 'ionic', formula: 'HgS', name: 'Cinnabar', spec: lat('Hg', 'S', '#d4302a'), tags: ['Mineral', 'Vermilion pigment'],
      text: 'Ground into vermilion, it colored Roman frescoes and Chinese lacquer. Beautiful, and poisonous.' },
    'Pb+S': { type: 'ionic', formula: 'PbS', name: 'Galena', spec: lat('Pb', 'S', '#6b7383'), tags: ['Mineral', 'Main lead ore'],
      text: 'Shiny cubic crystals and the main source of lead. Early crystal radios used a galena crystal to pick up signals.' },
    'Fe+S': { type: 'ionic', formula: 'FeS', name: 'Iron sulfide', spec: lat('Fe', 'S', '#c9a53c'), tags: ['Glows as it forms', 'Fool\'s gold'],
      text: 'Heat the two and the mixture glows red as it reacts. In nature iron and sulfur also crystallize as pyrite (FeS₂), the brassy fool\'s gold.' },
    'C+C': { type: 'covalent', formula: 'C', name: 'Diamond', spec: lat('C', 'C', '#d8f3ff'), tags: ['Allotrope', 'Hardest natural material'],
      text: 'Same atoms, different arrangement. Stacked in flat sheets, carbon is soft grey graphite. Locked into a 3-D network, each atom bonded to four others, it is diamond.' },
    'As+Ga': { type: 'covalent', formula: 'GaAs', name: 'Gallium arsenide', spec: lat('Ga', 'As'), tags: ['Semiconductor', 'Spacecraft solar cells'],
      text: 'A semiconductor faster than silicon. It is in the radio chips of phones and the solar panels of satellites.' },
    'P+P': { type: 'covalent', formula: 'P4', name: 'White phosphorus', spec: mol('P', ['P', 'P', 'P'], 'trigonal'), tags: ['Strained bonds', 'Ignites in air'],
      text: 'Four atoms in a tight tetrahedron, so strained that it bursts into flame in air at about 30 °C. It glows faintly in the dark as it oxidizes.' },
    'S+S': { type: 'covalent', formula: 'S8', name: 'Sulfur crown', spec: mol('S', ['S', 'S', 'S', 'S', 'S', 'S', 'S'], 'ring'), tags: ['Ring molecule'],
      text: 'Sulfur atoms link into rings of eight, shaped like a crown. Stacked together, those rings are the yellow crystals you know.' },
  };

  const WATER = {
    Li: { p: 0.3, text: 'Lithium floats and fizzes steadily, giving off hydrogen.' },
    Na: { p: 0.6, text: 'Sodium melts into a silver ball and skates across the surface, hissing. The hydrogen it releases may catch fire with a yellow flame.' },
    K: { p: 0.85, boom: true, text: 'Potassium bursts into a lilac flame the moment it touches water.' },
    Rb: { p: 1, boom: true, text: 'Rubidium explodes on contact with water.' },
    Cs: { p: 1.2, boom: true, text: 'Caesium explodes so violently it can shatter the container. Each step down the alkali column is more reactive, because the outer electron sits farther from the nucleus.' },
    Fr: { p: 1.2, boom: true, text: 'Francium would be the most violent of all, but no one has ever had enough of it to try.' },
    Ca: { p: 0.25, text: 'Calcium sinks and fizzes steadily, turning the water cloudy.' },
    Sr: { p: 0.35, text: 'Strontium reacts briskly, faster than calcium.' },
    Ba: { p: 0.45, text: 'Barium reacts vigorously, faster than strontium.' },
    Mg: { p: 0.08, text: 'Almost nothing happens. Magnesium needs hot water or steam to react.' },
  };

  /* ---------- general chemistry rules ---------- */
  const ANION = { H: 'hydride', B: 'boride', C: 'carbide', N: 'nitride', O: 'oxide', F: 'fluoride', Si: 'silicide', P: 'phosphide', S: 'sulfide', Cl: 'chloride', As: 'arsenide', Se: 'selenide', Br: 'bromide', Te: 'telluride', I: 'iodide', At: 'astatide' };
  const ION_FIXED = { Ag: 1, Cu: 2, Au: 3, Fe: 3, Al: 3, Ga: 3, In: 3, Ti: 4, Zr: 4, Hf: 4, Sn: 4, Pb: 2, Zn: 2, Cd: 2, Hg: 2, Cr: 3, Sc: 3, Y: 3, Tl: 1, Bi: 3, U: 4, Th: 4, Pu: 4, Np: 4, Pa: 5 };
  function cationCharge(e) {
    if (ION_FIXED[e.sym]) return ION_FIXED[e.sym];
    if (e.cat === 'am') return 1;
    if (e.cat === 'ae') return 2;
    if (e.cat === 'ln' || e.cat === 'an') return 3;
    if (e.cat === 'pt') return 3;
    return 2;
  }
  function anionCharge(e) {
    if (e.cat === 'hl') return 1;
    if (['O', 'S', 'Se', 'Te'].includes(e.sym)) return 2;
    if (['N', 'P', 'As', 'B'].includes(e.sym)) return 3;
    if (['C', 'Si'].includes(e.sym)) return 4;
    if (e.sym === 'H') return 1;
    return null;
  }
  function bondCount(e) {
    if (e.sym === 'H' || e.cat === 'hl') return 1;
    if (['O', 'S', 'Se', 'Te', 'Kr', 'Xe', 'Rn'].includes(e.sym)) return 2;
    if (['N', 'P', 'As', 'Sb', 'B'].includes(e.sym)) return 3;
    return 4;
  }
  const PREFIX = ['', 'mono', 'di', 'tri', 'tetra', 'penta', 'hexa', 'hepta', 'octa'];
  const fmla = (a, na, b, nb) => a.sym + (na > 1 ? na : '') + b.sym + (nb > 1 ? nb : '');
  function geoFor(center, k) {
    if (k === 1) return 'linear';
    if (k === 2) return ['O', 'S', 'Se', 'Te'].includes(center.sym) ? 'bent' : 'linear';
    if (k === 3) return 'trigonal';
    if (k === 4) return 'tetra';
    return 'ring';
  }

  function ionicRes(m, n) {
    const c = cationCharge(m), a = anionCharge(n), g = gcd(c, a);
    const cm = a / g, cn = c / g;
    const formula = fmla(m, cm, n, cn);
    const violent = n.sym === 'F' || (m.cat === 'am' && (n.cat === 'hl' || n.sym === 'O'));
    const oxide = n.sym === 'O' && (m.cat === 'am' || m.cat === 'ae');
    const dEN = m.en != null && n.en != null ? Math.abs(n.en - m.en) : null;
    return {
      type: oxide ? 'combustion' : 'ionic', formula, name: `${m.name} ${ANION[n.sym]}`, boom: violent, flame: m.flame || '#ffb066',
      donor: m, spec: lat(m.sym, n.sym),
      tags: ['Ionic bond', dEN != null ? `ΔEN ${dEN.toFixed(2)}` : 'Electron transfer', violent ? 'Violent' : 'Exothermic'],
      text: `${m.name} gives up ${c === 1 ? 'its outer electron' : `${c} outer electrons`} and ${n.name.toLowerCase()} takes ${a === 1 ? 'one' : a}. Now one is positive and one is negative, so they cling together and stack into a crystal${cm + cn > 2 ? ` in a ${cm}:${cn} ratio to balance the charges` : ''}.${violent ? ' The electron transfer releases a burst of energy as light and heat.' : ''}`,
    };
  }
  function covalentRes(a, b) {
    let va = bondCount(a), vb = bondCount(b);
    let c = a, o = b;
    if (vb > va || (vb === va && (b.en ?? 9) < (a.en ?? 9))) { c = b; o = a; }
    const g = gcd(bondCount(c), bondCount(o));
    const nc = bondCount(o) / g, no = bondCount(c) / g;
    // conventional order: less electronegative element first, with the NH3 / CH4 exceptions
    let first = c, nf = nc, second = o, ns = no;
    const hydrideFirst = ['C', 'Si', 'Ge', 'N', 'P', 'As', 'B'];
    if (c.sym === 'H' || o.sym === 'H') {
      const other = c.sym === 'H' ? o : c, H = c.sym === 'H' ? c : o;
      const nOther = other === c ? nc : no, nH = other === c ? no : nc;
      if (hydrideFirst.includes(other.sym)) { first = other; nf = nOther; second = H; ns = nH; }
      else { first = H; nf = nH; second = other; ns = nOther; }
    } else if ((o.en ?? 9) < (c.en ?? 9)) { first = o; nf = no; second = c; ns = nc; }
    const formula = fmla(first, nf, second, ns);
    const root = ANION[second.sym] || second.name.toLowerCase();
    let name = `${nf > 1 ? PREFIX[nf] : ''}${first.name.toLowerCase()} ${first.sym === 'H' ? '' : PREFIX[ns]}${root}`.replace(/ao/g, 'o').replace(/oo/g, 'o');
    const dEN = a.en != null && b.en != null ? Math.abs(a.en - b.en) : 0;
    const spec = nc === 1 ? mol(c.sym, Array(no).fill(o.sym), geoFor(c, no)) : mol(o.sym, Array(nc).fill(c.sym), geoFor(o, nc));
    const boom = a.sym === 'F' || b.sym === 'F';
    return {
      type: 'covalent', formula, name: cap(name), spec, boom,
      tags: [dEN < 0.4 ? 'Nonpolar covalent' : 'Polar covalent', `ΔEN ${dEN.toFixed(2)}`],
      text: `Neither ${a.name.toLowerCase()} nor ${b.name.toLowerCase()} is willing to give electrons away, so they share them. ${dEN < 0.4 ? 'They pull almost equally, so the sharing is fair.' : `${(a.en > b.en ? a : b).name} pulls the shared pair closer, giving that end a slight negative charge.`}${boom ? ' Fluorine makes it violent: it is the most electron-hungry element of all.' : ''}`,
    };
  }
  function alloyRes(a, b) {
    return {
      type: 'alloy', formula: `${a.sym} + ${b.sym}`, name: `${a.name}–${b.name} alloy`, spec: alloy(a.sym, b.sym, 0.4),
      tags: ['Metallic bond', 'Alloy'],
      text: `Metals don't trade electrons; they pool them. ${a.name} and ${b.name.toLowerCase()} atoms mix in one crystal, held together by a shared sea of free electrons. That sea is why metals shine, bend and conduct electricity.`,
    };
  }
  function sameRes(e) {
    if (['H', 'N', 'O', 'F', 'Cl', 'Br', 'I'].includes(e.sym)) {
      return { type: 'covalent', formula: e.sym + '2', name: `${e.name} molecule`, spec: mol(e.sym, [e.sym], 'linear'), tags: ['Diatomic', 'Nonpolar covalent'],
        text: `${e.name} atoms are lonelier than they look: alone, each is one electron short of a full shell, so they pair up and share. In nature you almost never meet a single ${e.name.toLowerCase()} atom.` };
    }
    if (METALS.has(e.cat)) {
      return { type: 'alloy', formula: e.sym, name: `${e.name} metal`, spec: alloy(e.sym, e.sym, 0), tags: ['Metallic bond'],
        text: `Two ${e.name.toLowerCase()} atoms pool their outer electrons into a shared sea. Repeat that a trillion trillion times and you have a lump of ${e.name.toLowerCase()}: shiny, conductive, bendable.` };
    }
    return { type: 'covalent', formula: e.sym, name: `${e.name} network`, spec: lat(e.sym, e.sym), tags: ['Covalent network'],
      text: `${e.name} atoms bond to several neighbours each, building a rigid 3-D network rather than separate molecules. That is why ${e.name.toLowerCase()} is a hard, brittle solid.` };
  }
  function inertRes(noble, other) {
    const v = noble.shells[noble.shells.length - 1];
    return { type: 'inert', formula: null, name: 'No reaction', tags: ['Full outer shell', 'Noble gas'],
      text: `${noble.name}'s outer shell is already full (${v} electrons). It has nothing to give and nothing to gain, so it bounces off ${other === noble ? 'itself' : other.name.toLowerCase()}. Noble gases were the last column to be found because they hide by refusing to react.` };
  }
  function decayRes(a, b) {
    const x = a.Z >= b.Z ? a : b;
    return { type: 'decay', formula: null, name: 'Gone before it could bond', tags: ['Radioactive decay', 'Alpha particles'],
      text: `Only a handful of ${x.name.toLowerCase()} atoms have ever existed at once, and they decay into lighter elements, spitting out alpha particles, long before anyone could watch them react.` };
  }
  const FRAG = { 92: [56, 36], 94: [54, 40] };
  const frag = Z => FRAG[Z] || [Math.round(Z * 0.6), Z - Math.round(Z * 0.6)];
  function fissionRes(a, b) {
    const products = [...frag(a.Z), ...frag(b.Z)];
    const names = [...new Set(products)].map(z => el(z).name.toLowerCase());
    return { type: 'fission', formula: products.map(z => el(z).sym).join(' + '), name: 'Chain reaction', products, tags: ['Nuclear fission', 'Critical mass'],
      text: `Bring enough ${a.name.toLowerCase()} together and one splitting nucleus fires neutrons that split its neighbours. Each nucleus breaks into lighter elements (here ${names.join(', ')}) and a little mass turns into a lot of energy, as E = mc² says. This is how reactors and atomic bombs work.` };
  }
  function fusionRes(a, b) {
    const sum = a.Z + b.Z;
    if (sum > 118) {
      return { type: 'fission', formula: '?', name: 'Too heavy to exist', products: frag(Math.min(sum, 236)).map(z => Math.min(z, 118)), tags: ['Beyond the table'],
        text: `A nucleus with ${sum} protons has never been made. The repulsion between that many protons would tear it apart instantly.` };
    }
    const p = el(sum);
    let text, tags;
    if (a.Z === 1 && b.Z === 1) {
      text = 'At 15 million °C in the Sun\'s core, hydrogen nuclei finally get close enough to fuse. Four protons end up as one helium nucleus, and the 0.7% of mass that goes missing becomes sunlight.';
      tags = ['Fusion', 'How the Sun shines'];
    } else if (a.Z === 2 && b.Z === 2) {
      text = 'Two helium nuclei make beryllium-8, which falls apart within a fraction of a femtosecond unless a third helium hits it first. That three-way collision (the triple-alpha process) makes carbon, including the carbon in you.';
      tags = ['Fusion', 'Triple-alpha'];
    } else if (sum <= 26) {
      text = `Fusing ${a.name.toLowerCase()} and ${b.name.toLowerCase()} nuclei releases energy. Big stars build elements up to iron this way, in layers like an onion, each layer hotter than the one outside it.`;
      tags = ['Fusion', 'Releases energy'];
    } else {
      text = `Past iron, fusion swallows energy instead of releasing it. Elements like ${p.name.toLowerCase()} are forged in supernovae and colliding neutron stars, where a flood of neutrons piles onto nuclei.`;
      tags = ['Costs energy', 'Supernova element'];
    }
    return { type: 'fusion', formula: p.sym, name: `${p.name} is born`, products: [sum], tags: [...tags, 'Simplified: protons add up'], text };
  }
  function waterRes(x) {
    const w = WATER[x.sym];
    const formula = x.cat === 'am' ? `${x.sym}OH` : `${x.sym}(OH)2`;
    return { type: 'aqueous', formula: `${formula} + H2`, name: `${x.name} in water`, boom: !!w.boom, power: w.p, flame: x.flame || '#ffb066',
      spec: mol(x.sym, ['O', 'H'], 'bent'), key: formula, tags: ['Alkali + water', w.boom ? 'Explosive' : 'Fizzing'], text: w.text };
  }

  function resolve(A, B) {
    if (A.kind === 'product' || B.kind === 'product') {
      const p = A.kind === 'product' ? A : B, x = A.kind === 'product' ? B : A;
      if (x.kind === 'atom' && p.key === 'H2O' && WATER[x.el.sym] && mode === 'room') return waterRes(x.el);
      return { type: 'inert', formula: null, name: 'Nothing happens', tags: ['Already stable'],
        text: mode === 'star' ? 'Inside a star there are no molecules at all. Everything is a plasma of bare nuclei and loose electrons.'
          : `${p.name} is already a stable compound. Its atoms have settled their electron needs, so there is nothing for ${x.kind === 'atom' ? x.el.name.toLowerCase() : 'another compound'} to grab. (Try an alkali metal on water.)` };
    }
    const a = A.el, b = B.el;
    if (mode === 'star') return fusionRes(a, b);
    if (a.Z >= 100 || b.Z >= 100) return decayRes(a, b);
    if (a.Z >= 90 && b.Z >= 90) return fissionRes(a, b);
    const sp = SPECIAL[pairKey(a.sym, b.sym)];
    if (sp) {
      const res = { ...sp };
      if (res.type === 'ionic') res.donor = METALS.has(a.cat) ? a : b;
      return res;
    }
    const noble = [a, b].find(e => e.cat === 'ng');
    if (noble) {
      const other = noble === a ? b : a;
      if (['Kr', 'Xe', 'Rn'].includes(noble.sym) && other.sym === 'F') return covalentRes(a, b);
      return inertRes(noble, other);
    }
    if (a.Z === b.Z) return sameRes(a);
    const ma = METALS.has(a.cat), mb = METALS.has(b.cat);
    if (ma && mb) return alloyRes(a, b);
    if (ma || mb) {
      const m = ma ? a : b, n = ma ? b : a;
      return anionCharge(n) ? ionicRes(m, n) : alloyRes(m, n);
    }
    return covalentRes(a, b);
  }

  /* ---------- things ---------- */
  const atomR = e => 20 + Math.cbrt(e.mass) * 2.6;
  function spawn(Z, x, y, vx = 0, vy = 0) {
    const e = el(Z);
    if (!W) resize();
    const t = { id: ++uid, kind: 'atom', el: e, x: x ?? rand(W * 0.25, W * 0.75), y: y ?? rand(H * 0.3, H * 0.7), vx, vy, r: atomR(e), color: e.color, scale: 1, born: performance.now(), phase: Math.random() * 6 };
    things.push(t);
    hint(false);
    return t;
  }
  function makeProduct(res, x, y) {
    const t = { id: ++uid, kind: 'product', x, y, vx: 0, vy: 0, r: 44, label: res.formula, name: res.name, key: res.key || res.formula, spec: res.spec, scale: 0.2, born: performance.now(), phase: Math.random() * 6 };
    things.push(t);
    return t;
  }
  const remove = t => (things = things.filter(x => x !== t));
  function hit(x, y) {
    for (let i = things.length - 1; i >= 0; i--) {
      const t = things[i];
      if (Math.hypot(t.x - x, t.y - y) < t.r + 6) return t;
    }
    return null;
  }
  function partnerFor(t) {
    let best = null, bd = Infinity;
    for (const o of things) {
      if (o === t || o.busy) continue;
      const d = Math.hypot(o.x - t.x, o.y - t.y);
      if (d < t.r + o.r + 26 && d < bd) { best = o; bd = d; }
    }
    return best;
  }

  /* ---------- effects ---------- */
  function boom(x, y, color, power = 1) {
    for (let i = 0; i < 3; i++) rings.push({ x, y, r: 10 + i * 8, vr: 340 * power * (1 - i * 0.2), life: 0, max: 0.9, color: i ? color : '#ffffff', w: 3 - i });
    for (let i = 0; i < 70 * power; i++) {
      const a = rand(0, 6.283), s = rand(80, 520) * power;
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: rand(0.5, 1.2), color: Math.random() < 0.3 ? '#fff' : color, size: rand(1, 3), drag: 0.92, g: 60, kind: 'spark' });
    }
    flash = Math.min(1, 0.55 * power); flashColor = color; shake = 14 * power;
  }
  function flame(x, y, color, n = 3, spread = 18) {
    for (let i = 0; i < n; i++) parts.push({ x: x + rand(-spread, spread), y: y + rand(-6, 6), vx: rand(-20, 20), vy: rand(-140, -60), life: 0, max: rand(0.5, 1), color, size: rand(4, 9), drag: 0.98, g: -40, kind: 'flame' });
  }
  function bubbles(x, y, n = 2) {
    for (let i = 0; i < n; i++) parts.push({ x: x + rand(-30, 30), y: y + rand(-10, 20), vx: rand(-10, 10), vy: rand(-90, -40), life: 0, max: rand(0.8, 1.5), color: '#cfe8ff', size: rand(2, 5), drag: 0.99, g: -30, kind: 'bubble' });
  }

  /* ---------- reactions ---------- */
  function startReaction(A, B, res) {
    A.busy = B.busy = true;
    A.vx = A.vy = B.vx = B.vy = 0;
    const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    let dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1;
    reactions.push({ A, B, res, t: 0, mid, dir: { x: dx / d, y: dy / d }, a0: { x: A.x, y: A.y }, b0: { x: B.x, y: B.y }, d0: d, fired: {} });
    showCard(A, B, res);
    record(res);
    hint(false);
  }
  const ease = u => u * u * (3 - 2 * u);
  function finish(r, product = true) {
    remove(r.A); remove(r.B);
    if (product && r.res.spec) makeProduct(r.res, r.mid.x, r.mid.y);
    r.done = true;
  }
  function stepReaction(r, dt) {
    r.t += dt;
    const { A, B, res, mid, dir } = r, t = r.t, type = res.type;
    const T0 = type === 'fusion' ? 1.4 : 0.6;
    const touch = (A.r + B.r) * (type === 'covalent' ? 0.36 : type === 'alloy' ? 0.2 : 0.5);
    if (type === 'fusion') {
      const u = Math.min(1, t / T0), ang0 = Math.atan2(r.a0.y - mid.y, r.a0.x - mid.x);
      const rad = (r.d0 / 2) * (1 - u * u), ang = ang0 + u * u * 16;
      A.x = mid.x + Math.cos(ang) * rad; A.y = mid.y + Math.sin(ang) * rad;
      B.x = mid.x - Math.cos(ang) * rad; B.y = mid.y - Math.sin(ang) * rad;
      if (Math.random() < u) parts.push({ x: mid.x + rand(-40, 40) * (1 - u), y: mid.y + rand(-40, 40) * (1 - u), vx: 0, vy: 0, life: 0, max: 0.4, color: '#ffd9a0', size: 2, drag: 1, g: 0, kind: 'spark' });
      if (t >= T0 && !r.fired.f) {
        r.fired.f = true;
        boom(mid.x, mid.y, '#fff2c4', 1.5);
        for (let i = 0; i < 14; i++) {
          const a = rand(0, 6.283);
          parts.push({ x: mid.x, y: mid.y, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, life: 0, max: 0.5, color: '#b8fff0', size: 1.5, drag: 1, g: 0, kind: 'gamma' });
        }
        remove(A); remove(B);
        res.products.forEach(z => { const n = spawn(z, mid.x, mid.y); n.scale = 0.1; });
        r.done = true;
      }
      return;
    }
    if (t < T0) {
      const u = ease(t / T0);
      A.x = lerp(r.a0.x, mid.x - dir.x * touch, u); A.y = lerp(r.a0.y, mid.y - dir.y * touch, u);
      B.x = lerp(r.b0.x, mid.x + dir.x * touch, u); B.y = lerp(r.b0.y, mid.y + dir.y * touch, u);
      return;
    }
    const k = t - T0;
    switch (type) {
      case 'ionic': {
        const donor = res.donor && res.donor === B.el ? B : A, acc = donor === A ? B : A;
        if (k < 0.8) r.electron = k / 0.8;
        else {
          r.electron = null;
          donor.scale = lerp(donor.scale, 0.82, 0.15); acc.scale = lerp(acc.scale, 1.18, 0.15);
          r.charges = { donor, acc };
        }
        r.donor = donor; r.acc = acc;
        if (k > 0.9 && !r.fired.b && res.boom) { r.fired.b = true; boom(mid.x, mid.y, res.flame || donor.el.flame || '#ffd27a', 1); }
        if (k > 1.15) finish(r);
        break;
      }
      case 'covalent': {
        if (res.boom && !r.fired.b) { r.fired.b = true; boom(mid.x, mid.y, '#ffcf8a', 0.9); }
        r.cloud = Math.min(1, k / 0.5);
        if (k > 1.1) finish(r);
        break;
      }
      case 'combustion': {
        if (!r.fired.b) { r.fired.b = true; flash = res.boom ? 0.8 : 0.35; flashColor = res.flame; if (res.boom) boom(mid.x, mid.y, res.flame, 0.7); }
        flame(mid.x, mid.y, res.flame, 4, 22);
        r.glow = res.flame;
        if (k > 1.4) finish(r);
        break;
      }
      case 'rust': {
        A.color = mixHex(A.el.color, '#a8432a', Math.min(1, k / 1.2)); B.color = mixHex(B.el.color, '#a8432a', Math.min(1, k / 1.2));
        if (Math.random() < 0.5) parts.push({ x: mid.x + rand(-30, 30), y: mid.y + rand(-10, 10), vx: rand(-20, 20), vy: rand(10, 40), life: 0, max: 1.4, color: Math.random() < 0.5 ? '#a8432a' : '#d0702e', size: rand(2, 4), drag: 0.99, g: 50, kind: 'flake' });
        if (k > 1.6) finish(r);
        break;
      }
      case 'alloy': {
        if (!r.fired.r) { r.fired.r = true; for (let i = 0; i < 3; i++) rings.push({ x: mid.x, y: mid.y, r: 20 + i * 12, vr: 60, life: -i * 0.18, max: 1, color: '#dfe6ff', w: 1.5 }); }
        r.melt = Math.min(1, k / 0.9);
        if (k > 1.0) finish(r);
        break;
      }
      case 'inert': {
        if (!r.fired.b) {
          r.fired.b = true;
          A.vx = -dir.x * 260; A.vy = -dir.y * 260; B.vx = dir.x * 260; B.vy = dir.y * 260;
          rings.push({ x: mid.x, y: mid.y, r: 6, vr: 120, life: 0, max: 0.5, color: '#b18cff', w: 2 });
          for (let i = 0; i < 12; i++) { const a = rand(0, 6.283); parts.push({ x: mid.x, y: mid.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0, max: 0.4, color: '#e6dcff', size: 1.5, drag: 0.9, g: 0, kind: 'spark' }); }
          A.busy = B.busy = false; A.cool = B.cool = 0.8;
          r.done = true;
        }
        break;
      }
      case 'fission': {
        if (!r.fired.n) {
          r.fired.n = true;
          parts.push({ x: mid.x - 260, y: mid.y - 120, vx: 520, vy: 240, life: 0, max: 0.5, color: '#9fb4ff', size: 4, drag: 1, g: 0, kind: 'neutron' });
        }
        const wob = Math.sin(k * 40) * Math.min(1, k) * 0.12;
        A.scale = 1 + wob; B.scale = 1 - wob;
        if (k > 0.75 && !r.fired.b) {
          r.fired.b = true;
          boom(mid.x, mid.y, '#ffe9b0', 1.7);
          remove(A); remove(B);
          res.products.forEach((z, i) => {
            const a = (i / res.products.length) * 6.283 + rand(-0.3, 0.3);
            spawn(z, mid.x + Math.cos(a) * 20, mid.y + Math.sin(a) * 20, Math.cos(a) * 420, Math.sin(a) * 420).cool = 1.2;
          });
          for (let i = 0; i < 9; i++) { const a = rand(0, 6.283); parts.push({ x: mid.x, y: mid.y, vx: Math.cos(a) * 600, vy: Math.sin(a) * 600, life: 0, max: 1.2, color: '#9fb4ff', size: 3.5, drag: 1, g: 0, kind: 'neutron' }); }
          r.done = true;
        }
        break;
      }
      case 'decay': {
        r.flicker = true;
        if (Math.random() < 0.25) {
          const src = Math.random() < 0.5 ? A : B, a = rand(0, 6.283);
          parts.push({ x: src.x, y: src.y, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, life: 0, max: 0.8, color: '#ff8a8a', size: 3, drag: 1, g: 0, kind: 'alpha' });
        }
        A.scale = B.scale = Math.max(0.05, 1 - k / 1.2);
        if (k > 1.2) { rings.push({ x: mid.x, y: mid.y, r: 4, vr: 160, life: 0, max: 0.6, color: '#ff8a8a', w: 1.5 }); finish(r, false); }
        break;
      }
      case 'aqueous': {
        const p = res.power;
        bubbles(mid.x, mid.y, Math.ceil(p * 4));
        if (p > 0.5) flame(mid.x, mid.y - 10, res.flame, Math.ceil(p * 3), 16);
        const x = A.kind === 'atom' ? A : B;
        x.x = mid.x + Math.sin(k * 14) * 18 * p; x.y = mid.y - 6 + Math.cos(k * 11) * 6 * p;
        if (res.boom && k > 0.5 && !r.fired.b) { r.fired.b = true; boom(mid.x, mid.y, res.flame, p); }
        if (k > 1.8) finish(r);
        break;
      }
      default: finish(r);
    }
  }

  /* ---------- drawing ---------- */
  function sphere(x, y, r, color, alpha = 1, glow = 14) {
    if (r <= 0.5) return;
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color; ctx.shadowBlur = glow;
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
    g.addColorStop(0, mixHex(color, '#ffffff', 0.6)); g.addColorStop(0.5, color); g.addColorStop(1, mixHex(color, '#000000', 0.65));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  function drawAtom(t, now) {
    const e = t.el, r = t.r * t.scale, time = now / 1000;
    if (t.scale < 1 && !t.busy) t.scale = Math.min(1, t.scale + 0.06);
    const alpha = t.flick ? (Math.random() < 0.5 ? 0.3 : 1) : 1;
    // valence shell: the electrons that do the chemistry
    const v = e.shells[e.shells.length - 1], full = e.cat === 'ng';
    ctx.strokeStyle = full ? 'rgba(177,140,255,0.45)' : 'rgba(150,165,210,0.22)';
    ctx.setLineDash(full ? [] : [2, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(t.x, t.y, r + 9, 0, 6.283); ctx.stroke();
    ctx.setLineDash([]);
    const speed = (hover === t ? 2.2 : 0.6) * (REDUCED ? 0.2 : 1);
    for (let i = 0; i < v; i++) {
      const a = time * speed + (i / v) * 6.283 + t.phase;
      ctx.fillStyle = '#d6e6ff'; ctx.shadowColor = '#8fb6ff'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(t.x + Math.cos(a) * (r + 9), t.y + Math.sin(a) * (r + 9), 2.2, 0, 6.283); ctx.fill();
    }
    ctx.shadowBlur = 0;
    sphere(t.x, t.y, r, t.color, alpha, hover === t ? 30 : 16);
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${Math.round(r * 0.72)}px Manrope, system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = alpha;
    ctx.fillText(e.sym, t.x, t.y + 1);
    ctx.globalAlpha = 1;
    if (hover === t || drag?.t === t || t.showName) {
      ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = 'rgba(236,232,225,0.85)';
      ctx.fillText(`${e.name} · ${v} outer e⁻`, t.x, t.y - r - 22);
    }
  }
  function drawProduct(t, now) {
    const time = now / 1000, sc = t.scale = Math.min(1, t.scale + 0.05), s = t.spec;
    ctx.save(); ctx.translate(t.x, t.y); ctx.scale(sc, sc);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 70);
    glow.addColorStop(0, 'rgba(255,255,255,0.06)'); glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 70, 0, 6.283); ctx.fill();
    if (s.ptype === 'molecule') {
      const cc = col(s.center), rc = s.center === 'H' ? 12 : 18;
      const k = s.sats.length, rot = time * 0.35 + t.phase, vib = 1 + Math.sin(time * 7 + t.phase) * 0.05;
      let angs;
      if (s.geo === 'linear') angs = k === 1 ? [0] : [0, Math.PI];
      else if (s.geo === 'bent') angs = [Math.PI / 2 - 0.91, Math.PI / 2 + 0.91];
      else if (s.geo === 'trigonal') angs = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
      else angs = Array.from({ length: k }, (_, i) => (i / k) * 6.283);
      const pts = s.sats.map((sym, i) => {
        const rs = sym === 'H' ? 11 : 15, d = (rc + rs - 5) * vib;
        let a = angs[i] + rot, depth = 0;
        if (s.geo === 'tetra') { depth = i % 2 ? 1 : -1; a = (i / k) * 6.283 + rot; }
        return { x: Math.cos(a) * d, y: Math.sin(a) * d * (s.geo === 'tetra' ? 0.6 : 1) + depth * 6, rs: rs * (1 + depth * 0.08), sym, depth };
      });
      const off = k === 1 ? { x: -pts[0].x / 2, y: -pts[0].y / 2 } : { x: 0, y: 0 };
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 4;
      pts.forEach(p => { ctx.beginPath(); ctx.moveTo(off.x, off.y); ctx.lineTo(p.x + off.x, p.y + off.y); ctx.stroke(); });
      const all = [{ x: 0, y: 0, rs: rc, sym: s.center, depth: 0 }, ...pts].sort((a, b) => a.depth - b.depth);
      all.forEach(p => sphere(p.x + off.x, p.y + off.y, p.rs, col(p.sym), 1, 10));
      all.forEach(p => {
        ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(p.rs * 0.75)}px Manrope, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.sym, p.x + off.x, p.y + off.y + 1);
      });
    } else if (s.ptype === 'lattice') {
      const th = time * 0.5 + t.phase, tx = 0.5, pts = [];
      const ca = s.tint || col(s.a), cb = s.tint ? mixHex(s.tint, '#000000', 0.35) : col(s.b);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
        const x = i * 15, y = j * 15, z = k * 15;
        const x1 = x * Math.cos(th) + z * Math.sin(th), z1 = -x * Math.sin(th) + z * Math.cos(th);
        const y1 = y * Math.cos(tx) - z1 * Math.sin(tx), z2 = y * Math.sin(tx) + z1 * Math.cos(tx);
        const isA = (i + j + k + 3) % 2 === 0;
        pts.push({ x: x1, y: y1, z: z2, c: isA ? ca : cb, r: isA ? 5.5 : 7.5 });
      }
      pts.sort((a, b) => a.z - b.z).forEach(p => sphere(p.x, p.y, p.r * (1 + p.z / 90), p.c, 0.75 + (p.z + 26) / 110, 6));
    } else if (s.ptype === 'alloy') {
      const ca = col(s.a), cb = col(s.b);
      let n = 0;
      for (let row = -2; row <= 2; row++) {
        const cnt = 5 - Math.abs(row);
        for (let i = 0; i < cnt; i++) {
          const x = (i - (cnt - 1) / 2) * 15, y = row * 13 + Math.sin(time * 3 + n) * 0.8;
          const isB = s.ratio > 0 && ((n * 7 + 3) % 19) / 19 < s.ratio;
          sphere(x, y, isB ? (s.b === 'C' ? 4 : 7.5) : 7.5, isB ? cb : mixHex(ca, '#ffffff', 0.08), 1, 4);
          n++;
        }
      }
      for (let i = 0; i < 16; i++) {
        const a = time * (0.8 + (i % 5) * 0.3) + i * 2.1;
        ctx.fillStyle = 'rgba(190,215,255,0.85)';
        ctx.beginPath(); ctx.arc(Math.cos(a * 1.3 + i) * 34, Math.sin(a + i * 0.7) * 28, 1.6, 0, 6.283); ctx.fill();
      }
    }
    ctx.restore();
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = '500 14px "JetBrains Mono", monospace'; ctx.fillStyle = '#ece8e1';
    ctx.globalAlpha = sc;
    ctx.fillText(sub(t.label), t.x, t.y + 64);
    ctx.font = '400 11px Manrope, sans-serif'; ctx.fillStyle = '#8d91a6';
    ctx.fillText(t.name, t.x, t.y + 80);
    ctx.globalAlpha = 1;
  }
  function drawReactionOverlay(r, now) {
    const { A, B, mid } = r, time = now / 1000;
    if (r.electron != null && r.donor) {
      const u = ease(r.electron), d = r.donor, a = r.acc;
      const nx = -(a.y - d.y), ny = a.x - d.x, nl = Math.hypot(nx, ny) || 1;
      const x = lerp(d.x, a.x, u) + (nx / nl) * Math.sin(u * Math.PI) * 50;
      const y = lerp(d.y, a.y, u) + (ny / nl) * Math.sin(u * Math.PI) * 50;
      ctx.fillStyle = '#e8f4ff'; ctx.shadowColor = '#7fd0ff'; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
      ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = '#9fd8ff'; ctx.textAlign = 'center';
      ctx.fillText('e⁻', x, y - 12);
    }
    if (r.charges) {
      ctx.font = '700 18px Manrope, sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ffb547'; ctx.fillText('+', r.charges.donor.x, r.charges.donor.y - r.charges.donor.r * r.charges.donor.scale - 14);
      ctx.fillStyle = '#7fd0ff'; ctx.fillText('−', r.charges.acc.x, r.charges.acc.y - r.charges.acc.r * r.charges.acc.scale - 14);
    }
    if (r.cloud) {
      const ang = Math.atan2(B.y - A.y, B.x - A.x), len = Math.hypot(B.x - A.x, B.y - A.y) / 2;
      ctx.save(); ctx.translate(mid.x, mid.y); ctx.rotate(ang);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, len + 40);
      g.addColorStop(0, `rgba(160,200,255,${0.25 * r.cloud})`); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, len + 40, 34, 0, 0, 6.283); ctx.fill();
      for (let i = 0; i < 2; i++) {
        const s = time * 4 + i * Math.PI;
        const x = Math.sin(s) * (len + 14), y = Math.sin(s * 2) * 16;
        ctx.fillStyle = '#e8f4ff'; ctx.shadowColor = '#7fd0ff'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 6.283); ctx.fill();
      }
      ctx.restore(); ctx.shadowBlur = 0;
    }
    if (r.melt) {
      const g = ctx.createRadialGradient(mid.x, mid.y, 0, mid.x, mid.y, 60);
      g.addColorStop(0, `rgba(230,236,255,${0.35 * r.melt})`); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mid.x, mid.y, 60, 0, 6.283); ctx.fill();
    }
    if (r.glow) {
      const g = ctx.createRadialGradient(mid.x, mid.y, 0, mid.x, mid.y, 90);
      g.addColorStop(0, r.glow + '66'); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mid.x, mid.y, 90, 0, 6.283); ctx.fill();
    }
    if (r.flicker) { A.flick = B.flick = true; }
  }
  function drawBackdrop(now) {
    const time = now / 1000;
    ctx.strokeStyle = mode === 'star' ? 'rgba(255,140,60,0.06)' : 'rgba(120,135,200,0.06)';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = (W % step) / 2; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = (H % step) / 2; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    if (mode === 'star') {
      for (let i = 0; i < 3; i++) {
        const r = ((time * 40 + i * 120) % 360) + 40;
        ctx.strokeStyle = `rgba(255,150,60,${0.12 * (1 - r / 400)})`;
        ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, 6.283); ctx.stroke();
      }
    }
    ctx.font = '500 10px "JetBrains Mono", monospace'; ctx.fillStyle = 'rgba(141,145,166,0.5)'; ctx.textAlign = 'right';
    ctx.fillText(mode === 'star' ? '15,000,000 K · 250 billion atm' : '298 K · 1 atm', W - 12, 18);
  }

  /* ---------- main loop ---------- */
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.033, (now - last) / 1000 || 0.016); last = now;
    // physics for free things
    for (const t of things) {
      if (t.busy || (drag && drag.t === t)) continue;
      t.x += t.vx * dt; t.y += t.vy * dt;
      t.vx *= 0.96; t.vy *= 0.96;
      if (t.cool) t.cool = Math.max(0, t.cool - dt);
      if (!REDUCED) { t.vx += Math.sin(now / 900 + t.phase * 3) * 0.6; t.vy += Math.cos(now / 1100 + t.phase * 2) * 0.6; }
      const m = t.r + 12;
      if (t.x < m) { t.x = m; t.vx = Math.abs(t.vx) * 0.6; }
      if (t.x > W - m) { t.x = W - m; t.vx = -Math.abs(t.vx) * 0.6; }
      if (t.y < m) { t.y = m; t.vy = Math.abs(t.vy) * 0.6; }
      if (t.y > H - m - (t.kind === 'product' ? 40 : 0)) { t.y = H - m - (t.kind === 'product' ? 40 : 0); t.vy = -Math.abs(t.vy) * 0.6; }
    }
    // thrown atoms react on impact; otherwise free things gently push apart
    for (let i = 0; i < things.length; i++) for (let j = i + 1; j < things.length; j++) {
      const a = things[i], b = things[j];
      if (a.busy || b.busy || (drag && (drag.t === a || drag.t === b))) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, min = a.r + b.r + 8;
      if (d < min) {
        const rel = Math.hypot(a.vx - b.vx, a.vy - b.vy);
        if (rel > 260 && !a.cool && !b.cool) { startReaction(a, b, resolve(a, b)); continue; }
        const push = (min - d) * 0.5;
        a.x -= (dx / d) * push; a.y -= (dy / d) * push; b.x += (dx / d) * push; b.y += (dy / d) * push;
      }
    }
    reactions.forEach(r => stepReaction(r, dt));
    reactions = reactions.filter(r => !r.done);
    things.forEach(t => (t.flick = false));

    ctx.save();
    ctx.clearRect(0, 0, W, H);
    if (shake > 0.3) { ctx.translate(rand(-shake, shake), rand(-shake, shake)); shake *= 0.88; }
    drawBackdrop(now);
    // attraction preview while dragging
    if (drag) {
      const p = partnerFor(drag.t);
      if (p) {
        ctx.strokeStyle = 'rgba(255,181,71,0.7)'; ctx.setLineDash([4, 6]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(drag.t.x, drag.t.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.fillStyle = '#ffb547'; ctx.textAlign = 'center';
        ctx.fillText('release to react', (drag.t.x + p.x) / 2, (drag.t.y + p.y) / 2 - 10);
      }
    }
    reactions.forEach(r => drawReactionOverlay(r, now));
    things.forEach(t => (t.kind === 'atom' ? drawAtom(t, now) : drawProduct(t, now)));
    if (mol3d) stepMolecule(dt);
    // particles
    for (const p of parts) {
      p.life += dt;
      p.vx *= p.drag; p.vy = p.vy * p.drag + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const u = p.life / p.max, a = Math.max(0, 1 - u);
      if (p.kind === 'flame') {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * (1 + u));
        g.addColorStop(0, `rgba(255,255,255,${0.7 * a})`); g.addColorStop(0.35, p.color); g.addColorStop(1, 'transparent');
        ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + u), 0, 6.283); ctx.fill();
      } else if (p.kind === 'bubble') {
        ctx.globalAlpha = a * 0.8; ctx.strokeStyle = p.color; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.283); ctx.stroke();
      } else if (p.kind === 'gamma') {
        ctx.globalAlpha = a; ctx.strokeStyle = p.color; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke();
      } else {
        ctx.globalAlpha = a; ctx.fillStyle = p.color;
        if (p.kind !== 'flake') { ctx.shadowColor = p.color; ctx.shadowBlur = p.kind === 'neutron' ? 10 : 6; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
      }
    }
    ctx.globalAlpha = 1;
    parts = parts.filter(p => p.life < p.max);
    if (parts.length > 1400) parts.splice(0, parts.length - 1400);
    for (const g of rings) {
      g.life += dt;
      if (g.life < 0) continue;
      g.r += g.vr * dt;
      ctx.globalAlpha = Math.max(0, 1 - g.life / g.max); ctx.strokeStyle = g.color; ctx.lineWidth = g.w;
      ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, 6.283); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    rings = rings.filter(g => g.life < g.max);
    ctx.restore();
    if (flash > 0.01) {
      ctx.globalAlpha = flash; ctx.fillStyle = flashColor; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      flash *= 0.86;
    }
    requestAnimationFrame(frame);
  }

  /* ---------- result card + log ---------- */
  const card = $('#result');
  function showCard(A, B, res) {
    const lab = t => (t.kind === 'atom' ? t.el.sym : subHTML(t.label));
    const out = res.formula ? subHTML(res.formula) : 'no reaction';
    card.innerHTML = `<button class="x" aria-label="Dismiss">×</button>
      <div class="eq">${lab(A)} + ${lab(B)} → ${out}</div>
      <h3>${res.name}</h3><p>${res.text}</p>
      <div class="tags">${(res.tags || []).map(t => `<span>${t}</span>`).join('')}</div>`;
    card.classList.add('on');
    $('.x', card).addEventListener('click', () => card.classList.remove('on'));
  }
  function record(res) {
    if (res.type === 'inert' && !res.tags.includes('Noble gas')) return;
    found.set(res.name, res);
    const items = [...found.values()].slice(-10).reverse();
    $('#log').innerHTML = `<span>Discovered: <span class="count">${found.size}</span></span>` +
      items.map(r => `<span class="found">${r.formula ? subHTML(r.formula) : r.name}</span>`).join('');
  }
  function hint(show) { $('#chamberHint').style.opacity = show ? 1 : 0; }

  /* ---------- input: dragging atoms inside the chamber ---------- */
  const local = ev => { const r = cv.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
  cv.addEventListener('pointerdown', ev => {
    const p = local(ev), t = hit(p.x, p.y);
    if (!t || t.busy) return;
    drag = { t, ox: t.x - p.x, oy: t.y - p.y, lx: p.x, ly: p.y, lt: performance.now(), vx: 0, vy: 0 };
    cv.setPointerCapture(ev.pointerId);
    cv.style.cursor = 'grabbing';
  });
  cv.addEventListener('pointermove', ev => {
    const p = local(ev);
    mouse.x = p.x; mouse.y = p.y;
    if (drag) {
      const now = performance.now(), dt = Math.max(1, now - drag.lt) / 1000;
      drag.vx = lerp(drag.vx, (p.x - drag.lx) / dt, 0.4); drag.vy = lerp(drag.vy, (p.y - drag.ly) / dt, 0.4);
      drag.lx = p.x; drag.ly = p.y; drag.lt = now;
      drag.t.x = clamp(p.x + drag.ox, 10, W - 10); drag.t.y = clamp(p.y + drag.oy, 10, H - 10);
    } else {
      hover = hit(p.x, p.y);
      cv.style.cursor = hover ? 'grab' : 'default';
    }
  });
  function endDrag() {
    if (!drag) return;
    const t = drag.t, partner = partnerFor(t);
    if (partner && !t.busy) startReaction(t, partner, resolve(t, partner));
    else { t.vx = clamp(drag.vx, -1400, 1400); t.vy = clamp(drag.vy, -1400, 1400); }
    drag = null;
    cv.style.cursor = 'default';
  }
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('pointerleave', () => { hover = null; });

  /* ---------- input: dragging new elements in from the palette ---------- */
  const chipsEl = $('#chips');
  chipsEl.innerHTML = ELEMENTS.map(e => `<button class="chip" data-z="${e.Z}" style="--c:${e.color}" aria-label="Add ${e.name}" title="${e.name}"><small>${e.Z}</small><b>${e.sym}</b></button>`).join('');
  let pd = null;
  chipsEl.addEventListener('pointerdown', ev => {
    const c = ev.target.closest('.chip');
    if (!c) return;
    pd = { Z: +c.dataset.z, x: ev.clientX, y: ev.clientY, ghost: null, touch: ev.pointerType === 'touch' };
    if (!pd.touch) ev.preventDefault();
  });
  addEventListener('pointermove', ev => {
    if (!pd || pd.touch) return;
    if (!pd.ghost && Math.hypot(ev.clientX - pd.x, ev.clientY - pd.y) > 6) {
      const e = el(pd.Z);
      pd.ghost = document.createElement('div');
      pd.ghost.className = 'drag-ghost';
      pd.ghost.style.setProperty('--c', e.color);
      pd.ghost.textContent = e.sym;
      document.body.appendChild(pd.ghost);
    }
    if (pd.ghost) { pd.ghost.style.left = ev.clientX + 'px'; pd.ghost.style.top = ev.clientY + 'px'; }
  });
  addEventListener('pointerup', ev => {
    if (!pd) return;
    const d = pd; pd = null;
    if (d.ghost) {
      d.ghost.remove();
      const r = cv.getBoundingClientRect();
      if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
        const t = spawn(d.Z, ev.clientX - r.left, ev.clientY - r.top);
        t.scale = 0.3;
        const p = partnerFor(t);
        if (p) startReaction(t, p, resolve(t, p));
      }
    } else if (Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 10) {
      const t = spawn(d.Z);
      t.scale = 0.3;
    }
  });
  $('#labSearch').addEventListener('input', ev => {
    const q = ev.target.value.trim().toLowerCase();
    $$('.chip', chipsEl).forEach(c => {
      const e = el(+c.dataset.z);
      c.hidden = !!q && !(e.name.toLowerCase().includes(q) || e.sym.toLowerCase() === q || String(e.Z) === q);
    });
  });

  /* ---------- controls ---------- */
  function setMode(m) {
    mode = m;
    $('#modeRoom').setAttribute('aria-pressed', m === 'room');
    $('#modeStar').setAttribute('aria-pressed', m === 'star');
    box.classList.toggle('star', m === 'star');
    $('#chamberHint').textContent = m === 'star'
      ? 'Inside a star, nuclei collide hard enough to fuse. Drag two atoms together.'
      : 'Drag one atom onto another. What happens next is real chemistry.';
  }
  $('#modeRoom').addEventListener('click', () => setMode('room'));
  $('#modeStar').addEventListener('click', () => setMode('star'));
  $('#labClear').addEventListener('click', () => { seq++; mol3d = null; things = []; reactions = []; parts = []; rings = []; card.classList.remove('on'); $('#narration').classList.remove('on'); hint(true); });

  const TRY = [
    ['Na', 'Cl'], ['H', 'O'], ['Na', 'water'], ['Fe', 'O'], ['Cu', 'Sn'], ['Ne', 'F'], ['U', 'U'], ['H', 'H', 'star'], ['Fe', 'Au', 'star'],
  ];
  const tryRow = $('#tryRow');
  TRY.forEach(([a, b, m]) => {
    const btn = document.createElement('button');
    btn.textContent = m === 'star' ? `${a} + ${b} in a star` : b === 'water' ? `${a} + water` : `${a} + ${b}`;
    btn.addEventListener('click', () => demo(a, b, m || 'room'));
    tryRow.appendChild(btn);
  });
  function demo(a, b, m) {
    if (!W) resize();
    setMode(m);
    const y = H * 0.45;
    const A = spawn(BY_SYM[a].Z, W * 0.3, y);
    const B = b === 'water' ? makeProduct({ formula: 'H2O', name: 'Water', spec: SPECIAL['H+O'].spec, key: 'H2O' }, W * 0.7, y) : spawn(BY_SYM[b].Z, W * 0.7, y);
    A.busy = B.busy = true;
    setTimeout(() => { A.busy = B.busy = false; if (things.includes(A) && things.includes(B)) startReaction(A, B, resolve(A, B)); }, 500);
  }

  /* ---------- Make a compound: type a name, watch it being made ---------- */
  const DIATOMIC = new Set(['H', 'N', 'O', 'F', 'Cl', 'Br', 'I']);
  const eqHTML = s => s.replace(/([A-Za-z)])(\d+)/g, '$1<sub>$2</sub>');
  function parseFormula(f) { // 'Fe2O3' -> [['Fe', 2], ['O', 3]]
    const m = f.match(/[A-Z][a-z]?\d*/g);
    if (!m || m.join('') !== f) return null;
    const out = m.map(x => { const [, sym, n] = x.match(/([A-Z][a-z]?)(\d*)/); return [sym, n ? +n : 1]; });
    return out.every(([sym]) => BY_SYM[sym]) ? out : null;
  }
  // Balanced equation for a binary product, treating H, N, O and the halogens as diatomic gases.
  function balance(formula) {
    const p = parseFormula(formula);
    if (!p) return null;
    const gas = sym => (DIATOMIC.has(sym) ? sym + '2' : sym);
    const k = (n, x) => (n > 1 ? n : '') + x;
    if (p.length === 1) return p[0][1] === 2 && DIATOMIC.has(p[0][0]) ? `2${p[0][0]} → ${formula}` : null;
    if (p.length !== 2) return null;
    const [[a, na], [b, nb]] = p, da = DIATOMIC.has(a) ? 2 : 1, db = DIATOMIC.has(b) ? 2 : 1;
    let c = 1;
    while ((c * na) % da || (c * nb) % db) c++;
    return `${k((c * na) / da, gas(a))} + ${k((c * nb) / db, gas(b))} → ${k(c, formula)}`;
  }

  const ALIASES = {
    'H+O': ['water', 'h2o', 'dihydrogen monoxide', 'ice', 'steam'],
    'Cl+Na': ['salt', 'table salt', 'sodium chloride', 'nacl', 'halite'],
    'H+H': ['hydrogen', 'hydrogen gas', 'h2'],
    'O+O': ['oxygen', 'oxygen gas', 'o2'],
    'N+N': ['nitrogen', 'nitrogen gas', 'n2'],
    'C+O': ['carbon dioxide', 'co2', 'dry ice'],
    'Fe+O': ['rust', 'iron oxide', 'fe2o3', 'iron(iii) oxide', 'hematite'],
    'Mg+O': ['magnesium oxide', 'mgo', 'magnesia'],
    'C+Fe': ['steel'],
    'Cu+Sn': ['bronze'],
    'Cu+Zn': ['brass'],
    'Au+Hg': ['gold amalgam', 'amalgam'],
    'Ag+Hg': ['dental amalgam', 'silver amalgam'],
    'O+Si': ['quartz', 'silica', 'sand', 'glass', 'silicon dioxide', 'sio2'],
    'H+N': ['ammonia', 'nh3'],
    'C+H': ['methane', 'natural gas', 'ch4'],
    'Cl+H': ['hydrochloric acid', 'hydrogen chloride', 'hcl', 'muriatic acid'],
    'F+H': ['hydrofluoric acid', 'hydrogen fluoride', 'hf'],
    'O+S': ['sulfur dioxide', 'sulphur dioxide', 'so2'],
    'Ca+O': ['quicklime', 'lime', 'calcium oxide', 'cao'],
    'F+Xe': ['xenon difluoride', 'xef2'],
    'K+Na': ['nak', 'sodium potassium alloy'],
    'Al+O': ['ruby', 'sapphire', 'corundum', 'alumina', 'aluminium oxide', 'aluminum oxide', 'al2o3'],
    'O+Ti': ['titanium dioxide', 'tio2', 'titania'],
    'Hg+S': ['cinnabar', 'vermilion', 'mercury sulfide', 'hgs'],
    'Pb+S': ['galena', 'lead sulfide', 'pbs'],
    'Fe+S': ['pyrite', 'iron sulfide', 'fes', "fool's gold", 'fools gold'],
    'C+C': ['diamond', 'graphite'],
    'As+Ga': ['gallium arsenide', 'gaas'],
    'P+P': ['white phosphorus', 'p4'],
    'S+S': ['s8', 'sulfur crown'],
  };
  // Two-step recipes: make water first, then drop a metal into it.
  const MULTI = [
    { names: ['sodium hydroxide', 'lye', 'caustic soda', 'naoh'], metal: 'Na', eq: '2Na + 2H2O → 2NaOH + H2' },
    { names: ['potassium hydroxide', 'caustic potash', 'koh'], metal: 'K', eq: '2K + 2H2O → 2KOH + H2' },
    { names: ['lithium hydroxide', 'lioh'], metal: 'Li', eq: '2Li + 2H2O → 2LiOH + H2' },
    { names: ['caesium hydroxide', 'cesium hydroxide', 'csoh'], metal: 'Cs', eq: '2Cs + 2H2O → 2CsOH + H2' },
    { names: ['calcium hydroxide', 'slaked lime', 'ca(oh)2', 'caoh2'], metal: 'Ca', eq: 'Ca + 2H2O → Ca(OH)2 + H2' },
  ];
  function preview(a, b) {
    const m = mode;
    mode = 'room';
    const res = resolve({ kind: 'atom', el: BY_SYM[a] }, { kind: 'atom', el: BY_SYM[b] });
    mode = m;
    return res;
  }
  function pairRecipe(a, b, typed) {
    const res = preview(a, b);
    const shown = res.formula && /\s/.test(res.formula) ? res.name : res.formula;
    const eq = res.formula ? balance(res.formula) || `${a} + ${b} → ${shown}` : `${a} + ${b} → no reaction`;
    let note = '';
    if (typed && res.formula && typed !== res.formula && !/\s/.test(res.formula)) note = `Shown: ${res.formula}, the compound ${BY_SYM[a].name.toLowerCase()} and ${BY_SYM[b].name.toLowerCase()} most commonly form here.`;
    return { title: res.name, steps: [[a, b]], eq, note };
  }
  function findRecipe(raw) {
    const q = raw.trim().replace(/\s+/g, ' ');
    if (!q) return null;
    const lq = q.toLowerCase(), tight = lq.replace(/\s/g, '');
    const multi = MULTI.find(m => m.names.includes(lq) || m.names.includes(tight));
    if (multi) return { title: cap(multi.names[0]), steps: [['H', 'O'], [multi.metal, '$']], eq: multi.eq };
    for (const [k, al] of Object.entries(ALIASES)) if (al.includes(lq) || al.includes(tight)) return pairRecipe(...k.split('+'));
    const typed = q.replace(/\s/g, ''), f = parseFormula(typed);
    if (f && f.length <= 2) {
      const a = f[0][0], b = (f[1] || f[0])[0], res = preview(a, b);
      if (res.formula && res.formula === typed) return pairRecipe(a, b);
    }
    return null;
  }

  // the dropdown suggestions under the input
  const SUGGEST = [
    ...Object.values(ALIASES).map(al => al[0]), ...MULTI.map(m => m.names[0]),
    'glucose', 'caffeine', 'ethanol', 'aspirin', 'sulfuric acid', 'sodium bicarbonate', 'acetic acid', 'citric acid', 'benzene',
    'dopamine', 'serotonin', 'nitroglycerin', 'TNT', 'vitamin C', 'urea', 'potassium chloride', 'C6H12O6', 'H2SO4',
  ];
  $('#makeList').innerHTML = SUGGEST.map(n => `<option value="${n}">`).join('');

  let seq = 0;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const idle = () => new Promise(r => { const tick = () => (reactions.length ? setTimeout(tick, 80) : r()); tick(); });
  function tween(t, x0, x1, ms) {
    return new Promise(r => {
      const t0 = performance.now();
      const step = now => {
        const u = Math.min(1, (now - t0) / ms);
        t.x = lerp(x0, x1, 1 - Math.pow(1 - u, 3));
        u < 1 ? requestAnimationFrame(step) : r();
      };
      requestAnimationFrame(step);
    });
  }
  const nar = $('#narration');
  function narrate(step, text, eq) {
    nar.classList.add('on');
    hint(false);
    if (eq != null) $('#nEq').innerHTML = eqHTML(eq);
    $$('#nSteps li').forEach((li, i) => { li.classList.toggle('on', i === step); li.classList.toggle('done', i < step); });
    $('#nText').textContent = text;
  }
  const who = t => (t.kind === 'atom' ? t.el.name : t.name.toLowerCase());
  const asReactant = sym => (DIATOMIC.has(sym) ? `${BY_SYM[sym].name.toLowerCase()} gas (${sym}₂)` : BY_SYM[sym].name.toLowerCase());
  function stageText(res, A, B) {
    const other = res.donor && A.el === res.donor ? B : A;
    switch (res.type) {
      case 'ionic': return `${res.donor ? res.donor.name : who(A)} hands electrons to ${who(other).toLowerCase()}. The opposite charges snap together into a crystal.`;
      case 'covalent': return `${res.boom ? 'A spark sets them off. ' : ''}${who(A)} and ${who(B).toLowerCase()} share pairs of electrons and bond.`;
      case 'combustion': return `${who(A)} burns in ${who(B).toLowerCase()}, giving off heat and light.`;
      case 'rust': return 'Iron slowly gives up electrons to oxygen and corrodes.';
      case 'alloy': return 'The metals melt together and pool their electrons into one shared sea.';
      case 'aqueous': return `${who(A)} attacks the water, tearing off hydrogen gas.`;
      case 'inert': return 'A full outer shell: nothing to share, nothing to trade.';
      default: return res.name;
    }
  }
  async function make(recipe) {
    const my = ++seq;
    mol3d = null;
    booted = true;
    things = []; reactions = []; parts = []; rings = [];
    card.classList.remove('on');
    setMode('room');
    if (!W) resize();
    const y = H * 0.5;
    let product = null;
    for (let i = 0; i < recipe.steps.length; i++) {
      const [a, b] = recipe.steps[i];
      const A = spawn(BY_SYM[a].Z, -60, y);
      const B = b === '$' ? product : spawn(BY_SYM[b].Z, W + 60, y);
      A.busy = B.busy = true;
      A.showName = B.kind === 'atom';
      B.showName = B.kind === 'atom';
      const intro = b === '$'
        ? `${cap(asReactant(a))} is dropped into the ${who(B)}.`
        : `${cap(asReactant(a))} and ${asReactant(b)} come in. The equation gives the real ratio; one atom of each is shown.`;
      narrate(0, intro, recipe.eq);
      await Promise.all([tween(A, -60, W * 0.24, 1100), B.kind === 'atom' ? tween(B, W + 60, W * 0.76, 1100) : null]);
      await wait(700);
      if (my !== seq) return;
      A.busy = B.busy = false;
      const res = resolve(A, B);
      narrate(1, stageText(res, A, B));
      startReaction(A, B, res);
      await idle();
      await wait(450);
      if (my !== seq) return;
      product = things.filter(t => t.kind === 'product').pop() || null;
      if (!product) break;
      if (i < recipe.steps.length - 1) {
        product.busy = true;
        narrate(2, `Step ${i + 1} done: ${product.name.toLowerCase()}. Now the next reactant.`);
        await wait(1500);
        if (my !== seq) return;
      }
    }
    narrate(2, product
      ? `${product.name}${/\s/.test(product.label) ? '' : ` (${sub(product.label)})`}. ${recipe.note || 'The card below explains what happened.'}`
      : 'No product formed. The card below explains why.');
    if (product) product.busy = false;
    setTimeout(() => { if (my === seq) nar.classList.remove('on'); }, 9000);
  }

  const makeMsg = $('#makeMsg'), makeInput = $('#makeInput');
  const EXAMPLES = ['water', 'glucose', 'caffeine', 'sulfuric acid', 'aspirin', 'rust'];
  function runMake(text) {
    if (!text.trim()) return;
    const recipe = findRecipe(text);
    if (!recipe) return pubchemMake(text.trim());
    makeMsg.textContent = '';
    make(recipe);
  }
  $('#makeForm').addEventListener('submit', ev => { ev.preventDefault(); runMake(makeInput.value); });
  makeMsg.addEventListener('click', ev => {
    const c = ev.target.closest('[data-cid]');
    if (c) return pubchemMake({ cid: +c.dataset.cid });
    const b = ev.target.closest('[data-ex]');
    if (b) { makeInput.value = b.dataset.ex; runMake(b.dataset.ex); }
  });

  /* ---------- PubChem: any known compound, assembled atom by atom from its real structure ---------- */
  const PUG = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
  let netErr = false;
  const getJSON = url => fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => { netErr = true; return null; });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const CPK = { H: '#f2f2f2', C: '#8a94a3', N: '#4a6bff', O: '#ff4040', F: '#90e050', Cl: '#2fe02f', Br: '#b03a3a', I: '#a020c0', S: '#ffd02a', P: '#ff8a1a', B: '#ffb5b5', Si: '#e8c8a0', Na: '#ab5cf2', K: '#9a50e0', Mg: '#8aff00', Ca: '#3dff6a', Fe: '#e06633', Cu: '#d88a4a', Zn: '#7d80b0', Al: '#bfa6a6', Li: '#cc80ff' };
  const cpk = sym => CPK[sym] || BY_SYM[sym].color;
  const hillOrder = syms => {
    const u = [...new Set(syms)];
    if (!u.includes('C')) return u.sort();
    return ['C', ...(u.includes('H') ? ['H'] : []), ...u.filter(s => s !== 'C' && s !== 'H').sort()];
  };
  const countsOf = list => list.reduce((m, s) => ((m[s] = (m[s] || 0) + 1), m), {});
  const hillFormula = counts => hillOrder(Object.keys(counts)).map(s => s + (counts[s] > 1 ? counts[s] : '')).join('');
  function sameFormula(a, b) {
    const pa = parseFormula(a), pb = parseFormula(b);
    if (!pa || !pb) return false;
    const ca = Object.fromEntries(pa), cb = Object.fromEntries(pb);
    return Object.keys(ca).length === Object.keys(cb).length && Object.keys(ca).every(k => ca[k] === cb[k]);
  }
  // Formation from the elements in their natural form: 6C + 6H2 + 3O2 → C6H12O6
  function formationEq(counts, formula) {
    const order = hillOrder(Object.keys(counts));
    const mult = order.some(s => DIATOMIC.has(s) && counts[s] % 2) ? 2 : 1;
    const terms = order.map(s => {
      const n = DIATOMIC.has(s) ? (counts[s] * mult) / 2 : counts[s] * mult;
      return (n > 1 ? n : '') + (DIATOMIC.has(s) ? s + '2' : s);
    });
    return `${terms.join(' + ')} → ${mult > 1 ? 2 : ''}${formula}`;
  }

  async function pubchemLookup(q) {
    let cids = null;
    if (q.cid) cids = [q.cid];
    else {
      const tight = q.replace(/\s/g, '');
      if (parseFormula(tight)) cids = (await getJSON(`${PUG}/compound/fastformula/${tight}/cids/JSON?MaxRecords=6`))?.IdentifierList?.CID;
      if (!cids?.length) cids = (await getJSON(`${PUG}/compound/name/${encodeURIComponent(q)}/cids/JSON`))?.IdentifierList?.CID;
    }
    if (!cids?.length) return null;
    const p = await getJSON(`${PUG}/compound/cid/${cids.slice(0, 6).join(',')}/property/Title,MolecularFormula,MolecularWeight/JSON`);
    const props = p?.PropertyTable?.Properties || [];
    return props.length ? { ...props[0], others: props.slice(1) } : null;
  }
  async function loadStructure(cid) {
    let is3d = true;
    let j = await getJSON(`${PUG}/compound/cid/${cid}/record/JSON?record_type=3d`);
    if (!j) { is3d = false; j = await getJSON(`${PUG}/compound/cid/${cid}/record/JSON?record_type=2d`); }
    const c = j?.PC_Compounds?.[0];
    if (!c || !c.coords) return null;
    const conf = c.coords[0].conformers[0], aids = c.atoms.aid;
    const atoms = c.atoms.element.map((z, i) => ({ sym: el(z) ? el(z).sym : null, p: { x: conf.x[i], y: conf.y[i], z: conf.z ? conf.z[i] : 0 } }));
    if (atoms.some(a => !a.sym)) return null;
    const idx = aid => aids.indexOf(aid);
    const bonds = c.bonds ? c.bonds.aid1.map((a, i) => ({ a: idx(a), b: idx(c.bonds.aid2[i]), order: c.bonds.order[i] })) : [];
    return { atoms, bonds, is3d };
  }
  async function describe(cid) {
    const j = await getJSON(`${PUG}/compound/cid/${cid}/description/JSON`);
    const d = j?.InformationList?.Information?.find(x => x.Description)?.Description;
    if (!d) return null;
    const two = d.split(/(?<=\.)\s+(?=[A-Z])/).slice(0, 2).join(' ');
    return two.length > 380 ? two.slice(0, 377).replace(/\s+\S*$/, '') + '…' : two;
  }

  let mol3d = null, rotDrag = null;
  function startMolecule(info, struct, fromChamber, descP) {
    const atoms = struct.atoms, n = atoms.length;
    const cx = W / 2, cy = H * 0.52;
    // fit the real structure to the chamber
    const c = atoms.reduce((s, a) => ({ x: s.x + a.p.x / n, y: s.y + a.p.y / n, z: s.z + a.p.z / n }), { x: 0, y: 0, z: 0 });
    atoms.forEach(a => { a.p = { x: a.p.x - c.x, y: a.p.y - c.y, z: a.p.z - c.z }; });
    const maxR = Math.max(1.2, ...atoms.map(a => Math.hypot(a.p.x, a.p.y, a.p.z)));
    const fit = Math.min(W, H) * 0.3, s = fit / maxR;
    atoms.forEach(a => { a.r = clamp(s * (a.sym === 'H' ? 0.25 : 0.33 + Math.cbrt(BY_SYM[a.sym].mass) * 0.03), 3, 30); a.ph = Math.random() * 6; });

    // reactants wait in one cluster per element, then fly into the structure
    const groups = hillOrder(atoms.map(a => a.sym)).map(sym => ({ sym, list: atoms.filter(a => a.sym === sym) }));
    const G = groups.length, R = Math.min(W, H) * 0.34;
    const pool = fromChamber ? [...fromChamber] : [];
    groups.forEach((g, gi) => {
      const ang = Math.PI + (gi / G) * Math.PI * 2;
      g.cx = cx + Math.cos(ang) * R * 1.3; g.cy = cy + Math.sin(ang) * R * 0.8;
      g.list.forEach((a, k) => {
        const mine = pool.findIndex(t => t.el.sym === a.sym);
        if (mine >= 0) {
          const t = pool.splice(mine, 1)[0];
          a.sx = a.gx = t.x; a.sy = a.gy = t.y; a.d0 = -2;
        } else {
          const d = Math.sqrt(k) * a.r * 1.7, b = k * 2.39996;
          a.gx = g.cx + Math.cos(b) * d; a.gy = g.cy + Math.sin(b) * d;
          a.sx = cx + Math.cos(ang) * Math.max(W, H) * 0.8 + rand(-40, 40); a.sy = cy + Math.sin(ang) * Math.max(W, H) * 0.8 + rand(-40, 40);
          a.d0 = Math.min(1.2, gi * 0.15 + k * 0.03);
        }
      });
    });
    // build order: walk the bonds outward from the most connected heavy atom
    const adj = atoms.map(() => []);
    struct.bonds.forEach(b => { if (b.a >= 0 && b.b >= 0) { adj[b.a].push(b.b); adj[b.b].push(b.a); } });
    const heavy = atoms.map((a, i) => i).filter(i => atoms[i].sym !== 'H');
    const start = (heavy.length ? heavy : [0]).sort((i, j) => adj[j].length - adj[i].length)[0];
    const order = [], seen = new Set([start]), queue = [start];
    while (queue.length) { const i = queue.shift(); order.push(i); adj[i].forEach(j => { if (!seen.has(j)) { seen.add(j); queue.push(j); } }); }
    atoms.forEach((a, i) => { if (!seen.has(i)) order.push(i); });
    const tAsm = fromChamber ? 1.6 : 2.6, dk = Math.min(0.12, 2.8 / n);
    order.forEach((i, k) => (atoms[i].d1 = tAsm + k * dk));
    const tEnd = tAsm + (n - 1) * dk + 1.1;
    struct.bonds.forEach(b => (b.on = Math.max(atoms[b.a].d1, atoms[b.b].d1) + 0.8));

    const counts = countsOf(atoms.map(a => a.sym));
    const formula = info.MolecularFormula;
    const eq = formationEq(counts, formula);
    const listText = groups.map(g => `${g.list.length} ${BY_SYM[g.sym].name.toLowerCase()}`);
    const joined = listText.length > 1 ? listText.slice(0, -1).join(', ') + ' and ' + listText.slice(-1) : listText[0];
    const nb = struct.bonds.length, ionic = struct.bonds.filter(b => b.order === 7).length;
    const dbl = struct.bonds.filter(b => b.order === 2).length, tri = struct.bonds.filter(b => b.order === 3).length;
    mol3d = {
      atoms, bonds: struct.bonds, groups, s, fit, yaw: 0.4, pitch: 0.35, spin: struct.is3d, t: 0, tAsm, title: info.Title, formula,
      events: [
        { t: 0, fn: () => narrate(0, `${cap(joined)} atom${n > 1 ? 's' : ''}${fromChamber ? ' from your chamber' : ' come in'}. Together they make exactly one molecule of ${info.Title}.`, eq) },
        { t: tAsm, fn: () => narrate(1, ionic && ionic === nb
          ? 'Opposite charges pull the ions together into place.'
          : `Atoms snap into place and share pairs of electrons: ${nb} bond${nb === 1 ? '' : 's'}${dbl ? `, ${dbl} of them double` : ''}${tri ? `, ${tri} triple` : ''}.`) },
        { t: tEnd, fn: async () => {
          narrate(2, `${info.Title} (${sub(formula)}), ${(+info.MolecularWeight).toLocaleString()} g/mol. ${struct.is3d ? 'Real 3D shape' : 'Flat 2D layout'} from PubChem. Drag it to rotate.`);
          record({ type: 'molecule', tags: [], name: info.Title, formula });
          showMolCard(info, struct, eq, n, nb, await descP);
        } },
      ],
    };
  }
  function stepMolecule(dt) {
    const m = mol3d, t = (m.t += dt);
    while (m.events.length && m.events[0].t <= t) m.events.shift().fn();
    if (m.spin && !rotDrag) m.yaw += dt * 0.35;
    const cx = W / 2, cy = H * 0.52, cyw = Math.cos(m.yaw), syw = Math.sin(m.yaw), cp = Math.cos(m.pitch), sp = Math.sin(m.pitch);
    for (const a of m.atoms) {
      const x1 = a.p.x * cyw + a.p.z * syw, z1 = -a.p.x * syw + a.p.z * cyw;
      const y2 = a.p.y * cp - z1 * sp, z2 = a.p.y * sp + z1 * cp;
      const f = 1 / (1 - (z2 * m.s) / (m.fit * 5));
      const tx = cx + x1 * m.s * f, ty = cy - y2 * m.s * f;
      a.depth = z2;
      if (t < a.d0) { a.x = a.sx; a.y = a.sy; a.rr = a.r; }
      else if (t < a.d0 + 1) { const u = 1 - Math.pow(1 - (t - a.d0), 3); a.x = lerp(a.sx, a.gx, u); a.y = lerp(a.sy, a.gy, u); a.rr = a.r; }
      else if (t < a.d1) { a.x = a.gx + Math.sin(t * 3 + a.ph) * 1.5; a.y = a.gy + Math.cos(t * 2.6 + a.ph) * 1.5; a.rr = a.r; }
      else if (t < a.d1 + 0.8) {
        const u = ease((t - a.d1) / 0.8);
        a.x = lerp(a.gx, tx, u); a.y = lerp(a.gy, ty, u) - Math.sin(u * Math.PI) * 30; a.rr = lerp(a.r, a.r * f, u);
      } else { a.x = tx; a.y = ty; a.rr = a.r * f; }
    }
    // bonds form once both atoms have arrived
    for (const b of m.bonds) {
      if (t < b.on) continue;
      const A = m.atoms[b.a], B = m.atoms[b.b];
      if (!b.sparked) {
        b.sparked = true;
        const x = (A.x + B.x) / 2, y = (A.y + B.y) / 2, col = b.order === 7 ? '#7fd0ff' : '#e8f4ff';
        for (let i = 0; i < 6; i++) { const a = rand(0, 6.283); parts.push({ x, y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0, max: 0.35, color: col, size: 1.5, drag: 0.9, g: 0, kind: 'spark' }); }
      }
      const alpha = Math.min(1, (t - b.on) / 0.3), dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      ctx.globalAlpha = alpha;
      if (b.order === 7) {
        ctx.setLineDash([3, 4]); ctx.strokeStyle = '#7fd0ff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); ctx.setLineDash([]);
      } else {
        const k = b.order === 2 ? 2 : b.order === 3 ? 3 : 1, gap = Math.max(2.5, m.s * 0.06);
        const g = ctx.createLinearGradient(A.x, A.y, B.x, B.y);
        g.addColorStop(0, cpk(A.sym)); g.addColorStop(1, cpk(B.sym));
        ctx.strokeStyle = g; ctx.lineWidth = k > 1 ? 1.8 : Math.max(2, m.s * 0.07);
        for (let i = 0; i < k; i++) {
          const o = (i - (k - 1) / 2) * gap;
          ctx.beginPath(); ctx.moveTo(A.x + nx * o, A.y + ny * o); ctx.lineTo(B.x + nx * o, B.y + ny * o); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    [...m.atoms].sort((a, b) => a.depth - b.depth).forEach(a => {
      sphere(a.x, a.y, a.rr, cpk(a.sym), 1, 8);
      if (a.rr > (a.sym === 'H' ? 11 : 8)) {
        ctx.fillStyle = a.sym === 'H' || a.sym === 'S' ? '#1a1d26' : '#fff';
        ctx.font = `700 ${Math.round(a.rr * 0.8)}px Manrope, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(a.sym, a.x, a.y + 1);
      }
    });
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    if (t < m.tAsm + 0.3) {
      ctx.font = '500 12px "JetBrains Mono", monospace'; ctx.fillStyle = '#ece8e1';
      m.groups.forEach(g => {
        const top = Math.min(...g.list.map(a => a.y - a.r));
        ctx.globalAlpha = clamp(t - 0.6, 0, 1);
        ctx.fillText(`${g.list.length} × ${BY_SYM[g.sym].name}`, g.list[0].x, top - 12);
      });
      ctx.globalAlpha = 1;
    } else if (!m.events.length) {
      const y = Math.min(H - 28, H * 0.52 + m.fit + 34);
      ctx.font = '500 15px "JetBrains Mono", monospace'; ctx.fillStyle = '#ece8e1';
      ctx.fillText(sub(m.formula), W / 2, y);
      ctx.font = '400 12px Manrope, sans-serif'; ctx.fillStyle = '#8d91a6';
      ctx.fillText(`${m.title} · drag to rotate`, W / 2, y + 17);
    }
  }
  function showMolCard(info, struct, eq, n, nb, desc) {
    card.innerHTML = `<button class="x" aria-label="Dismiss">×</button>
      <div class="eq">${eqHTML(eq)}</div>
      <h3>${esc(info.Title)}</h3>
      <p>${desc ? esc(desc) + ' ' : ''}<span class="muted">The animation shows which atoms one molecule contains and how they are bonded. Making it in a real lab usually takes several steps.</span></p>
      <div class="tags"><span>${esc(info.MolecularWeight)} g/mol</span><span>${n} atoms</span><span>${nb} bonds</span><span>${struct.is3d ? '3D structure' : '2D structure'}</span></div>
      <a class="src" href="https://pubchem.ncbi.nlm.nih.gov/compound/${info.CID}" target="_blank" rel="noopener">See ${esc(info.Title)} on PubChem ↗</a>`;
    card.classList.add('on');
    $('.x', card).addEventListener('click', () => card.classList.remove('on'));
  }

  async function pubchemMake(q, fromChamber) {
    const my = ++seq;
    netErr = false;
    makeMsg.textContent = `Looking up ${q.cid ? 'that compound' : `“${q}”`} in PubChem…`;
    const info = await pubchemLookup(q);
    if (my !== seq) return;
    if (!info) {
      makeMsg.innerHTML = netErr
        ? 'Couldn’t reach PubChem. Check your internet connection and try again.'
        : fromChamber
          ? `No known compound has exactly the formula ${eqHTML(q)}. Add or remove atoms and try again (water needs 2 H + 1 O).`
          : `PubChem has no compound called “${esc(q)}”. Check the spelling, or try a formula like C6H12O6. Examples: ${EXAMPLES.map(x => `<button type="button" data-ex="${x}">${x}</button>`).join(', ')}.`;
      return;
    }
    // simple two-element compounds the lab already animates as a reaction
    const f = parseFormula(info.MolecularFormula);
    if (!fromChamber && f && f.length === 2) {
      const res = preview(f[0][0], f[1][0]);
      if (res.formula && sameFormula(res.formula, info.MolecularFormula)) { makeMsg.textContent = ''; return make(pairRecipe(f[0][0], f[1][0])); }
    }
    const struct = await loadStructure(info.CID);
    if (my !== seq) return;
    if (!struct) { makeMsg.textContent = `PubChem has ${info.Title}, but no atom-by-atom structure for it.`; return; }
    if (struct.atoms.length > 400) { makeMsg.textContent = `${info.Title} has ${struct.atoms.length} atoms, too many to animate one by one. Try a smaller molecule.`; return; }
    makeMsg.innerHTML = `Showing <b>${esc(info.Title)}</b> (${eqHTML(info.MolecularFormula)}) from PubChem.` +
      (info.others.length ? ` Same search also found: ${info.others.map(o => `<button type="button" data-cid="${o.CID}">${esc(o.Title)}</button>`).join(', ')}.` : '');
    booted = true;
    things = []; reactions = []; parts = []; rings = [];
    card.classList.remove('on');
    setMode('room');
    if (!W) resize();
    startMolecule(info, struct, fromChamber, describe(info.CID));
  }

  function combine() {
    const atoms = things.filter(t => t.kind === 'atom');
    if (atoms.length < 2) { makeMsg.textContent = 'Put at least two atoms in the chamber first, then combine them. For sulfuric acid: 2 H, 1 S and 4 O.'; return; }
    pubchemMake(hillFormula(countsOf(atoms.map(t => t.el.sym))), atoms);
  }
  $('#labCombine').addEventListener('click', combine);

  // rotate the finished molecule by dragging empty space
  cv.addEventListener('pointerdown', ev => {
    if (!mol3d || mol3d.events.length || drag) return;
    const p = local(ev);
    rotDrag = { x: p.x, y: p.y, yaw: mol3d.yaw, pitch: mol3d.pitch };
    cv.setPointerCapture(ev.pointerId);
  });
  cv.addEventListener('pointermove', ev => {
    if (!rotDrag || !mol3d) return;
    const p = local(ev);
    mol3d.yaw = rotDrag.yaw + (p.x - rotDrag.x) * 0.01;
    mol3d.pitch = clamp(rotDrag.pitch + (p.y - rotDrag.y) * 0.01, -1.5, 1.5);
  });
  const endRot = () => { rotDrag = null; };
  cv.addEventListener('pointerup', endRot);
  cv.addEventListener('pointercancel', endRot);

  // live suggestions from PubChem as you type
  let acT;
  $('#makeInput').addEventListener('input', () => {
    clearTimeout(acT);
    const q = $('#makeInput').value.trim();
    if (q.length < 3) return;
    acT = setTimeout(async () => {
      const j = await getJSON(`https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete/compound/${encodeURIComponent(q)}/json?limit=8`);
      const terms = j?.dictionary_terms?.compound || [];
      const local = SUGGEST.filter(x => x.toLowerCase().startsWith(q.toLowerCase()));
      $('#makeList').innerHTML = [...new Set([...local, ...terms])].map(x => `<option value="${esc(x)}">`).join('');
    }, 250);
  });

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = box.clientWidth; H = box.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', () => { if (running) resize(); });

  function boot() {
    booted = true;
    resize();
    // open in a working state: a few atoms waiting to meet
    [['Na', 0.18, 0.3], ['Cl', 0.36, 0.62], ['H', 0.55, 0.28], ['O', 0.74, 0.55], ['Fe', 0.86, 0.25], ['Ne', 0.5, 0.75]]
      .forEach(([s, x, y]) => spawn(BY_SYM[s].Z, W * x, H * y));
    hint(true);
  }

  return {
    start() {
      if (running) return;
      running = true;
      requestAnimationFrame(() => {
        if (!booted) boot(); else resize();
        last = performance.now();
        requestAnimationFrame(frame);
      });
    },
    stop() { running = false; drag = null; },
    spawn(Z) {
      const go = () => { const t = spawn(Z, W * 0.5, H * 0.45); t.scale = 0.2; };
      if (!booted) setTimeout(go, 60); else go();
    },
  };
})();
window.Lab = Lab;
if (App.state.view === 'lab') Lab.start();
