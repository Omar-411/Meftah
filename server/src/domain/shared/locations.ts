export interface City {
  readonly id: string;
  readonly label: string;
  readonly region: string;
}

export const CITIES: readonly City[] = [
  { id: "la-marsa", label: "La Marsa", region: "Grand Tunis" },
  { id: "carthage", label: "Carthage", region: "Grand Tunis" },
  { id: "sidi-bou-said", label: "Sidi Bou Saïd", region: "Grand Tunis" },
  { id: "gammarth", label: "Gammarth", region: "Grand Tunis" },
  { id: "berges-du-lac", label: "Les Berges du Lac", region: "Grand Tunis" },
  { id: "ennasr", label: "Ennasr (Ariana)", region: "Grand Tunis" },
  { id: "la-soukra", label: "La Soukra", region: "Grand Tunis" },
  { id: "hammamet", label: "Hammamet", region: "Nabeul" },
  { id: "sousse", label: "Sousse", region: "Sahel" },
];

export function findCity(id: string): City | undefined {
  return CITIES.find((city) => city.id === id);
}

export function cityLabel(id: string): string {
  return findCity(id)?.label ?? id;
}
