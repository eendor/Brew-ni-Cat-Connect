export type GalleryImage = Readonly<{
  src: string;
  alt: string;
  featured?: boolean;
  landscape?: boolean;
}>;

export const galleryImages: readonly GalleryImage[] = [
  {
    src: "/images/shop/photo_004.jpg",
    alt: "Cats resting on a café table beneath blue evening lights at Brew ni Cat",
    featured: true,
  },
  {
    src: "/images/shop/photo_006.jpg",
    alt: "Fluffy white cat resting beside greenery inside Brew ni Cat",
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
    src: "/images/shop/photo_011.jpg",
    alt: "Spicy noodles served with a fried egg and seaweed at Brew ni Cat",
    featured: true,
  },
  {
    src: "/images/shop/photo_030.jpg",
    alt: "Customers gathered around drinks and snacks inside Brew ni Cat",
    featured: true,
  },
  {
    src: "/images/shop/photo_041.jpg",
    alt: "Group enjoying colorful drinks and snacks at Brew ni Cat",
  },
  {
    src: "/images/shop/photo_045.jpg",
    alt: "Customers seated in Brew ni Cat’s outdoor area",
  },
  {
    src: "/images/shop/photo_060.jpg",
    alt: "Customers sharing drinks beside a cat at the window counter",
    featured: true,
  },
  {
    src: "/images/shop/photo_063.jpg",
    alt: "Customer holding a green drink beside Brew ni Cat’s wall logo",
    featured: true,
  },
  {
    src: "/images/shop/photo_064.jpg",
    alt: "Customers seated outdoors under warm string lights at Brew ni Cat",
    featured: true,
  },
  {
    src: "/images/shop/photo_074.jpg",
    alt: "Customers seated with cats, drinks, and snacks inside Brew ni Cat",
  },
  {
    src: "/images/shop/photo_092.jpg",
    alt: "Group gathered around a café table with two cats",
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
  },
  {
    src: "/images/shop/photo_145.jpg",
    alt: "Two people wearing Brew ni Cat aprons at the service counter",
  },
  {
    src: "/images/shop/photo_146.jpg",
    alt: "Group gathered with cats inside Brew ni Cat Coffee Shop",
  },
  {
    src: "/images/shop/photo_148.jpg",
    alt: "Gray cat beside a salted caramel matcha inside Brew ni Cat",
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
    src: "/images/shop/photo_152.jpg",
    alt: "White cat beside a caramel Oreo drink by the café window",
  },
  {
    src: "/images/shop/photo_153.jpg",
    alt: "Customers holding cats around a table inside Brew ni Cat",
    featured: true,
  },
  {
    src: "/images/shop/photo_154.jpg",
    alt: "Four customers with drinks and desserts at a Brew ni Cat table",
  },
  {
    src: "/images/shop/photo_155.jpg",
    alt: "Customers enjoying drinks on the Brew ni Cat patio",
  },
  {
    src: "/images/shop/photo_156.jpg",
    alt: "Group of customers with drinks and a cat inside Brew ni Cat",
  },
  {
    src: "/images/shop/photo_157.jpg",
    alt: "Customer with a drink and two cats at a Brew ni Cat table",
    featured: true,
  },
  {
    src: "/images/shop/photo_158.jpg",
    alt: "Customers holding cats beside drinks inside Brew ni Cat",
    featured: true,
  },
  {
    src: "/images/shop/photo_159.jpg",
    alt: "Customers beside a cat resting on the Brew ni Cat counter",
  },
];

export const homeGalleryImages = galleryImages.filter(
  (image) => image.featured,
);
