export type GalleryImage = Readonly<{
  src: string;
  alt: string;
  featured?: boolean;
  landscape?: boolean;
  /** Customers or staff are in the shot. */
  people?: boolean;
}>;

export const galleryImages: readonly GalleryImage[] = [
  {
    src: "/images/shop/photo_148.jpg",
    alt: "Gray cat beside a salted caramel matcha inside Brew ni Cat",
    featured: true,
  },
  {
    src: "/images/shop/photo_153.jpg",
    alt: "Customers holding cats around a table inside Brew ni Cat",
    people: true,
  },
  {
    src: "/images/shop/photo_157.jpg",
    alt: "Customer with a drink and two cats at a Brew ni Cat table",
    people: true,
  },
  {
    src: "/images/shop/photo_158.jpg",
    alt: "Customers holding cats beside drinks inside Brew ni Cat",
    people: true,
  },
  {
    src: "/images/shop/photo_152.jpg",
    alt: "White cat beside a caramel Oreo drink by the café window",
    featured: true,
  },
  {
    src: "/images/shop/photo_149.jpg",
    alt: "Gray and black-and-white cats on a wooden cat shelf at Brew ni Cat",
  },
  {
    src: "/images/shop/photo_150.jpg",
    alt: "Gray cat sitting behind a small wooden fence in the cat area",
  },
  {
    src: "/images/shop/photo_151.jpg",
    alt: "White and gray cats relaxing together on the café floor",
  },
  {
    src: "/images/shop/photo_155.jpg",
    alt: "Customers enjoying drinks on the Brew ni Cat patio",
    people: true,
  },
  {
    src: "/images/shop/photo_154.jpg",
    alt: "Four customers with drinks and desserts at a Brew ni Cat table",
    people: true,
  },
  {
    src: "/images/shop/photo_156.jpg",
    alt: "Group of customers with drinks and a cat inside Brew ni Cat",
    people: true,
  },
  {
    src: "/images/shop/photo_159.jpg",
    alt: "Customers beside a cat resting on the Brew ni Cat counter",
    people: true,
  },
  {
    src: "/images/shop/photo_004.jpg",
    alt: "Cats resting on a café table beneath blue evening lights at Brew ni Cat",
    featured: true,
  },
  {
    src: "/images/shop/photo_006.jpg",
    alt: "Fluffy white cat resting beside greenery inside Brew ni Cat",
    featured: true,
  },
  {
    src: "/images/shop/photo_007.jpg",
    alt: "Black-and-white cat sitting near a wooden cat tower at Brew ni Cat",
  },
  {
    src: "/images/shop/photo_009.jpg",
    alt: "Siamese cat in front of the café’s leafy interior wall",
  },
  {
    src: "/images/shop/photo_012.jpg",
    alt: "Three iced drinks with cat stickers lined up behind the syrup pumps",
    featured: true,
  },
  {
    src: "/images/shop/photo_030.jpg",
    alt: "Customers gathered around drinks and snacks inside Brew ni Cat",
    people: true,
  },
  {
    src: "/images/shop/photo_041.jpg",
    alt: "Group enjoying colorful drinks and snacks at Brew ni Cat",
    people: true,
  },
  {
    src: "/images/shop/photo_045.jpg",
    alt: "Customers seated in Brew ni Cat’s outdoor area",
    people: true,
  },
  {
    src: "/images/shop/photo_060.jpg",
    alt: "Customers sharing drinks beside a cat at the window counter",
    people: true,
  },
  {
    src: "/images/shop/photo_063.jpg",
    alt: "Customer holding a green drink beside Brew ni Cat’s wall logo",
    people: true,
  },
  {
    src: "/images/shop/photo_064.jpg",
    alt: "Customers seated outdoors under warm string lights at Brew ni Cat",
    people: true,
  },
  {
    src: "/images/shop/photo_074.jpg",
    alt: "Customers seated with cats, drinks, and snacks inside Brew ni Cat",
    people: true,
  },
  {
    src: "/images/shop/photo_092.jpg",
    alt: "Group gathered around a café table with two cats",
    people: true,
  },
  {
    src: "/images/shop/photo_119.jpg",
    alt: "Siamese cat sitting on wooden cat furniture inside the shop",
  },
  {
    src: "/images/shop/photo_124.jpg",
    alt: "Brew ni Cat seating area with a cat resting near the window",
  },
  {
    src: "/images/shop/photo_126.jpg",
    alt: "Fluffy white cat in a blue shirt resting by the café window",
    featured: true,
  },
  {
    src: "/images/shop/photo_145.jpg",
    alt: "Two people wearing Brew ni Cat aprons at the service counter",
    people: true,
  },
  {
    src: "/images/shop/photo_146.jpg",
    alt: "Group gathered with cats inside Brew ni Cat Coffee Shop",
    people: true,
  },
  {
    src: "/images/shop/photo_160.jpg",
    alt: "Two guests at a small table with fries and drinks beside the green leaf wall",
    people: true,
  },
  {
    src: "/images/shop/photo_161.jpg",
    alt: "Four friends sharing fries and matcha drinks around a round table",
    people: true,
  },
  {
    src: "/images/shop/photo_162.jpg",
    alt: "Three guests at a table of fries and drinks by the café window",
    people: true,
  },
  {
    src: "/images/shop/photo_163.jpg",
    alt: "Two guests at a table with a white cat and a black-and-white cat on their laps",
    people: true,
  },
  {
    src: "/images/shop/photo_164.jpg",
    alt: "Two guests at a small table with drinks beside the photo wall",
    people: true,
  },
  {
    src: "/images/shop/photo_165.jpg",
    alt: "Two guests with a tray of fries and food at a round table",
    people: true,
  },
  {
    src: "/images/shop/photo_166.jpg",
    alt: "Three students holding drinks over a basket of fries",
    people: true,
  },
  {
    src: "/images/shop/photo_167.jpg",
    alt: "Four young guests at a table with fries and iced drinks",
    people: true,
  },
  {
    src: "/images/shop/photo_168.jpg",
    alt: "Four friends seated together under the cloud ceiling",
    people: true,
  },
  {
    src: "/images/shop/photo_169.jpg",
    alt: "Three friends at a table with fries and a black-and-white cat",
    people: true,
  },
  {
    src: "/images/shop/photo_170.jpg",
    alt: "Guest at a table with fries, an iced drink and a fluffy white cat under the shop logo",
    people: true,
  },
  {
    src: "/images/shop/photo_171.jpg",
    alt: "Four teenagers at a table with matcha drinks and fries",
    people: true,
  },
  {
    src: "/images/shop/photo_172.jpg",
    alt: "Two guests with a cat and a basket of fries at a round table",
    people: true,
  },
  {
    src: "/images/shop/photo_173.jpg",
    alt: "Two guests with iced matcha and berry drinks at a table",
    people: true,
  },
  {
    src: "/images/shop/photo_174.jpg",
    alt: "Students with cats and a plate of fries at a corner table",
    people: true,
  },
  {
    src: "/images/shop/photo_175.jpg",
    alt: "Two guests with a matcha drink and fries beneath the photo wall",
    people: true,
  },
  {
    src: "/images/shop/photo_176.jpg",
    alt: "Two guests each holding a cat with a basket of fries on the table",
    people: true,
  },
  {
    src: "/images/shop/photo_177.jpg",
    alt: "Three guests with fries and drinks at a table under the Brew ni Cat sign",
    people: true,
  },
];

/**
 * The gallery's 3D ring is a hero-style showcase, so it only shows cats,
 * drinks, food and the space. Photos with people stay in the full grid.
 */
export const ringImages = galleryImages.filter((image) => !image.people);

/** Home preview reel uses six featured cat/food/space photos (duplicated for the marquee). */
export const homeGalleryImages = galleryImages
  .filter((image) => image.featured)
  .slice(0, 6);
