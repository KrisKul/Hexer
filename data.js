// /js/data.js
export async function loadJSON(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

// Example: preload shared data (others can import)
export const Data = {
  monsters: [],
  balance: {}
};

(async () => {
  [Data.monsters, Data.balance] = await Promise.all([
    loadJSON('/data/monsters.json'),
    loadJSON('/data/balance.json')
  ]);
  // Dispatch a ready event so core can start after data loads
  window.dispatchEvent(new Event('hexer:dataReady'));
})();
