/**
 * The prompts and artwork behind the empty state's explore grid.
 *
 * Media is served from the platform's own CDN at the URLs the reference uses, so the grid is the
 * one the reference shows rather than an approximation of it. Two hosts appear because the CDN is
 * partitioned by age — newer assets answer on `galaxy-prod`, older ones on `galaxyai` — and a host
 * serves only its own half.
 *
 * A card carries the artwork's intrinsic size so the masonry can reserve each tile's height before
 * anything loads. Without it the column heights are unknown until the images arrive and the grid
 * reshuffles under the pointer.
 */
export type TemplateCategory =
  | "Viral Video Formats"
  | "Video Special Effects"
  | "Content Creation"
  | "Branding & Design"
  | "Image & Editing";

export type Template = {
  id: string;
  title: string;
  description: string;
  prompt: string;
  categories: readonly TemplateCategory[];
  width: number;
  height: number;
  /** The still the card shows at rest, and the poster frame for a clip. */
  poster: string;
  /** Present only on video cards: the short loop played while the pointer is over the card. */
  clip?: string;
};

export const TEMPLATE_CATEGORIES: readonly TemplateCategory[] = [
  "Viral Video Formats",
  "Video Special Effects",
  "Content Creation",
  "Branding & Design",
  "Image & Editing",
];

const PROD = "https://galaxy-prod.tlcdn.com";
const AI = "https://galaxyai.tlcdn.com";
const EXAMPLES = "galaxymainsiteexamples/explore_ideas";

const still = (host: string, file: string) => `${host}/preview-assets/image/${EXAMPLES}/${file}`;
const frame = (file: string, host: string = PROD) =>
  `${host}/original-assets/image/${EXAMPLES}/thumbnails/${file}`;
const clip = (host: string, id: string) =>
  `${host}/original-assets/video/${EXAMPLES}/previews/${id}.mp4`;
/** A handful of cards point at a tool's own output rather than a curated capture. */
const generated = (file: string) => `${AI}/gen/image/${EXAMPLES}/${file}`;

