// Palette alpine centralisée (Villard-Reculas / Oisans) — couleurs inspirées des photos aériennes IGN
// Échantillonnage des ortho-*.webp : prés vert-jaune, forêts sombres, roches grises, neige blanche
export const PALETTE = {
  terrain: {
    meadow: 0x7a9f4a, meadow2: 0x92b060,   // prés alpins (vert-jaune d'été, échantillonné IGN)
    forest: 0x2d4428, forest2: 0x3f5838,   // forêts de conifères sombres (épicéas/mélèzes)
    rock: 0x8c8780, rock2: 0x5a5c58,       // roches calcaires/schiste (gris moyen à sombre)
    snow: 0xf4f7fb, snowShade: 0xd8e0ea,   // neige avec ombres bleutées
    water: 0x4d7a83, water2: 0x365860,     // lac du Verney (bleu-vert foncé)
    shore: 0x8b8d89,                       // gravier/marnage (gris neutre)
    village: 0xa09b72,                     // terre/chemins de village (ocre-gris)
  },
  chalet: {
    woodTints: [0xa8672f, 0x5a3a22, 0x8a5530, 0xb07a45], // bois miel / brun (texture madriers neutre × teinte)
    roofTints: [0x52565e, 0x4a4e55, 0x5a5852],           // ardoise #3b3f45 (texture claire × teinte)
    render: 0xd8cfc0,                                    // crépi beige du rez-de-chaussée
    garage: 0xb5652d,                                    // portes de garage en planches orange-brun
    solar: 0x1b2430,                                     // panneaux solaires
    shutters: [0x3f6b45, 0x2f5a3a, 0x7a2f28],            // volets par variante
  },
  road: { asphalt: 0x6b6e73, verge: 0x7c8a45, wall: 0x8f8a80, rail: 0xa9adb0, dam: 0x9a9c98 },
  lakeSurface: 0x4f7b84,
  leafy: [0x5f7f32, 0x6b8a38, 0x4f7030, 0x7a9440, 0x587a36], // feuillus d'été (verts)
};
