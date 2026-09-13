import { collectCommission, type RunState } from '../../src/game/engine';

export function collectWithRepeatPrices(run: RunState): RunState {
  const shop = collectCommission(run);
  if (shop === run || run.stage < 3) return shop;
  const owned = [...Object.values(run.board), ...run.bench];
  return {
    ...shop,
    offers: shop.offers.map((offer) => {
      if (offer.kind !== 'doubler' && offer.kind !== 'crown') return offer;
      const copies = owned.filter((peg) => peg.kind === offer.kind).length;
      return { ...offer, price: offer.price + Math.min(4, Math.max(0, copies - 2) * 2) };
    }),
  };
}