/* A synthetic one-parameter loss landscape, not a trained model. */
(function (root) {
  'use strict';
  const loss = w => 0.45 * (w ** 4 / 4 - 0.1 * w ** 3 - 1.125 * w ** 2 + 0.675 * w) + 2;
  const gradient = w => 0.45 * (w + 1.5) * (w - 0.3) * (w - 1.5);
  const curvature = w => 0.45 * (3 * w ** 2 - 0.6 * w - 2.25);
  const tangent = w => ({m: gradient(w), b: loss(w) - gradient(w) * w, angle: Math.atan(gradient(w)) * 180 / Math.PI});
  const step = (w, rate) => w - rate * gradient(w);
  const api = {loss, gradient, curvature, tangent, step};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LossMath = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
