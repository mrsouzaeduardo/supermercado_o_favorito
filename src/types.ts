export interface User {
  id: string;
  name: string;
  email?: string;
  whatsapp?: string;
  points: number;
  createdAt: string;
  city?: string;
  neighborhood?: string;
  streetNumber?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  promoPrice?: number;
  isPromo: boolean;
  image: string;
  pointsAwarded: number;
  stock: number;
  unit: string;
  minStock?: number; // Optional custom safety minimum stock
  costPrice?: number; // Optional purchase cost price for margin calculation
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  userContact: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discountUsed: number;
  total: number;
  pointsEarned: number;
  pointsRedeemed?: number;
  cep: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  paymentMethod: 'pix' | 'credit' | 'cash';
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  createdAt: string;
  trackingHistory: {
    status: 'pending' | 'processing' | 'shipped' | 'delivered';
    timestamp: string;
    description: string;
    driverId?: string;
    driverName?: string;
  }[];
  deliveryDriverId?: string;
  deliveryDriverName?: string;
  deliverySlotId?: string;
  deliveryDate?: string;
}

export interface DeliverySlot {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  maxOrders: number;
  isActive: boolean;
}

export interface DeliveryConfig {
  baseFee: number;
  feePerKm: number;
  freeDeliveryThreshold: number;
  neighborhoodFees: { [key: string]: number };
}

export interface DeliveryDriver {
  id: string;
  name: string;
  birthDate: string;
  phone: string;
  email: string;
  vehicleType: 'carro' | 'moto';
  licensePlate: string;
  createdAt: string;
  imgEntregador?: string;
}

export interface Delivery {
  id: string;
  orderId: string;
  driverId: string;
  driverName: string;
  clientName: string;
  deliveryAddress: string;
  status: 'shipped' | 'delivered' | 'returned';
  assignedAt: string;
  deliveredAt?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  movementType: 'venda' | 'reposicao' | 'ajuste';
  orderId?: string;
  createdAt: string;
}

