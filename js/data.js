// Element data. Temperatures in kelvin, density in g/cm³, year 0 = known since antiquity.
// Z|symbol|name|mass|category|electronegativity|melt K|boil K|density|year|appearance|fact
const RAW = `
1|H|Hydrogen|1.008|nm|2.20|13.99|20.27|0.0000899|1766|Colorless gas that glows pink-violet in a discharge tube|Makes up about 74% of all ordinary matter in the universe by mass.
2|He|Helium|4.0026|ng|||4.22|0.0001785|1868|Colorless gas that glows peach in a discharge tube|Found in the Sun's spectrum 27 years before anyone found it on Earth.
3|Li|Lithium|6.94|am|0.98|453.65|1603|0.534|1817|Soft silvery metal light enough to float on oil|The lightest metal. It powers nearly every rechargeable phone battery.
4|Be|Beryllium|9.0122|ae|1.57|1560|2742|1.85|1798|Hard steel-grey metal|X-rays pass straight through it. The James Webb telescope's mirrors are beryllium coated in gold.
5|B|Boron|10.81|md|2.04|2349|4200|2.08|1808|Black-brown, glassy and extremely hard|Borosilicate glass (Pyrex) survives sudden heat because of boron.
6|C|Carbon|12.011|nm|2.55|3823|4098|2.267|0|Soft black graphite or brilliant transparent diamond|Forms more compounds than any other element. It is the backbone of every living thing.
7|N|Nitrogen|14.007|nm|3.04|63.15|77.36|0.0012506|1772|Colorless gas; as a liquid it boils at −196 °C|78% of every breath you take.
8|O|Oxygen|15.999|nm|3.44|54.36|90.20|0.001429|1774|Colorless gas; pale blue and magnetic as a liquid|The most abundant element in Earth's crust, by mass.
9|F|Fluorine|18.998|hl|3.98|53.48|85.03|0.001696|1886|Pale yellow gas, the most reactive element|So electron-hungry it attacks glass and even forces xenon to react.
10|Ne|Neon|20.180|ng||24.56|27.07|0.0008999|1898|Colorless gas that blazes red-orange in a tube|Only red-orange 'neon' signs actually contain neon. Other colors come from other gases.
11|Na|Sodium|22.990|am|0.93|370.94|1156.09|0.968|1807|Soft silvery metal you can cut with a butter knife|Its yellow glow is the color of old sodium street lamps.
12|Mg|Magnesium|24.305|ae|1.31|923|1363|1.738|1755|Light silvery metal|Burns with a blinding white flame. Early camera flashes used it.
13|Al|Aluminium|26.982|pt|1.61|933.47|2792|2.70|1825|Light, bright silvery metal|Once rarer than gold. Napoleon III served his most honored guests on aluminium plates.
14|Si|Silicon|28.085|md|1.90|1687|3538|2.329|1824|Blue-grey crystal with a metallic shine|The heart of every computer chip. Sand is mostly silicon dioxide.
15|P|Phosphorus|30.974|nm|2.19|317.3|553.7|1.823|1669|Waxy white (glows in the dark), red or black solid|An alchemist found it by boiling down 1,500 gallons of urine.
16|S|Sulfur|32.06|nm|2.58|388.36|717.8|2.07|0|Bright yellow brittle crystals|The biblical brimstone. It burns with an eerie blue flame.
17|Cl|Chlorine|35.45|hl|3.16|171.6|239.11|0.003214|1774|Yellow-green, choking gas|Half of table salt. It also keeps pools and drinking water safe.
18|Ar|Argon|39.95|ng||83.81|87.30|0.0017837|1894|Colorless gas that glows lavender|Nearly 1% of the air. Its name means 'the lazy one'.
19|K|Potassium|39.098|am|0.82|336.53|1032|0.862|1807|Soft silvery metal that tarnishes in seconds|Burns lilac. Bananas are slightly radioactive because of potassium-40.
20|Ca|Calcium|40.078|ae|1.00|1115|1757|1.55|1808|Dull silver-grey metal|Builds bones, teeth, seashells, limestone and marble.
21|Sc|Scandium|44.956|tm|1.36|1814|3109|2.985|1879|Silvery-white metal with a yellow tint|Mendeleev predicted it as 'eka-boron' ten years before it was found.
22|Ti|Titanium|47.867|tm|1.54|1941|3560|4.506|1791|Lustrous silver-grey metal|As strong as steel and 45% lighter. Used in jet engines and bone implants.
23|V|Vanadium|50.942|tm|1.63|2183|3680|6.0|1801|Blue-grey metal|Its compounds come in a rainbow of colors, so it was named after the goddess Vanadís.
24|Cr|Chromium|51.996|tm|1.66|2180|2944|7.19|1797|Hard, mirror-bright metal|A trace of chromium makes rubies red and emeralds green.
25|Mn|Manganese|54.938|tm|1.55|1519|2334|7.21|1774|Hard, brittle grey metal|Essential for steel. Potato-sized nodules of it carpet parts of the deep-sea floor.
26|Fe|Iron|55.845|tm|1.83|1811|3134|7.874|0|Lustrous grey metal|When a star's core turns to iron, fusion stops paying, and the star collapses.
27|Co|Cobalt|58.933|tm|1.88|1768|3200|8.90|1735|Hard silver-blue metal|Named after the kobold, a goblin German miners blamed for their troubles.
28|Ni|Nickel|58.693|tm|1.91|1728|3003|8.908|1751|Silvery metal with a faint gold tint|Earth's core is mostly iron and nickel.
29|Cu|Copper|63.546|tm|1.90|1357.77|2835|8.96|0|Reddish-orange metal|Turns green as it weathers. The Statue of Liberty is copper.
30|Zn|Zinc|65.38|tm|1.65|692.68|1180|7.14|1746|Bluish-silver metal|A coat of zinc stops steel from rusting (galvanizing).
31|Ga|Gallium|69.723|pt|1.81|302.91|2673|5.91|1875|Silvery metal that melts in your hand|Melts at 29.8 °C. A gallium spoon dissolves in hot tea.
32|Ge|Germanium|72.630|md|2.01|1211.4|3106|5.323|1886|Grey-white lustrous metalloid|The first transistors were made from germanium.
33|As|Arsenic|74.922|md|2.18|887|887|5.727|1250|Grey, metallic, brittle crystals|History's favorite poison. Also used in high-speed chips.
34|Se|Selenium|78.971|nm|2.55|494|958|4.81|1817|Grey metallic crystals or red powder|Conducts electricity better in light. Early photocopiers depended on it.
35|Br|Bromine|79.904|hl|2.96|265.8|332.0|3.1028|1826|Dark red-brown liquid giving off orange fumes|One of only two elements that are liquid at room temperature.
36|Kr|Krypton|83.798|ng|3.00|115.78|119.93|0.003733|1898|Colorless gas that glows white-violet|Its orange spectral line defined the length of the meter from 1960 to 1983.
37|Rb|Rubidium|85.468|am|0.82|312.45|961|1.532|1861|Soft silvery-white metal|Bursts into flame in air. Rubidium clocks keep GPS satellites in time.
38|Sr|Strontium|87.62|ae|0.95|1050|1655|2.64|1790|Soft silvery-yellow metal|Paints fireworks crimson red.
39|Y|Yttrium|88.906|tm|1.22|1799|3609|4.472|1794|Silvery metal|One of four elements named after the Swedish village of Ytterby.
40|Zr|Zirconium|91.224|tm|1.33|2128|4682|6.52|1789|Grey-white lustrous metal|Neutrons pass through it, so it clads the fuel rods in nuclear reactors.
41|Nb|Niobium|92.906|tm|1.6|2750|5017|8.57|1801|Grey metal that anodizes into vivid colors|Superconducting niobium magnets run MRI scanners and the Large Hadron Collider.
42|Mo|Molybdenum|95.95|tm|2.16|2896|4912|10.28|1778|Silvery-grey metal|Bacteria use it to pull nitrogen from the air and feed plants.
43|Tc|Technetium|98|tm|1.9|2430|4538|11|1937|Silvery-grey radioactive metal|The first element made artificially. Every isotope is radioactive.
44|Ru|Ruthenium|101.07|tm|2.2|2607|4423|12.45|1844|Hard silvery-white metal|Named after Ruthenia, a Latin name for Russia.
45|Rh|Rhodium|102.91|tm|2.28|2237|3968|12.41|1803|Highly reflective silver metal|One of the rarest, priciest metals. It cleans car exhaust.
46|Pd|Palladium|106.42|tm|2.20|1828.05|3236|12.023|1803|Silvery-white metal|Soaks up 900 times its own volume of hydrogen gas.
47|Ag|Silver|107.87|tm|1.93|1234.93|2435|10.49|0|Brilliant white metal|Conducts electricity and heat better than any other element.
48|Cd|Cadmium|112.41|tm|1.69|594.22|1040|8.65|1817|Soft bluish-white metal|Gave painters their brightest yellows. Highly toxic.
49|In|Indium|114.82|pt|1.78|429.75|2345|7.31|1863|Soft silvery metal that squeals when bent|Indium tin oxide makes touchscreens both transparent and conductive.
50|Sn|Tin|118.71|pt|1.96|505.08|2875|7.287|0|Silvery, easily shaped metal|Mixed with copper, it made bronze and started the Bronze Age.
51|Sb|Antimony|121.76|md|2.05|903.78|1908|6.697|0|Brittle, silvery metalloid|Ancient Egyptians used its sulfide as kohl eyeliner.
52|Te|Tellurium|127.60|md|2.1|722.66|1261|6.24|1782|Brittle silvery-white metalloid|A tiny exposure gives you garlic breath for weeks.
53|I|Iodine|126.90|hl|2.66|386.85|457.4|4.933|1811|Shiny black-violet crystals that release purple vapor|Your thyroid needs it, which is why it's added to table salt.
54|Xe|Xenon|131.29|ng|2.6|161.4|165.03|0.005887|1898|Colorless gas that glows blue|In 1962 it became the first noble gas forced into a compound.
55|Cs|Caesium|132.91|am|0.79|301.7|944|1.93|1860|Soft pale-gold metal|Defines the second: atomic clocks count 9,192,631,770 of its oscillations.
56|Ba|Barium|137.33|ae|0.89|1000|2170|3.51|1808|Soft silvery-grey metal|Makes fireworks green and guts visible on X-rays.
57|La|Lanthanum|138.91|ln|1.10|1193|3737|6.162|1839|Soft silvery-white metal|Each hybrid car battery holds several kilograms of lanthanum.
58|Ce|Cerium|140.12|ln|1.12|1068|3716|6.770|1803|Iron-grey metal|The sparks from a lighter's 'flint' are burning cerium alloy.
59|Pr|Praseodymium|140.91|ln|1.13|1208|3793|6.77|1885|Soft silvery metal that tarnishes green|Tints welders' goggles yellow-green to block glare.
60|Nd|Neodymium|144.24|ln|1.14|1297|3347|7.01|1885|Silvery metal|Makes the strongest permanent magnets: in motors, earbuds and wind turbines.
61|Pm|Promethium|145|ln|1.13|1315|3273|7.26|1945|Radioactive metal that glows|Has no stable form. Almost none exists in Earth's crust.
62|Sm|Samarium|150.36|ln|1.17|1345|2067|7.52|1879|Silvery metal|Indirectly the first element named after a person, via the mineral samarskite.
63|Eu|Europium|151.96|ln|1.2|1099|1802|5.264|1901|Silvery metal, the most reactive lanthanide|Glows red under UV in euro banknotes to expose forgeries.
64|Gd|Gadolinium|157.25|ln|1.20|1585|3546|7.90|1880|Silvery-white metal|Brightens MRI scans, and is magnetic only below about 20 °C.
65|Tb|Terbium|158.93|ln|1.2|1629|3503|8.23|1843|Silvery-white metal|Supplies the green glow in screens and lamps.
66|Dy|Dysprosium|162.50|ln|1.22|1680|2840|8.540|1886|Bright silver metal|Its name means 'hard to get at' in Greek.
67|Ho|Holmium|164.93|ln|1.23|1734|2993|8.79|1878|Silvery-white metal|Has the highest magnetic strength of any element.
68|Er|Erbium|167.26|ln|1.24|1802|3141|9.066|1843|Silvery metal|Erbium-doped fibers amplify the light that carries the internet.
69|Tm|Thulium|168.93|ln|1.25|1818|2223|9.32|1879|Silvery-grey metal|Named after Thule, the mythical far north.
70|Yb|Ytterbium|173.05|ln|1.1|1097|1469|6.90|1878|Silvery metal|Ytterbium atomic clocks are among the most precise ever built.
71|Lu|Lutetium|174.97|ln|1.27|1925|3675|9.841|1907|Silvery-white metal|Lutetium-177 is used to treat some cancers.
72|Hf|Hafnium|178.49|tm|1.3|2506|4876|13.31|1923|Grey steel-colored metal|Swallows neutrons, so it makes control rods for reactors.
73|Ta|Tantalum|180.95|tm|1.5|3290|5731|16.69|1802|Blue-grey, dense metal|Tantalum capacitors sit inside nearly every smartphone.
74|W|Tungsten|183.84|tm|2.36|3695|6203|19.25|1783|Grey-white metal|Highest melting point of any metal: 3,422 °C.
75|Re|Rhenium|186.21|tm|1.9|3459|5869|21.02|1925|Silvery-white dense metal|The last stable element to be discovered.
76|Os|Osmium|190.23|tm|2.2|3306|5285|22.59|1803|Blue-grey, hard and brittle metal|The densest natural element. A fist-sized lump weighs about 10 kg.
77|Ir|Iridium|192.22|tm|2.20|2719|4403|22.56|1803|Silvery-white, very hard metal|A worldwide layer of iridium marks the asteroid strike that ended the dinosaurs.
78|Pt|Platinum|195.08|tm|2.28|2041.4|4098|21.45|1735|Silvery-white precious metal|Inside catalytic converters, pacemakers and the old reference kilogram.
79|Au|Gold|196.97|tm|2.54|1337.33|3129|19.3|0|Bright, warm yellow metal|A single gram can be hammered into a sheet about one square meter wide.
80|Hg|Mercury|200.59|tm|2.00|234.32|629.88|13.534|0|Silvery liquid metal|The only metal that is liquid at room temperature.
81|Tl|Thallium|204.38|pt|1.62|577|1746|11.85|1861|Soft grey metal|Called 'the poisoner's poison'. Named for its bright green spectral line.
82|Pb|Lead|207.2|pt|1.87|600.61|2022|11.34|0|Soft, dense blue-grey metal|Romans piped water through it. 'Plumbing' comes from its Latin name, plumbum.
83|Bi|Bismuth|208.98|pt|2.02|544.7|1837|9.78|1753|Silvery metal that grows iridescent stair-step crystals|Technically radioactive, with a half-life a billion times the age of the universe.
84|Po|Polonium|209|pt|2.0|527|1235|9.196|1898|Silvery radioactive metal with a blue glow|Discovered by Marie and Pierre Curie and named for her homeland, Poland.
85|At|Astatine|210|hl|2.2|575|610|6.4|1940|Never seen in bulk; probably a dark metal|The rarest natural element. Less than a gram exists in Earth's crust at any moment.
86|Rn|Radon|222|ng|2.2|202|211.5|0.00973|1899|Colorless radioactive gas|Seeps from granite into basements. A leading cause of lung cancer.
87|Fr|Francium|223|am|0.79|300|950|1.87|1939|Never seen in bulk|Only a few dozen grams exist naturally on Earth at any time.
88|Ra|Radium|226|ae|0.9|973|2010|5.5|1898|Silvery-white metal with a faint blue glow|Painted on glowing watch dials, it poisoned the 'Radium Girls'.
89|Ac|Actinium|227|an|1.1|1323|3471|10|1899|Silvery radioactive metal|So radioactive it glows pale blue in the dark.
90|Th|Thorium|232.04|an|1.3|2023|5061|11.7|1829|Silvery metal that tarnishes black|Named for Thor. A candidate fuel for safer nuclear reactors.
91|Pa|Protactinium|231.04|an|1.5|1841|4300|15.37|1913|Bright silvery radioactive metal|Among the rarest and most expensive natural elements.
92|U|Uranium|238.03|an|1.38|1405.3|4404|19.1|1789|Silvery-grey, very dense metal|One kilogram of uranium-235 can release as much energy as about 3,000 tonnes of coal.
93|Np|Neptunium|237|an|1.36|912|4447|20.45|1940|Silvery radioactive metal|The first element heavier than uranium, named for the planet beyond Uranus.
94|Pu|Plutonium|244|an|1.28|912.5|3505|19.82|1940|Silvery metal that is warm to the touch|Its decay heat powers Voyager and the Mars rovers.
95|Am|Americium|243|an|1.13|1449|2880|12|1944|Silvery radioactive metal|A tiny speck of it sits inside most household smoke detectors.
96|Cm|Curium|247|an|1.28|1613|3383|13.51|1944|Silvery metal that glows purple in the dark|Named for Marie and Pierre Curie.
97|Bk|Berkelium|247|an|1.3|1259|2900|14.78|1949|Silvery radioactive metal|Named after Berkeley, California, where it was made.
98|Cf|Californium|251|an|1.3|1173|1743|15.1|1950|Silvery radioactive metal|One microgram gives off about 2 million neutrons a second. Used to start reactors.
99|Es|Einsteinium|252|an|1.3|1133||8.84|1952|Silvery metal that glows blue|First found in the fallout of the first hydrogen bomb test.
100|Fm|Fermium|257|an|1.3|1800|||1952|Never seen in bulk|Also from H-bomb fallout. The heaviest element made by neutron capture.
101|Md|Mendelevium|258|an|1.3|1100|||1955|Never seen in bulk|Named for Dmitri Mendeleev, who built the periodic table.
102|No|Nobelium|259|an|1.3|1100|||1958|Never seen in bulk|Named for Alfred Nobel.
103|Lr|Lawrencium|266|an|1.3|1900|||1961|Never seen in bulk|Named for Ernest Lawrence, inventor of the cyclotron.
104|Rf|Rutherfordium|267|tm|||||1964|Synthetic; made a few atoms at a time|Named for Ernest Rutherford, who discovered the atomic nucleus.
105|Db|Dubnium|268|tm|||||1968|Synthetic; made a few atoms at a time|Named for Dubna, the Russian town of its discovery.
106|Sg|Seaborgium|269|tm|||||1974|Synthetic; made a few atoms at a time|Named for Glenn Seaborg while he was still alive.
107|Bh|Bohrium|270|tm|||||1981|Synthetic; made a few atoms at a time|Named for Niels Bohr, who pictured electrons in shells.
108|Hs|Hassium|269|tm|||||1984|Synthetic; made a few atoms at a time|Named for the German state of Hesse.
109|Mt|Meitnerium|278|tm|||||1982|Synthetic; made a few atoms at a time|Named for Lise Meitner, who explained nuclear fission.
110|Ds|Darmstadtium|281|tm|||||1994|Synthetic; made a few atoms at a time|Named for Darmstadt, Germany.
111|Rg|Roentgenium|282|tm|||||1994|Synthetic; made a few atoms at a time|Named for Wilhelm Röntgen, discoverer of X-rays.
112|Cn|Copernicium|285|tm|||||1996|Synthetic; made a few atoms at a time|Named for Copernicus. Might be a liquid metal, like mercury.
113|Nh|Nihonium|286|pt|||||2004|Synthetic; made a few atoms at a time|The first element discovered in Asia, at RIKEN in Japan.
114|Fl|Flerovium|289|pt|||||1998|Synthetic; made a few atoms at a time|Relativity may make it behave almost like a noble gas.
115|Mc|Moscovium|290|pt|||||2003|Synthetic; made a few atoms at a time|Named for the Moscow region.
116|Lv|Livermorium|293|pt|||||2000|Synthetic; made a few atoms at a time|Named for Lawrence Livermore National Laboratory.
117|Ts|Tennessine|294|hl|||||2010|Synthetic; made a few atoms at a time|Named for Tennessee. The most recently discovered element.
118|Og|Oganesson|294|ng|||||2002|Synthetic; made a few atoms at a time|The heaviest known element. It may not even be a gas.
`;

