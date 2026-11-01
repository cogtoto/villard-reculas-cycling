// Modèle physique vélo : puissance = résistances (air + roulement + gravité) — partagé client / serveur.
export const BIKE = { mass: 82, cda: 0.36, crr: 0.005, g: 9.81, drivetrain: 0.975 };

const rhoAt = (altM = 0) => 1.225 * Math.exp(-altM / 8500); // densité de l'air selon l'altitude

// Forces résistantes (N) à la vitesse v (m/s) sur une pente gradePct
export function resistance(v, gradePct, altM = 0, p = BIKE) {
  const th = Math.atan(gradePct / 100);
  return 0.5 * rhoAt(altM) * p.cda * v * v + p.crr * p.mass * p.g * Math.cos(th) + p.mass * p.g * Math.sin(th);
}

// Vitesse d'équilibre (m/s) : P·η = F(v)·v — résolution par dichotomie
export function steadySpeed(watts, gradePct, altM = 0, p = BIKE) {
  const P = Math.max(0, watts || 0) * p.drivetrain;
  let lo = 0, hi = 40;
  if (P === 0 && resistance(0.01, gradePct, altM, p) >= 0) return 0;
  for (let i = 0; i < 60; i++) { const v = (lo + hi) / 2; if (P - resistance(v, gradePct, altM, p) * v > 0) lo = v; else hi = v; }
  return lo;
}

// Intégration temporelle (inertie) : m·dv/dt = P/v − F(v)
export function stepSpeed(v, watts, gradePct, dt, altM = 0, p = BIKE) {
  const P = Math.max(0, watts || 0) * p.drivetrain;
  const drive = P / Math.max(v, 1.0);
  const a = (drive - resistance(v, gradePct, altM, p)) / (p.mass * 1.04); // +4 % inertie des roues
  return Math.max(0, v + a * dt);
}
