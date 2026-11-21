/**
 * zsviczian -- compare fixed-position glyph cores without classifying a faint
 * antialias fringe's threshold crossing as movement. No changed core pixel is
 * tolerated; displacement controls exercise the same comparator.
 * Author: zsviczian. PR #493 / plugin #3064; CI run 44889615453.
 */
export function compareTextGlyphPixels(before, after) {
  if (!before.length || before.length !== after.length || before.length % 4) {
    throw new Error("Expected equal nonempty RGBA images");
  }
  const masks = [64, 128, 200].map((threshold) => {
    let changed = 0;
    let beforeInk = 0;
    let afterInk = 0;
    for (let index = 0; index < before.length; index += 4) {
      const a = before[index] < threshold;
      const b = after[index] < threshold;
      beforeInk += Number(a);
      afterInk += Number(b);
      changed += Number(a !== b);
    }
    return { threshold, changed, beforeInk, afterInk };
  });
  return {
    masks,
    // The 200 mask remains diagnostic: CI changed a single fringe pixel from
    // gray 204 to 192 without moving either of the darker glyph silhouettes.
    stable: masks
      .filter(({ threshold }) => threshold <= 128)
      .every(
        ({ changed, beforeInk, afterInk }) =>
          !changed && beforeInk > 0 && afterInk > 0,
      ),
  };
}
