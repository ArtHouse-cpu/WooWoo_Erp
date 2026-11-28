export function foodCategoryEmoji(category: string) {
  const value = category.toLowerCase();
  if (value.includes('drink') || value.includes('coffee') || value.includes('beverage')) return '☕';
  if (value.includes('start')) return '🍟';
  if (value.includes('break')) return '🥞';
  if (value.includes('dessert') || value.includes('sweet')) return '🍰';
  if (value.includes('snack')) return '🍿';
  return '🍽️';
}