const CATS = {
  am: { name: 'Alkali metal',        color: '#ff5470' },
  ae: { name: 'Alkaline earth',      color: '#ff9e4a' },
  tm: { name: 'Transition metal',    color: '#5b9dff' },
  pt: { name: 'Post-transition',     color: '#7fd1c2' },
  md: { name: 'Metalloid',           color: '#b5d86a' },
  nm: { name: 'Reactive nonmetal',   color: '#ffd35c' },
  hl: { name: 'Halogen',             color: '#3fe0a0' },
  ng: { name: 'Noble gas',           color: '#b18cff' },
  ln: { name: 'Lanthanide',          color: '#ff7fd0' },
  an: { name: 'Actinide',            color: '#8fe9ff' },
};
const METALS = new Set(['am', 'ae', 'tm', 'pt', 'ln', 'an']);

// Flame-test / discharge colors, where an element has a famous one.
const FLAME = {
  H: '#d77bff', He: '#ffc7a0', Li: '#ff2a55', Na: '#ffb000', K: '#c48bff', Rb: '#e0307a',
  Cs: '#6f7dff', Ca: '#ff6a2a', Sr: '#ff1f2e', Ba: '#a4ff5a', Cu: '#2fe0c0', B: '#7cff6a',
  In: '#5b6cff', Tl: '#4bff7a', Ne: '#ff5a1f', Ar: '#b78bff', Kr: '#e6e0ff', Xe: '#6aa8ff',
  Mg: '#ffffff', S: '#5a7bff', P: '#c8ff9a', Se: '#7aa0ff', Hg: '#9fd0ff', Rn: '#ff4a6a',
};

