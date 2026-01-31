// Maps OSM-style tags (used in scoring) to Overture categories
export const OSM_TO_OVERTURE: Record<string, string[]> = {
  // Groceries
  "shop=supermarket": ["supermarket", "grocery_store"],
  "shop=convenience": ["convenience_store"],
  "shop=grocery": ["grocery_store"],
  "shop=greengrocer": ["greengrocer", "farmers_market"],

  // Restaurants
  "amenity=restaurant": ["restaurant"],
  "amenity=cafe": ["cafe", "coffee_shop"],
  "amenity=fast_food": ["fast_food_restaurant"],
  "amenity=bar": ["bar", "pub"],

  // Transit
  // Note: Overture POI data only has major stations, not individual bus stops
  // For comprehensive transit coverage, consider adding GTFS or OSM transit data
  "railway=station": ["train_station", "subway_station", "metro_station"],
  "railway=halt": ["train_station"],
  "railway=tram_stop": ["tram_station", "light_rail_station"],
  "amenity=bus_station": ["bus_station", "bus_terminal"],
  "highway=bus_stop": ["bus_stop", "bus_station"], // Fallback to station since stops not in Overture
  "public_transport=stop_position": ["bus_stop", "bus_station", "train_station", "public_transportation"],
  "public_transport=platform": ["bus_stop", "bus_station", "train_station"],

  // Healthcare
  "amenity=hospital": ["hospital"],
  "amenity=clinic": ["medical_clinic", "urgent_care"],
  "amenity=pharmacy": ["pharmacy"],
  "amenity=doctors": ["doctor"],
  "amenity=dentist": ["dentist"],

  // Education
  "amenity=school": ["school"],
  "amenity=kindergarten": ["preschool", "daycare"],
  "amenity=university": ["university", "college"],
  "amenity=college": ["college"],
  "amenity=library": ["library"],

  // Parks & Recreation
  "leisure=park": ["park"],
  "leisure=playground": ["playground"],
  "leisure=garden": ["garden"],
  "leisure=sports_centre": ["sports_club", "recreation_center"],
  "leisure=fitness_centre": ["gym", "fitness_center"],

  // Shopping
  "shop=mall": ["shopping_mall"],
  "shop=clothes": ["clothing_store"],
  "shop=shoes": ["shoe_store"],
  "shop=department_store": ["department_store"],
  "shop=electronics": ["electronics_store"],

  // Entertainment
  // Updated with actual Overture category names from database
  "amenity=cinema": ["cinema", "movie_theater", "drive_in_theater"],
  "amenity=theatre": [
    "theatre",
    "performing_arts_theater",
    "theaters_and_performance_venues",
    "comedy_club",
  ],
  "amenity=nightclub": ["dance_club", "nightclub"],
  "leisure=bowling_alley": ["bowling_alley"],
  "tourism=museum": ["museum", "art_museum", "history_museum"],
};

export function osmTagsToOvertureCategories(tags: string[]): string[] {
  return tags.flatMap((tag) => OSM_TO_OVERTURE[tag] || []);
}

/** Maps an Overture category back to the best matching OSM tag from the given tags */
export function overtureCategoryToOsmTag(
  overtureCategory: string,
  availableTags: string[]
): string | null {
  for (const tag of availableTags) {
    const overtureCategories = OSM_TO_OVERTURE[tag];
    if (overtureCategories?.includes(overtureCategory)) {
      return tag;
    }
  }
  return null;
}

// Maps our category IDs to their OSM tag prefixes
const CATEGORY_TAG_PREFIXES: Record<string, string[]> = {
  groceries: ["shop=supermarket", "shop=convenience", "shop=grocery", "shop=greengrocer"],
  restaurants: ["amenity=restaurant", "amenity=cafe", "amenity=fast_food", "amenity=bar"],
  parks: ["leisure=park", "leisure=playground", "leisure=garden", "leisure=sports_centre", "leisure=fitness_centre"],
  transit: ["railway=station", "railway=halt", "railway=tram_stop", "amenity=bus_station", "highway=bus_stop", "public_transport=stop_position", "public_transport=platform"],
  healthcare: ["amenity=hospital", "amenity=clinic", "amenity=pharmacy", "amenity=doctors", "amenity=dentist"],
  education: ["amenity=school", "amenity=kindergarten", "amenity=university", "amenity=college", "amenity=library"],
  shopping: ["shop=mall", "shop=clothes", "shop=shoes", "shop=department_store", "shop=electronics"],
  entertainment: ["amenity=cinema", "amenity=theatre", "amenity=nightclub", "leisure=bowling_alley", "tourism=museum"],
};

// Build reverse mapping: overture category → our category ID
const OVERTURE_TO_CATEGORY_ID: Record<string, string> = {};
for (const [categoryId, tags] of Object.entries(CATEGORY_TAG_PREFIXES)) {
  for (const tag of tags) {
    const overtureCategories = OSM_TO_OVERTURE[tag] || [];
    for (const oc of overtureCategories) {
      OVERTURE_TO_CATEGORY_ID[oc] = categoryId;
    }
  }
}

/** Maps an Overture category to our category ID (groceries, restaurants, etc.) */
export function overtureCategoryToCategoryId(overtureCategory: string): string | null {
  return OVERTURE_TO_CATEGORY_ID[overtureCategory] || null;
}

/** Get all Overture categories for a list of our category IDs */
export function categoryIdsToOvertureCategories(categoryIds: string[]): string[] {
  const result: string[] = [];
  for (const categoryId of categoryIds) {
    const tags = CATEGORY_TAG_PREFIXES[categoryId] || [];
    for (const tag of tags) {
      const overtureCategories = OSM_TO_OVERTURE[tag] || [];
      result.push(...overtureCategories);
    }
  }
  return [...new Set(result)]; // dedupe
}
