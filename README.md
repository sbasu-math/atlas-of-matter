# Atlas of Matter

An interactive periodic table that runs in the browser. All 118 elements react to your cursor, change state as you adjust the temperature, and can be combined in a small chemistry lab.

**Live demo:** https://sbasu-math.github.io/atlas-of-matter/

Built with [Claude Code](https://claude.com/claude-code) from three plain-English prompts. I did not write the code by hand.

## Features

- **Three layouts of the same 118 elements:** the classic table, a spiral, and a discovery timeline. Tiles swell and tilt toward the cursor.
- **Temperature slider (1 K – 6,000 K):** elements visibly melt and boil at their real melting and boiling points.
- **Element pages:** a real photo, an atom you can excite with the cursor to watch it emit light, and a cube that floats or sinks in water according to the element's actual density.
- **What If Lab:** drag elements together. Sodium and chlorine crystallize into salt, uranium splits, hydrogen fuses inside a star.
- **Compound builder:** type a compound name (water, caffeine, aspirin, glucose) and watch its atoms assemble into their real 3D shape, using structure data fetched live from PubChem.

## How it's built

About 2,800 lines of plain HTML, CSS and JavaScript. There are no frameworks, no build step, no server and no database.

```
index.html   layout, styles, page structure
js/data.js   element data
js/app.js    table, layouts, element pages
js/lab.js    What If Lab and compound builder
```

To run it locally, download the repository and open `index.html` in a browser.

## Privacy

- No accounts, cookies, tracking or analytics.
- It never accesses your files, camera, microphone or location.
- Network requests go only to Wikipedia (element photos), PubChem (compound lookups) and Google Fonts. The only data sent is the element or compound name you look up.
- The only thing stored in your browser is a cache of photo links (`localStorage`), so pages load faster.

## Limitations

- The compound animation shows what a molecule is **made of** and its final shape, not the reaction pathway chemists actually use to synthesize it.
- The content was generated with AI assistance. Check facts against a primary source before using it for teaching.

## Credits

- Element photos and summaries: [Wikipedia](https://www.wikipedia.org/) via its REST API (images remain under their original licenses)
- Compound structures: [PubChem](https://pubchem.ncbi.nlm.nih.gov/), National Center for Biotechnology Information
- Fonts: Instrument Serif, Manrope and JetBrains Mono via Google Fonts

## License

MIT. See [LICENSE](LICENSE).
