/* ============================================================
   Mock data
   ============================================================ */

const U = (id, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const mockCategories = [
  { slug: "kebab",    label: "Kebab",        itemCount: 18, image: U("1633321702518-7feccafb94d5") },
  { slug: "falafel",  label: "Falafel",      itemCount: 9,  image: U("1593504049359-74330189a345") },
  { slug: "tacos",    label: "Tacos",        itemCount: 4,  image: U("1565299585323-38d6b0865b47") },
  { slug: "box",      label: "Box & Plates", itemCount: 8,  image: U("1565299507177-b0ac66763828") },
  { slug: "drinks",   label: "Drinks",       itemCount: 7,  image: U("1556679343-c7306c1976bc") },
];

const mockFeaturedDishes = [
  {
    href: "/menu/items/kebab-tortilla-srodni",
    name: "Kebab Tortilla Średni",
    description: "Beef + lamb mix, fresh salad, tahini sauce in a warm tortilla. Our most-ordered.",
    price: { amount: 24, currency: "PLN" },
    flags: [],
    image: { src: U("1633321702518-7feccafb94d5"), alt: "Kebab tortilla wrap on cream paper" },
  },
  {
    href: "/menu/items/falafel-pita-duzy",
    name: "Falafel Pita Duży",
    description: "Eight hand-rolled falafel, hummus, pickled turnips, parsley.",
    price: { amount: 23, currency: "PLN" },
    flags: ["vegetarian", "vegan"],
    image: { src: U("1593504049359-74330189a345"), alt: "Falafel pita with hummus" },
  },
  {
    href: "/menu/items/kapsalon-duzy",
    name: "Kapsalon Duży",
    description: "The Rotterdam classic. Fries, kebab, melted cheese, salad, sauce. Built for two.",
    price: { amount: 43, currency: "PLN" },
    flags: ["featured"],
    image: { src: U("1565299585323-38d6b0865b47"), alt: "Kapsalon with kebab and melted cheese" },
  },
  {
    href: "/menu/items/tacos-x3",
    name: "Tacos x3",
    description: "Three soft tacos, your choice of kebab or falafel, salsa.",
    price: { amount: 29, currency: "PLN" },
    flags: ["spicy"],
    image: { src: U("1565299624946-b28f40a0ae38"), alt: "Three soft tacos" },
  },
  {
    href: "/menu/items/box-strips-mega",
    name: "Box Strips Mega",
    description: "Crispy chicken strips, fries, slaw, two sauces.",
    price: { amount: 39, currency: "PLN" },
    flags: [],
    image: { src: U("1626645738196-c2a7c87a8f9d"), alt: "Box of crispy chicken strips and fries" },
  },
  {
    href: "/menu/items/salatka-kebab-duzy",
    name: "Sałatka Kebab Duży",
    description: "No bread — just greens, kebab meat, tahini, pomegranate.",
    price: { amount: 32, currency: "PLN" },
    flags: ["gluten-free"],
    image: { src: U("1546069901-ba9599a7e63c"), alt: "Kebab salad bowl with greens and pomegranate" },
  },
];

const mockTestimonials = [
  {
    rating: 5,
    quote: "Best kebab in Warsaw, hands down. The tahini sauce is on another level and you can tell the bread is fresh. I've been three times this month.",
    author: { name: "Kasia W.", meta: "Local guide · 42 reviews" },
    source: "google",
  },
  {
    rating: 5,
    quote: "Falafel pita that actually tastes like it should — crispy outside, soft inside, properly spiced. My go-to vegetarian lunch.",
    author: { name: "Tomasz K.", meta: "12 reviews" },
    source: "google",
  },
  {
    rating: 5,
    quote: "The kapsalon is dangerous. In a good way.",
    author: { name: "Anna M.", meta: "5 reviews" },
    source: "google",
  },
  {
    rating: 4,
    quote: "Real quality and fair prices. Sometimes a wait on Fridays but worth it.",
    author: { name: "Michał R.", meta: "Top reviewer" },
    source: "google",
  },
  {
    rating: 5,
    quote: "I'm Lebanese and this is the closest thing to home I've found in Poland. The pickled turnips are perfect.",
    author: { name: "Ola B.", meta: "8 reviews" },
    source: "google",
  },
  {
    rating: 5,
    quote: "Counter staff remember our order. That alone earns five stars.",
    author: { name: "Piotr Z.", meta: "23 reviews" },
    source: "google",
  },
];

const mockHours = [
  { day: "MON", open: "11:00", close: "22:00" },
  { day: "TUE", open: "11:00", close: "22:00" },
  { day: "WED", open: "11:00", close: "22:00" },
  { day: "THU", open: "11:00", close: "22:00" },
  { day: "FRI", open: "11:00", close: "23:00" },
  { day: "SAT", open: "12:00", close: "23:00" },
  { day: "SUN", open: "12:00", close: "21:00" },
];

const mockLocation = {
  address1: "Marszałkowska 102",
  address2: "00-026 Warszawa, Poland",
  phone: "+48 22 555 01 23",
  coords: { lat: 52.2297, lng: 21.0122 },
};

Object.assign(window, {
  mockCategories, mockFeaturedDishes, mockTestimonials, mockHours, mockLocation
});
