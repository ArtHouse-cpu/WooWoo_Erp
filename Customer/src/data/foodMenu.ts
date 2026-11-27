export type FoodMenuCategory = 'drinks' | 'starter' | 'breakfast';

export type FoodMenuItem = {
  id: string;
  name: string;
  category: FoodMenuCategory;
  price: number;
  image: string;
  description?: string;
  isVeg?: boolean;
  tag?: string;
};

export type FoodCategoryTab = {
  id: FoodMenuCategory;
  label: string;
  emoji: string;
};

export const FOOD_MENU_CATEGORIES: FoodCategoryTab[] = [
  {id: 'drinks', label: 'Drinks', emoji: '☕'},
  {id: 'starter', label: 'Starter', emoji: '🍟'},
  {id: 'breakfast', label: 'Breakfast', emoji: '🥞'},
];

export const SAMPLE_FOOD_MENU: FoodMenuItem[] = [
  // ================= DRINKS =================
  {
    id: 'drink-1',
    name: 'Artisanal Hot Chocolate',
    category: 'drinks',
    price: 180,
    image: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=600&q=80',
    description: 'Rich melted Belgian chocolate with velvety steamed milk and marshmallow.',
    isVeg: true,
    tag: 'Bestseller',
  },
  {
    id: 'drink-2',
    name: 'Iced Caramel Macchiato',
    category: 'drinks',
    price: 220,
    image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
    description: 'Freshly pulled espresso layered over milk, vanilla syrup, and golden caramel drizzle.',
    isVeg: true,
    tag: 'Popular',
  },
  {
    id: 'drink-3',
    name: 'Peach & Passionfruit Iced Tea',
    category: 'drinks',
    price: 160,
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80',
    description: 'Brewed black tea infused with natural white peach and tropical passionfruit puree.',
    isVeg: true,
  },
  {
    id: 'drink-4',
    name: 'Classic Cold Coffee with Ice Cream',
    category: 'drinks',
    price: 190,
    image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80',
    description: 'Thick, creamy cold blended coffee topped with a generous scoop of vanilla ice cream.',
    isVeg: true,
    tag: 'Chef Pick',
  },
  {
    id: 'drink-5',
    name: 'Matcha Green Tea Latte',
    category: 'drinks',
    price: 240,
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80',
    description: 'Ceremonial grade Japanese Uji matcha whisked with warm almond or whole milk.',
    isVeg: true,
  },
  {
    id: 'drink-6',
    name: 'Fresh Berry Mint Mojito',
    category: 'drinks',
    price: 180,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
    description: 'Muddled garden mint, fresh lime wedges, sparkling water, and crushed mixed berries.',
    isVeg: true,
  },
  {
    id: 'drink-7',
    name: 'Hazelnut Frothy Cappuccino',
    category: 'drinks',
    price: 200,
    image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80',
    description: 'Dark roasted espresso with toasted hazelnut notes and thick micro-foam latte art.',
    isVeg: true,
  },
  {
    id: 'drink-8',
    name: 'Fresh Lemon Mint Cooler',
    category: 'drinks',
    price: 150,
    image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=600&q=80',
    description: 'Zesty lemon juice, crushed ice, black salt, and hand-plucked garden mint leaves.',
    isVeg: true,
  },

  // ================= STARTER =================
  {
    id: 'starter-1',
    name: 'Peri Peri Crispy Fries',
    category: 'starter',
    price: 160,
    image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80',
    description: 'Golden double-fried potato fries generously dusted with spicy African bird’s eye seasoning.',
    isVeg: true,
    tag: 'Bestseller',
  },
  {
    id: 'starter-2',
    name: 'Cheesy Loaded Mexican Nachos',
    category: 'starter',
    price: 240,
    image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=600&q=80',
    description: 'Crispy corn tortilla chips baked with cheddar cheese sauce, refried beans, and jalapenos.',
    isVeg: true,
    tag: 'Popular',
  },
  {
    id: 'starter-3',
    name: 'Paneer Tikka Herb Bruschetta',
    category: 'starter',
    price: 220,
    image: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=600&q=80',
    description: 'Crisp garlic crostini topped with charred tandoori cottage cheese and basil dressing.',
    isVeg: true,
  },
  {
    id: 'starter-4',
    name: 'Garlic Butter Stuffed Mushrooms',
    category: 'starter',
    price: 210,
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
    description: 'Button mushrooms filled with spiced herb cheese, baked in sizzling garlic butter.',
    isVeg: true,
    tag: 'Chef Pick',
  },
  {
    id: 'starter-5',
    name: 'Crispy Corn Salt & Pepper',
    category: 'starter',
    price: 190,
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
    description: 'Crunchy sweet corn kernels tossed with scallions, crushed black pepper, and bell peppers.',
    isVeg: true,
  },
  {
    id: 'starter-6',
    name: 'Classic Cheesy Garlic Bread',
    category: 'starter',
    price: 170,
    image: 'https://images.unsplash.com/photo-1619895092538-128341789043?auto=format&fit=crop&w=600&q=80',
    description: 'Toasted artisan baguette slices smothered in herb butter and melted mozzarella cheese.',
    isVeg: true,
  },
  {
    id: 'starter-7',
    name: 'Farm Fresh Salsa Tacos',
    category: 'starter',
    price: 230,
    image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=600&q=80',
    description: 'Soft-shell tacos filled with grilled corn, seasoned bell peppers, guacamole, and salsa fresca.',
    isVeg: true,
  },
  {
    id: 'starter-8',
    name: 'BBQ Glazed Paneer Skewers',
    category: 'starter',
    price: 220,
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80',
    description: 'Tender cottage cheese cubes skewers grilled with smoky hickory barbecue glaze.',
    isVeg: true,
  },

  // ================= BREAKFAST =================
  {
    id: 'breakfast-1',
    name: 'Belgian Waffles with Maple Syrup',
    category: 'breakfast',
    price: 260,
    image: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80',
    description: 'Crisp golden malted waffles served with 100% pure Canadian maple syrup and whipped butter.',
    isVeg: true,
    tag: 'Bestseller',
  },
  {
    id: 'breakfast-2',
    name: 'Fluffy Blueberry Pancakes',
    category: 'breakfast',
    price: 240,
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=600&q=80',
    description: 'Triple stack of buttermilk pancakes bursting with blueberries, drizzled with berry compote.',
    isVeg: true,
    tag: 'Popular',
  },
  {
    id: 'breakfast-3',
    name: 'Sourdough Avocado Toast',
    category: 'breakfast',
    price: 280,
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
    description: 'Toasted natural sourdough crowned with smashed Hass avocado, chia seeds, and cherry tomatoes.',
    isVeg: true,
    tag: 'Healthy',
  },
  {
    id: 'breakfast-4',
    name: 'Farmhouse Cheese Omelette',
    category: 'breakfast',
    price: 210,
    image: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=600&q=80',
    description: 'Three-egg folded fluffy omelette loaded with cheddar, sautéed mushrooms, and baby spinach.',
    isVeg: false,
  },
  {
    id: 'breakfast-5',
    name: 'Nutella & Banana French Toast',
    category: 'breakfast',
    price: 250,
    image: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=600&q=80',
    description: 'Brioche bread soaked in spiced custard, seared golden, and drizzled with warm hazelnut spread.',
    isVeg: true,
    tag: 'Sweet Tooth',
  },
  {
    id: 'breakfast-6',
    name: 'Berry Granola Greek Yogurt Bowl',
    category: 'breakfast',
    price: 230,
    image: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=600&q=80',
    description: 'Thick strained probiotic yogurt layered with crunchy almond granola, honey, and fresh berries.',
    isVeg: true,
    tag: 'Healthy',
  },
  {
    id: 'breakfast-7',
    name: 'Grilled Veg Club Triple Sandwich',
    category: 'breakfast',
    price: 220,
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
    description: 'Three-layered toasted sandwich with crunchy cucumber, tomato, cheese slice, and mint chutney.',
    isVeg: true,
  },
  {
    id: 'breakfast-8',
    name: 'Full WooFoo Breakfast Platter',
    category: 'breakfast',
    price: 320,
    image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=600&q=80',
    description: 'Signature breakfast feast: baked beans, grilled tomatoes, hash browns, sautéed mushrooms, and toast.',
    isVeg: true,
    tag: 'Platter',
  },
];
