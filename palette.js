// Palette alpine centralisée (Villard-Reculas / Oisans) — point d'entrée unique pour caler les couleurs
// sur des références photo (Street View). Modifier ici : terrain, chalets, route.
export const PALETTE = {
  terrain: {
    meadow: 0x6f9a45, meadow2: 0x8fae55,   // prés verts d'été
    forest: 0x2f4f2c, forest2: 0x41613a,   // sous-bois de résineux
    rock: 0x8a857c, rock2: 0x3a3d42,       // calcaire / coupes de roche sombres
    snow: 0xf3f6fa, snowShade: 0xd6dde8,
    water: 0x4f7b84, water2: 0x34585f,     // lac du Verney (Street View)
    shore: 0x8a8c88,                       // bande de gravier (marnage)
    village: 0x9c9a70,
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
