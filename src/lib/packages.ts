export type PackageId = "silver" | "gold";

export interface PackagePlan {
  id: PackageId;
  name: string;
  period: string;
  price: number;
  priceDisplay: string;
  featured: boolean;
  badge?: string;
  features: string[];
  mutedFeatures?: string[];
}

export const PACKAGES: PackagePlan[] = [
  {
    id: "silver",
    name: "نقره‌ای",
    period: "عضویت یک‌ماهه",
    price: 250_000,
    priceDisplay: "۲۵۰,۰۰۰",
    featured: false,
    features: [
      "دسترسی به ابزارهای پایه تحلیل",
      "ویدیوهای آموزشی مقدماتی و تحلیلی",
      "داشبورد شخصی و تقویم بازار",
      "استفاده همزمان از یک دستگاه",
      "پشتیبانی استاندارد",
    ],
    mutedFeatures: [
      "کتابخانه کامل ویدیوهای پیشرفته",
      "دسترسی اولویت‌دار به محتوای جدید",
    ],
  },
  {
    id: "gold",
    name: "طلایی",
    period: "عضویت یک‌ماهه",
    price: 450_000,
    priceDisplay: "۴۵۰,۰۰۰",
    featured: true,
    badge: "پیشنهادی",
    features: [
      "همه ابزارها — پایه و پیشرفته",
      "کتابخانه کامل ویدیوها و منابع",
      "داشبورد گسترده با ابزارهای اختصاصی",
      "استفاده همزمان از دو دستگاه",
      "دسترسی زودتر به محتوا و به‌روزرسانی‌ها",
      "پشتیبانی سریع‌تر",
    ],
  },
];

export function getPackageById(id: string | null): PackagePlan | undefined {
  return PACKAGES.find((pkg) => pkg.id === id);
}
