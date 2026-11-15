// Le Commentateur — optional live race commentary (Web Speech API, French).
// Spoken only; no banners. Lightweight: no bundled audio files.
// Prefers a local Piper voice via the companion /tts endpoint, else Web Speech.
// Persona: passionate, gouailleur French cycling commentator. Rider: Vincent.

export const COMMENTATOR_KEY = 'vv.commentator';
export const COOLDOWN_MS = 25000;
export const ATTACK_DELTA_W = 50;
export const ATTACK_RATIO = 1.15;
export const STEEP_GRADE = 8;
export const LOW_CADENCE = 65;
export const HIGH_HR = 165;
export const LAST_METERS = 500;
export const POWER_WINDOW_MS = 30000;

// Never mention a real commentator by name.
export const PERSONA = 'Le Commentateur';

export const LINES = {
  start: [
    "Et c'est parti pour Vincent ! Allez, allez !",
    "Allez, allez, allez Vincent ! On y va !",
    "Le départ est lancé ! Vincent, ça va claquer !",
    "C'est parti mon kiki ! Vincent, mets-y une plaque !",
    "Et ho, ça s'élance ! Vincent, on attaque !",
    "Ça y est, on roule ! Allez Vincent !",
    "Départ canon pour Vincent ! Il est déjà dedans !",
    "Allez Vincent, ça va chanter dans les jambes !",
    "Vincent s'élance ! Quel départ !",
    "Le ride est lancé ! Allez, allez Vincent !",
    "Et c'est parti ! Vincent, on n'y va pas mollet !"
  ],
  startVillard: [
    "Et c'est parti du barrage du Verney ! Allez Vincent !",
    "Départ au barrage d'Allemond ! Vincent, direction le chalet !",
    "Au-dessus du lac, Vincent s'élance ! Les lacets l'attendent !",
    "C'est parti de l'Eau d'Olle ! Allez, allez Vincent !",
    "Vincent s'élance du barrage du Verney ! Ça va grimper !",
    "Départ au Verney ! Vincent, Villard-Reculas est tout là-haut !",
    "On quitte le Verney ! Allez Vincent, ça va faire mal !",
    "Allez, allez, allez Vincent ! Du barrage jusqu'au chalet !",
    "Départ d'Allemond ! Vincent met le feu dès le premier braquet !",
    "C'est parti pour l'Oisans ! Vincent, la montagne est à toi !",
    "Et ho ! Vincent s'échappe au départ du Verney !"
  ],
  startNormandy: [
    "Et c'est parti dans le bocage ! Allez Vincent !",
    "Départ en campagne ! Vincent, la Normandie, ça va claquer !",
    "Vincent s'élance dans l'Eure ! Allez, allez !",
    "C'est parti pour Grand-Camp ! Vincent, les jambes vont parler !",
    "Allez, allez, allez Vincent ! La route de Normandie est à toi !",
    "Le départ est donné en plaine ! Vincent, ça va vite !",
    "Vincent embarque dans le bocage ! Il a envie d'en découdre !",
    "Départ allègre pour Vincent ! La campagne s'ouvre, ça va rouler !",
    "Ça roule en Normandie ! Allez Vincent, tiens le rythme !",
    "C'est parti mon Vincent ! Fais-leur un numéro dans le bocage !",
    "Départ lancé ! Vincent, le vent du pays d'Ouche est avec toi !"
  ],
  attack: [
    "Allez, allez, allez Vincent ! Quelle attaque !",
    "Oh la la, quelle attaque ! Vincent met le feu !",
    "Vincent met une plaque ! Quelle relance !",
    "Il est en train de faire exploser la course ! Quelle attaque !",
    "Oh la la ! Vincent attaque, ça s'envole !",
    "Quelle relance de Vincent ! Il n'y va pas mollet !",
    "Ça décolle ! Vincent met une plaque de malade !",
    "Il passe à l'attaque ! Vincent, les watts s'affolent !",
    "Vincent met le paquet ! Allez, allez !",
    "Quelle accélération ! Vincent fait le trou !",
    "Et hop, Vincent met une plaque ! Le compteur s'emballe !",
    "Il relance à bloc, Vincent ! Quelle attaque !"
  ],
  zoneRed: [
    "Vincent est dans le rouge ! Ça va taper !",
    "Il passe en zone cinq ! Allez Vincent, serre les dents !",
    "Là, Vincent, c'est le braquet de la souffrance ! À bloc !",
    "Vincent n'a plus de marge ! Il est dans le dur !",
    "Le moteur est en surrégime ! Allez Vincent !",
    "Attention, Vincent est dans le rouge ! Ça brûle !",
    "Vincent danse près de la rupture ! Quel courage !",
    "Effort violent ! Vincent serre les dents, ça pique !",
    "Les watts sont trop hauts, et Vincent y va quand même !",
    "Il est dans le vif, Vincent ! Plus question de blaguer !",
    "Le compteur s'affole ! Vincent, c'est le très dur !"
  ],
  struggle: [
    "Il est dans le dur, Vincent ! Ça fait mal !",
    "La cadence tombe ! Allez Vincent, accroche !",
    "Ça grimpe, ça grimpe ! Vincent, ne lâche rien !",
    "Les jambes sont lourdes, Vincent ! Il avance quand même !",
    "Il est à la peine, Vincent ! Petite cadence, grande volonté !",
    "Ça fait mal aux pattes ! Allez, allez Vincent !",
    "Vincent lutte contre la pente ! Il ne lâche rien !",
    "La cadence s'écroule, Vincent est dans le dur ! Allez !",
    "On l'entend souffler d'ici ! Ça brûle, Vincent, ça brûle !",
    "Il est au tas, Vincent ! Et pourtant il continue !",
    "C'est le moment où ça fait mal ! Tiens bon, Vincent !"
  ],
  steep: [
    "Attention, ça se cabre ! Vincent, les pourcentages s'envolent !",
    "Ça se redresse, Vincent ! Plus de 8 %, ça va piquer !",
    "La route se cabre ! Allez Vincent, ça grimpe !",
    "Oh là, ça se verticalise ! Vincent, tiens le braquet !",
    "Le ruban d'asphalte se lève ! Vincent, ça va faire mal !",
    "Ça casse, ça casse ! Allez Vincent !",
    "La pente se fait méchante ! Bienvenue dans le dur, Vincent !",
    "Ça se lève d'un coup ! Vincent, danse sur les pédales !",
    "Les pourcentages s'enflamment ! Vincent, pas le moment de rêver !",
    "Ça grimpe tout à coup ! Mets une petite dent, Vincent !",
    "La route prend de l'altitude ! Accroche-toi, Vincent !"
  ],
  km: [
    "Kilomètre {km} ! Vincent est toujours en selle, ça roule !",
    "Et voilà le kilomètre {km} ! Allez Vincent !",
    "Kilomètre {km} pour Vincent ! Il tient son affaire, chapeau !",
    "On passe le {km} ! Vincent, ça avance, ça avance !",
    "Kilomètre {km} ! Les jambes de Vincent répondent présent !",
    "Encore un bornage, le {km} ! Allez Vincent !",
    "Kilomètre {km} ! Vincent, on ne le lâche pas, quel rythme !",
    "Le {km} est dans la poche ! Ça fait plaisir, Vincent !",
    "Kilomètre {km} ! Vincent gère, il a encore de la marge !",
    "Et on pointe le kilomètre {km} ! Belle régularité, Vincent !",
    "Kilomètre {km} déjà ! Vincent, le temps passe vite !"
  ],
  kmRemaining: [
    "Plus que {remain} kilomètres ! Ça va se jouer, Vincent !",
    "Encore {remain} kilomètres ! Allez Vincent, gère la fin !",
    "Il reste {remain} kilomètres ! Ne te relâche pas, Vincent !",
    "Plus que {remain} bornes ! Vincent, le plus dur peut arriver !",
    "Encore {remain} kilomètres à avaler ! Allez, allez Vincent !",
    "Ça se rapproche ! Plus que {remain} kilomètres, Vincent est lancé !",
    "Il en reste {remain} ! Vincent, c'est maintenant que ça compte !",
    "Encore {remain} kilomètres ! Les jambes de Vincent doivent tenir !",
    "Plus que {remain} kilomètres ! La ligne se dessine, Vincent !",
    "Il reste {remain} bornes ! Serre, serre, Vincent, ça va passer !",
    "Encore {remain} kilomètres ! On n'est plus très loin, Vincent !"
  ],
  intervalHard: [
    "C'est le morceau dur ! Serre les dents, Vincent !",
    "L'intervalle sérieux commence ! Vincent, mets une plaque !",
    "Ça démarre l'effort ! Allez Vincent !",
    "Morceau difficile ! On entre dans le dur, Vincent !",
    "C'est le moment de tout mettre ! L'intervalle est lancé, Vincent !",
    "Effort lancé ! Ça va taper, Vincent, et c'est tant mieux !",
    "On attaque le dur ! Danse sur les pédales, Vincent !",
    "L'intervalle de feu ! Les watts vont parler, Vincent !",
    "Ça va être un vrai numéro ! Accroche-toi, Vincent !",
    "Le dur est là ! Pas de cadeau, Vincent, on y va !",
    "C'est parti pour l'effort ! Vincent est dans le vif du sujet !"
  ],
  intervalRecovery: [
    "Récup, Vincent ! On souffle, on relâche les épaules !",
    "Ça souffle ! Profite de la récup, Vincent !",
    "On dégrafe un peu, Vincent ! Récup active, on roule !",
    "Belle récup pour Vincent ! On roule léger, on prépare la suite !",
    "Souffle, Vincent ! La récup est là, ça va revenir !",
    "On pose un peu les armes, Vincent ! Mais on reste en mouvement !",
    "Récupération, Vincent ! C'est le moment de boire et de souffler !",
    "Ça retombe, Vincent ! Profite, le prochain effort n'est pas loin !",
    "On allège, Vincent ! Les battements redescendent, c'est bien géré !",
    "Petite récup pour Vincent ! Il l'a bien méritée !",
    "On roule en souplesse, Vincent ! La récup, c'est encore de l'effort !"
  ],
  hrHigh: [
    "Le cœur s'emballe ! Vincent est à fond de la boîte !",
    "Ça pulse, Vincent ! Le cœur est lancé, attention à la fin !",
    "Le cardio s'affole ! Vincent est vraiment dedans !",
    "Oh le cœur de Vincent ! Ça tape, ça tape !",
    "Les battements s'envolent ! Vincent est à bloc, chapeau !",
    "Le cœur joue du tambour ! Vincent, tu es à fond !",
    "Ça chauffe sous le maillot ! Vincent, c'est sérieux !",
    "Vincent, le cœur est haut ! Quel courage !",
    "Les pulsations s'affolent ! Vincent n'a plus beaucoup de marge !",
    "Le cœur est en zone rouge ! Tiens bon, Vincent !",
    "Ça bat très fort ! Vincent est dans un effort de tous les diables !"
  ],
  last500: [
    "Plus que cinq cents mètres ! La ligne est là, allez Vincent !",
    "Cinq cents mètres ! Vincent, c'est le sprint de la vérité !",
    "On y est presque ! Plus que cinq cents mètres, mets une plaque, Vincent !",
    "Derniers cinq cents mètres ! Ne te relâche pas, Vincent !",
    "La ligne se rapproche ! Cinq cents mètres, un dernier coup de rein, Vincent !",
    "Plus que cinq cents mètres ! Ça se joue maintenant, Vincent !",
    "Le final ! Cinq cents mètres, danse sur les pédales, Vincent !",
    "Cinq cents mètres ! Les jambes peuvent crier, Vincent, on va au bout !",
    "C'est le moment ! Plus que cinq cents mètres, Vincent !",
    "Dernière ligne droite ! Cinq cents mètres, allez, allez Vincent !",
    "Plus que cinq cents mètres ! Tu tiens le bon bout, Vincent, lâche rien !"
  ],
  last500Villard: [
    "Plus que cinq cents mètres ! Le chalet est en vue, allez Vincent !",
    "Le 7 rue Nouvelle approche ! Cinq cents mètres, quelle arrivée, Vincent !",
    "On sent déjà le village ! Plus que cinq cents mètres jusqu'au chalet, Vincent !",
    "Cinq cents mètres ! Villard-Reculas est là, un dernier effort, Vincent !",
    "Le chalet se dessine ! Cinq cents mètres, mets le braquet, Vincent !",
    "Plus que cinq cents mètres vers la maison ! Allez, allez Vincent !",
    "La rue Nouvelle est tout près ! Cinq cents mètres, lâche rien, Vincent !",
    "On rentre dans le final de Villard ! Cinq cents mètres, Vincent !",
    "Le toit du chalet n'est plus très loin ! Encore cinq cents mètres, Vincent !",
    "Cinq cents mètres ! Tu rentres à la maison, Vincent, fais-le en beauté !",
    "Derniers cinq cents mètres pour le 7 rue Nouvelle ! Allez Vincent !"
  ],
  finish: [
    "Arrivée de Vincent ! Quel numéro, il est allé au bout !",
    "Et c'est fini ! Vincent a tenu, chapeau l'artiste !",
    "Ligne d'arrivée ! Vincent, les bras en l'air, quelle page !",
    "Vincent franchit la ligne ! Quel courage, il n'a rien lâché !",
    "Arrivée, arrivée ! Vincent est au bout, bravo !",
    "C'est plié, Vincent ! Tu l'as fait, les jambes peuvent souffler !",
    "Et il arrive, Vincent ! Quelle leçon de pugnacité !",
    "La ligne est passée ! Vincent, tu peux relâcher, c'était grand !",
    "Terminé pour Vincent ! Il est allé chercher loin, chapeau bas !",
    "Arrivée de Vincent ! Le compteur s'arrête, le sourire peut revenir !",
    "C'est fini, Vincent ! Tu as tenu le choc, quel bel effort !"
  ],
  finishVillard: [
    "Arrivée au 7 rue Nouvelle ! Vincent est à la maison, quel numéro !",
    "Et il rentre au chalet ! 7 rue Nouvelle, Villard-Reculas, bravo Vincent !",
    "Le chalet, le voilà ! Vincent franchit l'arrivée, il est à la maison !",
    "Arrivée à Villard-Reculas, au 7 rue Nouvelle ! Vincent a gravi la montagne !",
    "C'est fini au pied du chalet ! Quelle ascension, Vincent, chapeau !",
    "Vincent pose le pied au 7 rue Nouvelle ! Les lacets sont derrière, quel exploit !",
    "Le 7 rue Nouvelle accueille Vincent ! Arrivée au sommet, c'est magnifique !",
    "Il rentre à la maison ! Vincent, Villard-Reculas, le chalet, bravo !",
    "Arrivée au chalet ! Vincent, tu peux souffler, tu l'as cherchée loin !",
    "7 rue Nouvelle, c'est l'arrivée ! Vincent a tenu du barrage jusqu'ici !",
    "Et voilà le chalet ! Vincent est arrivé, Villard-Reculas lui appartient !"
  ],
  verney: [
    "On quitte le barrage du Verney ! Direction les hauteurs, Vincent !",
    "Le lac est derrière ! Allemond s'éloigne, Vincent, la route s'élève !",
    "Au revoir le Verney ! Maintenant ça va parler montant, Vincent !",
    "Vincent laisse le barrage ! L'Oisans s'ouvre, allez !",
    "On s'éloigne du Verney ! Les premiers pourcents sont là, Vincent !",
    "Allemond recule dans le rétro ! Le vrai col commence, Vincent !",
    "Le barrage du Verney est dans le dos ! Accroche-toi, Vincent, ça grimpe !",
    "Vincent s'extrait du Verney ! La D 526 va lui demander des comptes !",
    "On dit adieu au lac ! Place à la route d'en haut, Vincent !",
    "Le Verney s'éloigne ! Ça sent la vraie côte d'Oisans, Vincent !",
    "Départ du barrage bien lancé ! Allez Vincent, ça va taper !"
  ],
  lacets: [
    "Les lacets, les voilà ! Vincent danse sur les pédales !",
    "Ça serpente, ça serpente ! Les lacets de Villard, allez Vincent !",
    "Vincent est dans les lacets ! Il danse, ça c'est de l'art !",
    "Les épingles s'enchaînent ! Relance à chaque fois, Vincent !",
    "Dans les lacets, Vincent ! Un coup à droite, un coup à gauche !",
    "Il aborde les lacets ! Danse sur les pédales, Vincent !",
    "Quelle série de lacets ! Vincent met le braquet, et ça passe !",
    "Les virages en épingle ! Vincent est dedans, il relance !",
    "Ça s'enroule ! Les lacets le font souffrir, et Vincent brille !",
    "Vincent dans les lacets ! Il n'y va pas molle, ça se voit d'ici !",
    "Les lacets de l'Oisans ! C'est là qu'on reconnaît Vincent !"
  ],
  villardVillage: [
    "Villard-Reculas, on entre dans le village ! Quelle arrivée, Vincent !",
    "Le village, le voilà ! Villard-Reculas t'ouvre la porte, Vincent !",
    "On rentre dans Villard-Reculas ! Le chalet n'est plus très loin, Vincent !",
    "Villard-Reculas ! Les toits se rapprochent, ça sent l'arrivée, Vincent !",
    "Le panneau du village ! Tu es dans Villard-Reculas, Vincent !",
    "On déboule dans Villard ! Les chalets t'accompagnent, Vincent !",
    "Villard-Reculas, tu y es ! Plus qu'à rejoindre la rue Nouvelle, Vincent !",
    "Le village est là ! Villard-Reculas, tu l'as mérité, Vincent !",
    "On entre à Villard-Reculas ! Les jambes peuvent déjà sourire, Vincent !",
    "Villard-Reculas t'accueille ! Encore un filet d'effort, Vincent !",
    "Le voici le village ! Villard-Reculas, c'est bientôt la maison, Vincent !"
  ]

};

