// Géographie approximative (lon, lat WGS84) : océan + Grand Traict, marais salants de Guérande.
// Polygones tracés à la main, calés sur le GPX (côte juste côté mer de la route).
const OCEAN = [
  [-2.20, 47.236], [-2.29, 47.237], [-2.315, 47.2425], [-2.329, 47.248], [-2.3388, 47.2532], [-2.343, 47.2615],
  [-2.352, 47.268], [-2.364, 47.2735], [-2.372, 47.2768], [-2.387, 47.2798], [-2.401, 47.2802], [-2.411, 47.2785],
  [-2.421, 47.2725], [-2.4155, 47.2615], [-2.4172, 47.2578], [-2.430, 47.2568], [-2.440, 47.2588], [-2.452, 47.2628],
  [-2.463, 47.2682], [-2.471, 47.2695], [-2.484, 47.2725], [-2.4925, 47.2745], [-2.4975, 47.2778], [-2.508, 47.2802], [-2.522, 47.2853],
  [-2.536, 47.2872], [-2.5505, 47.2925], [-2.5515, 47.2975], [-2.546, 47.3015], [-2.534, 47.3025],
  // Grand Traict (baie du Croisic) : entrée au nord du port
  [-2.520, 47.3015], [-2.505, 47.2995], [-2.490, 47.2985], [-2.477, 47.304], [-2.479, 47.316], [-2.495, 47.3215],
  [-2.512, 47.317], [-2.525, 47.309],
  // Pen Bron → La Turballe
  [-2.528, 47.312], [-2.519, 47.325], [-2.512, 47.345], [-2.506, 47.37], [-2.50, 47.45],
  [-2.80, 47.45], [-2.80, 47.05], [-2.20, 47.05],
];
const MARSH = [
  [-2.490, 47.2975], [-2.476, 47.2885], [-2.462, 47.2825], [-2.445, 47.2830], [-2.428, 47.2855], [-2.416, 47.2950],
  [-2.410, 47.310], [-2.418, 47.324], [-2.437, 47.334], [-2.458, 47.336], [-2.473, 47.327], [-2.479, 47.316], [-2.477, 47.304],
];

export function makeGeo(origin) {
  const R = 6371000, k = Math.cos((origin.lat0 * Math.PI) / 180);
  const proj = ([lon, lat]) => [((lon - origin.lon0) * Math.PI / 180) * R * k, -((lat - origin.lat0) * Math.PI / 180) * R];
  const ocean = OCEAN.map(proj), marsh = MARSH.map(proj);
  const inside = (poly, x, z) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i], [xj, zj] = poly[j];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
    }
    return c;
  };
  // 'sea' | 'marsh' | 'land'
  const classify = (x, z) => (inside(ocean, x, z) ? 'sea' : inside(marsh, x, z) ? 'marsh' : 'land');
  return { classify, ocean, marsh };
}
