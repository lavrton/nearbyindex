import type { CategoryDefinition } from "./types";

// Higher maxCount = harder to reach top scores
// The logarithmic scoring means first few POIs matter most
export const categories: CategoryDefinition[] = [
  {
    id: "groceries",
    weight: 1.5,
    radius: 800,        // Tighter radius - must be walkable
    minCount: 1,
    maxCount: 10,       // Need many options for high score
    overpassTags: [
      "shop=supermarket",
      "shop=convenience",
      "shop=grocery",
      "shop=greengrocer",
    ],
  },
  {
    id: "restaurants",
    weight: 1.0,
    radius: 600,        // Tighter - real walkability
    minCount: 3,
    maxCount: 25,       // Dense urban = lots of restaurants
    overpassTags: [
      "amenity=restaurant",
      "amenity=cafe",
      "amenity=fast_food",
      "amenity=bar",
    ],
  },
  {
    id: "transit",
    weight: 1.5,
    radius: 500,        // Transit should be CLOSE
    minCount: 1,
    maxCount: 8,
    overpassTags: [
      "highway=bus_stop",
      "railway=station",
      "railway=halt",
      "railway=tram_stop",
      "amenity=bus_station",
      "public_transport=stop_position",
      "public_transport=platform",
    ],
  },
  {
    id: "healthcare",
    weight: 1.2,
    radius: 1500,       // Healthcare can be a bit further
    minCount: 1,
    maxCount: 6,
    overpassTags: [
      "amenity=pharmacy",
      "amenity=hospital",
      "amenity=clinic",
      "amenity=doctors",
      "amenity=dentist",
    ],
  },
  {
    id: "education",
    weight: 1.0,
    radius: 1200,
    minCount: 1,
    maxCount: 5,
    overpassTags: [
      "amenity=school",
      "amenity=kindergarten",
      "amenity=university",
      "amenity=college",
      "amenity=library",
    ],
  },
  {
    id: "parks",
    weight: 1.0,
    radius: 800,
    minCount: 1,
    maxCount: 5,
    overpassTags: [
      "leisure=park",
      "leisure=garden",
      "leisure=playground",
      "leisure=sports_centre",
      "leisure=fitness_centre",
    ],
  },
  {
    id: "shopping",
    weight: 0.8,
    radius: 800,
    minCount: 2,
    maxCount: 15,
    overpassTags: [
      "shop=clothes",
      "shop=shoes",
      "shop=department_store",
      "shop=mall",
      "shop=electronics",
    ],
  },
  {
    id: "entertainment",
    weight: 0.6,
    radius: 1200,
    minCount: 1,
    maxCount: 8,
    overpassTags: [
      "amenity=cinema",
      "amenity=theatre",
      "amenity=nightclub",
      "leisure=bowling_alley",
      "tourism=museum",
    ],
  },
];

export function getCategoryById(id: string): CategoryDefinition | undefined {
  return categories.find((c) => c.id === id);
}