export const VILLARD_LANDMARKS = [
  { id: 'verney', fromM: 80, toM: 450, pool: 'verney' },
  { id: 'lacets', fromM: 3000, toM: 7500, pool: 'lacets' },
  { id: 'villardVillage', fromM: 10400, toM: 10880, pool: 'villardVillage' }
];

export function isCommentatorEnabled(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  if (!storage) return true;
  const v = storage.getItem(COMMENTATOR_KEY);
  if (v == null) return true; // default ON
  return v !== 'off' && v !== '0' && v !== 'false';
}

export function setCommentatorEnabled(on, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  if (storage) storage.setItem(COMMENTATOR_KEY, on ? 'on' : 'off');
  return !!on;
}

export function formatLine(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
}

export function pickLine(pool, random = Math.random, lastLine = null) {
  if (!pool || !pool.length) return null;
  if (pool.length === 1) return pool[0];
  const choices = lastLine ? pool.filter((l) => l !== lastLine) : pool;
  const list = choices.length ? choices : pool;
  return list[Math.floor(random() * list.length)];
}

export function averagePower(samples, now, windowMs = POWER_WINDOW_MS) {
  const cut = now - windowMs;
  let sum = 0, n = 0;
  for (const s of samples) {
    if (s.t >= cut) { sum += s.watts; n++; }
  }
  return n ? sum / n : 0;
}

