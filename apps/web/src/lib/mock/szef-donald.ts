/**
 * Szef Donald brand assets used by the landing page + dev primitives demo.
 *
 * NOTE: this is *not* DB seed data — the real menu comes from `useMenuTree()`
 * (which reads The Test Kitchen). These constants drive the design language
 * showcase (hero copy, testimonials, hours, location). Replace per-restaurant
 * when we onboard a real Szef Donald instance.
 */

import type { DayOfWeek, HoursRow } from '@repo/ui';

export const mockHours: HoursRow[] = [
  { dayOfWeek: 1 as DayOfWeek, opensAt: '11:00', closesAt: '22:00' },
  { dayOfWeek: 2 as DayOfWeek, opensAt: '11:00', closesAt: '22:00' },
  { dayOfWeek: 3 as DayOfWeek, opensAt: '11:00', closesAt: '22:00' },
  { dayOfWeek: 4 as DayOfWeek, opensAt: '11:00', closesAt: '22:00' },
  { dayOfWeek: 5 as DayOfWeek, opensAt: '11:00', closesAt: '23:00' },
  { dayOfWeek: 6 as DayOfWeek, opensAt: '12:00', closesAt: '23:00' },
  { dayOfWeek: 0 as DayOfWeek, opensAt: '12:00', closesAt: '21:00' },
];

export const mockLocation = {
  address1: 'Marszałkowska 102',
  address2: '00-026 Warszawa, Poland',
  phone: '+48 22 555 01 23',
  coords: { lat: 52.2297, lng: 21.0122 },
};

const U = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const mockCategories = [
  { slug: 'kebab', label: 'Kebab', itemCount: 18, image: U('1633321702518-7feccafb94d5') },
  { slug: 'falafel', label: 'Falafel', itemCount: 9, image: U('1593504049359-74330189a345') },
  { slug: 'tacos', label: 'Tacos', itemCount: 4, image: U('1565299585323-38d6b0865b47') },
  { slug: 'box', label: 'Box & Plates', itemCount: 8, image: U('1565299507177-b0ac66763828') },
  { slug: 'drinks', label: 'Drinks', itemCount: 7, image: U('1556679343-c7306c1976bc') },
];

export const mockFeaturedDishes = [
  {
    slug: 'kebab-tortilla-srodni',
    name: 'Kebab Tortilla Średni',
    description: 'Beef + lamb mix, fresh salad, tahini sauce in a warm tortilla. Our most-ordered.',
    price: { amount: '24.00', currency: 'PLN' },
    flags: [] as string[],
    image: { src: U('1633321702518-7feccafb94d5', 900), alt: 'Kebab tortilla wrap on cream paper' },
  },
  {
    slug: 'falafel-pita-duzy',
    name: 'Falafel Pita Duży',
    description: 'Eight hand-rolled falafel, hummus, pickled turnips, parsley.',
    price: { amount: '23.00', currency: 'PLN' },
    flags: ['vegetarian', 'vegan'] as string[],
    image: { src: U('1593504049359-74330189a345', 900), alt: 'Falafel pita with hummus' },
  },
  {
    slug: 'kapsalon-duzy',
    name: 'Kapsalon Duży',
    description: 'The Rotterdam classic. Fries, kebab, melted cheese, salad, sauce. Built for two.',
    price: { amount: '43.00', currency: 'PLN' },
    flags: ['featured'] as string[],
    image: {
      src: U('1565299585323-38d6b0865b47', 900),
      alt: 'Kapsalon with kebab and melted cheese',
    },
  },
  {
    slug: 'tacos-x3',
    name: 'Tacos x3',
    description: 'Three soft tacos, your choice of kebab or falafel, salsa.',
    price: { amount: '29.00', currency: 'PLN' },
    flags: ['spicy'] as string[],
    image: { src: U('1565299624946-b28f40a0ae38', 900), alt: 'Three soft tacos' },
  },
  {
    slug: 'box-strips-mega',
    name: 'Box Strips Mega',
    description: 'Crispy chicken strips, fries, slaw, two sauces.',
    price: { amount: '39.00', currency: 'PLN' },
    flags: [] as string[],
    image: {
      src: U('1626645738196-c2a7c87a8f9d', 900),
      alt: 'Box of crispy chicken strips and fries',
    },
  },
  {
    slug: 'salatka-kebab-duzy',
    name: 'Sałatka Kebab Duży',
    description: 'No bread — just greens, kebab meat, tahini, pomegranate.',
    price: { amount: '32.00', currency: 'PLN' },
    flags: ['gluten-free'] as string[],
    image: {
      src: U('1546069901-ba9599a7e63c', 900),
      alt: 'Kebab salad bowl with greens and pomegranate',
    },
  },
];

export const mockTestimonials = [
  {
    rating: 5,
    quote:
      "Best kebab in Warsaw, hands down. The tahini sauce is on another level and you can tell the bread is fresh. I've been three times this month.",
    author: { name: 'Kasia W.', meta: 'Local guide · 42 reviews' },
    source: 'google' as const,
  },
  {
    rating: 5,
    quote:
      'Falafel pita that actually tastes like it should — crispy outside, soft inside, properly spiced. My go-to vegetarian lunch.',
    author: { name: 'Tomasz K.', meta: '12 reviews' },
    source: 'google' as const,
  },
  {
    rating: 5,
    quote: 'The kapsalon is dangerous. In a good way.',
    author: { name: 'Anna M.', meta: '5 reviews' },
    source: 'google' as const,
  },
  {
    rating: 4,
    quote: 'Real quality and fair prices. Sometimes a wait on Fridays but worth it.',
    author: { name: 'Michał R.', meta: 'Top reviewer' },
    source: 'google' as const,
  },
];
