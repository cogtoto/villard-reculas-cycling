// Le Commentateur — optional live race commentary (Web Speech API, French).
// Spoken only; no banners. Lightweight: no audio files, no network.
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
    "Et c'est parti pour Vincent ! Le compteur tourne, on y va !",
    "Allez Vincent, on s'élance, ça va être un bel effort !",
    "Le départ est donné, Vincent est déjà dans le rythme, quel plaisir !",
    "C'est parti mon kiki ! Vincent met le pied sur la pédale, on attaque la route !",
    "Et ho, ça s'élance ! Vincent, on va pas y aller avec le dos de la cuillère !",
    "Le peloton imaginaire est lâché, Vincent prend les devants dès le départ !",
    "Ça y est, on roule ! Vincent, les jambes sont chaudes, ça promet !",
    "Départ lancé pour Vincent, on sent déjà l'envie dans les pédales !",
    "Et c'est un départ canon pour Vincent, il est déjà dedans !",
    "Allez, on embarque Vincent, ça va chanter dans les jambes !",
    "Le ride est lancé, Vincent, tiens bien le guidon, ça va bouger !"
  ],
  startVillard: [
    "Et c'est parti du barrage du Verney ! Vincent, direction Villard-Reculas, ça va grimper !",
    "Départ au sommet du barrage d'Allemond, Vincent s'élance vers le 7 rue Nouvelle !",
    "Au-dessus du lac, Vincent met le braquet, les lacets de Villard l'attendent !",
    "C'est parti de l'Eau d'Olle, Vincent, on quitte Allemond, ça va être un vrai numéro !",
    "Vincent s'élance du barrage du Verney, 700 mètres de D+ dans les pattes, allez !",
    "Le départ est donné au barrage, Vincent, Villard-Reculas est tout là-haut !",
    "On quitte le Verney, Vincent, accroche-toi, la route d'Oisans n'est pas un long fleuve tranquille !",
    "Allez Vincent, du barrage jusqu'au chalet, ça va faire mal, et c'est tant mieux !",
    "Départ d'Allemond, Vincent est déjà sur le grand plateau, ça sent la bagarre avec la pente !",
    "C'est parti pour l'Oisans, Vincent, le barrage est derrière, la montagne devant !",
    "Et ho, Vincent s'échappe déjà au départ du Verney, quelle entrée en matière !"
  ],
  startNormandy: [
    "Et c'est parti dans le bocage ! Vincent, la Normandie va se laisser dévorer !",
    "Départ en campagne, Vincent, ça va rouler, ça sent bon le bitume normand !",
    "Vincent s'élance dans l'Eure, les haies défilent déjà, quel décor !",
    "C'est parti pour Grand-Camp, Vincent, les jambes vont parler dans le faux-plat !",
    "Allez Vincent, la route de Normandie est à toi, mets-y une petite plaque dès le départ !",
    "Le départ est donné en plaine, Vincent, ça va vite, ça va claquer !",
    "Vincent embarque dans le bocage, on sent qu'il a envie d'en découdre !",
    "Et c'est un départ allègre pour Vincent, la campagne s'ouvre devant lui !",
    "Ça roule en Normandie, Vincent, tiens le rythme, ça va se jouer à la relance !",
    "C'est parti mon Vincent, les vaches te regardent passer, alors fais-leur un numéro !",
    "Départ lancé, Vincent, le vent du pays d'Ouche est avec toi, on espère !"
  ],
  attack: [
    "Vincent met une plaque ! Quelle relance !",
    "Oh la la, il attaque ! Vincent met le feu aux pédales !",
    "Quelle relance de Vincent ! Il n'y va pas avec le dos de la cuillère !",
    "Il met une denture, Vincent, ça s'envole !",
    "Et il attaque, le voilà qui met le braquet, quel numéro !",
    "Vincent fait le trou, il met une plaque de malade !",
    "Ça décolle ! Vincent relance comme un pro, chapeau !",
    "Il passe à l'attaque, Vincent, les watts s'affolent !",
    "Quelle fièvre dans les jambes, Vincent met le paquet !",
    "Il relance à bloc, Vincent, ça c'est une vraie accélération !",
    "Et hop, Vincent met une plaque, le compteur s'emballe, c'est beau !",
    "Il va chercher trop loin ? Non, Vincent assume, quelle attaque !"
  ],
  zoneRed: [
    "Vincent est dans le rouge, ça va taper !",
    "Il passe en zone cinq, les jambes vont crier, Vincent !",
    "Là, Vincent, c'est le braquet de la souffrance, il est à bloc !",
    "Ça y est, il entre dans la zone à risques, Vincent n'a plus de marge !",
    "Il met le moteur en surrégime, Vincent, ça fait mal et il aime ça !",
    "Attention, Vincent est dans le dur, le rouge est allumé !",
    "Il danse déjà près de la rupture, Vincent, quel courage !",
    "C'est l'effort violent, Vincent serre les dents, ça va piquer !",
    "Les watts sont trop hauts pour durer, mais Vincent y va quand même, mon champion !",
    "Il est dans le vif, Vincent, plus question de blaguer, c'est du sérieux !",
    "Le compteur s'affole, Vincent est passé de l'autre côté, dans le très dur !"
  ],
  struggle: [
    "Il est dans le dur, Vincent, ça fait mal aux jambes !",
    "La cadence tombe, Vincent lutte, il est en train de se faire un mal de chien !",
    "Ça grimpe, ça grimpe, et Vincent est dans le dur, allez, accroche !",
    "Les jambes sont lourdes, Vincent, on le sent, il souffre mais il avance !",
    "Il est à la peine, Vincent, petite cadence, grande volonté !",
    "Ça fait mal aux pattes, Vincent, c'est le moment de serrer les dents !",
    "Il lutte contre la pente, Vincent, il n'y a plus de secret, c'est dur !",
    "La cadence s'écroule un peu, Vincent est dans le dur, mais il ne lâche rien !",
    "On l'entend souffler d'ici, Vincent, ça brûle, ça brûle !",
    "Il est au tas, Vincent, les jambes demandent grâce, et pourtant il continue !",
    "C'est le moment où ça fait mal, Vincent, tient bon le guidon, ça va passer !"
  ],
  steep: [
    "Attention, ça se cabre ! Les pourcentages s'envolent !",
    "Ça se redresse, Vincent, plus de 8 %, ça va piquer !",
    "La route se met à danser, ça grimpe sérieusement, Vincent !",
    "Oh là, ça se verticalise, Vincent, tiens le braquet !",
    "Le ruban d'asphalte se cabre, Vincent, ça va faire mal aux jambes !",
    "Ça casse, ça casse, Vincent, les pourcents passent en revue !",
    "Là, la pente se fait méchante, Vincent, bienvenue dans le dur !",
    "Ça se lève d'un coup, Vincent, il va falloir danser sur les pédales !",
    "Les pourcentages s'enflamment, Vincent, c'est pas le moment de regarder le paysage !",
    "Ça grimpe tout à coup, Vincent, mets une petite dent, ça va tirer !",
    "La route prend de l'altitude, Vincent, accroche-toi, ça va chantourner !"
  ],
  km: [
    "Kilomètre {km}, Vincent est toujours en selle, ça roule !",
    "Et voilà le kilomètre {km}, Vincent, le rythme est là !",
    "Kilomètre {km} pour Vincent, il tient son affaire, chapeau !",
    "On passe le {km}, Vincent, ça avance, ça avance !",
    "Kilomètre {km}, les jambes de Vincent répondent toujours présent !",
    "Encore un bornage, le {km} pour Vincent, il est propre dans l'effort !",
    "Kilomètre {km}, Vincent, on ne le lâche pas d'une semelle, quel rythme !",
    "Le {km} est dans la poche, Vincent, ça fait plaisir à voir !",
    "Kilomètre {km}, Vincent gère, il a l'air d'avoir encore de la marge !",
    "Et on pointe le kilomètre {km}, Vincent, belle régularité !",
    "Kilomètre {km} déjà, Vincent, le temps passe vite quand on pédale comme ça !"
  ],
  kmRemaining: [
    "Plus que {remain} kilomètres, Vincent, ça va se jouer maintenant !",
    "Encore {remain} kilomètres, Vincent, il va falloir gérer la fin !",
    "Il reste {remain} kilomètres, Vincent, ne te relâche pas !",
    "Plus que {remain} bornes, Vincent, le plus dur peut encore arriver !",
    "Encore {remain} kilomètres à avaler, Vincent, allez, on prolonge l'effort !",
    "Ça se rapproche, plus que {remain} kilomètres, Vincent est lancé !",
    "Il en reste {remain}, Vincent, c'est maintenant que ça compte !",
    "Encore {remain} kilomètres, les jambes de Vincent doivent tenir le choc !",
    "Plus que {remain} kilomètres, Vincent, la ligne se dessine tout là-bas !",
    "Il reste {remain} bornes, Vincent, serrez, serrez, ça va passer !",
    "Encore {remain} kilomètres, Vincent, on n'est plus très loin de la maison !"
  ],
  intervalHard: [
    "C'est le morceau dur, maintenant ! Vincent, serre les dents !",
    "L'intervalle sérieux commence, Vincent, il va falloir mettre une plaque !",
    "Ça démarre l'effort, Vincent, on n'est plus là pour se regarder le paysage !",
    "Morceau difficile pour Vincent, allez, on entre dans le dur !",
    "C'est le moment de tout mettre, Vincent, l'intervalle est lancé !",
    "Effort lancé, Vincent, ça va taper, et c'est tant mieux !",
    "On attaque le dur, Vincent, danse sur les pédales si ça passe !",
    "L'intervalle de feu, Vincent, les watts vont parler !",
    "Ça va être un vrai numéro, Vincent, accroche-toi à ce palier !",
    "Le dur est là, Vincent, pas de cadeau, on y va à fond mais juste !",
    "C'est parti pour l'effort, Vincent, il est dans le vif du sujet !"
  ],
  intervalRecovery: [
    "Récup, Vincent, on souffle un peu, on relâche les épaules !",
    "Ça souffle, Vincent, profite de la récup, les jambes te remercieront !",
    "On dégrafe un peu, Vincent, récup active, on ne s'arrête pas !",
    "Belle récup pour Vincent, on roule léger, on prépare la suite !",
    "Souffle, Vincent, la récup est là, relâche les poignets, ça va revenir !",
    "On pose un peu les armes, Vincent, mais on reste en mouvement !",
    "Récupération, Vincent, c'est le moment de boire et de souffler !",
    "Ça retombe, Vincent, profite, le prochain effort n'est pas loin !",
    "On allège, Vincent, les battements redescendent, c'est bien géré !",
    "Petite récup pour Vincent, il l'a bien méritée, ce morceau-là !",
    "On roule en souplesse, Vincent, la récup, c'est encore de l'effort intelligent !"
  ],
  hrHigh: [
    "Le cœur s'emballe, Vincent est à fond de la boîte !",
    "Ça pulse, Vincent, le cœur est lancé, attention à ménager la fin !",
    "Le cardio s'affole, Vincent, il est vraiment dedans !",
    "Oh le cœur de Vincent, ça tape, ça tape, quel engagement !",
    "Les battements s'envolent, Vincent est à bloc, chapeau l'artiste !",
    "Le cœur est en train de jouer du tambour, Vincent, tu es à fond !",
    "Ça chauffe sous le maillot, Vincent, le cardio dit que c'est sérieux !",
    "Vincent, le cœur est haut, il faudra doser, mais quel courage !",
    "Les pulsations s'affolent, Vincent n'a plus beaucoup de marge !",
    "Le cœur est en zone rouge, Vincent, tiens bon, ça passe ou ça casse !",
    "Ça bat très fort, Vincent, on le sent, il est dans un effort de tous les diables !"
  ],
  last500: [
    "Plus que cinq cents mètres, Vincent, la ligne est là, allez !",
    "Cinq cents mètres, Vincent, c'est le sprint de la vérité !",
    "On y est presque, Vincent, plus que cinq cents mètres, mets une plaque !",
    "Derniers cinq cents mètres, Vincent, ne te relâche surtout pas !",
    "La ligne se rapproche, cinq cents mètres, Vincent, un dernier coup de rein !",
    "Plus que cinq cents mètres, Vincent, ça se joue maintenant !",
    "Le final, Vincent, cinq cents mètres, danse sur les pédales !",
    "Cinq cents mètres, les jambes peuvent crier, Vincent, on va au bout !",
    "C'est le moment, Vincent, plus que cinq cents mètres, quelle arrivée en vue !",
    "Dernière ligne droite pour ainsi dire, Vincent, cinq cents mètres, allez !",
    "Plus que cinq cents mètres, Vincent, tu tiens le bon bout, lâche rien !"
  ],
  last500Villard: [
    "Plus que cinq cents mètres, le chalet est en vue, Vincent, allez !",
    "Le 7 rue Nouvelle approche, cinq cents mètres, Vincent, quelle arrivée !",
    "On sent déjà le village, Vincent, plus que cinq cents mètres jusqu'au chalet !",
    "Cinq cents mètres, Villard-Reculas est là, Vincent, un dernier effort !",
    "Le chalet se dessine, Vincent, cinq cents mètres, mets le braquet !",
    "Plus que cinq cents mètres vers la maison, Vincent, ça va être beau !",
    "La rue Nouvelle est tout près, Vincent, cinq cents mètres, lâche rien !",
    "On rentre dans le final de Villard, Vincent, cinq cents mètres, quelle relance s'il en reste !",
    "Le toit du chalet n'est plus très loin, Vincent, encore cinq cents mètres !",
    "Cinq cents mètres, Vincent, tu rentres à la maison, fais-le en beauté !",
    "Derniers cinq cents mètres pour le 7 rue Nouvelle, Vincent, c'est ton arrivée !"
  ],
  finish: [
    "Arrivée de Vincent ! Quel numéro, il est allé au bout !",
    "Et c'est fini, Vincent a tenu, chapeau l'artiste !",
    "Ligne d'arrivée, Vincent, les bras en l'air, ça c'est une belle page !",
    "Vincent franchit la ligne, quel courage, il n'a rien lâché !",
    "Arrivée, arrivée, Vincent est au bout de son effort, bravo !",
    "C'est plié, Vincent, tu l'as fait, les jambes peuvent souffler !",
    "Et il arrive, Vincent, quelle leçon de pugnacité !",
    "La ligne est passée, Vincent, tu peux relâcher, c'était grand !",
    "Terminé pour Vincent, il est allé chercher loin, chapeau bas !",
    "Arrivée de Vincent, le compteur s'arrête, le sourire peut revenir !",
    "C'est fini, Vincent, tu as tenu le choc, quel bel effort !"
  ],
  finishVillard: [
    "Arrivée au 7 rue Nouvelle ! Vincent est à la maison, quel numéro !",
    "Et il rentre au chalet, Vincent, 7 rue Nouvelle, Villard-Reculas, bravo l'artiste !",
    "Le chalet, le voilà ! Vincent franchit l'arrivée, il est à la maison !",
    "Arrivée à Villard-Reculas, au 7 rue Nouvelle, Vincent a gravi la montagne !",
    "C'est fini au pied du chalet, Vincent, quelle ascension, chapeau !",
    "Vincent pose le pied au 7 rue Nouvelle, les lacets sont derrière, quel exploit !",
    "Le 7 rue Nouvelle accueille Vincent, arrivée au sommet, c'est magnifique !",
    "Il rentre à la maison, Vincent, Villard-Reculas, le chalet, l'arrivée, bravo !",
    "Arrivée au chalet ! Vincent, tu peux souffler, tu l'as cherchée loin celle-là !",
    "7 rue Nouvelle, c'est l'arrivée, Vincent a tenu du barrage jusqu'ici, quel numéro !",
    "Et voilà le chalet, Vincent est arrivé, Villard-Reculas lui appartient aujourd'hui !"
  ],
  verney: [
    "On quitte le barrage du Verney, Vincent, direction les hauteurs !",
    "Le lac est derrière, Vincent, Allemond s'éloigne, la route s'élève !",
    "Au revoir le Verney, Vincent, maintenant ça va parler montant !",
    "Vincent laisse le barrage, l'Oisans s'ouvre, ça va être un bel ouvrage !",
    "On s'éloigne du Verney, Vincent, les premiers pourcents sont déjà là !",
    "Allemond recule dans le rétro, Vincent, le vrai col commence ici !",
    "Le barrage du Verney est dans le dos, Vincent, accroche-toi, ça grimpe !",
    "Vincent s'extrait du Verney, la D 526 va lui demander des comptes !",
    "On dit adieu au lac, Vincent, place à la route d'en haut !",
    "Le Verney s'éloigne, Vincent, ça sent déjà la vraie côte d'Oisans !",
    "Départ du barrage bien lancé, Vincent, Allemond te souhaite un bon effort !"
  ],
  lacets: [
    "Les lacets, les voilà ! Vincent danse sur les pédales !",
    "Ça serpente, ça serpente, Vincent, les lacets de Villard, quel spectacle !",
    "Vincent est dans les lacets, il danse sur les pédales, ça c'est de l'art !",
    "Les épingles s'enchaînent, Vincent, il va falloir relancer à chaque fois !",
    "Dans les lacets, Vincent, un coup à droite, un coup à gauche, ça fait mal aux jambes !",
    "Il aborde les lacets, Vincent, c'est le moment de danser sur les pédales !",
    "Quelle série de lacets, Vincent, il met le braquet et ça passe !",
    "Les virages en épingle, Vincent est dedans, il relance, quelle vue !",
    "Ça s'enroule, Vincent, les lacets le font souffrir et le font briller !",
    "Vincent dans les lacets, il n'y va pas molle, ça se voit d'ici !",
    "Les lacets de l'Oisans, Vincent, c'est là qu'on reconnaît les combattants !"
  ],
  villardVillage: [
    "Villard-Reculas, on entre dans le village, Vincent, quelle arrivée en vue !",
    "Le village, le voilà, Vincent, Villard-Reculas t'ouvre la porte !",
    "On rentre dans Villard-Reculas, Vincent, le chalet n'est plus très loin !",
    "Villard-Reculas, Vincent, les toits se rapprochent, ça sent l'arrivée !",
    "Le panneau du village, Vincent, tu es dans Villard-Reculas, quel moment !",
    "On déboule dans Villard, Vincent, les chalets t'accompagnent jusqu'au bout !",
    "Villard-Reculas, Vincent, tu y es, plus qu'à rejoindre la rue Nouvelle !",
    "Le village est là, Vincent, Villard-Reculas, tu l'as mérité celle-là !",
    "On entre à Villard-Reculas, Vincent, les jambes peuvent déjà sourire !",
    "Villard-Reculas t'accueille, Vincent, encore un filet d'effort, le chalet arrive !",
    "Le voici le village, Vincent, Villard-Reculas, c'est bientôt la maison !"
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

export function createSpeechOutput({ lang = 'fr-FR', rate = 1.15, pitch = 1.05, getSynth } = {}) {
  const synthOf = () => {
    if (getSynth) return getSynth();
    if (typeof window !== 'undefined' && window.speechSynthesis) return window.speechSynthesis;
    return null;
  };

  let current = null;

  const speak = (text, { onend, onstart } = {}) => {
    const synth = synthOf();
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      if (onend) onend();
      return false;
    }
    try { synth.cancel(); } catch (_) { /* ignore */ }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    u.pitch = pitch;
    const voice = pickFrenchVoice(synth.getVoices ? synth.getVoices() : []);
    if (voice) u.voice = voice;
    u.onend = () => { if (current === u) current = null; if (onend) onend(); };
    u.onerror = () => { if (current === u) current = null; if (onend) onend(); };
    if (onstart) u.onstart = onstart;
    current = u;
    synth.speak(u);
    return true;
  };

  const cancel = () => {
    current = null;
    const synth = synthOf();
    if (synth) try { synth.cancel(); } catch (_) { /* ignore */ }
  };

  const primeVoices = () => {
    const synth = synthOf();
    if (synth && synth.getVoices) synth.getVoices();
  };

  return { speak, cancel, primeVoices, pickVoice: () => pickFrenchVoice((synthOf() && synthOf().getVoices && synthOf().getVoices()) || []) };
}