export function classifyInterval(interval, ftp) {
  if (!interval) return null;
  const type = interval.type;
  if (type === 'recovery' || type === 'cooldown') return 'recovery';
  if (type === 'work' || type === 'ramp') return 'hard';
  const target = interval.target != null
    ? interval.target
    : (interval.targetStart + interval.targetEnd) / 2;
  if (ftp > 0 && target < ftp * 0.7) return 'recovery';
  if (ftp > 0 && target >= ftp * 0.88) return 'hard';
  return null;
}

function landmarkAt(routeId, distanceM) {
  if (routeId !== 'villard') return null;
  for (const lm of VILLARD_LANDMARKS) {
    if (distanceM >= lm.fromM && distanceM <= lm.toM) return lm;
  }
  return null;
}

export function createCommentatorEngine({
  cooldownMs = COOLDOWN_MS,
  random = Math.random,
  now = () => Date.now()
} = {}) {
  let enabled = true;
  let lastSpeakAt = -Infinity;
  let lastLine = null;
  let lastCategory = null;
  let speaking = false;
  let startSpoken = false;
  let last500Spoken = false;
  let finishSpoken = false;
  let lastKmSpoken = 0;
  let lastZone = null;
  let lastGrade = 0;
  let lastIntervalIndex = -1;
  let lastPlaceId = null;
  let hrHighActive = false;
  let rideWasStarted = false;
  let powerSamples = [];

  const reset = () => {
    lastSpeakAt = -Infinity;
    lastLine = null;
    lastCategory = null;
    speaking = false;
    startSpoken = false;
    last500Spoken = false;
    finishSpoken = false;
    lastKmSpoken = 0;
    lastZone = null;
    lastGrade = 0;
    lastIntervalIndex = -1;
    lastPlaceId = null;
    hrHighActive = false;
    rideWasStarted = false;
    powerSamples = [];
  };

  const canSpeak = (t, important) => {
    if (!enabled) return false;
    if (important) return true;
    if (speaking) return false;
    if (t - lastSpeakAt < cooldownMs) return false;
    return true;
  };

  const utter = (category, t, vars, important = false) => {
    if (!canSpeak(t, important)) return null;
    const pool = LINES[category];
    const raw = pickLine(pool, random, lastLine);
    if (!raw) return null;
    const line = formatLine(raw, vars);
    lastSpeakAt = t;
    lastLine = raw;
    lastCategory = category;
    speaking = true;
    return { category, line, important: !!important };
  };

  const markOneShot = (category) => {
    if (category === 'finish' || category === 'finishVillard') finishSpoken = true;
    if (category === 'last500' || category === 'last500Villard') last500Spoken = true;
    if (category === 'start' || category === 'startVillard' || category === 'startNormandy') startSpoken = true;
  };

  const update = (sample = {}) => {
    const t = sample.t != null ? sample.t : now();
    const watts = Number(sample.watts) || 0;
    const cadence = Number(sample.cadence) || 0;
    const grade = Number(sample.gradePct) || 0;
    const distanceM = Number(sample.distanceM) || 0;
    const trackLength = Number(sample.trackLength) || 0;
    const zone = sample.zone || null;
    const hr = sample.hr == null ? null : Number(sample.hr);
    const intervalIndex = sample.intervalIndex != null ? sample.intervalIndex : -1;
    const interval = sample.interval || null;
    const ftp = Number(sample.ftp) || 160;
    const routeId = sample.routeId || null;
    const rideStarted = !!sample.rideStarted;
    const arrivedFinish = !!sample.arrivedFinish;

    powerSamples.push({ t, watts });
    const cut = t - POWER_WINDOW_MS - 1000;
    if (powerSamples.length > 2000 || (powerSamples[0] && powerSamples[0].t < cut)) {
      powerSamples = powerSamples.filter((s) => s.t >= cut);
    }
    const avg30 = averagePower(powerSamples, t);

    // Highest priority first. Finish and last 500 m may interrupt.
    if (arrivedFinish) {
      rideWasStarted = rideStarted;
      lastZone = zone;
      lastGrade = grade;
      if (!finishSpoken) {
        const cat = routeId === 'villard' ? 'finishVillard' : 'finish';
        markOneShot(cat);
        return utter(cat, t, {}, true);
      }
      return null;
    }

    if (rideStarted && !startSpoken) {
      const pool = routeId === 'villard' ? 'startVillard' : routeId === 'normandy' ? 'startNormandy' : 'start';
      markOneShot(pool);
      const ev = utter(pool, t, {}, true);
      rideWasStarted = true;
      lastZone = zone;
      lastGrade = grade;
      return ev;
    }
    rideWasStarted = rideStarted;

    const inLast500 = trackLength > 0 && distanceM >= Math.max(0, trackLength - LAST_METERS) && distanceM < trackLength;
    if (inLast500 && !last500Spoken && !finishSpoken) {
      const cat = routeId === 'villard' ? 'last500Villard' : 'last500';
      markOneShot(cat);
      const ev = utter(cat, t, {}, true);
      lastZone = zone;
      lastGrade = grade;
      if (ev) return ev;
    }

    // In the last 500 m, let the finish call take over; skip place-name chatter.
    const lm = landmarkAt(routeId, distanceM);
    if (!inLast500 && lm && lm.id !== lastPlaceId) {
      const ev = utter(lm.pool, t, {});
      if (ev) {
        lastPlaceId = lm.id;
        lastZone = zone;
        lastGrade = grade;
        return ev;
      }
    }

    if (intervalIndex >= 0 && intervalIndex !== lastIntervalIndex) {
      const kind = classifyInterval(interval, ftp);
      if (kind === 'hard' || kind === 'recovery') {
        const ev = utter(kind === 'hard' ? 'intervalHard' : 'intervalRecovery', t, {});
        if (ev) {
          lastIntervalIndex = intervalIndex;
          lastZone = zone;
          lastGrade = grade;
          return ev;
        }
      } else {
        lastIntervalIndex = intervalIndex;
      }
    }

    const prevZone = lastZone;
    const enteringRed = (zone === 'Z5' || zone === 'Z6') && prevZone && prevZone !== zone && prevZone !== 'Z5' && prevZone !== 'Z6';
    if (enteringRed) {
      const ev = utter('zoneRed', t, {});
      lastGrade = grade;
      if (ev) {
        lastZone = zone;
        return ev;
      }
    } else {
      lastZone = zone;
    }

    const prevGrade = lastGrade;
    const steepening = grade > STEEP_GRADE && prevGrade <= STEEP_GRADE;
    if (steepening) {
      const ev = utter('steep', t, {});
      if (ev) {
        lastGrade = grade;
        return ev;
      }
    } else {
      lastGrade = grade;
    }

    if (grade > STEEP_GRADE && cadence > 0 && cadence <= LOW_CADENCE) {
      const ev = utter('struggle', t, {});
      if (ev) return ev;
    }

    const windowReady = powerSamples.length >= 8 && (t - powerSamples[0].t >= 8000);
    if (windowReady && avg30 >= 80 && watts >= avg30 + ATTACK_DELTA_W && watts >= avg30 * ATTACK_RATIO) {
      const ev = utter('attack', t, {});
      if (ev) return ev;
    }

    if (hr != null && hr > 0) {
      if (hr >= HIGH_HR && !hrHighActive) {
        const ev = utter('hrHigh', t, {});
        if (ev) {
          hrHighActive = true;
          return ev;
        }
      } else if (hr < HIGH_HR - 10) {
        hrHighActive = false;
      }
    }

    if (trackLength > 0 && !inLast500) {
      const km = Math.floor(distanceM / 1000);
      if (km >= 1 && km > lastKmSpoken && distanceM < trackLength) {
        const remain = Math.max(0, Math.round((trackLength - distanceM) / 1000));
        const useRemain = remain >= 1 && remain <= 5 && remain !== km;
        const ev = utter(useRemain ? 'kmRemaining' : 'km', t, { km, remain });
        if (ev) {
          lastKmSpoken = km;
          return ev;
        }
      }
    }

    return null;
  };

  return {
    update,
    reset,
    onSpeechEnd: () => { speaking = false; },
    setSpeaking: (v) => { speaking = !!v; },
    isSpeaking: () => speaking,
    setEnabled: (on) => { enabled = !!on; if (!enabled) speaking = false; },
    isEnabled: () => enabled,
    getState: () => ({ lastSpeakAt, lastCategory, lastLine, startSpoken, last500Spoken, finishSpoken, lastKmSpoken, speaking, enabled })
  };
}

