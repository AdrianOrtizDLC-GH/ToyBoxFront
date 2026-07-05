export enum ProductCondition {
  Excellent = 'excellent',
  VeryGood = 'very_good',
  Good = 'good',
  Fair = 'fair'
}

export const PRODUCT_CONDITION_LABELS: Record<ProductCondition, string> = {
  [ProductCondition.Excellent]: 'Excelente',
  [ProductCondition.VeryGood]: 'Muy bueno',
  [ProductCondition.Good]: 'Bueno',
  [ProductCondition.Fair]: 'Aceptable'
};