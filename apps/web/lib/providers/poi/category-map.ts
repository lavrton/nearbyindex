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
  "railway=station": ["train_station", "subway_station"],
  "railway=halt": ["train_station"],
  "railway=tram_stop": ["tram_station"],
  "amenity=bus_station": ["bus_station"],
  "highway=bus_stop": ["bus_stop"],
  "public_transport=stop_position": ["bus_stop", "train_station"],
  "public_transport=platform": ["bus_stop", "train_station"],

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
  "amenity=cinema": ["movie_theater"],
  "amenity=theatre": ["performing_arts_theater"],
  "amenity=nightclub": ["nightclub"],
  "leisure=bowling_alley": ["bowling_alley"],
  "tourism=museum": ["museum"],
};

export function osmTagsToOvertureCategories(tags: string[]): string[] {
  return tags.flatMap((tag) => OSM_TO_OVERTURE[tag] || []);
}