export function pickFrenchVoice(voices) {
  const list = Array.from(voices || []);
  if (!list.length) return null;
  const score = (v) => {
    const lang = (v.lang || '').toLowerCase();
    const name = (v.name || '').toLowerCase();
    let s = 0;
    if (lang === 'fr-fr' || lang.startsWith('fr-fr')) s += 50;
    else if (lang.startsWith('fr')) s += 30;
    else if (/français|french/.test(name)) s += 20;
    else return -1;
    if (v.localService) s += 8;
    if (v.default) s += 3;
    if (/google|microsoft|thomas|hortense|denise|gabriel|claude|aurelie|aurélie|france/.test(name)) s += 6;
    return s;
  };
  let best = null, bestS = -1;
  for (const v of list) {
    const s = score(v);
    if (s > bestS) { bestS = s; best = v; }
  }
  return bestS >= 0 ? best : null;
}

export const TTS_PORT = 8787;
export const PIPER_PLAYBACK_RATE = 1.05;

export function ttsBaseUrl(hostname, port = TTS_PORT) {
  const host = hostname || (typeof location !== 'undefined' && location.hostname) || '127.0.0.1';
  return `http://${host}:${port}`;
}

export function ttsStatusUrl(hostname, port = TTS_PORT) {
  return `${ttsBaseUrl(hostname, port)}/tts/status`;
}