export const TEMPLATES: readonly Template[] = [
  {
    id: "collectible-stamp-sheet",
    title: "Collectible Stamp Sheet",
    description: "Design a postage-stamp collection for your favorite city",
    prompt:
      "Create a premium commemorative postage-stamp sheet for my favorite city — 7-9 collectible stamps in elegant Scandinavian-minimalist style, varied sizes arranged with gentle asymmetry across an A4 vertical layout, each stamp capturing a different landmark, food, or cultural detail through clean geometric silhouettes. Crisp perforated edges, authentic currency and denominations, refined typography.",
    categories: ["Image & Editing"],
    width: 1055,
    height: 1491,
    poster: still(PROD, "image_1787068819854__Collectible_Stamp_Sheet.png?hsh=optimize"),
  },
  {
    id: "swiss-style-city-poster",
    title: "Swiss-Style City Poster",
    description: "Create a Swiss graphic poster with monumental city typography",
    prompt:
      "Create a premium 4:5 vertical poster of me in Swiss International Typographic Style — a sharp, ultra-photorealistic with massive architectural city-name typography, the skyline peeking through the letters like part of the grid itself. Museum-grade layout, disciplined color accents, luxury editorial fashion, subtle film-print texture. Ask me relevant questions.",
    categories: ["Image & Editing"],
    width: 1003,
    height: 1568,
    poster: still(PROD, "image_1787068820420__Swiss-Style_City_Poster.png?hsh=optimize"),
  },
  {
    id: "animated-storybook",
    title: "Animated Storybook",
    description: "Turn your child's art into a hand-drawn animated story",
    prompt:
      "Bring my child's book to life with Seedance 2.5 — hand-drawn 2D storybook animation with soft pencil linework, crayon texture and warm watercolor fills, no cuts, one flowing tracking shot. Ask me relevant questions.",
    categories: ["Video Special Effects"],
    width: 1920,
    height: 1080,
    poster: frame("video_1787068863255__Animated_Storybook__thumbnail.jpg"),
    clip: clip(PROD, "3c072edc-64f3-8070-9bb6-d742b3b025d1"),
  },
  {
    id: "giant-banner-reveal",
    title: "Giant Banner Reveal",
    description: "Turn your brand banner into a monumental building-scale reveal",
    prompt:
      "Generate a locked-camera product reveal using Kling 3 — a massive advertising banner mounted on a building unfurls from the top with real physical weight and inertia, settling into place with a natural rebound and gently diminishing sway before coming to rest. Create this for my brand.",
    categories: ["Viral Video Formats"],
    width: 720,
    height: 1280,
    poster: frame("video_1787068863416__Giant_Banner_Reveal_thumbnail.jpg"),
    clip: clip(PROD, "3c072edc-64f3-8007-95ab-c5b4cac65be6"),
  },
  {
    id: "jello-world-asmr",
    title: "Jello World ASMR",
    description: "Create viral jello ASMR videos.",
    prompt:
      "Create a mesmerizing ASMR-style cinematic short using Seedance 2.5 — an entire world sculpted from glossy, jiggly translucent jello, with a character sprinting, wobbling, and leaping across it in dramatic slow motion before landing in a satisfying splash. Smooth tracking camera, premium food-photography lighting, squelchy synced sound design. Ask me relevant questions.",
    categories: ["Viral Video Formats"],
    width: 1280,
    height: 704,
    poster: frame("video_1787068904373__Jello_World_ASMR__thumbnail.jpg"),
    clip: clip(PROD, "3c072edc-64f3-804d-994e-c81dc194364b"),
  },
  {
    id: "street-art-illusion",
    title: "Street Art Illusion",
    description: "Street illusions fool pedestrians",
    prompt:
      'Create a 10-second photorealistic documentary montage using Seedance — real street artists, real anamorphic illusions, real pedestrians getting fooled. Handheld camera, natural motion blur, authentic mirrorless texture, and that unmistakable "caught on camera" feel. Chalk stairwells that aren\'t there, whirlpools that open up in the pavement, cobras leaping off walls — each scene reveals the trick with a camera move that collapses the illusion back into flat paint. Playful rhythmic instrumental, no vocals, no text.',
    categories: ["Video Special Effects"],
    width: 1920,
    height: 1080,
    poster: frame("video_1786626074642__Street_Art_Illusion_thumbnail.jpg"),
    clip: clip(AI, "3bb72edc-64f3-8046-80d8-ca1143bd8309"),
  },
  {
    id: "motion-clones",
    title: "Motion Clones",
    description: "Motion Clone film, shot like a high-end campaign.",
    prompt:
      "Generate a high-fashion editorial video using Seedance — shot on ARRI Alexa 35 with anamorphic lenses, shallow depth of field, and that rich, clean film-grain fashion grade. A single model moves through a vast minimalist white architectural space, every shot already in motion — powerful leaps, sharp contemporary dance phrases, sweeping turns — while semi-transparent clones of herself echo and complement her movement around her. Use the reference image attached to create the main character.",
    categories: ["Video Special Effects"],
    width: 1920,
    height: 1080,
    poster: frame("video_1786626075078__Motion_Clones__thumbnail.jpg"),
    clip: clip(AI, "3bb72edc-64f3-8099-8afb-f45ed35b26db"),
  },
  {
    id: "awakening-giant",
    title: "Awakening Giant Cinematic Scene",
    description: "Build your own multi-shot sci-fi epic",
    prompt:
      "Generate a 5-shot cinematic sci-fi epic using Kling 3 — a lone frozen figure standing in the palm of an ancient sleeping giant, eyes opening to reveal a single burst of colour in an otherwise monochrome world, before an entire frozen city lifts into the air. Slow deliberate camera moves, heavy fog, falling snow, hard cuts only. Ask me if I want a different story line.",
    categories: ["Video Special Effects"],
    width: 3840,
    height: 2160,
    poster: frame("video_1786521675167__Awakening_Giant_Cinematic_Scene_thumbnail.jpg"),
    clip: clip(AI, "3ba72edc-64f3-8034-8670-f8b883e9d2c8"),
  },
  {
    id: "neon-animation",
    title: "Neon Animation",
    description: "Ordinary objects burst into glowing neon animation.",
    prompt:
      "Create a first-person POV video blending live-action with hand-drawn 2D neon animation using Seedance 2.0 — everyday objects come alive in glowing color, morphing and dancing across a sunlit kitchen. A line becomes a caterpillar, a towel hides a snail, a window bursts into a blooming animated sunset. Whimsical, tactile, and a little bit magical — like the world is winking at you. Ask me if I want different visuals.",
    categories: ["Video Special Effects"],
    width: 1280,
    height: 720,
    poster: frame("video_1786431655291__Neon_Animation_thumbnail.jpg"),
    clip: clip(AI, "3b972edc-64f3-803b-838e-d2d9f61ff6c9"),
  },
  {
    id: "beauty-product-unboxing",
    title: "Beauty Product Unboxing",
    description: "Create unboxing videos for any beauty product.",
    prompt:
      "Create a luxury beauty product commercial — soft pastel pink aesthetic, overhead flat-lay shots, macro close-ups, and smooth cinematic reveals as a package is unboxed to show off a skincare or beauty product. Natural daylight, glossy textures, before/after glow shot, ending on a hero product shot with sparkling light. Ultra-realistic 4K quality.",
    categories: ["Content Creation"],
    width: 3840,
    height: 2160,
    poster: frame("video_1786107623328_Beauty_Product_Unboxing_thumbnail.jpg"),
    clip: clip(AI, "3b572edc-64f3-80f4-a9c7-e27b932cdf2f"),
  },
  {
    id: "day-in-the-life-montage",
    title: "A Day in the Life Montage",
    description: "Handheld camcorder day-in-life montage.",
    prompt:
      "Create a fast, punchy time-lapse day-in-the-life montage using DV camcorder POV footage — handheld, tape-worn, imperfect framing that builds energy across locations: sleepy morning routine → travel → backstage chaos → final stage moment. Reflective voiceover narration ties it together, lighting shifting naturally from warm to cool to bright stage lights. Use the reference image attached to create the main character. Ask me if I want a different story line.",
    categories: ["Content Creation"],
    width: 1280,
    height: 720,
    poster: frame("video_1785830444809__A_Day_in_the_Life_Montage_thumbnail.jpg"),
    clip: clip(AI, "3b272edc-64f3-80b2-ace4-d8fd28e40d3b"),
  },
  {
    id: "morning-coffee-vlog",
    title: "Morning Coffee Vlog",
    description: "A slow, satisfying morning coffee ritual vlog.",
    prompt:
      "Create a cozy, authentic camcorder-style morning vlog — handheld mini DV footage with natural hand shake, soft grain, and that lo-fi consumer camera feel. Follow someone through a slow, satisfying coffee ritual with ASMR-style sound: grinder whirring, tamping, steam hissing, milk pouring. Candid, minimal dialogue, warm morning light. Ends with a quiet smile and a hand covering the lens.",
    categories: ["Content Creation"],
    width: 2534,
    height: 1456,
    poster: frame("video_1785830445265__Morning_Coffee_Vlog_thumbnail.jpg"),
    clip: clip(AI, "3b272edc-64f3-8086-a123-d48cc8ccee84"),
  },
  {
    id: "japanese-food-commercial",
    title: "Japanese Food Commercial",
    description: "A warm, appetizing 15-second product ad shot like real Japanese morning TV",
    prompt:
      "Create a polished 10-second horizontal Japanese food commercial using Kling 3 — bright natural morning light, a cozy convenience-store setting, and the same cast of friends throughout a warm, appetizing product story: first glance, first bite, and a shared moment together. Crisp macro shots of texture and steam, soft natural dialogue in Japanese, clean product hero shot to close.",
    categories: ["Viral Video Formats"],
    width: 3840,
    height: 2160,
    poster: frame("video_1785830473639__Japanese_Food_Commercial__thumbnail.jpg"),
    clip: clip(AI, "3b272edc-64f3-80f3-a4bc-f42a8eabada0"),
  },
  {
    id: "raw-documentary-realism",
    title: "Raw Documentary Realism",
    description: "Create documentary style videos",
    prompt:
      "Generate a raw, documentary-style video using Seedance 2.0 — handheld and shoulder-mounted camera work, natural wind-shake, reactive pans, foreground obstruction, no slow-mo, no polish, just real-feeling live-action realism like actual crew footage.",
    categories: ["Viral Video Formats"],
    width: 1280,
    height: 720,
    poster: frame("video_1785830473641__Raw_Documentary_Realism_thumbnail.jpg"),
    clip: clip(AI, "3b272edc-64f3-804c-84a2-d7be6c0f64c5"),
  },
  {
    id: "ink-calligraphy-transformation",
    title: "Ink Calligraphy Transformation",
    description: "Calligraphy strokes forge a warrior from swirling ink.",
    prompt:
      "Generate a magical ink-transformation sequence using Kling 3 — a figure caught in a swirling void as calligraphy strokes lash through the air, staining hair, armor, and markings into being with each brushstroke, all building to a glowing sigil underfoot and a final blade-raised signature pose. Stock-footage grandeur, played completely sincere. Use the reference image attached to create the main character.",
    categories: ["Video Special Effects"],
    width: 1280,
    height: 720,
    poster: frame("video_1785830502221__Ink_Calligraphy_Transformation_thumbnail.jpg"),
    clip: clip(AI, "3b272edc-64f3-8039-b310-fd83c1a0ec07"),
  },
  {
    id: "touch-to-anime",
    title: "Touch-to-Anime Transformation",
    description: "Watch reality flip into anime with a single tap of a marker.",
    prompt:
      "Generate a single continuous first-person shot using Kling 3 — a hand holding a marker taps real objects in a photorealistic scene, and on contact each one instantly flips from live-action into flat, hand-drawn 2D anime. No fades, no wipes — just an instant reality-to-anime swap with a tiny colored flash on impact. Smooth handheld pans and tilts carry you from object to object as the world transforms around you. Pure mixed-media magic.",
    categories: ["Viral Video Formats"],
    width: 2560,
    height: 1440,
    poster: frame("video_1785830502222__Touch-to-Anime_Transformation_thumbnail.jpg"),
    clip: clip(AI, "3b272edc-64f3-8050-ab4d-f0ceb532c344"),
  },
  {
    id: "recreate-viral-ugc-ads",
    title: "Recreate Viral UGC Ads",
    description: "Turn one reference video into infinite UGC ads.",
    prompt:
      "Generate authentic UGC-style influencer content using Seedance 2.0 Reference to video — use the attached reference video for the exact motion, framing, and performance guide. Make fresh creator identities from the same performance.",
    categories: ["Content Creation"],
    width: 1920,
    height: 1080,
    poster: frame("video_1785830530554__Recreate_Viral_UGC_Ads__thumbnail.jpg"),
    clip: clip(AI, "3b272edc-64f3-8036-8ebc-f562b6439042"),
  },
  {
    id: "retro-windows-fashion-montage",
    title: "Retro Windows Desktop Fashion Montage",
    description: "Y2K desktop runway of sticker-style fashion cutouts",
    prompt:
      "Build a nostalgic early-2000s Windows desktop fashion montage using Seedance 2.0 — a retro computer screen scene with a bright blue sky wallpaper, green grassy hill, pixelated desktop icons, and a floating purple app window front and center. Inside, fashionable young adults appear one by one as realistic full-body cutout portraits — studio-shot streetwear models with clean white sticker outlines, like magazine stickers pasted onto an old-school desktop.",
    categories: ["Video Special Effects"],
    width: 1080,
    height: 1920,
    poster: frame("video_1785830530557__Retro_Windows_Desktop_Fashion_Montage_thumbnail.jpg"),
    clip: clip(AI, "3b272edc-64f3-8030-a1fe-f2b9e7669b3e"),
  },
  {
    id: "rapid-fire-expression-collage",
    title: "Rapid-Fire Expression Collage",
    description: "Turn your face into a beat-synced pop-art flipbook of expressions",
    prompt:
      "Create a punchy motion-graphics reel using Seedance 2.0 — floating head cutouts with clean white sticker outlines, popping against bold retro-pattern backgrounds, snapping through rapid-fire facial expressions on hard, beat-synced jump cuts every quarter-second. No morphing, no fades — just crisp, rhythmic, editorial-collage energy with a premium graphic-design finish.",
    categories: ["Video Special Effects"],
    width: 1080,
    height: 1920,
    poster: frame("video_1785830558385__Rapid-Fire_Expression_Collage__thumbnail.jpg"),
    clip: clip(AI, "3b272edc-64f3-8012-8f9a-ce0c83daaaf3"),
  },
  {
    id: "graffiti-comes-alive",
    title: "Graffiti Comes Alive",
    description: "One-shot mixed-media video",
    prompt:
      "Generate a one-shot, 9:16 mixed-media video where a flat 2D wall-graffiti character comes to life and starts messing with the real person standing next to it. Fixed camera, playful physical comedy — person tries to walk away, the graffiti mimics them behind their back, breaks into a goofy little victory dance, then plays innocent with a big heart drawn overhead. The person can't help but crack a smile. Charming, funny, perfectly synced between the real world and the flat sketch, which never leaves the wall or becomes 3D. Use the reference image attached as the first frame to lock in the character, wall, and composition.",
    categories: ["Video Special Effects"],
    width: 1080,
    height: 1916,
    poster: frame("video_1785830558388_Graffiti_Comes_Alive__thumbnail.jpg"),
    clip: clip(AI, "3b272edc-64f3-8033-b30c-f25c6d759814"),
  },
  {
    id: "multi-angle-cinematic-video",
    title: "Multi-Angle Cinematic Video",
    description: "Watch a critical event unfold in perfect sync",
    prompt:
      "Generate a four-way synchronized split-screen video capturing one critical event from every angle at once — inside the action, tracking the main subject, a control-room view of experts responding, and a wide aerial shot of the whole scene. All four panels lock to the same timeline: something goes wrong, people react naturally, professionals step in and take control, and everything resolves in perfect sync. Documentary-grade realism, precise physics, matching cause-and-effect across every frame.",
    categories: ["Viral Video Formats"],
    width: 2560,
    height: 1440,
    poster: frame("video_1785830582858_Multi-Angle_Cinematic_Video__thumbnail.jpg"),
    clip: clip(AI, "3b272edc-64f3-80b6-a3fd-c0ea5018fc48"),
  },
  {
    id: "peel-away-screen-effect",
    title: "Peel-Away Screen Effect",
    description: "Watch a webpage get physically peeled off a laptop screen",
    prompt:
      "Generate a satisfying screen-peel effect using Seedance 2.0 — handheld iPhone-vlog style as a hand pinches the corner of a laptop screen and peels the entire webpage off like a thin glossy film, curling and catching light as it lifts away to reveal the desktop underneath. No CGI look, no void — just a weirdly satisfying, tactile reality-bend. Use the reference image attached and ask me anything you need to know before generating.",
    categories: ["Video Special Effects"],
    width: 720,
    height: 1280,
    poster: frame("video_1785517214179_Peel-Away_Screen_Effect_thumbnail.jpg"),
    clip: clip(AI, "3ae72edc-64f3-80a5-9b53-c69ab35c0843"),
  },
  {
    id: "grumpy-to-giggles",
    title: "Grumpy to Giggles",
    description: "Playful 3D-animated baby antics melt a grumpy stranger's heart.",
    prompt:
      "Create a playful 3D animation using Kling 3 — a warm, minimalist beige backdrop, smooth toon-like textures, and a burst of yellows, pinks, and reds. One character shows off energetic, joyful tricks, slowly winning over a grumpy bystander until they're both caught up in the fun — all wrapped up with a charming little mishap at the end.",
    categories: ["Viral Video Formats"],
    width: 1280,
    height: 720,
    poster: frame("video_1785222057251__Grumpy_to_Giggles__thumbnail.jpg"),
    clip: clip(AI, "3ab72edc-64f3-80ed-a26f-c5d1db51acc4"),
  },
  {
    id: "frozen-time",
    title: "Frozen Time",
    description: "Freeze a warzone mid-explosion and walk through it.",
    prompt:
      "Create a raw, handheld war-zone sequence using seedance 2.0 — chaos frozen in an instant. Explosions, fighter jets locked in aerial combat, civilians fleeing through smoke and debris, all rendered with gritty documentary realism. Then time stops dead — every explosion, every falling body suspended mid-air — while one figure walks calmly through the frozen battlefield to save a life. Reference image attached to create the main character into the role.",
    categories: ["Video Special Effects"],
    width: 1920,
    height: 1080,
    poster: frame("video_1785222057690__Frozen_Time__thumbnail.jpg"),
    clip: clip(AI, "3ab72edc-64f3-8042-9c4d-e7b8abfb4638"),
  },
  {
    id: "two-worlds-one-frame",
    title: "Two Worlds, One Frame",
    description: "Blend two art styles & moods into a single split-screen video",
    prompt:
      "Create a split-screen image blending two contrasting art styles in one frame — dreamy and soft on one half, sharp and futuristic on the other.",
    categories: ["Viral Video Formats"],
    width: 720,
    height: 1280,
    poster: frame("video_1785222085418_Two_Worlds_One_Frame_thumbnail.jpg"),
    clip: clip(AI, "3ab72edc-64f3-80c7-9815-d8c36b4185cc"),
  },
  {
    id: "paper-cutout-outfit",
    title: "Paper Cutout Outfit",
    description: "Transform any outfit into paper cutout art.",
    prompt:
      "Generate an image edit that transforms the outfit into a paper cutout art style — layered paper textures, crisp cut edges, and a handcrafted collage look — while keeping the face, pose, background, and everything else exactly identical. A reference image of the outfit is attached for the transformation.",
    categories: ["Image & Editing"],
    width: 1080,
    height: 1080,
    poster: generated("image_1786391534060__Paper_Cutout_Outfit.png"),
  },
  {
    id: "shadow-dance",
    title: "Shadow Dance",
    description: "Turn your dance video into a living shadow dance",
    prompt:
      "Generate a depth-mapped dance sequence using Seedance 2.0 — start with a clean depth map of a dancer mid-move, animate it into a full choreography video with fluid, natural motion, then transfer that exact choreography onto the characters in your reference image. Use the reference image attached to apply the dance onto your characters.",
    categories: ["Video Special Effects"],
    width: 1080,
    height: 1080,
    poster: frame("video_1785222120554_Shadow_Dance__thumbnail.jpg"),
    clip: clip(AI, "3ab72edc-64f3-80ad-b8fe-f64b637c2b74"),
  },
  {
    id: "2d-character-comedy",
    title: "2D Character Comedy",
    description: "Cute sticker character causes real kitchen chaos.",
    prompt:
      "Create a comedy composite short using Seedance 2.0 — a photorealistic first-person cooking POV where everything in the kitchen is real, except one 2D hand-drawn sticker character who refuses to behave. Use the reference image attached to keep the character's design, proportions, and expression exactly intact throughout.",
    categories: ["Viral Video Formats"],
    width: 1280,
    height: 720,
    poster: frame("video_1785222120556__2D_Character_Comedy_thumbnail.jpg"),
    clip: clip(AI, "3ab72edc-64f3-8002-a2ad-f5437dba698e"),
  },
  {
    id: "bullet-time-predator-strike",
    title: "Bullet-Time Predator Strike",
    description: "High-speed chase suddenly freezes into stunning macro detail.",
    prompt:
      "Create a single, unbroken wildlife documentary shot using Seedance 2.0 — ultra-photorealistic, IMAX-grade nature cinematography with zero cuts. Start on an intimate high-speed chase weaving through a sunlit forest, then let it collide into a sudden, explosive predator strike — and without ever cutting away, glide seamlessly into a jaw-dropping bullet-time macro orbit around the frozen moment of impact, revealing every microscopic detail in slow, cinematic clarity.",
    categories: ["Video Special Effects"],
    width: 1280,
    height: 720,
    poster: frame("video_1784894445309__Bullet-Time_Predator_Strike_thumbnail.jpg"),
    clip: clip(AI, "3a772edc-64f3-8056-9847-d6cdedccb62f"),
  },
  {
    id: "lost-minidv-home-video",
    title: "Lost MiniDV Home Video",
    description: "Grainy rediscovered tape footage of an ordinary errand.",
    prompt:
      "Create a found-footage home video using Seedance 2.0 — the kind of grainy, imperfect MiniDV tape you'd stumble on in an old drawer, capturing an ordinary grocery run like it actually happened decades ago. Shaky camcorder pans, autofocus hunting, overexposed sunlight, ambient market noise — nothing staged, nothing cinematic, just real life caught on tape. Use the reference image attached to create the main character",
    categories: ["Viral Video Formats"],
    width: 1920,
    height: 1080,
    poster: frame("video_1784894445930__Lost_MiniDV_Home_Video_thumbnail.jpg"),
    clip: clip(AI, "3a772edc-64f3-80ab-b350-d062f35e57b5"),
  },
  {
    id: "property-walkthrough",
    title: "Property Walkthrough",
    description: "Raw handheld iPhone tour of any property",
    prompt:
      "Create a raw, authentic iPhone-style influencer walkthrough video — handheld, natural shake, harsh daylight, zero cinematic polish, exactly like a real Instagram Reel shot on location. Quick cuts between rooms as she shows off the wildest features of a themed property, talking straight to camera the whole time.",
    categories: ["Viral Video Formats"],
    width: 1280,
    height: 720,
    poster: frame("video_1784707270845__Property_Walkthrough__thumbnail.jpg", AI),
    clip: clip(AI, "3a572edc-64f3-8075-8a8a-ed4649292446"),
  },
  {
    id: "pocket-clone",
    title: "Pocket Clone",
    description: "Y2K street style photo with a tiny clone.",
    prompt:
      "Generate a Y2K-revival fashion editorial still — extreme fisheye lens, distorted wide perspective, low street-level angle, 35mm film grain with a subtle halation glow. A deadpan street style shot with one delightfully weird twist: a tiny 15cm identical clone of the subject peeking out of their jacket pocket, matching outfit, matching expression, arms resting on the pocket edge like it's just another day. Clean daylight, pale blue sky, city backdrop. Use the reference image attached.",
    categories: ["Image & Editing"],
    width: 941,
    height: 1672,
    poster: still(AI, "image_1784703851800__Pocket_Clone_.png?hsh=optimize"),
  },
  {
    id: "product-hero-ad",
    title: "Product Hero Ad",
    description: "Turn any product into a scroll-stopping ad",
    prompt:
      'Build a single 15-second multishot product ad using Seedance 2.0 — snappy, beat-synced lifestyle cuts (working, lounging, commuting, gaming) all showing off a hero product with a punchy upbeat VO and bold on-screen text. Whip-pan transitions, glowing accent lighting, satisfying close-up product details, ends on a clean "Shop Now" CTA frame. Product image attached.',
    categories: ["Branding & Design"],
    width: 1280,
    height: 720,
    poster: frame("video_1784703628252__Product_Hero_Ad__thumbnail.jpg"),
    clip: clip(AI, "3a572edc-64f3-8093-ade0-ed531c997370"),
  },
  {
    id: "frozen-splash-portrait",
    title: "Frozen Splash Portrait",
    description: "Turn any drink shot into a frozen-in-time moment.",
    prompt:
      "Create a portrait image with a dramatic frozen-motion effect — a drink caught mid-spill, liquid suspended in the air like time just stopped, person's face still clearly visible through the action. Use the reference image attached to create the main character.",
    categories: ["Image & Editing"],
    width: 941,
    height: 1672,
    poster: still(PROD, "image_1784106138028__Frozen_Splash_Portrait.png?hsh=optimize"),
  },
  {
    id: "bungee-jump",
    title: "Bungee Jump",
    description: "See yourself take the ultimate bungee jump plunge.",
    prompt:
      "Generate a hyper-cinematic single-take bungee jump using seedance 2.0 with the reference image attached — no cuts, no transitions, just one seamless continuous shot from face-to-face sprint at the edge all the way through a violent vertical freefall, a near-water slow-motion freeze, and a snapping cord rebound. The bungee cord stays visible and physically believable the entire time. Canyon setting, bright daylight, brutal height, real adrenaline.",
    categories: ["Viral Video Formats"],
    width: 1920,
    height: 1080,
    poster: frame("video_1782810032631__Bungee_Jump_thumbnail.jpg"),
    clip: clip(AI, "38f72edc-64f3-800d-bf56-c178f636ae8c"),
  },
  {
    id: "selfie-with-a-villain",
    title: "Selfie With a Villain",
    description: "Take a candid selfie with your favorite movie monster",
    prompt:
      "Generate a wide-angle selfie — close-up of my face in the foreground pulling a genuinely terrified expression, arm extended like they snapped it themselves. Standing right beside them is a legendary horror villain, completely unbothered, sipping a Starbucks through a straw. Dark energy meets chaotic behind-the-scenes humor. Sharp faces, wide-angle lens distortion, crew and set blurred in the background. Vertical 9:16, natural skin texture, authentic selfie perspective.",
    categories: ["Image & Editing"],
    width: 941,
    height: 1672,
    poster: still(PROD, "image_1781679620692__Selfie_With_a_Villain.png?hsh=optimize"),
  },
  {
    id: "giant-comic-book-self-portrait",
    title: "Giant Comic-Book Self Portrait",
    description: "Create a larger-than-life comic version of yourself burst through the asphalt.",
    prompt:
      "Generate a photorealistic + comic-book fusion portrait of me — the person standing confidently on an empty highway, arms crossed, while a giant 3D comic-style version of themselves erupts from a cracked asphalt crater behind them. Colorful paint splashes, graffiti accents, stars, sparkles, and pop-art chaos frame the scene. Bright daylight, clear blue sky, cinematic composition. Ultra-detailed, vibrant, 8K quality. Use the reference image attached to create the main subject.",
    categories: ["Image & Editing"],
    width: 941,
    height: 1672,
    poster: still(PROD, "image_1781251211099_Giant_Comic-Book_Self_Portrait.png?hsh=optimize"),
  },
  {
    id: "watercolor-ink-portrait",
    title: "Watercolor & Ink Portrait",
    description: "Turn yourself into a dreamy, paint-splashed watercolor illustration.",
    prompt:
      "Generate a watercolor and ink portrait of me — flowing paint splashes, loose brush strokes, ink splatters, transparent layers, and that beautiful bleeding effect where pigment bleeds into white space. Soft, artistic, gallery-worthy.",
    categories: ["Image & Editing"],
    width: 1024,
    height: 1536,
    poster: still(PROD, "image_1781161254720__Watercolor_Ink_Portrait.png?hsh=optimize"),
  },
  {
    id: "nine-pose-lifestyle-collage",
    title: "9-Pose Lifestyle Photo Collage",
    description: "Upload your photo and get a full Korean-style street photoshoot collage.",
    prompt:
      "Generate a 3×3 Instagram-style photo collage using the reference image attached of me to create the main character — nine candid lifestyle poses, one consistent outfit, one charming urban street setting. Korean-inspired photoshoot energy, DSLR 50mm quality, shallow depth of field, soft natural daylight.\nNine poses across the grid: sipping an iced drink, hands under chin, peace sign, double peace signs, sitting on the curb, surprised expression, drinking pose, looking back while walking, and squatting with hands framing the face.",
    categories: ["Content Creation"],
    width: 941,
    height: 1672,
    poster: still(PROD, "image_1781161277260__9-Pose_Lifestyle_Photo_Collage.png?hsh=optimize"),
  },
  {
    id: "luxury-cgi-campaign-poster",
    title: "Luxury CGI Campaign Poster",
    description: "A drop-worthy campaign poster built for any brand.",
    prompt:
      "Generate a premium vertical luxury CGI product poster for my brand — one hero product, one pedestal object, one dominant color, total brand immersion. Clean studio backdrop, radial gradient glow, Octane-quality rendering, and sharp campaign typography. The kind of visual that belongs on a flagship website or a Supreme drop page.",
    categories: ["Branding & Design"],
    width: 1122,
    height: 1402,
    poster: still(PROD, "image_1781161277262__Luxury_CGI_Campaign_Poster.png?hsh=optimize"),
  },
  {
    id: "gaming-influencer-poster",
    title: "Gaming Influencer Editorial Poster",
    description: "Build a premium Esports creator campaign poster.",
    prompt:
      'Generate a luxury esports lifestyle editorial poster of me using the image attached — vibrant sunflower-yellow backdrop, a confident gaming creator as the hero shot, and a premium collage layout that blends magazine editorial with social media campaign energy. Rounded white frames, layered photography panels, vertical "NOVA" outline type, and modern futuristic gaming typography.',
    categories: ["Branding & Design"],
    width: 941,
    height: 1672,
    poster: still(PROD, "image_1781161322940__Gaming_Influencer_Editorial_Poster.png?hsh=optimize"),
  },
  {
    id: "luxury-fashion-campaign-poster",
    title: "Luxury Fashion Campaign Poster",
    description:
      "Design a luxury fashion lifestyle poster with monumental typography and a dream destination backdrop",
    prompt:
      "Create an ultra-premium fashion lifestyle campaign poster in 9:16 for my brand — a luxury destination backdrop, a model captured in natural motion through the environment, and monumental oversized typography integrated directly into the architecture. Agency-level art direction, editorial color grading, world-class graphic design hierarchy. Built for Instagram, billboards, and global rollout.",
    categories: ["Branding & Design"],
    width: 941,
    height: 1672,
    poster: still(PROD, "image_1781006434981__Luxury_Fashion_Campaign_Poster.png?hsh=optimize"),
  },
  {
    id: "japanese-streetwear-poster",
    title: "Japanese Streetwear Editorial Poster",
    description: "Design a bold Japanese-inspired streetwear editorial poster.",
    prompt:
      "Create an ultra-premium editorial streetwear poster — Japanese graphic design aesthetic, dramatic low-angle wide-lens shot with aggressive foreground hand distortion, coral red vertical panel behind the subject, bold collage layering of halftone circles, vintage bird illustrations, ink sketches, and cropped photo fragments. Large Japanese typography at the top. Warm cinematic lighting, off-white textured paper grain, 8K sharp.",
    categories: ["Branding & Design"],
    width: 941,
    height: 1672,
    poster: still(PROD, "image_1781006499012__Japanese_Streetwear_Editorial_Poster.png?hsh=optimize"),
  },
  {
    id: "full-logo-system",
    title: "Full Logo System & Brand Identity",
    description: "Generate a scalable logo system with mockups, color, and typography.",
    prompt:
      "Build a complete logo system image — 3 to 5 distinct directions across wordmark, monogram, symbol, and hybrid concepts, then expand the winner into a full scalable identity: primary logo, secondary lock-up, icon, favicon, watermark, and social avatars. Typography system, color palette, and real-world mockups across digital and print.",
    categories: ["Branding & Design"],
    width: 2048,
    height: 1152,
    poster: still(PROD, "image_1779958870845_Full_Logo_System_Brand_Identity.png?hsh=optimize"),
  },
  {
    id: "swiss-grid-brand-poster",
    title: "Swiss Grid Brand Poster",
    description: "Stripe geometry, modernist grids, editorial finish — a premium brand poster.",
    prompt:
      "I want to create a bold brand poster using GPT Image 2 for my brand/product — Swiss-modernist grid structure, clean stripe geometry, precise editorial spacing, and a polished motion-style finish that feels premium and intentional.",
    categories: ["Branding & Design"],
    width: 1254,
    height: 1254,
    poster: still(PROD, "image_1779436856022_Swiss_Grid_Brand_Poster.png?hsh=optimize"),
  },
  {
    id: "neo-noir-storm-drive",
    title: "Neo-Noir Storm Drive",
    description: "Fog, lightning, and a car racing the cliff's edge.",
    prompt:
      "Create a neo-noir road sequence using Kling 3 — a lone car threading through a storm-lashed mountain road at dusk, headlights cutting through fog, rain streaking across chrome under flashes of lightning. Sweeping aerials give way to low, moody exterior shots as the drive turns treacherous near the cliff's edge. Use the reference image attached to lock in the character's identity throughout.",
    categories: ["Content Creation"],
    width: 1280,
    height: 720,
    poster: frame("video_1784707184780__Neo-Noir_Storm_Drive_thumbnail.jpg", AI),
    clip: clip(AI, "3a572edc-64f3-8058-b370-fa9c85cfb259"),
  },
];
