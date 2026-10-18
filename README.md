# Paul Gedrimas — personal portfolio

A static GitHub Pages portfolio in the Signal Instrument direction: ivory, graphite and orange, a monochrome GitHub portrait, and a scripted AI-assistant panel in the header.

## Preview

`npm run dev` serves the website at http://127.0.0.1:4173. No production dependencies or build step are required. You can also open `index.html` directly.

## Included

- Header portrait with CSS grayscale, slight sepia, contrast, scanlines and an offset orange frame. Original avatar retained unchanged in `assets/paul-github.jpg` (downloaded from the public GitHub profile on 27 September 2026).
- A scripted, résumé-grounded chat assistant in the header: answers FAQ-style questions about my background and projects via keyword pattern matching, with clickable example prompts, an ASCII ripple/face avatar, and a status indicator (idle/thinking/responding). It is not a live LLM — no network calls, nothing typed leaves the browser — and it can run one real site command, switching the page between light and dark mode on request.
- Light/dark theme (toggleable from the nav or by asking the assistant), keyboard controls, and reduced-motion support throughout.
- Selected public projects, a window-to-prediction explorer, a step-through merge-k-sorted-lists animation, project documentation links, archive filters, and the [live My Queue collection](https://geddie212.github.io/my_queue/).
- Printable HTML résumé based on the supplied résumé. No public phone number.

## GitHub Pages

This checkout uses the repository `geddie212/geddie212.github.io`, renamed from `-geddie212.github.io`. The portfolio address is https://geddie212.github.io/.

GitHub Pages publishes from the `main` branch and `/` (root). All local links use relative paths. `.nojekyll` bypasses Jekyll processing. Pushes to `main` update the live site after the Pages build completes.

## Content boundaries

Project descriptions use public repository documentation and the supplied résumé. Diagrammed watch/chat interfaces are labeled illustrations, not screenshots. Field Notes links to existing documentation, not fabricated publications. The reading/listening section links to the existing collection and does not claim those older selections are current.

New research articles and detailed study results need confirmed content before adding them. No model performance, clinical effectiveness, or production usage claims have been invented. The biosignal explorer is a synthetic educational example, not a medical prediction. The chat assistant's answers are hand-written from the résumé and project copy already on this site, not generated or fetched from any external source.

The Forklane card describes the published `@forklaneai/forklane` npm package and the public forklane.ai site. Its GitHub repository is private, so the card links to the live product and package listing instead of source, and carries no co-founder or company framing.

The user reports a toy BehaviorTrace project predicting running, walking, sitting and standing; the project card reflects that result without inventing an accuracy score. The real training script extracts statistical/timing features and configures a 500-tree `RandomForestClassifier`.

### Interactive model details

`bio-model.js` trains a deterministic five-tree teaching forest on 360 generated windows, using bootstrap samples, random feature subsets and Gini splits. Its stream, data, and trained trees are separate from BehaviorTrace. The interface shows actual window statistics, sample values, local extrema, per-tree paths, and averaged leaf proportions. These are toy model outputs, not validation results. A separate conceptual diagram explains how a neural network could replace the forest.

`mergeklists-model.js` emits a step trace for [my NeetCode solution](https://github.com/geddie212/neetcode-submissions/blob/main/Data%20Structures%20%26%20Algorithms/merge-k-sorted-linked-lists/submission-2.java) to LeetCode 23 (Merge k Sorted Lists): 5 randomly generated already-sorted linked lists, the `ListNode[] lists` array, the `mergeSort(lists, l, r)` index splits, and the `merge(ls, rs)` pointer walk. It follows that method exactly, including attaching a remaining chain with a single `curr.next` assignment rather than node by node. Every node is tagged with the index of the list it was born in, and that tag is carried through every merge untouched, which is also exactly how the real algorithm behaves — nodes are relinked, never copied.

`experiments.js` renders the linked lists themselves as SVG: ellipse nodes colored by origin list (`--list-0`…`--list-4` in `styles.css`, flipped for dark mode), connected by arrows running bottom-up to `⌀`. A dashed box highlights the index range the current recursive call covers. Only the `ListNode[] lists` array and the `mergeSort(...)` call list stay plain monospace text, since those are literally code/array structures rather than the linked lists. Two deliberate presentation choices: all divide steps are shown before the merges, though a real call stack interleaves them, and long chains compress their vertical spacing so every phase stays a similar height. Complexity figures (O(N log k) time, O(log k) call-stack space) describe the algorithm's shape, not a stopwatch benchmark.

`assistant-data.js` holds the chat assistant's fixed response copy, a small keyword-matching `respond()` function, and the ASCII ripple/face generator; `assistant.js` wires that to the chat panel's DOM (message log, quick-question chips, status indicator, the form) and calls into `site.js`'s theme functions for the "dark mode" / "light mode" commands. There is no API call and no server — everything is static text picked by matching the typed question against a fixed list of trigger phrases.

Sources: [BehaviorTrace training code](https://github.com/geddie212/BehaviorTrace/blob/main/train_model/train_emotibit_model.py), [scikit-learn forests](https://scikit-learn.org/stable/modules/ensemble.html#forests-of-randomized-trees), [my NeetCode submissions](https://github.com/geddie212/neetcode-submissions).

## Validation

`npm install` then `npm test` runs browser checks using installed Chrome. Test tooling is development-only. The tests cover the chat assistant's quick questions and typed commands (including the dark-mode command), touch dragging, reduced motion, theme persistence, filters, the merge-k-lists recursion trace, asset availability and responsive overflow. Browser emulation does not replace final testing on physical iOS and Android devices.
