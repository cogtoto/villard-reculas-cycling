// Export de la sortie au format TCX (Garmin Connect / Strava : puissance, cadence, vitesse, altitude, GPS).
import { Capacitor } from '@capacitor/core';

const R = 6371000;
export function toLatLon(origin, x, z) {
  const k = Math.cos((origin.lat0 * Math.PI) / 180);
  return [origin.lat0 - (z / R) * 180 / Math.PI, origin.lon0 + (x / (R * k)) * 180 / Math.PI];
}

// samples : [{ t (ms epoch), lat, lon, alt, dist (m), w, cad, v (m/s) }]
export function buildTcx(samples, { name = 'Velo Virtuel ride' } = {}) {
  const iso = (t) => new Date(t).toISOString().replace(/\.\d+Z$/, 'Z');
  const s0 = samples[0], sN = samples[samples.length - 1];
  const secs = (sN.t - s0.t) / 1000, avgW = samples.reduce((a, s) => a + s.w, 0) / samples.length;
  const maxV = Math.max(...samples.map((s) => s.v));
  const cads = samples.filter((s) => s.cad > 0), avgCad = cads.length ? Math.round(cads.reduce((a, s) => a + s.cad, 0) / cads.length) : 0;
  const kcal = Math.round(avgW * secs / 1000 / 0.24 / 4.184); // ≈ kJ mécaniques
  const tp = samples.map((s) => `<Trackpoint><Time>${iso(s.t)}</Time><Position><LatitudeDegrees>${s.lat.toFixed(7)}</LatitudeDegrees><LongitudeDegrees>${s.lon.toFixed(7)}</LongitudeDegrees></Position><AltitudeMeters>${s.alt.toFixed(1)}</AltitudeMeters><DistanceMeters>${s.dist.toFixed(1)}</DistanceMeters>${s.cad > 0 ? `<Cadence>${Math.round(s.cad)}</Cadence>` : ''}<Extensions><ns3:TPX><ns3:Speed>${s.v.toFixed(2)}</ns3:Speed><ns3:Watts>${Math.round(s.w)}</ns3:Watts></ns3:TPX></Extensions></Trackpoint>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">
<Activities><Activity Sport="Biking"><Id>${iso(s0.t)}</Id>
<Lap StartTime="${iso(s0.t)}"><TotalTimeSeconds>${secs.toFixed(0)}</TotalTimeSeconds><DistanceMeters>${sN.dist.toFixed(1)}</DistanceMeters><MaximumSpeed>${maxV.toFixed(2)}</MaximumSpeed><Calories>${kcal}</Calories>${avgCad ? `<Cadence>${avgCad}</Cadence>` : ''}<Intensity>Active</Intensity><TriggerMethod>Manual</TriggerMethod>
<Track>
${tp}
</Track><Extensions><ns3:LX><ns3:AvgWatts>${Math.round(avgW)}</ns3:AvgWatts></ns3:LX></Extensions></Lap>
<Notes>${name} (virtual ride)</Notes></Activity></Activities>
<Author xsi:type="Application_t" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><Name>Velo Virtuel</Name><Build><Version><VersionMajor>0</VersionMajor><VersionMinor>3</VersionMinor></Version></Build><LangID>en</LangID><PartNumber>000-00000-00</PartNumber></Author>
</TrainingCenterDatabase>
`;
}

// Navigateur : téléchargement ; Android : fichier en cache + feuille de partage (Garmin Connect, Drive, e-mail…)
export async function saveFile(filename, text) {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const r = await Filesystem.writeFile({ path: filename, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: 'Ride for Garmin', text: 'Import this TCX file into Garmin Connect', url: r.uri, dialogTitle: 'Send ride to…' });
    return 'shared';
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/vnd.garmin.tcx+xml' }));
  a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return 'downloaded';
}
