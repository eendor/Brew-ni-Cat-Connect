/**
 * The shop's website content: one row of `public.site_content` per section
 * (docs/database-design.md §10, FR-085, FR-086). The owner edits it from the
 * POS; the website only reads it.
 */

export const SITE_CONTENT_SECTIONS = [
  "hours",
  "contact",
  "address",
  "payments",
  "notice",
  "social",
  "riders",
  "about",
  "gallery",
] as const;

export type SiteContentSection = (typeof SITE_CONTENT_SECTIONS)[number];

export const WEEK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];

/** 24-hour "HH:MM" times; the shop closes before midnight. */
export type OpeningHours = Readonly<{ opens: string; closes: string }>;

export type HoursContent = Readonly<{
  /** `null` is a closed day. */
  days: Readonly<Record<WeekDay, OpeningHours | null>>;
  /** Said after the hours, such as where schedule changes are posted. */
  note: string;
}>;

export type ContactContent = Readonly<{
  phone: string;
  email: string;
}>;

export type AddressContent = Readonly<{
  street: string;
  /** The barangay. */
  area: string;
  town: string;
  province: string;
  postalCode: string;
  country: string;
  /** A full phrase, such as "Beside …". */
  landmark: string;
  mapUrl: string;
}>;

export type PaymentsContent = Readonly<{
  methods: readonly string[];
  /** The shop's GCash QR, shown when a customer picks GCash. */
  qrCode: Photo | null;
}>;

export type NoticeContent = Readonly<{
  /** Shown on every page while it isn't empty. */
  text: string;
}>;

export type SocialContent = Readonly<{
  /** An empty link hides that button. */
  facebook: string;
  facebookPhotos: string;
  tiktok: string;
}>;

export type RiderPartner = Readonly<{
  name: string;
  href: string;
  logo: string;
}>;

export type RidersContent = Readonly<{
  partners: readonly RiderPartner[];
}>;

/** A photo that ships with the site, under `/images/`. */
export type Photo = Readonly<{
  src: string;
  alt: string;
}>;

export type GalleryPhoto = Photo &
  Readonly<{
    featured?: boolean;
    landscape?: boolean;
    /** Customers or staff are in the shot. */
    people?: boolean;
  }>;

export type CatRule = Readonly<{
  title: string;
  text: string;
}>;

export type AboutContent = Readonly<{
  /** "YYYY-MM-DD" */
  openedOn: string;
  heroTitle: string;
  heroText: string;
  homeTitle: string;
  homeText: string;
  homePhoto: Photo;
  intro: string;
  storyTitle: string;
  story: readonly string[];
  /** Exactly three, for the About page collage. */
  photos: readonly Photo[];
  menuSummary: string;
  footerText: string;
  catRules: readonly CatRule[];
}>;

export type GalleryContent = Readonly<{
  photos: readonly GalleryPhoto[];
}>;

export type SiteContent = Readonly<{
  hours: HoursContent;
  contact: ContactContent;
  address: AddressContent;
  payments: PaymentsContent;
  notice: NoticeContent;
  social: SocialContent;
  riders: RidersContent;
  about: AboutContent;
  gallery: GalleryContent;
}>;

/** The sections client components need: the shop's facts, not page copy. */
export const SHOP_SECTIONS = [
  "hours",
  "contact",
  "address",
  "payments",
  "notice",
  "social",
  "riders",
] as const satisfies readonly SiteContentSection[];

export type ShopSection = (typeof SHOP_SECTIONS)[number];

export type ShopContent = Pick<SiteContent, ShopSection>;

/** What client components read: the shop facts and the takeout box price. */
export type ShopFacts = ShopContent &
  Readonly<{
    /** From the live menu's Take-out Box item; null when it can't be read. */
    takeoutBoxPrice: number | null;
  }>;

/** Where each section came from on this render. */
export type SiteContentSource = "live" | "fallback";

export type LoadedSiteContent = Readonly<{
  content: SiteContent;
  sources: Readonly<Record<SiteContentSection, SiteContentSource>>;
}>;

/** What the website reads: `select section, content from site_content`. */
export type SiteContentRow = Readonly<{
  section: string | null;
  content: unknown;
}>;