// Measured visible emission lines (nm). Others are drawn as stylized lines and say so.
const SPECTRA = {
  H: [410.2, 434.0, 486.1, 656.3],
  He: [447.1, 471.3, 492.2, 501.6, 587.6, 667.8],
  Li: [460.3, 610.4, 670.8],
  Na: [568.8, 589.0, 589.6, 615.4],
  K: [404.4, 404.7, 766.5, 769.9],
  Ca: [393.4, 396.8, 422.7, 616.2],
  Ne: [585.2, 588.2, 594.5, 597.6, 603.0, 607.4, 614.3, 616.4, 621.7, 626.6, 633.4, 638.3, 640.2, 650.7, 659.9, 667.8, 692.9, 703.2],
  Ar: [696.5, 706.7, 714.7, 727.3, 738.4, 750.4],
  Hg: [404.7, 435.8, 546.1, 577.0, 579.1],
  Xe: [462.4, 467.1, 473.4, 480.7, 484.4, 492.3],
  Kr: [557.0, 587.1],
};

// Electron shells from the Madelung (aufbau) order, with the well-known exceptions.
const SHELL_EXCEPTIONS = {
  24: [2, 8, 13, 1], 29: [2, 8, 18, 1], 41: [2, 8, 18, 12, 1], 42: [2, 8, 18, 13, 1],
  44: [2, 8, 18, 15, 1], 45: [2, 8, 18, 16, 1], 46: [2, 8, 18, 18], 47: [2, 8, 18, 18, 1],
  57: [2, 8, 18, 18, 9, 2], 58: [2, 8, 18, 19, 9, 2], 64: [2, 8, 18, 25, 9, 2],
  78: [2, 8, 18, 32, 17, 1], 79: [2, 8, 18, 32, 18, 1], 89: [2, 8, 18, 32, 18, 9, 2],
  90: [2, 8, 18, 32, 18, 10, 2], 91: [2, 8, 18, 32, 20, 9, 2], 92: [2, 8, 18, 32, 21, 9, 2],
  93: [2, 8, 18, 32, 22, 9, 2], 96: [2, 8, 18, 32, 25, 9, 2], 103: [2, 8, 18, 32, 32, 8, 3],
};
function shellsFor(Z) {
  if (SHELL_EXCEPTIONS[Z]) return SHELL_EXCEPTIONS[Z];
  const order = [[1,0],[2,0],[2,1],[3,0],[3,1],[4,0],[3,2],[4,1],[5,0],[4,2],[5,1],[6,0],[4,3],[5,2],[6,1],[7,0],[5,3],[6,2],[7,1]];
  const sh = [0, 0, 0, 0, 0, 0, 0];
  let left = Z;
  for (const [n, l] of order) {
    if (left <= 0) break;
    const k = Math.min(left, 2 * (2 * l + 1));
    sh[n - 1] += k; left -= k;
  }
  while (sh.length && sh[sh.length - 1] === 0) sh.pop();
  return sh;
}

