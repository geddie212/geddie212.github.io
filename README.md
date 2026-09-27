# Paul Gedrimas — personal portfolio

A static GitHub Pages portfolio in the Signal Instrument direction: ivory, graphite and orange, a monochrome GitHub portrait, and an interactive gradient instrument in the header.

## Preview

`npm run dev` serves the website at http://127.0.0.1:4173. No production dependencies or build step are required. You can also open `index.html` directly.

## Included

- Header portrait with CSS grayscale, slight sepia, contrast, scanlines and an offset orange frame. Original avatar retained unchanged in `assets/paul-github.jpg` (downloaded from the public GitHub profile on 27 September 2026).
- Draggable loss-curve point, tangent, angle, learning rate and gradient descent. SVG measurement layer with decorative native WebGL ribbons. The numeric angle uses equal mathematical axis units; the decorative ribbons do not encode measurements.
- Light/dark theme, keyboard controls, reduced-motion support, offscreen animation suspension, and a functional SVG fallback when WebGL is unavailable.
- Selected public projects, a window-to-prediction explorer, six sorting visualisations, project documentation links, archive filters, and the [live My Queue collection](https://geddie212.github.io/my_queue/).
- Printable HTML résumé based on the supplied résumé. No public phone number.

## GitHub Pages

This checkout uses the repository `geddie212/geddie212.github.io`, renamed from `-geddie212.github.io`. The portfolio address is https://geddie212.github.io/.

GitHub Pages publishes from the `main` branch and `/` (root). All local links use relative paths. `.nojekyll` bypasses Jekyll processing. Pushes to `main` update the live site after the Pages build completes.

## Content boundaries

Project descriptions use public repository documentation and the supplied résumé. Diagrammed watch/chat interfaces are labeled illustrations, not screenshots. Field Notes links to existing documentation, not fabricated publications. The reading/listening section links to the existing collection and does not claim those older selections are current.

Forklane, new research articles and detailed study results need confirmed content before adding them. No model performance, clinical effectiveness, or production usage claims have been invented. The loss landscape and biosignal explorer are synthetic educational examples, not medical predictions.

The user reports a toy BehaviorTrace project predicting running, walking, sitting and standing; the project card reflects that result without inventing an accuracy score. The real training script extracts statistical/timing features and configures a 500-tree `RandomForestClassifier`.

### Interactive model details

`bio-model.js` trains a deterministic five-tree teaching forest on 360 generated windows, using bootstrap samples, random feature subsets and Gini splits. Its stream, data, and trained trees are separate from BehaviorTrace. The interface shows actual window statistics, sample values, local extrema, per-tree paths, and averaged leaf proportions. These are toy model outputs, not validation results. A separate conceptual diagram explains how a neural network could replace the forest.

`sort-model.js` implements browser adaptations of insertion, enhanced bubble, selection, merge, quicksort and the custom ascending-run pairwise merge algorithm. Standard merge and partition routines handle odd lengths and repeated values, rather than reproducing edge-case bugs in the original Java source. Complexity describes the sorting algorithm's peak auxiliary memory, including recursion but excluding snapshot storage and the input copy. Counters record key comparisons, main-array writes and swaps in the browser implementation. Switching algorithms reuses the same input for a fair comparison.

Sources: [BehaviorTrace training code](https://github.com/geddie212/BehaviorTrace/blob/main/train_model/train_emotibit_model.py), [Java sorting project](https://github.com/geddie212/sort_algorithms), [scikit-learn forests](https://scikit-learn.org/stable/modules/ensemble.html#forests-of-randomized-trees), [Princeton algorithm complexities](https://algs4.cs.princeton.edu/cheatsheet/).

## Validation

`npm install` then `npm test` runs browser checks using installed Chrome. Test tooling is development-only. The tests cover mouse/touch dragging, convergence, reduced motion, theme persistence, filters, sorting, asset availability and responsive overflow. Browser emulation does not replace final testing on physical iOS and Android devices.
