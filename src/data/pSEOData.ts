export interface PseoPage {
  slug: string;
  cityName: string;
  climateType: string;
  seoTitle: string;
  seoDescription: string;
  localAdvice: string;
}

export const PSEO_LANDING_PAGES: PseoPage[] = [
  {
    slug: "skin-barrier-protection-los-angeles",
    cityName: "Los Angeles",
    climateType: "Arid / High UV",
    seoTitle: "Los Angeles Skin Barrier Protection | Skin Tight",
    seoDescription: "Protect your skin from LA's high UV index and low coastal humidity. Discover tailored skin health tracking tips.",
    localAdvice: "In Los Angeles, the combination of intense year-round UV radiation and fluctuating coastal winds quickly depletes the skin's natural moisture barrier. Balance your active retinoids or exfoliating acids by pairing them with ceramides and high-SPF mineral sunscreens during dry daytime cycles. Ensure you monitor suspicious moles regularly, as high UV exposure increases cell mutation risks."
  },
  {
    slug: "skin-barrier-protection-new-york",
    cityName: "New York",
    climateType: "Humid Continental / Seasonal",
    seoTitle: "NYC Seasonal Skin Barrier Advice | Skin Tight",
    seoDescription: "Navigate New York's harsh winters and humid summers. Track local environmental impacts on your skin barrier.",
    localAdvice: "New York City's climate demands a dual-strategy approach. During freezing, low-humidity winters, shield your barrier with rich occlusive moisturizers and skip harsh morning foaming cleansers. In stifling, humid summers, transition to lightweight hyaluronic acid gels to prevent pore congestion while maintaining a consistent protective moisture layer."
  },
  {
    slug: "skin-barrier-protection-miami",
    cityName: "Miami",
    climateType: "Tropical / Extreme Humidity",
    seoTitle: "Miami Tropical Skin Health Guide | Skin Tight",
    seoDescription: "Counter Miami's tropical humidity and persistent UV. Keep your skin barrier clear, protected, and balanced.",
    localAdvice: "Miami's high atmospheric humidity keeps the outermost skin layers hydrated, but the extreme heat and UV levels trigger excessive sebum production. Focus on non-comedogenic antioxidants like Vitamin C to combat environmental stressors and choose ultra-light fluid sunscreens. Keep a close eye on any new or changing spots exposed to the constant tropical sun."
  },
  {
    slug: "skin-barrier-protection-phoenix",
    cityName: "Phoenix",
    climateType: "Desert Extreme / Arid",
    seoTitle: "Phoenix Desert Skin Barrier Defense | Skin Tight",
    seoDescription: "Survive Phoenix's intense heat and zero-humidity air. Advanced tips for tracking skin hydration levels.",
    localAdvice: "Phoenix presents one of the most hostile environments for the skin barrier, characterized by extreme dry heat and minimal humidity. Standard moisturizers evaporate rapidly; you must layer hydrating humectants under dense, ceramide-rich emollient creams to lock in water. Minimize strong active peeling agents, as a compromised barrier is highly prone to inflammation here."
  },
  {
    slug: "skin-barrier-protection-atlanta",
    cityName: "Atlanta",
    climateType: "Humid Subtropical",
    seoTitle: "Atlanta Skin Health & Barrier Care | Skin Tight",
    seoDescription: "Manage Atlanta's pollen surges and humid climate. Guard your skin against local atmospheric allergens.",
    localAdvice: "Atlanta's subtropical environment brings intense humidity alongside heavy seasonal pollen counts, which can sensitize the skin barrier. Support your skin with soothing anti-inflammatory ingredients like niacinamide and centella asiatica. Always apply broad-spectrum sunscreen before embarking on outdoor activities under the dense Southern sun."
  },
  {
    slug: "skin-barrier-protection-chicago",
    cityName: "Chicago",
    climateType: "Cold Seasonal / Windy",
    seoTitle: "Chicago Windy City Skin Care Guide | Skin Tight",
    seoDescription: "Defend your skin barrier against Chicago's biting winter winds and low indoor humidity.",
    localAdvice: "Chicago's famous biting winds strip moisture directly from exposed facial skin, leading to micro-tears and windburn. Implement a dense lipid-replacement barrier cream before stepping outdoors during chilly seasons. Utilize a cool-mist humidifier indoors to offset dry radiator heating and maintain healthy skin-barrier elasticity."
  },
  {
    slug: "skin-barrier-protection-seattle",
    cityName: "Seattle",
    climateType: "Cool Marine / Low UV",
    seoTitle: "Seattle Cool Marine Skin Hydration | Skin Tight",
    seoDescription: "Keep skin radiant in Seattle's misty, low-UV climate. Balanced barrier protection for rainy days.",
    localAdvice: "Seattle's constant misty dampness provides consistent ambient humidity, but the low ambient UV levels often tempt residents to neglect sunscreen. UV rays still penetrate overcast clouds and damage deep cellular structures. Use a gentle, hydrating cleanser and lightweight humectants to support healthy moisture levels in this cool, maritime climate."
  },
  {
    slug: "skin-barrier-protection-denver",
    cityName: "Denver",
    climateType: "High Altitude / Semi-Arid",
    seoTitle: "Denver High-Altitude Skin Defense | Skin Tight",
    seoDescription: "Combat intense UV rays and dry air at high elevation in Denver. Track skin changes and spot safety.",
    localAdvice: "Denver's mile-high altitude means the atmosphere is thinner, filtering out less solar radiation and resulting in significantly higher UV intensity. Combined with semi-arid air, your skin barrier dehydrates and burns far more easily. Commit to daily physical sunscreen application, reapply every two hours, and use rich barrier repair serums containing squalane."
  },
  {
    slug: "skin-barrier-protection-san-francisco",
    cityName: "San Francisco",
    climateType: "Cool Marine / Microclimates",
    seoTitle: "San Francisco Coastal Skin Care | Skin Tight",
    seoDescription: "Navigate SF's cool fog and coastal winds. Protect your skin barrier against maritime dryness.",
    localAdvice: "San Francisco's microclimates and brisk ocean winds can trigger sudden skin dehydration and sensitivity. Protect your face from wind-induced barrier disruption by using soothing barrier balms. Do not let the cool marine fog fool you; up to 80% of UV rays penetrate fog, making consistent sun tracking and protection vital."
  },
  {
    slug: "skin-barrier-protection-boston",
    cityName: "Boston",
    climateType: "Humid Continental / Coastal",
    seoTitle: "Boston Coastal Skin Barrier Care | Skin Tight",
    seoDescription: "Adapt your skincare routine to Boston's coastal humidity and freezing marine winter cycles.",
    localAdvice: "Boston's coastal location brings high summer humidity followed by freezing, dry winters. This dramatic temperature swing can leave your skin barrier confused and sensitised. Transition to heavier, barrier-reinforcing creams in autumn, and use mild salicylic acid cleansers in humid summers to sweep away sweat without stripping essential lipids."
  },
  {
    slug: "skin-barrier-protection-dallas",
    cityName: "Dallas",
    climateType: "Humid Subtropical / High Heat",
    seoTitle: "Dallas Sun & Humidity Skin Tracker | Skin Tight",
    seoDescription: "Shield your skin barrier from intense Texas heat and UV surges. Localized dermatological tips.",
    localAdvice: "Dallas summers deliver intense, prolonged heatwaves that compromise skin hydration via excessive sweating and high UV indices. Counteract this by choosing oil-free, non-comedogenic hydrators containing glycerin and hyaluronic acid. Perform routine skin evaluations on your limbs and neck, which get high exposure during hot Texas days."
  },
  {
    slug: "skin-barrier-protection-las-vegas",
    cityName: "Las Vegas",
    climateType: "Hot Desert / Extreme Dry",
    seoTitle: "Las Vegas Desert Skin Protection | Skin Tight",
    seoDescription: "Rehydrate and protect your skin in Las Vegas's high-heat, zero-humidity desert landscape.",
    localAdvice: "Las Vegas has an incredibly dry, moisture-depleting desert climate that acts as a vacuum for skin moisture, causing premature cracking and sensitivity. Avoid harsh physical scrubs or strong chemical exfoliants. Instead, drench your skin in lipid-restoring ointments and multi-weight hyaluronic acid complexes to prevent transepidermal water loss."
  },
  {
    slug: "skin-barrier-protection-minneapolis",
    cityName: "Minneapolis",
    climateType: "Extreme Continental / Cold",
    seoTitle: "Minneapolis Cold Climate Skin Care | Skin Tight",
    seoDescription: "Guard against Minneapolis's freezing dry sub-zero winters. Dynamic moisture tracking tips.",
    localAdvice: "Minneapolis winters bring sub-zero temperatures and bone-dry indoor heating that severely damage the skin's lipid barrier, leading to eczema and flaking. Switch to a thick, ointment-based balm or cream containing panthenol, colloidal oatmeal, and shea butter. Avoid taking scalding hot showers, which further strip protective skin oils."
  },
  {
    slug: "skin-barrier-protection-houston",
    cityName: "Houston",
    climateType: "Gulf Coastal / High Humidity",
    seoTitle: "Houston Gulf Coast Skin Guide | Skin Tight",
    seoDescription: "Protect and clarify your skin in Houston's intense Gulf Coast humidity and hot climate.",
    localAdvice: "Houston's extreme Gulf Coast humidity means your skin is constantly damp with sweat, raising the risk of fungal acne and clogged pores. Use gentle, pH-balanced foaming cleansers and lightweight, gel-based moisturizers. Keep sun protection a non-negotiable priority since the Southern UV index remains elevated for most of the year."
  },
  {
    slug: "skin-barrier-protection-salt-lake-city",
    cityName: "Salt Lake City",
    climateType: "High Altitude / Dry Arid",
    seoTitle: "Salt Lake City Elevated Skin Hydration | Skin Tight",
    seoDescription: "Maintain skin barrier health under Salt Lake City's dry alpine air and high sun exposure.",
    localAdvice: "Salt Lake City's combination of elevated altitude and dry mountain air leaves the skin barrier highly susceptible to dehydration. Strengthen your skin with ceramides and cholesterol-rich creams to seal in moisture. Always apply high-protection SPF before heading into the mountains, where UV levels increase exponentially with elevation."
  }
];