function gridPos(Z) {
  if (Z === 1) return { col: 0, row: 0 };
  if (Z === 2) return { col: 17, row: 0 };
  if (Z <= 4) return { col: Z - 3, row: 1 };
  if (Z <= 10) return { col: Z - 5 + 12, row: 1 };
  if (Z <= 12) return { col: Z - 11, row: 2 };
  if (Z <= 18) return { col: Z - 13 + 12, row: 2 };
  if (Z <= 36) return { col: Z - 19, row: 3 };
  if (Z <= 54) return { col: Z - 37, row: 4 };
  if (Z <= 56) return { col: Z - 55, row: 5 };
  if (Z <= 71) return { col: Z - 57 + 2, row: 7.4, f: true };
  if (Z <= 86) return { col: Z - 72 + 3, row: 5 };
  if (Z <= 88) return { col: Z - 87, row: 6 };
  if (Z <= 103) return { col: Z - 89 + 2, row: 8.4, f: true };
  return { col: Z - 104 + 3, row: 6 };
}

const ELEMENTS = RAW.trim().split('\n').map(line => {
  const [Z, sym, name, mass, cat, en, mp, bp, dens, year, look, fact] = line.split('|');
  const z = +Z;
  const num = v => (v === '' ? null : +v);
  const g = gridPos(z);
  const period = z <= 2 ? 1 : z <= 10 ? 2 : z <= 18 ? 3 : z <= 36 ? 4 : z <= 54 ? 5 : z <= 86 ? 6 : 7;
  return {
    Z: z, sym, name, mass: +mass, cat, en: num(en), mp: num(mp), bp: num(bp), density: num(dens),
    year: +year, look, fact, col: g.col, row: g.row, fblock: !!g.f,
    group: g.f ? null : g.col + 1, period,
    radioactive: z === 43 || z === 61 || z >= 84,
    synthetic: z === 43 || z === 61 || z >= 93,
    shells: shellsFor(z),
    color: CATS[cat].color,
    flame: FLAME[sym] || null,
    wiki: sym === 'Hg' ? 'Mercury_(element)' : name,
  };
});
const BY_SYM = Object.fromEntries(ELEMENTS.map(e => [e.sym, e]));
const el = Z => ELEMENTS[Z - 1];