export function ttsAudioUrl(hostname, text, port = TTS_PORT) {
  return `${ttsBaseUrl(hostname, port)}/tts?text=${encodeURIComponent(String(text || '').trim())}`;
}

export function createSpeechOutput({ lang = 'fr-FR', rate = 1.15, pitch = 1.05, piperPlaybackRate = PIPER_PLAYBACK_RATE, getSynth, ttsBase, fetchImpl, AudioCtor } = {}) {
  const synthOf = () => {
    if (getSynth) return getSynth();
    if (typeof window !== 'undefined' && window.speechSynthesis) return window.speechSynthesis;
    return null;
  };
  const fetchFn = fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
  const AudioFn = AudioCtor || (typeof Audio !== 'undefined' ? Audio : null);

  const baseOf = () => {
    if (ttsBase) return String(ttsBase).replace(/\/$/, '');
    if (typeof location !== 'undefined' && location.hostname) return ttsBaseUrl(location.hostname);
    return '';
  };

  let currentUtterance = null;
  let currentAudio = null;
  let token = 0;
  let piperOk = null; // null = unknown

  const stopAudio = () => {
    if (!currentAudio) return;
    const a = currentAudio;
    currentAudio = null;
    try { a.onended = null; a.onerror = null; a.onplay = null; } catch (_) { /* ignore */ }
    try { a.pause(); a.removeAttribute && a.removeAttribute('src'); a.src = ''; } catch (_) { /* ignore */ }
  };

  const speakBrowser = (text, { onend, onstart } = {}, myToken) => {
    const synth = synthOf();
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      if (myToken === token && onend) onend();
      return false;
    }
    try { synth.cancel(); } catch (_) { /* ignore */ }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    u.pitch = pitch;
    const voice = pickFrenchVoice(synth.getVoices ? synth.getVoices() : []);
    if (voice) u.voice = voice;
    u.onend = () => { if (currentUtterance === u) currentUtterance = null; if (myToken === token && onend) onend(); };
    u.onerror = () => { if (currentUtterance === u) currentUtterance = null; if (myToken === token && onend) onend(); };
    if (onstart) u.onstart = onstart;
    currentUtterance = u;
    synth.speak(u);
    return true;
  };

  const probePiper = async () => {
    const base = baseOf();
    if (!base || !fetchFn) { piperOk = false; return false; }
    try {
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const t = setTimeout(() => { try { ctrl && ctrl.abort(); } catch (_) { /* ignore */ } }, 900);
      const r = await fetchFn(`${base}/tts/status`, ctrl ? { signal: ctrl.signal } : {});
      clearTimeout(t);
      if (!r.ok) { piperOk = false; return false; }
      const j = await r.json();
      piperOk = !!(j && j.ok);
      return piperOk;
    } catch (_) {
      piperOk = false;
      return false;
    }
  };

  const speakPiper = async (text, { onend, onstart } = {}, myToken) => {
    const base = baseOf();
    const r = await fetchFn(`${base}/tts?text=${encodeURIComponent(text)}`);
    if (!r.ok) throw new Error(`tts HTTP ${r.status}`);
    if (myToken !== token) { if (onend) onend(); return false; }
    const blob = await r.blob();
    if (myToken !== token) { if (onend) onend(); return false; }
    if (!AudioFn) throw new Error('no Audio');
    const url = URL.createObjectURL(blob);
    const audio = new AudioFn(url);
    try { audio.playbackRate = piperPlaybackRate; } catch (_) { /* ignore */ }
    currentAudio = audio;
    const finish = (ended) => {
      try { URL.revokeObjectURL(url); } catch (_) { /* ignore */ }
      if (currentAudio === audio) currentAudio = null;
      if (ended && myToken === token && onend) onend();
    };
    audio.onended = () => finish(true);
    audio.onerror = () => finish(true);
    if (onstart) audio.onplay = onstart;
    const played = audio.play();
    if (played && typeof played.then === 'function') await played;
    if (myToken !== token) {
      stopAudio();
      finish(false);
      return false;
    }
    return true;
  };

  const speak = (text, cbs = {}) => {
    const myToken = ++token;
    stopAudio();
    const synth = synthOf();
    if (synth) try { synth.cancel(); } catch (_) { /* ignore */ }

    const go = async () => {
      if (piperOk === null) await probePiper();
      if (myToken !== token) { if (cbs.onend) cbs.onend(); return; }
      if (piperOk) {
        try {
          await speakPiper(text, cbs, myToken);
          return;
        } catch (_) {
          // Fall back for this line; probe again next time in case Piper comes up later.
          piperOk = null;
        }
      }
      if (myToken !== token) { if (cbs.onend) cbs.onend(); return; }
      speakBrowser(text, cbs, myToken);
    };
    go();
    return true;
  };

  const cancel = () => {
    token += 1;
    stopAudio();
    currentUtterance = null;
    const synth = synthOf();
    if (synth) try { synth.cancel(); } catch (_) { /* ignore */ }
  };

  const primeVoices = () => {
    const synth = synthOf();
    if (synth && synth.getVoices) synth.getVoices();
    if (piperOk === null) probePiper();
  };

  return {
    speak,
    cancel,
    primeVoices,
    probePiper,
    piperStatus: () => piperOk,
    pickVoice: () => pickFrenchVoice((synthOf() && synthOf().getVoices && synthOf().getVoices()) || [])
  };
}
