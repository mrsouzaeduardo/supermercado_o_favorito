import { Product } from '../types';

export const mockProducts: Product[] = [
  // Hortifrúti
  {
    id: 'h1',
    name: 'Tomate Italiano Especial',
    description: 'Tomates vermelhos maduros selecionados, perfeitos para saladas e molhos. Preço por kg.',
    category: 'Hortifrúti',
    price: 8.90,
    promoPrice: 5.99,
    isPromo: true,
    image: 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=400&auto=format&fit=crop&q=80',
    pointsAwarded: 3,
    stock: 50,
    unit: 'kg'
  },
  {
    id: 'h2',
    name: 'Banana Prata Orgânica',
    description: 'Banana prata orgânica cultivada sem agrotóxicos. Rica em potássio. Pencas aprox 1kg.',
    category: 'Hortifrúti',
    price: 7.50,
    promoPrice: 4.89,
    isPromo: true,
    image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&auto=format&fit=crop&q=80',
    pointsAwarded: 2,
    stock: 80,
    unit: 'kg'
  },
  {
    id: 'h3',
    name: 'Alface Crespa Higienizada',
    description: 'Folhas crocantes e fresquinhas, prontas para consumo. Produzida em hidroponia.',
    category: 'Hortifrúti',
    price: 4.50,
    isPromo: false,
    image: 'https://images.unsplash.com/photo-1622484211148-716221430537?w=400&auto=format&fit=crop&q=80',
    pointsAwarded: 1,
    stock: 40,
    unit: 'un'
  },
  {
    id: 'h4',
    name: 'Laranja Pêra Doce',
    description: 'Laranjas selecionadas de casca fina e muito suco. Ideal para o café da manhã. Pacote com 2kg.',
    category: 'Hortifrúti',
    price: 12.90,
    promoPrice: 9.90,
    isPromo: true,
    image: 'https://images.unsplash.com/photo-1547514701-42782101795e?w=400&auto=format&fit=crop&q=80',
    pointsAwarded: 5,
    stock: 60,
    unit: 'pct'
  },

  // Açougue
  {
    id: 'a1',
    name: 'Picanha Bovina Fatiada Premium',
    description: 'Corte nobre com excelente capa de gordura, extremamente macia e suculenta. Preço por kg.',
    category: 'Açougue',
    price: 89.90,
    promoPrice: 74.90,
    isPromo: true,
    image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=400&auto=format&fit=crop&q=80',
    pointsAwarded: 25,
    stock: 20,
    unit: 'kg'
  },
  {
    id: 'a2',
    name: 'Filé de Frango Rezende',
    description: 'Filézinhos de peito de frango congelados e soltinhos, prontos para grelhar. Pacote de 1kg.',
    category: 'Açougue',
    price: 21.90,
    promoPrice: 17.90,
    isPromo: true,
    image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&auto=format&fit=crop&q=80',
    pointsAwarded: 8,
    stock: 35,
    unit: 'kg'
  },
  {
    id: 'a3',
    name: 'Linguiça Toscana Sadia para Churrasco',
    description: 'Sabor tradicional e com tempero no ponto certo. Excelente para churrasco ou grelha.',
    category: 'Açougue',
    price: 24.90,
    isPromo: false,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80',
    pointsAwarded: 6,
    stock: 45,
    unit: 'kg'
  },

  // Mercearia
  {
    id: 'm1',
    name: 'Arroz Integral Tipo 1 Tio João',
    description: 'Arroz integral de grãos selecionados, rico em fibras e nutrientes básicos. Pacote de 1kg.',
    category: 'Mercearia',
    price: 9.80,
    isPromo: false,
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80',
    pointsAwarded: 4,
    stock: 120,
    unit: 'un'
  },
  {
    id: 'm2',
    name: 'Feijão Carioca Tipo 1 Camil',
    description: 'Feijão carioca de cozimento rápido, produz caldo grosso e muito saboroso. Pacote de 1kg.',
    category: 'Mercearia',
    price: 11.50,
    promoPrice: 8.49,
    isPromo: true,
    image: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&auto=format&fit=crop&q=80',
    pointsAwarded: 5,
    stock: 100,
    unit: 'un'
  },
  {
    id: 'm3',
    name: 'Café Espresso Gourmet Melitta',
    description: 'Café torrado e moído com aroma intenso e notas de chocolate. Vácuo 250g.',
    category: 'Mercearia',
    price: 18.90,
    promoPrice: 14.99,
    isPromo: true,
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&auto=format&fit=crop&q=80',
    pointsAwarded: 6,
    stock: 55,
    unit: 'un'
  },
  {
    id: 'm4',
    name: 'Azeite de Oliva Extra Virgem Andorinha',
    description: 'Azeite português de acidez máxima 0.5%, sabor equilibrado para saladas e pratos quentes. Vidro 500ml.',
    category: 'Mercearia',
    price: 36.90,
    isPromo: false,
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80',
    pointsAwarded: 12,
    stock: 30,
    unit: 'un'
  },

  // Padaria
  {
    id: 'p1',
    name: 'Pão Francês Crocante Soltinho',
    description: 'Pão francês fresquinho, crocante por fora e macio por dentro. Assado de hora em hora. Preço por kg.',
    category: 'Padaria',
    price: 18.50,
    promoPrice: 14.90,
    isPromo: true,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80',
    pointsAwarded: 4,
    stock: 200,
    unit: 'kg'
  },
  {
    id: 'p2',
    name: 'Bolo de Cenoura com Cobertura de Chocolate',
    description: 'Bolo caseiro super fofinho com espessa calda de chocolate e granulado.',
    category: 'Padaria',
    price: 22.00,
    isPromo: false,
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&auto=format&fit=crop&q=80',
    pointsAwarded: 8,
    stock: 15,
    unit: 'un'
  },

  // Bebidas
  {
    id: 'b1',
    name: 'Suco de Uva Integral Aurora',
    description: 'Suco 100% uva tinta, sem adição de açúcar ou conservantes. Muito saudável. Garrafa 1L.',
    category: 'Bebidas',
    price: 16.90,
    promoPrice: 12.90,
    isPromo: true,
    image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&auto=format&fit=crop&q=80',
    pointsAwarded: 6,
    stock: 80,
    unit: 'un'
  },
  {
    id: 'b2',
    name: 'Cerveja Esportiva Craft IPA',
    description: 'Cerveja artesanal estilo IPA com amargor equilibrado e notas cítricas marcantes. Lata 473ml.',
    category: 'Bebidas',
    price: 11.90,
    isPromo: false,
    image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&auto=format&fit=crop&q=80',
    pointsAwarded: 3,
    stock: 90,
    unit: 'un'
  },
  {
    id: 'b3',
    name: 'Refrigerante Guaraná Antarctica 2L',
    description: 'Guaraná Antarctica original bem gelado, excelente para acompanhar as refeições.',
    category: 'Bebidas',
    price: 9.50,
    promoPrice: 7.99,
    isPromo: true,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80',
    pointsAwarded: 2,
    stock: 150,
    unit: 'un'
  },

  // Limpeza e Higiene
  {
    id: 'l1',
    name: 'Sabão Líquido Especial Omo',
    description: 'Lava-roupas líquido concentrado de alta eficácia com perfume duradouro. Galão 3L.',
    category: 'Limpeza/Higiene',
    price: 49.90,
    promoPrice: 39.90,
    isPromo: true,
    image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&auto=format&fit=crop&q=80',
    pointsAwarded: 15,
    stock: 50,
    unit: 'un'
  },
  {
    id: 'l2',
    name: 'Creme Dental Colgate Total 12',
    description: 'Prevenção de cáries, placa bacteriana, gengivite e hálito fresco. Leve 3 e Pague 2.',
    category: 'Limpeza/Higiene',
    price: 15.90,
    isPromo: false,
    image: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400&auto=format&fit=crop&q=80',
    pointsAwarded: 5,
    stock: 120,
    unit: 'kit'
  }
];

export const CATEGORIES = [
  'Todos',
  'Açougue',
  'Bebês',
  'Bebidas',
  'Carvões',
  'Chocolates e Balas',
  'Descartáveis',
  'Gelos',
  'Higiene',
  'Hortifrúti',
  'Laticínios',
  'Limpeza',
  'Mercearia',
  'Padaria',
  'Ração',
  'Salgadinhos',
  'Sorvetes',
  'Utilidades',
  'Papelaria',
  'Frios e Congelados'
];
