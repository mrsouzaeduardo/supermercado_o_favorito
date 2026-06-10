import { createClient } from '@supabase/supabase-js';
import { Product, User, Order, DeliveryConfig, DeliveryDriver, Delivery, StockMovement, DeliverySlot } from '../types';
import { mockProducts } from '../data/mockProducts';

// Robust environment lookup checks for process.env (Vite defined) and import.meta.env
const getEnvVar = (key: string): string => {
  // Try standard Vite import.meta.env
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    if ((import.meta as any).env[key]) return (import.meta as any).env[key];
    if ((import.meta as any).env[`VITE_${key}`]) return (import.meta as any).env[`VITE_${key}`];
  }
  // Try process.env
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env[key]) return process.env[key]!;
      if (process.env[`VITE_${key}`]) return process.env[`VITE_${key}`]!;
    }
  } catch (e) {
    // ignore
  }
  return '';
};

// Retrieve Supabase environment variables if present (prioritizing URL_SUPABASE & KEY_SUPABASE)
const SUPABASE_URL = getEnvVar('URL_SUPABASE') || getEnvVar('SUPABASE_URL') || 'https://omecgzlgvhqoupselomj.supabase.co';
const SUPABASE_ANON_KEY = getEnvVar('KEY_SUPABASE') || getEnvVar('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tZWNnemxndmhxb3Vwc2Vsb21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzA2MDIsImV4cCI6MjA5NjUwNjYwMn0.x6Tc6I0mBL69Z6ok_Cjq6sCkxKNTw1UA_bMRDNsL9kw';

// Verify if Supabase is properly configured
const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Display connection status or guidelines
export function getDbMode() {
  return {
    isSupabase: isSupabaseConfigured,
    url: SUPABASE_URL,
    status: isSupabaseConfigured ? 'conectado' : 'mock-local',
  };
}

// Ensure base database files are present in localStorage for mock mode
const LOCAL_STORAGE_PREFIX = 'O_FAVORITO_DB_';

function getLocalData<T>(key: string, defaultValue: T): T {
  try {
    if (typeof localStorage === 'undefined') {
      return defaultValue;
    }
    const data = localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
    if (!data) {
      localStorage.setItem(LOCAL_STORAGE_PREFIX + key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(data);
  } catch (e) {
    return defaultValue;
  }
}

function setLocalData<T>(key: string, value: T): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_PREFIX + key, JSON.stringify(value));
    }
  } catch (e) {
    // ignore
  }
}

// Database APIs with automatic fallback
export const db = {
  // PRODUCTS
  async getProducts(): Promise<Product[]> {
    if (supabase) {
      try {
        // Try standard unified products table first
        let rawProducts: any[] = [];
        try {
          const { data, error } = await supabase
            .from('products')
            .select('*');
          if (!error && data && data.length > 0) {
            rawProducts = data;
          }
        } catch (err) {
          // Unified products table might not exist or failed
        }
        
        // If standard products has no data, let's try querying individual category tables
        if (rawProducts.length === 0) {
          const categories = [
            { table: 'acougue', label: 'Açougue' },
            { table: 'bebes', label: 'Bebês' },
            { table: 'bebidas', label: 'Bebidas' },
            { table: 'carvoes', label: 'Carvões' },
            { table: 'chocolates_e_balas', label: 'Chocolates e Balas' },
            { table: 'descartaveis', label: 'Descartáveis' },
            { table: 'gelos', label: 'Gelos' },
            { table: 'higiene', label: 'Higiene' },
            { table: 'hortifruti', label: 'Hortifrúti' },
            { table: 'laticinios', label: 'Laticínios' },
            { table: 'limpeza', label: 'Limpeza' },
            { table: 'mercearia', label: 'Mercearia' },
            { table: 'padaria', label: 'Padaria' },
            { table: 'racao', label: 'Ração' },
            { table: 'salgadinhos', label: 'Salgadinhos' },
            { table: 'sorvetes', label: 'Sorvetes' },
            { table: 'utilidades', label: 'Utilidades' },
            { table: 'papelaria', label: 'Papelaria' },
            { table: 'frios_e_congelados', label: 'Frios e Congelados' }
          ];
          
          const categoryPromises = categories.map(async (cat) => {
            try {
              const { data: catData, error: catErr } = await supabase
                .from(cat.table)
                .select('*');
              if (!catErr && catData) {
                return catData.map(item => ({ ...item, category: cat.label }));
              }
            } catch (err) {
              // Ignore Table Not Found error
            }
            return [];
          });
          
          const results = await Promise.all(categoryPromises);
          const accumulated = results.flat();
          if (accumulated.length > 0) {
            rawProducts = accumulated;
          }
        }

        if (rawProducts.length > 0) {
          return rawProducts.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            category: p.category,
            price: Number(p.price),
            promoPrice: p.promo_price ? Number(p.promo_price) : undefined,
            isPromo: Boolean(p.is_promo),
            image: p.image,
            pointsAwarded: Number(p.points_awarded || 0),
            stock: (p.stock !== undefined && p.stock !== null) ? Number(p.stock) : 50,
            unit: p.unit || 'un',
            minStock: (p.min_stock !== undefined && p.min_stock !== null) ? Number(p.min_stock) : undefined,
            costPrice: (p.cost_price !== undefined && p.cost_price !== null) ? Number(p.cost_price) : undefined,
          }));
        }
      } catch (e) {
        console.error('Supabase getProducts error, falling back to local:', e);
      }
    }
    // Fallback to local / mock
    return getLocalData<Product[]>('products', mockProducts);
  },

  async updateProduct(product: Product): Promise<void> {
    product.name = product.name.toUpperCase();
    if (supabase) {
      try {
        // Store in unified products
        const { error } = await supabase
          .from('products')
          .upsert({
            id: product.id,
            name: product.name,
            description: product.description,
            category: product.category,
            price: product.price,
            promo_price: product.promoPrice,
            is_promo: product.isPromo,
            image: product.image,
            points_awarded: product.pointsAwarded,
            stock: product.stock,
            unit: product.unit,
            min_stock: product.minStock,
            cost_price: product.costPrice,
          });

        // Also try to store in category-specific table if available
        const categoryTableMap: Record<string, string> = {
          'Açougue': 'acougue',
          'Bebês': 'bebes',
          'Bebidas': 'bebidas',
          'Carvões': 'carvoes',
          'Chocolates e Balas': 'chocolates_e_balas',
          'Descartáveis': 'descartaveis',
          'Gelos': 'gelos',
          'Higiene': 'higiene',
          'Hortifrúti': 'hortifruti',
          'Laticínios': 'laticinios',
          'Limpeza': 'limpeza',
          'Mercearia': 'mercearia',
          'Padaria': 'padaria',
          'Ração': 'racao',
          'Salgadinhos': 'salgadinhos',
          'Sorvetes': 'sorvetes',
          'Utilidades': 'utilidades',
          'Papelaria': 'papelaria',
          'Frios e Congelados': 'frios_e_congelados'
        };
        const table = categoryTableMap[product.category];
        if (table) {
          try {
            await supabase.from(table).upsert({
              id: product.id,
              name: product.name,
              description: product.description,
              price: product.price,
              promo_price: product.promoPrice,
              is_promo: product.isPromo,
              image: product.image,
              points_awarded: product.pointsAwarded,
              stock: product.stock,
              unit: product.unit,
              min_stock: product.minStock,
              cost_price: product.costPrice,
            });
          } catch (e) {
            // Ignore if category table does not exist yet
          }
        }

        if (!error) return;
      } catch (e) {
        console.error('Supabase updateProduct error:', e);
      }
    }
    const list = getLocalData<Product[]>('products', mockProducts);
    const index = list.findIndex((p) => p.id === product.id);
    if (index !== -1) {
      list[index] = product;
    } else {
      list.push(product);
    }
    setLocalData('products', list);
  },

  async deleteProduct(id: string, category: string): Promise<void> {
    if (supabase) {
      try {
        // Delete from unified products
        await supabase
          .from('products')
          .delete()
          .eq('id', id);

        // Delete from category table
        const categoryTableMap: Record<string, string> = {
          'Açougue': 'acougue',
          'Bebês': 'bebes',
          'Bebidas': 'bebidas',
          'Carvões': 'carvoes',
          'Chocolates e Balas': 'chocolates_e_balas',
          'Descartáveis': 'descartaveis',
          'Gelos': 'gelos',
          'Higiene': 'higiene',
          'Hortifrúti': 'hortifruti',
          'Laticínios': 'laticinios',
          'Limpeza': 'limpeza',
          'Mercearia': 'mercearia',
          'Padaria': 'padaria',
          'Ração': 'racao',
          'Salgadinhos': 'salgadinhos',
          'Sorvetes': 'sorvetes',
          'Utilidades': 'utilidades',
          'Papelaria': 'papelaria',
          'Frios e Congelados': 'frios_e_congelados'
        };
        const table = categoryTableMap[category];
        if (table) {
          try {
            await supabase
              .from(table)
              .delete()
              .eq('id', id);
          } catch (e) {
            // Ignore if subtable delete fails
          }
        }
      } catch (e) {
        console.error('Supabase deleteProduct error:', e);
      }
    }
    const list = getLocalData<Product[]>('products', mockProducts);
    const updatedList = list.filter((p) => p.id !== id);
    setLocalData('products', updatedList);
  },

  // USERS / LOGINS WITH SECURE PASSWORDS
  async loginOrRegister(contact: string, name: string, password?: string): Promise<User> {
    const isEmail = contact.includes('@');
    const cleanContact = contact.trim().toLowerCase();

    if (supabase) {
      try {
        // Query if user exists
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .or(`email.eq."${cleanContact}",whatsapp.eq."${cleanContact}"`);

        if (!error && data && data.length > 0) {
          const user = data[0];
          
          // Verify password if set
          if (password && user.password) {
            if (user.password !== password) {
              throw new Error('PASSWORD_INCORRECT');
            }
          } else if (password && !user.password) {
            // If the user didn't have a password set up, save it as their password now
            await supabase
              .from('users')
              .update({ password })
              .eq('id', user.id);
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            whatsapp: user.whatsapp,
            points: Number(user.points),
            createdAt: user.created_at,
          };
        } else {
          // Register user
          const newUserPayload = {
            id: 'u_' + Math.random().toString(36).substr(2, 9),
            name: (name || 'Cliente O Favorito').trim().toUpperCase(),
            points: 10, // 10 welcome points!
            created_at: new Date().toISOString(),
            email: isEmail ? cleanContact : null,
            whatsapp: !isEmail ? cleanContact : null,
            password: password || null,
          };

          const { error: insertError } = await supabase
            .from('users')
            .insert([newUserPayload]);

          if (insertError) {
             throw new Error('REGISTRATION_FAILED');
          }

          return {
            id: newUserPayload.id,
            name: newUserPayload.name,
            email: newUserPayload.email,
            whatsapp: newUserPayload.whatsapp,
            points: newUserPayload.points,
            createdAt: newUserPayload.created_at,
          };
        }
      } catch (e: any) {
        if (e.message === 'PASSWORD_INCORRECT' || e.message === 'REGISTRATION_FAILED') {
          throw e;
        }
        console.error('Supabase auth error, falling back to local Auth:', e);
      }
    }

    // Fallback Mock Local Auth
    const users = getLocalData<any[]>('users', []);
    let user = users.find(
      (u) =>
        u.email?.toLowerCase() === cleanContact || u.whatsapp === cleanContact
    );

    if (!user) {
      user = {
        id: 'u_' + Math.random().toString(36).substr(2, 9),
        name: (name || 'Cliente O Favorito').trim().toUpperCase(),
        points: 10, // 10 points bonus on sign up
        email: isEmail ? cleanContact : undefined,
        whatsapp: !isEmail ? cleanContact : undefined,
        password: password || null,
        createdAt: new Date().toISOString(),
      };
      users.push(user);
      setLocalData('users', users);
    } else {
      if (password && user.password) {
        if (user.password !== password) {
          throw new Error('PASSWORD_INCORRECT');
        }
      } else if (password && !user.password) {
        user.password = password;
        setLocalData('users', users);
      }
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      whatsapp: user.whatsapp,
      points: user.points,
      createdAt: user.createdAt,
    };
  },

  async resetUserPassword(contact: string, newPassword?: string): Promise<{ success: boolean; message: string }> {
    const cleanContact = contact.trim().toLowerCase();
    
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .or(`email.eq."${cleanContact}",whatsapp.eq."${cleanContact}"`);

        if (!error && data && data.length > 0) {
          const user = data[0];
          const tempPassword = Math.random().toString(36).substr(2, 6).toUpperCase();
          const pwdToSet = newPassword || tempPassword;
          const { error: updateError } = await supabase
            .from('users')
            .update({ password: pwdToSet })
            .eq('id', user.id);

          if (!updateError) {
            return { 
              success: true, 
              message: `Recuperação bem-sucedida! Sua nova senha provisória é: ${pwdToSet}. Faça o seu login usando-a agora.` 
            };
          }
        }
      } catch (e) {
        console.error('Password reset issue on Supabase:', e);
      }
    }

    // Fallback Mock Reset
    const users = getLocalData<any[]>('users', []);
    const index = users.findIndex(u => u.email?.toLowerCase() === cleanContact || u.whatsapp === cleanContact);
    if (index !== -1) {
      const tempPassword = Math.random().toString(36).substr(2, 6).toUpperCase();
      const pwdToSet = newPassword || tempPassword;
      users[index].password = pwdToSet;
      setLocalData('users', users);
      return { 
        success: true, 
        message: `Recuperação bem-sucedida (Local)! Sua nova senha provisória é: ${pwdToSet}. Faça o seu login usando-a agora.` 
      };
    }
    return { success: false, message: 'Usuário não encontrado com este contato de E-mail ou WhatsApp.' };
  },

  // ADMINISTRATIVE MANAGER LOGIN
  async adminLogin(username: string, password: string): Promise<{ success: boolean; name?: string; message: string }> {
    const cleanUser = username.trim().toLowerCase();
    
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('username', cleanUser);
        
        if (!error && data && data.length > 0) {
          const admin = data[0];
          if (admin.password === password) {
            return { success: true, name: admin.name || 'Gerência', message: 'Sucesso' };
          } else {
            return { success: false, message: 'Senha incorreta para a conta de gerente.' };
          }
        }
      } catch (e) {
        console.error('Supabase admin login issues:', e);
      }
    }

    // Local / Bootstrap default admin login credentials
    const admins = getLocalData<any[]>('admin_users', [
      { id: 'adm_1', username: 'admin', password: 'admin', name: 'Administrador Vitta' }
    ]);
    const admin = admins.find(a => a.username.toLowerCase() === cleanUser);
    if (admin) {
      if (admin.password === password) {
        return { success: true, name: admin.name, message: 'Sucesso' };
      } else {
        return { success: false, message: 'Senha incorreta para a conta de gerente.' };
      }
    }
    return { success: false, message: 'Login de administrador não encontrado. Caso tenha iniciado o Supabase, certifique-se de popular a tabela admin_users!' };
  },

  async updateUserPoints(userId: string, points: number): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase
          .from('users')
          .update({ points })
          .eq('id', userId);
        if (!error) return;
      } catch (e) {
        console.error('Supabase updateUserPoints error:', e);
      }
    }
    const users = getLocalData<User[]>('users', []);
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex].points = points;
      setLocalData('users', users);
    }
  },

  async getUsers(): Promise<User[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          return data.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email || '',
            whatsapp: u.whatsapp || '',
            points: Number(u.points || 0),
            createdAt: u.created_at,
            city: u.city || '',
            neighborhood: u.neighborhood || '',
            streetNumber: u.street_number || '',
          }));
        }
      } catch (e) {
        console.error('Error fetching users from Supabase:', e);
      }
    }
    const localUsers = getLocalData<any[]>('users', []);
    return localUsers.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email || '',
      whatsapp: u.whatsapp || '',
      points: Number(u.points || 0),
      createdAt: u.createdAt || u.created_at || new Date().toISOString(),
      city: u.city || '',
      neighborhood: u.neighborhood || '',
      streetNumber: u.streetNumber || u.street_number || '',
    }));
  },

  async registerClient(client: {
    name: string;
    email?: string;
    whatsapp?: string;
    city?: string;
    neighborhood?: string;
    streetNumber?: string;
    password?: string;
  }): Promise<User> {
    const uppercaseName = (client.name || 'Cliente O Favorito').trim().toUpperCase();
    const uppercaseCity = (client.city || '').trim().toUpperCase();
    const uppercaseNeighborhood = (client.neighborhood || '').trim().toUpperCase();
    const uppercaseStreet = (client.streetNumber || '').trim().toUpperCase();

    if (supabase) {
      try {
        const newUserPayload = {
          id: 'u_' + Math.random().toString(36).substr(2, 9),
          name: uppercaseName,
          points: 10,
          created_at: new Date().toISOString(),
          email: client.email ? client.email.trim().toLowerCase() : null,
          whatsapp: client.whatsapp ? client.whatsapp.trim() : null,
          password: client.password || null,
          city: uppercaseCity || null,
          neighborhood: uppercaseNeighborhood || null,
          street_number: uppercaseStreet || null,
        };

        const { error: insertError } = await supabase
          .from('users')
          .insert([newUserPayload]);

        if (insertError) {
          throw new Error('REGISTRATION_FAILED: ' + insertError.message);
        }

        return {
          id: newUserPayload.id,
          name: newUserPayload.name,
          email: newUserPayload.email || '',
          whatsapp: newUserPayload.whatsapp || '',
          points: newUserPayload.points,
          createdAt: newUserPayload.created_at,
          city: newUserPayload.city || '',
          neighborhood: newUserPayload.neighborhood || '',
          streetNumber: newUserPayload.street_number || '',
        };
      } catch (err) {
        console.error('Supabase client registration error:', err);
        throw err;
      }
    }

    const users = getLocalData<any[]>('users', []);
    const newUser = {
      id: 'u_' + Math.random().toString(36).substr(2, 9),
      name: uppercaseName,
      points: 10,
      email: client.email || '',
      whatsapp: client.whatsapp || '',
      password: client.password || null,
      city: uppercaseCity,
      neighborhood: uppercaseNeighborhood,
      streetNumber: uppercaseStreet,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    setLocalData('users', users);
    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      whatsapp: newUser.whatsapp,
      points: newUser.points,
      createdAt: newUser.createdAt,
      city: newUser.city,
      neighborhood: newUser.neighborhood,
      streetNumber: newUser.streetNumber,
    };
  },

  async updateClientProfile(userId: string, updates: {
    name: string;
    email?: string;
    whatsapp?: string;
    city?: string;
    neighborhood?: string;
    streetNumber?: string;
  }): Promise<User> {
    const uppercaseName = (updates.name || '').trim().toUpperCase();
    const uppercaseCity = (updates.city || '').trim().toUpperCase();
    const uppercaseNeighborhood = (updates.neighborhood || '').trim().toUpperCase();
    const uppercaseStreet = (updates.streetNumber || '').trim().toUpperCase();

    if (supabase) {
      try {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            name: uppercaseName,
            email: updates.email ? updates.email.trim().toLowerCase() : null,
            whatsapp: updates.whatsapp ? updates.whatsapp.trim() : null,
            city: uppercaseCity || null,
            neighborhood: uppercaseNeighborhood || null,
            street_number: uppercaseStreet || null,
          })
          .eq('id', userId);

        if (updateError) {
          throw new Error('UPDATE_FAILED: ' + updateError.message);
        }
      } catch (err) {
        console.error('Supabase client update error, using fallback:', err);
      }
    }

    const users = getLocalData<any[]>('users', []);
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx] = {
        ...users[idx],
        name: uppercaseName,
        email: updates.email || '',
        whatsapp: updates.whatsapp || '',
        city: uppercaseCity,
        neighborhood: uppercaseNeighborhood,
        streetNumber: uppercaseStreet,
      };
      setLocalData('users', users);
    }

    const updated = users.find(u => u.id === userId) || {
      id: userId,
      name: uppercaseName,
      email: updates.email || '',
      whatsapp: updates.whatsapp || '',
      points: 0,
      createdAt: new Date().toISOString(),
      city: uppercaseCity,
      neighborhood: uppercaseNeighborhood,
      streetNumber: uppercaseStreet,
    };

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email || '',
      whatsapp: updated.whatsapp || '',
      points: Number(updated.points || 0),
      createdAt: updated.createdAt || updated.created_at || new Date().toISOString(),
      city: updated.city || '',
      neighborhood: updated.neighborhood || '',
      streetNumber: updated.streetNumber || updated.street_number || '',
    };
  },

  // ORDERS
  async createOrder(order: Order): Promise<void> {
    if (supabase) {
      try {
        const insertPayload: any = {
          id: order.id,
          user_id: order.userId,
          user_contact: order.userContact,
          items: order.items,
          subtotal: order.subtotal,
          delivery_fee: order.deliveryFee,
          discount_used: order.discountUsed,
          total: order.total,
          points_earned: order.pointsEarned,
          points_redeemed: order.pointsRedeemed,
          cep: order.cep,
          address: order.address,
          number: order.number,
          complement: order.complement,
          neighborhood: order.neighborhood,
          city: order.city,
          payment_method: order.paymentMethod,
          status: order.status,
          created_at: order.createdAt,
          tracking_history: order.trackingHistory
        };
        if (order.deliveryDriverId) {
          insertPayload.delivery_driver_id = order.deliveryDriverId;
        }
        if (order.deliveryDriverName) {
          insertPayload.delivery_driver_name = order.deliveryDriverName;
        }
        if (order.deliverySlotId) {
          insertPayload.delivery_slot_id = order.deliverySlotId;
        }
        if (order.deliveryDate) {
          insertPayload.delivery_date = order.deliveryDate;
        }
        const { error } = await supabase.from('orders').insert([insertPayload]);
        if (!error) return;
      } catch (e) {
        console.error('Supabase createOrder error:', e);
      }
    }
    const orders = getLocalData<Order[]>('orders', []);
    orders.push(order);
    setLocalData('orders', orders);
  },

  async getOrders(userId?: string): Promise<Order[]> {
    if (supabase) {
      try {
        let query = supabase.from('orders').select('*');
        if (userId) {
          query = query.eq('user_id', userId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) {
          return data.map((o) => {
            const trackingHistory = typeof o.tracking_history === 'string' ? JSON.parse(o.tracking_history) : o.tracking_history;
            const shippedLog = Array.isArray(trackingHistory) ? trackingHistory.find((h: any) => h.status === 'shipped') : null;
            return {
              id: o.id,
              userId: o.user_id,
              userContact: o.user_contact,
              items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
              subtotal: Number(o.subtotal),
              deliveryFee: Number(o.delivery_fee),
              discountUsed: Number(o.discount_used),
              total: Number(o.total),
              pointsEarned: Number(o.points_earned),
              pointsRedeemed: o.points_redeemed ? Number(o.points_redeemed) : undefined,
              cep: o.cep,
              address: o.address,
              number: o.number,
              complement: o.complement,
              neighborhood: o.neighborhood,
              city: o.city,
              paymentMethod: o.payment_method,
              status: o.status,
              createdAt: o.created_at,
              trackingHistory,
              deliveryDriverId: o.delivery_driver_id || (shippedLog ? shippedLog.driverId : undefined),
              deliveryDriverName: o.delivery_driver_name || (shippedLog ? shippedLog.driverName : undefined),
              deliverySlotId: o.delivery_slot_id,
              deliveryDate: o.delivery_date
            };
          });
        }
      } catch (e) {
        console.error('Supabase getOrders error, falling back locally:', e);
      }
    }
    const orders = getLocalData<Order[]>('orders', []);
    if (userId) {
      return orders.filter((o) => o.userId === userId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return orders.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getStockMovements(): Promise<StockMovement[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('stock_movements')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          return data.map((m: any) => ({
            id: m.id,
            productId: m.product_id,
            productName: m.product_name,
            quantity: Number(m.quantity),
            movementType: m.movement_type,
            orderId: m.order_id || undefined,
            createdAt: m.created_at,
          }));
        }
      } catch (e) {
        console.error('Supabase getStockMovements error, falling back locally:', e);
      }
    }
    return getLocalData<StockMovement[]>('stock_movements', []);
  },

  async recordStockMovement(movement: {
    productId: string;
    productName: string;
    quantity: number;
    movementType: 'venda' | 'reposicao' | 'ajuste';
    orderId?: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const newMovement: StockMovement = {
      id: 'stk_' + Math.random().toString(36).substring(2, 11),
      productId: movement.productId,
      productName: movement.productName,
      quantity: movement.quantity,
      movementType: movement.movementType,
      orderId: movement.orderId,
      createdAt: timestamp,
    };

    if (supabase) {
      try {
        await supabase
          .from('stock_movements')
          .insert({
            id: newMovement.id,
            product_id: movement.productId,
            product_name: movement.productName,
            quantity: movement.quantity,
            movement_type: movement.movementType,
            order_id: movement.orderId || null,
            created_at: timestamp,
          });
      } catch (e) {
        console.error('Supabase recordStockMovement error:', e);
      }
    }

    const movements = getLocalData<StockMovement[]>('stock_movements', []);
    movements.unshift(newMovement);
    setLocalData('stock_movements', movements);
  },

  async updateOrderStatus(
    orderId: string,
    status: Order['status'],
    description: string,
    driverId?: string,
    driverName?: string
  ): Promise<Order[]> {
    const timestamp = new Date().toISOString();
    let supabaseSuccess = false;
    
    if (supabase) {
      try {
        // First retrieve existing tracking history
        const { data } = await supabase.from('orders').select('tracking_history').eq('id', orderId).single();
        let currentHistory = [];
        if (data && data.tracking_history) {
          currentHistory = typeof data.tracking_history === 'string' ? JSON.parse(data.tracking_history) : data.tracking_history;
        }
        const updatedHistory = [...currentHistory, { status, timestamp, description, driverId, driverName }];

        const updatePayload: any = {
          status,
          tracking_history: updatedHistory
        };
        if (driverId) {
          updatePayload.delivery_driver_id = driverId;
        }
        if (driverName) {
          updatePayload.delivery_driver_name = driverName;
        }

        const { error } = await supabase
          .from('orders')
          .update(updatePayload)
          .eq('id', orderId);
        
        if (!error) {
          supabaseSuccess = true;
          // Automatic delivery record generation
          if (status === 'shipped' && driverId) {
            try {
              const { data: orderData } = await supabase.from('orders').select('*').eq('id', orderId).single();
              if (orderData) {
                const fullAddress = `${orderData.address}, ${orderData.number} - ${orderData.neighborhood}, ${orderData.city} (CEP: ${orderData.cep})`;
                await this.createDelivery({
                  orderId,
                  driverId,
                  driverName: driverName || 'Entregador',
                  clientName: orderData.user_contact || 'Cliente',
                  deliveryAddress: fullAddress,
                  status: 'shipped'
                });
              }
            } catch (err) {
              console.error('Erro ao registrar entrega automatica no Supabase:', err);
            }
          } else if (status === 'delivered') {
            try {
              await this.updateDeliveryStatus(orderId, 'delivered');
            } catch (err) {
              console.error('Erro ao atualizar entrega automatica no Supabase:', err);
            }
          }
        } else {
          console.error('Erro do Supabase ao atualizar o pedido, ativando fallback local:', error);
        }
      } catch (e) {
        console.error('Supabase updateOrderStatus error, ativando fallback local:', e);
      }
    }

    // Always perform local update as fallback or redundancy to guarantee UI responsiveness
    const orders = getLocalData<Order[]>('orders', []);
    const index = orders.findIndex((o) => o.id === orderId);
    if (index !== -1) {
      const history = orders[index].trackingHistory || [];
      orders[index].status = status;
      orders[index].trackingHistory = [...history, { status, timestamp, description, driverId, driverName }];
      if (driverId) {
        orders[index].deliveryDriverId = driverId;
      }
      if (driverName) {
        orders[index].deliveryDriverName = driverName;
      }
      
      // Se o pedido foi entregue/concluído localmente, decrementa o estoque local
      if (status === 'delivered') {
        try {
          const products = getLocalData<Product[]>('products', []);
          orders[index].items.forEach((item) => {
            const prodId = item.product.id;
            const prodIndex = products.findIndex((p) => p.id === prodId);
            if (prodIndex !== -1) {
              products[prodIndex].stock = Math.max(0, (products[prodIndex].stock || 0) - item.quantity);
            }
          });
          setLocalData('products', products);
        } catch (e) {
          console.error('Erro ao atualizar estoque local:', e);
        }
      }

      // Automatic delivery local fallback (only if not already done via Supabase successfully)
      if (!supabaseSuccess) {
        if (status === 'shipped' && driverId) {
          const fullAddress = `${orders[index].address}, ${orders[index].number} - ${orders[index].neighborhood}, ${orders[index].city} (CEP: ${orders[index].cep})`;
          await this.createDelivery({
            orderId,
            driverId,
            driverName: driverName || 'Entregador',
            clientName: orders[index].userContact || 'Cliente',
            deliveryAddress: fullAddress,
            status: 'shipped'
          });
        } else if (status === 'delivered') {
          await this.updateDeliveryStatus(orderId, 'delivered');
        }
      }
      
      setLocalData('orders', orders);
    }
    
    // If supabase updated successfully, we can load most fresh database state
    if (supabaseSuccess && supabase) {
      return await this.getOrders();
    }
    return orders.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // DELIVERY CONFIG
  getDeliveryConfig(): DeliveryConfig {
    const defaultConfig: DeliveryConfig = {
      baseFee: 5.00,
      feePerKm: 1.50,
      freeDeliveryThreshold: 150.00,
      neighborhoodFees: {
        'Centro': 4.00,
        'Jardins': 6.00,
        'Vila Nova': 5.00,
        'Alvorada': 7.00,
        'Boa Vista': 8.00,
        'Industrial': 9.00
      }
    };
    return getLocalData<DeliveryConfig>('delivery_config', defaultConfig);
  },

  saveDeliveryConfig(config: DeliveryConfig): void {
    setLocalData('delivery_config', config);
  },

  // DELIVERY DRIVERS (ENTREGADORES) WITH TRIGGER AND PROCEDURE BACKED OPS
  async getDrivers(): Promise<DeliveryDriver[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('delivery_drivers')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          return data.map(d => ({
            id: d.id,
            name: d.name,
            birthDate: d.birth_date,
            phone: d.phone,
            email: d.email || '',
            vehicleType: d.vehicle_type as 'carro' | 'moto',
            licensePlate: d.license_plate,
            createdAt: d.created_at,
            imgEntregador: d.img_entregador || ''
          }));
        }
      } catch (e) {
        console.error('Erro ao buscar entregadores no Supabase:', e);
      }
    }
    return getLocalData<DeliveryDriver[]>('delivery_drivers', []);
  },

  async createDriver(driver: Omit<DeliveryDriver, 'id' | 'createdAt'>): Promise<string> {
    if (driver.vehicleType !== 'carro' && driver.vehicleType !== 'moto') {
      throw new Error('Tipo de veículo inválido. Escolha "carro" ou "moto".');
    }

    if (supabase) {
      try {
        // Chamada direta da procedure customizada via RPC do Supabase
        const { data, error } = await supabase.rpc('register_delivery_driver', {
          p_name: driver.name,
          p_birth_date: driver.birthDate,
          p_phone: driver.phone,
          p_email: driver.email || null,
          p_vehicle_type: driver.vehicleType,
          p_license_plate: driver.licensePlate,
          p_img_entregador: driver.imgEntregador || null
        });
        
        if (error) {
          // Se falhar a RPC, joga o erro para tentarmos o fallback manual direto
          throw new Error(error.message);
        }
        return data as string;
      } catch (e: any) {
        console.warn('Procedimento RPC falhou ou não existe ainda no Banco. Tentando inserção direta fallback...', e.message);
        const id = 'd_' + Math.random().toString(36).substr(2, 9);
        const { error } = await supabase.from('delivery_drivers').insert([{
          id,
          name: driver.name,
          birth_date: driver.birthDate,
          phone: driver.phone,
          email: driver.email || null,
          vehicle_type: driver.vehicleType,
          license_plate: driver.licensePlate,
          img_entregador: driver.imgEntregador || null
        }]);
        if (!error) return id;
        throw new Error(`Falha ao salvar entregador no Supabase: ${error?.message || e.message}`);
      }
    }

    // Fallback Mock Local
    const drivers = getLocalData<DeliveryDriver[]>('delivery_drivers', []);
    const id = 'd_' + Math.random().toString(36).substr(2, 9);
    const newDriver: DeliveryDriver = {
      ...driver,
      id,
      licensePlate: driver.licensePlate.toUpperCase(), // simula a trigger sql de MAIÚSCULA
      createdAt: new Date().toISOString()
    };
    drivers.push(newDriver);
    setLocalData('delivery_drivers', drivers);
    return id;
  },

  async deleteDriver(id: string): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase
          .from('delivery_drivers')
          .delete()
          .eq('id', id);
        if (!error) return;
      } catch (e) {
        console.error('Erro ao deletar entregador no Supabase:', e);
      }
    }
    const drivers = getLocalData<DeliveryDriver[]>('delivery_drivers', []);
    const filtered = drivers.filter(d => d.id !== id);
    setLocalData('delivery_drivers', filtered);
  },

  // DELIVERIES MANAGEMENT methods (Tabela de Entregas)
  async getDeliveries(): Promise<Delivery[]> {
    let supabaseDeliveries: Delivery[] = [];
    let hasSupabaseData = false;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('deliveries')
          .select('*')
          .order('assigned_at', { ascending: false });
        if (!error && data) {
          supabaseDeliveries = data.map(d => ({
            id: d.id,
            orderId: d.order_id,
            driverId: d.driver_id,
            driverName: d.driver_name,
            clientName: d.client_name,
            deliveryAddress: d.delivery_address,
            status: d.status as 'shipped' | 'delivered' | 'returned',
            assignedAt: d.assigned_at,
            deliveredAt: d.delivered_at || undefined
          }));
          hasSupabaseData = true;
        } else if (error) {
          console.error('Erro ao carregar entregas no Supabase:', error);
        }
      } catch (e) {
        console.error('Erro ao carregar entregas no Supabase:', e);
      }
    }

    const localDeliveries = getLocalData<Delivery[]>('deliveries', []);

    if (!hasSupabaseData) {
      return localDeliveries;
    }

    // Se temos dados do Supabase, mesclamos com o localStorage para garantir visibilidade híbrida
    const merged = [...supabaseDeliveries];
    localDeliveries.forEach(local => {
      const exists = merged.some(sup => sup.id === local.id || (sup.orderId === local.orderId && sup.driverId === local.driverId));
      if (!exists) {
        merged.push(local);
      }
    });

    // Ordenar decrescente pela data atribuída
    return merged.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
  },

  async createDelivery(delivery: Omit<Delivery, 'id' | 'assignedAt' | 'deliveredAt'>): Promise<string> {
    const id = 'del_' + Math.random().toString(36).substr(2, 9);
    const assignedAt = new Date().toISOString();

    if (supabase) {
      try {
        const { error } = await supabase.from('deliveries').insert([{
          id,
          order_id: delivery.orderId,
          driver_id: delivery.driverId,
          driver_name: delivery.driverName,
          client_name: delivery.clientName,
          delivery_address: delivery.deliveryAddress,
          status: delivery.status,
          assigned_at: assignedAt
        }]);
        if (error) {
          console.error('Erro ao salvar entrega no Supabase (continuando no local):', error);
        }
      } catch (e) {
        console.error('Erro ao salvar entrega no Supabase (continuando no local):', e);
      }
    }

    const deliveries = getLocalData<Delivery[]>('deliveries', []);
    const newDelivery: Delivery = {
      ...delivery,
      id,
      assignedAt
    };
    deliveries.push(newDelivery);
    setLocalData('deliveries', deliveries);
    return id;
  },

  async updateDeliveryStatus(orderId: string, status: Delivery['status']): Promise<void> {
    const deliveredAt = status === 'delivered' ? new Date().toISOString() : undefined;

    if (supabase) {
      try {
        const updatePayload: any = { status };
        if (deliveredAt) {
          updatePayload.delivered_at = deliveredAt;
        }
        const { error } = await supabase
          .from('deliveries')
          .update(updatePayload)
          .eq('order_id', orderId);
        if (error) {
          console.error('Erro ao atualizar status da entrega no Supabase (continuando no local):', error);
        }
      } catch (e) {
        console.error('Erro ao atualizar status da entrega no Supabase (continuando no local):', e);
      }
    }

    const deliveries = getLocalData<Delivery[]>('deliveries', []);
    const index = deliveries.findIndex(d => d.orderId === orderId);
    if (index !== -1) {
      deliveries[index].status = status;
      if (deliveredAt) {
        deliveries[index].deliveredAt = deliveredAt;
      }
      setLocalData('deliveries', deliveries);
    }
  },

  async getDeliverySlots(): Promise<DeliverySlot[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('delivery_slots')
          .select('*')
          .eq('is_active', true);
        if (!error && data) {
          return data.map(s => ({
            id: s.id,
            dayOfWeek: s.day_of_week,
            startTime: s.start_time,
            endTime: s.end_time,
            maxOrders: s.max_orders,
            isActive: s.is_active
          }));
        }
      } catch (e) {
        console.error('Erro ao buscar janelas de entrega no Supabase:', e);
      }
    }
    // Mock robust fallback to match initial database population
    return [
      { id: 'slot_seg_08_11', dayOfWeek: 'Segunda-feira', startTime: '08:00', endTime: '11:00', maxOrders: 10, isActive: true },
      { id: 'slot_seg_11_14', dayOfWeek: 'Segunda-feira', startTime: '11:00', endTime: '14:00', maxOrders: 10, isActive: true },
      { id: 'slot_seg_14_17', dayOfWeek: 'Segunda-feira', startTime: '14:00', endTime: '17:00', maxOrders: 8, isActive: true },
      { id: 'slot_seg_17_20', dayOfWeek: 'Segunda-feira', startTime: '17:00', endTime: '20:00', maxOrders: 8, isActive: true },
      { id: 'slot_ter_08_11', dayOfWeek: 'Terça-feira', startTime: '08:00', endTime: '11:00', maxOrders: 10, isActive: true },
      { id: 'slot_ter_11_14', dayOfWeek: 'Terça-feira', startTime: '11:00', endTime: '14:00', maxOrders: 10, isActive: true },
      { id: 'slot_ter_14_17', dayOfWeek: 'Terça-feira', startTime: '14:00', endTime: '17:00', maxOrders: 8, isActive: true },
      { id: 'slot_ter_17_20', dayOfWeek: 'Terça-feira', startTime: '17:00', endTime: '20:00', maxOrders: 8, isActive: true },
      { id: 'slot_qua_08_11', dayOfWeek: 'Quarta-feira', startTime: '08:00', endTime: '11:00', maxOrders: 10, isActive: true },
      { id: 'slot_qua_11_14', dayOfWeek: 'Quarta-feira', startTime: '11:00', endTime: '14:00', maxOrders: 10, isActive: true },
      { id: 'slot_qua_14_17', dayOfWeek: 'Quarta-feira', startTime: '14:00', endTime: '17:00', maxOrders: 8, isActive: true },
      { id: 'slot_qua_17_20', dayOfWeek: 'Quarta-feira', startTime: '17:00', endTime: '20:00', maxOrders: 8, isActive: true },
      { id: 'slot_qui_08_11', dayOfWeek: 'Quinta-feira', startTime: '08:00', endTime: '11:00', maxOrders: 10, isActive: true },
      { id: 'slot_qui_11_14', dayOfWeek: 'Quinta-feira', startTime: '11:00', endTime: '14:00', maxOrders: 10, isActive: true },
      { id: 'slot_qui_14_17', dayOfWeek: 'Quinta-feira', startTime: '14:00', endTime: '17:00', maxOrders: 8, isActive: true },
      { id: 'slot_qui_17_20', dayOfWeek: 'Quinta-feira', startTime: '17:00', endTime: '20:00', maxOrders: 8, isActive: true },
      { id: 'slot_sex_08_11', dayOfWeek: 'Sexta-feira', startTime: '08:00', endTime: '11:00', maxOrders: 10, isActive: true },
      { id: 'slot_sex_11_14', dayOfWeek: 'Sexta-feira', startTime: '11:00', endTime: '14:00', maxOrders: 10, isActive: true },
      { id: 'slot_sex_14_17', dayOfWeek: 'Sexta-feira', startTime: '14:00', endTime: '17:00', maxOrders: 8, isActive: true },
      { id: 'slot_sex_17_20', dayOfWeek: 'Sexta-feira', startTime: '17:00', endTime: '20:00', maxOrders: 8, isActive: true },
      { id: 'slot_sab_08_12', dayOfWeek: 'Sábado', startTime: '08:00', endTime: '12:00', maxOrders: 12, isActive: true },
      { id: 'slot_sab_12_16', dayOfWeek: 'Sábado', startTime: '12:00', endTime: '16:00', maxOrders: 12, isActive: true }
    ];
  },

  async getSlotUsage(date: string): Promise<Record<string, number>> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('delivery_slot_id')
          .eq('delivery_date', date)
          .not('status', 'eq', 'cancelado');
        if (!error && data) {
          const counts: Record<string, number> = {};
          data.forEach((o: any) => {
            if (o.delivery_slot_id) {
              counts[o.delivery_slot_id] = (counts[o.delivery_slot_id] || 0) + 1;
            }
          });
          return counts;
        }
      } catch (e) {
        console.error('Erro ao buscar uso de slots no Supabase:', e);
      }
    }
    
    // Local storage count fallback
    const localOrders = getLocalData<Order[]>('orders', []);
    const counts: Record<string, number> = {};
    localOrders.forEach(o => {
      if (o.deliveryDate === date && o.deliverySlotId) {
        counts[o.deliverySlotId] = (counts[o.deliverySlotId] || 0) + 1;
      }
    });
    return counts;
  }
};

// SQL Helper string to display in Supabase dialog
export const SUPABASE_SQL_SCHEMA = `-- CRIE ESTAS TABELAS NO SEU PAINEL DO SUPABASE (SQL EDITOR)

-- 1. Tabela de Usuários
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  whatsapp TEXT UNIQUE,
  password TEXT,
  points NUMERIC DEFAULT 0,
  city TEXT,
  neighborhood TEXT,
  street_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Produtos
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  promo_price NUMERIC,
  is_promo BOOLEAN DEFAULT false,
  image TEXT,
  points_awarded NUMERIC DEFAULT 0,
  stock NUMERIC DEFAULT 0,
  unit TEXT NOT NULL
);

-- 3. Tabela de Pedidos
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id),
  user_contact TEXT,
  items JSONB NOT NULL,
  subtotal NUMERIC NOT NULL,
  delivery_fee NUMERIC NOT NULL,
  discount_used NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  points_earned NUMERIC DEFAULT 0,
  points_redeemed NUMERIC DEFAULT 0,
  cep TEXT NOT NULL,
  address TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  tracking_history JSONB NOT NULL,
  delivery_driver_id TEXT DEFAULT NULL,
  delivery_driver_name TEXT DEFAULT NULL
);

-- AJUSTE/ATUALIZAÇÃO DE TABELA LEGADA DE PEDIDOS (CASO JÁ EXISTA):
-- ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_driver_id TEXT DEFAULT NULL;
-- ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_driver_name TEXT DEFAULT NULL;

-- 4. Tabela de Administradores / Gerentes
CREATE TABLE IF NOT EXISTS public.admin_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Entregadores (delivery_drivers)
CREATE TABLE IF NOT EXISTS public.delivery_drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('carro', 'moto')),
  license_plate TEXT NOT NULL,
  img_entregador TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Log e Controle de Entregas (deliveries)
CREATE TABLE IF NOT EXISTS public.deliveries (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  driver_id TEXT,
  driver_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  status TEXT NOT NULL, -- 'shipped', 'delivered', 'returned'
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Trigger para formatar automaticamente a Placa do Veículo em MAIÚSCULA
CREATE OR REPLACE FUNCTION public.format_driver_plate()
RETURNS TRIGGER AS $$
BEGIN
  NEW.license_plate := UPPER(NEW.license_plate);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_format_driver_plate ON public.delivery_drivers;
CREATE TRIGGER tr_format_driver_plate
BEFORE INSERT OR UPDATE ON public.delivery_drivers
FOR EACH ROW
EXECUTE FUNCTION public.format_driver_plate();

-- Procedure (Stored Function) para Cadastrar Entregadores com validações
CREATE OR REPLACE FUNCTION public.register_delivery_driver(
  p_name TEXT,
  p_birth_date DATE,
  p_phone TEXT,
  p_email TEXT,
  p_vehicle_type TEXT,
  p_license_plate TEXT,
  p_img_entregador TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_id TEXT;
BEGIN
  -- Validação de veículo
  IF p_vehicle_type NOT IN ('carro', 'moto') THEN
    RAISE EXCEPTION 'Tipo de veículo inválido. Use "carro" ou "moto".';
  END IF;

  -- Validação de comprimento de placa
  IF LENGTH(p_license_plate) < 5 THEN
    RAISE EXCEPTION 'Placa de veículo inválida ou muito curta.';
  END IF;

  v_id := 'd_' || md5(random()::text || clock_timestamp()::text);

  INSERT INTO public.delivery_drivers (id, name, birth_date, phone, email, vehicle_type, license_plate, img_entregador)
  VALUES (v_id, p_name, p_birth_date, p_phone, p_email, p_vehicle_type, p_license_plate, p_img_entregador);

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

  -- ----------- TABELAS DE CATEGORIAS INDIVIDUAIS -----------

  -- 1. Açougue
  CREATE TABLE IF NOT EXISTS public.acougue (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    promo_price NUMERIC,
    is_promo BOOLEAN DEFAULT false,
    image TEXT,
    points_awarded NUMERIC DEFAULT 0,
    stock NUMERIC DEFAULT 0,
    unit TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- 2. Bebês
  CREATE TABLE IF NOT EXISTS public.bebes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    promo_price NUMERIC,
    is_promo BOOLEAN DEFAULT false,
    image TEXT,
    points_awarded NUMERIC DEFAULT 0,
    stock NUMERIC DEFAULT 0,
    unit TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- 3. Bebidas
  CREATE TABLE IF NOT EXISTS public.bebidas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    promo_price NUMERIC,
    is_promo BOOLEAN DEFAULT false,
    image TEXT,
    points_awarded NUMERIC DEFAULT 0,
    stock NUMERIC DEFAULT 0,
    unit TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- 4. Carvões
  CREATE TABLE IF NOT EXISTS public.carvoes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    promo_price NUMERIC,
    is_promo BOOLEAN DEFAULT false,
    image TEXT,
    points_awarded NUMERIC DEFAULT 0,
    stock NUMERIC DEFAULT 0,
    unit TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- 5. Chocolates e Balas
  CREATE TABLE IF NOT EXISTS public.chocolates_e_balas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    promo_price NUMERIC,
    is_promo BOOLEAN DEFAULT false,
    image TEXT,
    points_awarded NUMERIC DEFAULT 0,
    stock NUMERIC DEFAULT 0,
    unit TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- 6. Descartáveis
  CREATE TABLE IF NOT EXISTS public.descartaveis (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    promo_price NUMERIC,
    is_promo BOOLEAN DEFAULT false,
    image TEXT,
    points_awarded NUMERIC DEFAULT 0,
    stock NUMERIC DEFAULT 0,
    unit TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- 7. Gelos
  CREATE TABLE IF NOT EXISTS public.gelos (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    promo_price NUMERIC,
    is_promo BOOLEAN DEFAULT false,
    image TEXT,
    points_awarded NUMERIC DEFAULT 0,
    stock NUMERIC DEFAULT 0,
    unit TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- 8. Higiene
  CREATE TABLE IF NOT EXISTS public.higiene (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    promo_price NUMERIC,
    is_promo BOOLEAN DEFAULT false,
    image TEXT,
    points_awarded NUMERIC DEFAULT 0,
    stock NUMERIC DEFAULT 0,
    unit TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- 9. Hortifrúti
  CREATE TABLE IF NOT EXISTS public.hortifruti (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    promo_price NUMERIC,
    is_promo BOOLEAN DEFAULT false,
    image TEXT,
    points_awarded NUMERIC DEFAULT 0,
    stock NUMERIC DEFAULT 0,
    unit TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- 10. Laticínios
  CREATE TABLE IF NOT EXISTS public.laticinios (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    promo_price NUMERIC,
    is_promo BOOLEAN DEFAULT false,
    image TEXT,
    points_awarded NUMERIC DEFAULT 0,
    stock NUMERIC DEFAULT 0,
    unit TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- 11. Limpeza
  CREATE TABLE IF NOT EXISTS public.limpeza (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    promo_price NUMERIC,
    is_promo BOOLEAN DEFAULT false,
    image TEXT,
    points_awarded NUMERIC DEFAULT 0,
    stock NUMERIC DEFAULT 0,
    unit TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- 12. Mercearia
  CREATE TABLE IF NOT EXISTS public.mercearia (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    promo_price NUMERIC,
    is_promo BOOLEAN DEFAULT false,
    image TEXT,
    points_awarded NUMERIC DEFAULT 0,
    stock NUMERIC DEFAULT 0,
    unit TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- 13. Padaria
  CREATE TABLE IF NOT EXISTS public.padaria (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    promo_price NUMERIC,
    is_promo BOOLEAN DEFAULT false,
    image TEXT,
    points_awarded NUMERIC DEFAULT 0,
    stock NUMERIC DEFAULT 0,
    unit TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- 14. Ração
  CREATE TABLE IF NOT EXISTS public.racao (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    promo_price NUMERIC,
    is_promo BOOLEAN DEFAULT false,
    image TEXT,
    points_awarded NUMERIC DEFAULT 0,
    stock NUMERIC DEFAULT 0,
    unit TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- 15. Salgadinhos
  CREATE TABLE IF NOT EXISTS public.salgadinhos (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    promo_price NUMERIC,
    is_promo BOOLEAN DEFAULT false,
    image TEXT,
    points_awarded NUMERIC DEFAULT 0,
    stock NUMERIC DEFAULT 0,
    unit TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- 16. Sorvetes
  CREATE TABLE IF NOT EXISTS public.sorvetes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    promo_price NUMERIC,
    is_promo BOOLEAN DEFAULT false,
    image TEXT,
    points_awarded NUMERIC DEFAULT 0,
    stock NUMERIC DEFAULT 0,
    unit TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- 17. Utilidades
  CREATE TABLE IF NOT EXISTS public.utilidades (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    promo_price NUMERIC,
    is_promo BOOLEAN DEFAULT false,
    image TEXT,
    points_awarded NUMERIC DEFAULT 0,
    stock NUMERIC DEFAULT 0,
    unit TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

-- Ajustar RLS nas Tabelas
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- ----------- HABILITAR RLS NAS TABELAS DE CATEGORIAS -----------
ALTER TABLE public.acougue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bebes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bebidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carvoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chocolates_e_balas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.descartaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.higiene ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hortifruti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laticinios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.limpeza ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercearia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.padaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.racao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salgadinhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sorvetes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilidades ENABLE ROW LEVEL SECURITY;

-- Limpar políticas existentes se houver reconfiguração (evita erros "already exists")
DROP POLICY IF EXISTS "Leitura pública de produtos" ON public.products;
DROP POLICY IF EXISTS "Modificação por todos" ON public.products;
DROP POLICY IF EXISTS "Leitura completa de usuários" ON public.users;
DROP POLICY IF EXISTS "Modificação de usuários" ON public.users;
DROP POLICY IF EXISTS "Acesso total aos pedidos" ON public.orders;
DROP POLICY IF EXISTS "Leitura completa de administradores" ON public.admin_users;
DROP POLICY IF EXISTS "Acesso total aos gerentes" ON public.admin_users;
DROP POLICY IF EXISTS "Leitura pública de entregadores" ON public.delivery_drivers;
DROP POLICY IF EXISTS "Acesso total aos entregadores" ON public.delivery_drivers;
DROP POLICY IF EXISTS "Leitura completa de entregas" ON public.deliveries;
DROP POLICY IF EXISTS "Acesso total às entregas" ON public.deliveries;

-- Limpar políticas de categorias se houver reconfiguração
DROP POLICY IF EXISTS "Leitura pública acougue" ON public.acougue;
DROP POLICY IF EXISTS "Total acougue" ON public.acougue;
DROP POLICY IF EXISTS "Leitura pública bebes" ON public.bebes;
DROP POLICY IF EXISTS "Total bebes" ON public.bebes;
DROP POLICY IF EXISTS "Leitura pública bebidas" ON public.bebidas;
DROP POLICY IF EXISTS "Total bebidas" ON public.bebidas;
DROP POLICY IF EXISTS "Leitura pública carvoes" ON public.carvoes;
DROP POLICY IF EXISTS "Total carvoes" ON public.carvoes;
DROP POLICY IF EXISTS "Leitura pública chocolates_e_balas" ON public.chocolates_e_balas;
DROP POLICY IF EXISTS "Total chocolates_e_balas" ON public.chocolates_e_balas;
DROP POLICY IF EXISTS "Leitura pública descartaveis" ON public.descartaveis;
DROP POLICY IF EXISTS "Total descartaveis" ON public.descartaveis;
DROP POLICY IF EXISTS "Leitura pública gelos" ON public.gelos;
DROP POLICY IF EXISTS "Total gelos" ON public.gelos;
DROP POLICY IF EXISTS "Leitura pública higiene" ON public.higiene;
DROP POLICY IF EXISTS "Total higiene" ON public.higiene;
DROP POLICY IF EXISTS "Leitura pública hortifruti" ON public.hortifruti;
DROP POLICY IF EXISTS "Total hortifruti" ON public.hortifruti;
DROP POLICY IF EXISTS "Leitura pública laticinios" ON public.laticinios;
DROP POLICY IF EXISTS "Total laticinios" ON public.laticinios;
DROP POLICY IF EXISTS "Leitura pública limpeza" ON public.limpeza;
DROP POLICY IF EXISTS "Total limpeza" ON public.limpeza;
DROP POLICY IF EXISTS "Leitura pública mercearia" ON public.mercearia;
DROP POLICY IF EXISTS "Total mercearia" ON public.mercearia;
DROP POLICY IF EXISTS "Leitura pública padaria" ON public.padaria;
DROP POLICY IF EXISTS "Total padaria" ON public.padaria;
DROP POLICY IF EXISTS "Leitura pública racao" ON public.racao;
DROP POLICY IF EXISTS "Total racao" ON public.racao;
DROP POLICY IF EXISTS "Leitura pública salgadinhos" ON public.salgadinhos;
DROP POLICY IF EXISTS "Total salgadinhos" ON public.salgadinhos;
DROP POLICY IF EXISTS "Leitura pública sorvetes" ON public.sorvetes;
DROP POLICY IF EXISTS "Total sorvetes" ON public.sorvetes;
DROP POLICY IF EXISTS "Leitura pública utilidades" ON public.utilidades;
DROP POLICY IF EXISTS "Total utilidades" ON public.utilidades;

-- Criar políticas atualizadas
CREATE POLICY "Leitura pública de produtos" ON public.products FOR SELECT USING (true);
CREATE POLICY "Modificação por todos" ON public.products FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura completa de usuários" ON public.users FOR SELECT USING (true);
CREATE POLICY "Modificação de usuários" ON public.users FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total aos pedidos" ON public.orders FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura completa de administradores" ON public.admin_users FOR SELECT USING (true);
CREATE POLICY "Acesso total aos gerentes" ON public.admin_users FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura pública de entregadores" ON public.delivery_drivers FOR SELECT USING (true);
CREATE POLICY "Acesso total aos entregadores" ON public.delivery_drivers FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura completa de entregas" ON public.deliveries FOR SELECT USING (true);
CREATE POLICY "Acesso total às entregas" ON public.deliveries FOR ALL USING (true) WITH CHECK (true);

-- Criar políticas de categorias
CREATE POLICY "Leitura pública acougue" ON public.acougue FOR SELECT USING (true);
CREATE POLICY "Total acougue" ON public.acougue FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura pública bebes" ON public.bebes FOR SELECT USING (true);
CREATE POLICY "Total bebes" ON public.bebes FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura pública bebidas" ON public.bebidas FOR SELECT USING (true);
CREATE POLICY "Total bebidas" ON public.bebidas FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura pública carvoes" ON public.carvoes FOR SELECT USING (true);
CREATE POLICY "Total carvoes" ON public.carvoes FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura pública chocolates_e_balas" ON public.chocolates_e_balas FOR SELECT USING (true);
CREATE POLICY "Total chocolates_e_balas" ON public.chocolates_e_balas FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura pública descartaveis" ON public.descartaveis FOR SELECT USING (true);
CREATE POLICY "Total descartaveis" ON public.descartaveis FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura pública gelos" ON public.gelos FOR SELECT USING (true);
CREATE POLICY "Total gelos" ON public.gelos FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura pública higiene" ON public.higiene FOR SELECT USING (true);
CREATE POLICY "Total higiene" ON public.higiene FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura pública hortifruti" ON public.hortifruti FOR SELECT USING (true);
CREATE POLICY "Total hortifruti" ON public.hortifruti FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura pública laticinios" ON public.laticinios FOR SELECT USING (true);
CREATE POLICY "Total laticinios" ON public.laticinios FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura pública limpeza" ON public.limpeza FOR SELECT USING (true);
CREATE POLICY "Total limpeza" ON public.limpeza FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura pública mercearia" ON public.mercearia FOR SELECT USING (true);
CREATE POLICY "Total mercearia" ON public.mercearia FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura pública padaria" ON public.padaria FOR SELECT USING (true);
CREATE POLICY "Total padaria" ON public.padaria FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura pública racao" ON public.racao FOR SELECT USING (true);
CREATE POLICY "Total racao" ON public.racao FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura pública salgadinhos" ON public.salgadinhos FOR SELECT USING (true);
CREATE POLICY "Total salgadinhos" ON public.salgadinhos FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura pública sorvetes" ON public.sorvetes FOR SELECT USING (true);
CREATE POLICY "Total sorvetes" ON public.sorvetes FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Leitura pública utilidades" ON public.utilidades FOR SELECT USING (true);
CREATE POLICY "Total utilidades" ON public.utilidades FOR ALL USING (true) WITH CHECK (true);

-- Inserir alguns produtos mock iniciais para testar
INSERT INTO public.products (id, name, description, category, price, promo_price, is_promo, image, points_awarded, stock, unit) VALUES
('h1', 'Tomate Italiano Especial', 'Tomates vermelhos maduros, perfeitos para saladas.', 'Hortifrúti', 8.90, 5.99, true, 'https://images.unsplash.com/photo-1595855759920-86582396756a', 3, 50, 'kg'),
('a1', 'Picanha Bovina Premium', 'Corte nobre com excelente gordura.', 'Açougue', 89.90, 74.90, true, 'https://images.unsplash.com/photo-1603048588665-791ca8aea617', 25, 20, 'kg')
ON CONFLICT (id) DO NOTHING;

-- Inserir administrador padrão para acesso ao painel gerencial
INSERT INTO public.admin_users (id, username, password, name) VALUES
('adm_1', 'admin', 'admin', 'Administrador Vitta')
ON CONFLICT (username) DO NOTHING;

-- =========== 11. ADICIONAR COLUNA DESCRIPTION PARA GARANTIA ===========
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.acougue ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.bebes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.bebidas ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.carvoes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.chocolates_e_balas ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.descartaveis ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.gelos ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.higiene ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.hortifruti ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.laticinios ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.limpeza ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.mercearia ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.padaria ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.racao ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.salgadinhos ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.sorvetes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.utilidades ADD COLUMN IF NOT EXISTS description TEXT;

-- ADICIONAR COLUNA MIN_STOCK PARA CONTROLE DE ESTOQUE MÍNIMO RECOMENDADO
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 10;
ALTER TABLE public.acougue ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 10;
ALTER TABLE public.bebes ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 10;
ALTER TABLE public.bebidas ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 10;
ALTER TABLE public.carvoes ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 10;
ALTER TABLE public.chocolates_e_balas ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 10;
ALTER TABLE public.descartaveis ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 10;
ALTER TABLE public.gelos ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 10;
ALTER TABLE public.higiene ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 10;
ALTER TABLE public.hortifruti ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 10;
ALTER TABLE public.laticinios ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 10;
ALTER TABLE public.limpeza ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 10;
ALTER TABLE public.mercearia ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 10;
ALTER TABLE public.padaria ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 10;
ALTER TABLE public.racao ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 10;
ALTER TABLE public.salgadinhos ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 10;
ALTER TABLE public.sorvetes ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 10;
ALTER TABLE public.utilidades ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 10;

-- =========== 12. TRIGGER PARA AUTOMATICAMENTE DEIXAR O NOME DO PRODUTO EM MAIÚSCULO ===========
CREATE OR REPLACE FUNCTION public.format_product_uppercase()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name := UPPER(NEW.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_format_product_uppercase ON public.products;
CREATE TRIGGER tr_format_product_uppercase BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.format_product_uppercase();

DROP TRIGGER IF EXISTS tr_format_acougue_uppercase ON public.acougue;
CREATE TRIGGER tr_format_acougue_uppercase BEFORE INSERT OR UPDATE ON public.acougue FOR EACH ROW EXECUTE FUNCTION public.format_product_uppercase();

DROP TRIGGER IF EXISTS tr_format_bebes_uppercase ON public.bebes;
CREATE TRIGGER tr_format_bebes_uppercase BEFORE INSERT OR UPDATE ON public.bebes FOR EACH ROW EXECUTE FUNCTION public.format_product_uppercase();

DROP TRIGGER IF EXISTS tr_format_bebidas_uppercase ON public.bebidas;
CREATE TRIGGER tr_format_bebidas_uppercase BEFORE INSERT OR UPDATE ON public.bebidas FOR EACH ROW EXECUTE FUNCTION public.format_product_uppercase();

DROP TRIGGER IF EXISTS tr_format_carvoes_uppercase ON public.carvoes;
CREATE TRIGGER tr_format_carvoes_uppercase BEFORE INSERT OR UPDATE ON public.carvoes FOR EACH ROW EXECUTE FUNCTION public.format_product_uppercase();

DROP TRIGGER IF EXISTS tr_format_chocolates_uppercase ON public.chocolates_e_balas;
CREATE TRIGGER tr_format_chocolates_uppercase BEFORE INSERT OR UPDATE ON public.chocolates_e_balas FOR EACH ROW EXECUTE FUNCTION public.format_product_uppercase();

DROP TRIGGER IF EXISTS tr_format_descartaveis_uppercase ON public.descartaveis;
CREATE TRIGGER tr_format_descartaveis_uppercase BEFORE INSERT OR UPDATE ON public.descartaveis FOR EACH ROW EXECUTE FUNCTION public.format_product_uppercase();

DROP TRIGGER IF EXISTS tr_format_gelos_uppercase ON public.gelos;
CREATE TRIGGER tr_format_gelos_uppercase BEFORE INSERT OR UPDATE ON public.gelos FOR EACH ROW EXECUTE FUNCTION public.format_product_uppercase();

DROP TRIGGER IF EXISTS tr_format_higiene_uppercase ON public.higiene;
CREATE TRIGGER tr_format_higiene_uppercase BEFORE INSERT OR UPDATE ON public.higiene FOR EACH ROW EXECUTE FUNCTION public.format_product_uppercase();

DROP TRIGGER IF EXISTS tr_format_hortifruti_uppercase ON public.hortifruti;
CREATE TRIGGER tr_format_hortifruti_uppercase BEFORE INSERT OR UPDATE ON public.hortifruti FOR EACH ROW EXECUTE FUNCTION public.format_product_uppercase();

DROP TRIGGER IF EXISTS tr_format_laticinios_uppercase ON public.laticinios;
CREATE TRIGGER tr_format_laticinios_uppercase BEFORE INSERT OR UPDATE ON public.laticinios FOR EACH ROW EXECUTE FUNCTION public.format_product_uppercase();

DROP TRIGGER IF EXISTS tr_format_limpeza_uppercase ON public.limpeza;
CREATE TRIGGER tr_format_limpeza_uppercase BEFORE INSERT OR UPDATE ON public.limpeza FOR EACH ROW EXECUTE FUNCTION public.format_product_uppercase();

DROP TRIGGER IF EXISTS tr_format_mercearia_uppercase ON public.mercearia;
CREATE TRIGGER tr_format_mercearia_uppercase BEFORE INSERT OR UPDATE ON public.mercearia FOR EACH ROW EXECUTE FUNCTION public.format_product_uppercase();

DROP TRIGGER IF EXISTS tr_format_padaria_uppercase ON public.padaria;
CREATE TRIGGER tr_format_padaria_uppercase BEFORE INSERT OR UPDATE ON public.padaria FOR EACH ROW EXECUTE FUNCTION public.format_product_uppercase();

DROP TRIGGER IF EXISTS tr_format_racao_uppercase ON public.racao;
CREATE TRIGGER tr_format_racao_uppercase BEFORE INSERT OR UPDATE ON public.racao FOR EACH ROW EXECUTE FUNCTION public.format_product_uppercase();

DROP TRIGGER IF EXISTS tr_format_salgadinhos_uppercase ON public.salgadinhos;
CREATE TRIGGER tr_format_salgadinhos_uppercase BEFORE INSERT OR UPDATE ON public.salgadinhos FOR EACH ROW EXECUTE FUNCTION public.format_product_uppercase();

DROP TRIGGER IF EXISTS tr_format_sorvetes_uppercase ON public.sorvetes;
CREATE TRIGGER tr_format_sorvetes_uppercase BEFORE INSERT OR UPDATE ON public.sorvetes FOR EACH ROW EXECUTE FUNCTION public.format_product_uppercase();

DROP TRIGGER IF EXISTS tr_format_utilidades_uppercase ON public.utilidades;
CREATE TRIGGER tr_format_utilidades_uppercase BEFORE INSERT OR UPDATE ON public.utilidades FOR EACH ROW EXECUTE FUNCTION public.format_product_uppercase();

-- =========== 13. FUNÇÃO AUXILIAR PARA DETERMINAR TABELA DA CATEGORIA ===========
CREATE OR REPLACE FUNCTION public.get_category_table_name(p_category TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE LOWER(p_category)
    WHEN 'açougue' THEN 'acougue'
    WHEN 'bebês' THEN 'bebes'
    WHEN 'bebidas' THEN 'bebidas'
    WHEN 'carvões' THEN 'carvoes'
    WHEN 'chocolates e balas' THEN 'chocolates_e_balas'
    WHEN 'descartáveis' THEN 'descartaveis'
    WHEN 'gelos' THEN 'gelos'
    WHEN 'higiene' THEN 'higiene'
    WHEN 'hortifrúti' THEN 'hortifruti'
    WHEN 'laticínios' THEN 'laticinios'
    WHEN 'limpeza' THEN 'limpeza'
    WHEN 'mercearia' THEN 'mercearia'
    WHEN 'padaria' THEN 'padaria'
    WHEN 'ração' THEN 'racao'
    WHEN 'salgadinhos' THEN 'salgadinhos'
    WHEN 'sorvetes' THEN 'sorvetes'
    WHEN 'utilidades' THEN 'utilidades'
    WHEN 'papelaria' THEN 'papelaria'
    WHEN 'frios e congelados' THEN 'frios_e_congelados'
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql;

-- =========== 14. TABELA DE MOVIMENTAÇÕES DE ESTOQUE (CONTROLE HISTÓRICO) ===========
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id TEXT PRIMARY KEY DEFAULT 'stk_' || md5(random()::text || clock_timestamp()::text),
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL, -- valor negativo para saídas/vendas, positivo para reposição/ajustes
  movement_type TEXT NOT NULL, -- 'venda', 'reposicao', 'ajuste'
  order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS nas movimentações de estoque
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura pública de estoque" ON public.stock_movements;
DROP POLICY IF EXISTS "Acesso total de estoque" ON public.stock_movements;
CREATE POLICY "Leitura pública de estoque" ON public.stock_movements FOR SELECT USING (true);
CREATE POLICY "Acesso total de estoque" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);

-- =========== 15. TRIGGER PARA ATUALIZAR ESTOQUE IMEDIATAMENTE QUANDO O PEDIDO FOR CRIADO (SEPARAÇÃO) ===========
CREATE OR REPLACE FUNCTION public.update_product_stock_on_order_create()
RETURNS TRIGGER AS $$
DECLARE
  v_items_json JSONB;
  v_item JSONB;
  v_product_id TEXT;
  v_category TEXT;
  v_quantity NUMERIC;
  v_table_name TEXT;
  v_product_name TEXT;
BEGIN
  -- Aciona no insert de um novo pedido (status inicial pendente)
  IF (TG_OP = 'INSERT') THEN
     
     -- Se for armazenado como string JSON dupla (scalar string), desaninha um nível:
     IF jsonb_typeof(NEW.items) = 'string' THEN
       v_items_json := (NEW.items#>>'{}')::jsonb;
     ELSE
       v_items_json := NEW.items;
     END IF;
     
     -- Se após o tratamento ainda não for um array válido, não prossegue para evitar erros
     IF jsonb_typeof(v_items_json) <> 'array' THEN
       RETURN NEW;
     END IF;
     
     FOR v_item IN SELECT * FROM jsonb_array_elements(v_items_json) LOOP
       v_product_id := v_item->'product'->>'id';
       v_category := v_item->'product'->>'category';
       v_quantity := (v_item->>'quantity')::NUMERIC;
       v_product_name := v_item->'product'->>'name';
       
       IF v_product_id IS NOT NULL AND v_quantity > 0 THEN
         -- Reduz o estoque na tabela geral de produtos
         UPDATE public.products 
         SET stock = GREATEST(0, stock - v_quantity) 
         WHERE id::text = v_product_id::text;
         
         -- Determina a tabela específica da categoria
         v_table_name := public.get_category_table_name(v_category);
         
         -- Reduz o estoque na tabela de categoria específica se existir
         IF v_table_name IS NOT NULL THEN
           EXECUTE format('UPDATE public.%I SET stock = GREATEST(0, stock - $1) WHERE id::text = $2::text', v_table_name)
           USING v_quantity, v_product_id;
         END IF;

         -- Registra a movimentação negativa de estoque (venda)
         INSERT INTO public.stock_movements (product_id, product_name, quantity, movement_type, order_id)
         VALUES (v_product_id, COALESCE(v_product_name, 'Produto'), -v_quantity, 'venda', NEW.id)
         ON CONFLICT DO NOTHING;
       END IF;
     END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove o gatilho antigo baseado em delivery para evitar duto desconto
DROP TRIGGER IF EXISTS tr_update_stock_on_delivery ON public.orders;
DROP FUNCTION IF EXISTS public.update_product_stock_on_delivery();

-- Cria o gatilho novo baseado na criação do pedido
DROP TRIGGER IF EXISTS tr_update_stock_on_order_create ON public.orders;
CREATE TRIGGER tr_update_stock_on_order_create
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_product_stock_on_order_create();


-- =========== 16. TABELA DE JANELAS DE ENTREGA (SLOTS DE HORÁRIOS) ===========
CREATE TABLE IF NOT EXISTS public.delivery_slots (
  id TEXT PRIMARY KEY DEFAULT 'slot_' || md5(random()::text || clock_timestamp()::text),
  day_of_week TEXT NOT NULL, -- ex: 'Segunda-feira', 'Terça-feira', etc.
  start_time TIME NOT NULL, -- ex: '08:00'
  end_time TIME NOT NULL, -- ex: '10:00'
  max_orders INTEGER DEFAULT 5 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS nas janelas de entrega
ALTER TABLE public.delivery_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura pública de janelas de entrega" ON public.delivery_slots;
DROP POLICY IF EXISTS "Acesso total de janelas de entrega" ON public.delivery_slots;
CREATE POLICY "Leitura pública de janelas de entrega" ON public.delivery_slots FOR SELECT USING (true);
CREATE POLICY "Acesso total de janelas de entrega" ON public.delivery_slots FOR ALL USING (true) WITH CHECK (true);

-- Popular dados iniciais de exemplo para janelas de entrega se estiver vazia
INSERT INTO public.delivery_slots (day_of_week, start_time, end_time, max_orders) VALUES
('Segunda-feira', '08:00', '11:00', 10),
('Segunda-feira', '11:00', '14:00', 10),
('Segunda-feira', '14:00', '17:00', 8),
('Segunda-feira', '17:00', '20:00', 8),
('Terça-feira', '08:00', '11:00', 10),
('Terça-feira', '11:00', '14:00', 10),
('Terça-feira', '14:00', '17:00', 8),
('Terça-feira', '17:00', '20:00', 8),
('Quarta-feira', '08:00', '11:00', 10),
('Quarta-feira', '11:00', '14:00', 10),
('Quarta-feira', '14:00', '17:00', 8),
('Quarta-feira', '17:00', '20:00', 8),
('Quinta-feira', '08:00', '11:00', 10),
('Quinta-feira', '11:00', '14:00', 10),
('Quinta-feira', '14:00', '17:00', 8),
('Quinta-feira', '17:00', '20:00', 8),
('Sexta-feira', '08:00', '11:00', 10),
('Sexta-feira', '11:00', '14:00', 10),
('Sexta-feira', '14:00', '17:00', 8),
('Sexta-feira', '17:00', '20:00', 8),
('Sábado', '08:00', '12:00', 12),
('Sábado', '12:00', '16:00', 12)
ON CONFLICT DO NOTHING;

-- =========== 17. COLUNAS DE AGENDAMENTO NA TABELA DE PEDIDOS ===========
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_slot_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_date DATE;

-- =========== 18. TRIGGER/PROCEDURE PARA VALIDAÇÃO DA CAPACIDADE DO SLOT ===========
CREATE OR REPLACE FUNCTION public.validate_delivery_slot_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_max_orders INT;
  v_current_orders INT;
BEGIN
  -- Se o pedido não tiver slot ou data de entrega, pula validação
  IF NEW.delivery_slot_id IS NULL OR NEW.delivery_date IS NULL THEN
    RETURN NEW;
  END IF;

  -- Verifica se o slot existe e pega a capacidade máxima
  SELECT max_orders INTO v_max_orders
  FROM public.delivery_slots
  WHERE id = NEW.delivery_slot_id AND is_active = true;

  -- Se o slot não existir ou estiver inativo, levanta erro
  IF v_max_orders IS NULL THEN
    RAISE EXCEPTION 'Janela de entrega inválida ou inativa.';
  END IF;

  -- Conta quantos pedidos ativos já utilizam este slot na mesma data de entrega
  SELECT COUNT(*) INTO v_current_orders
  FROM public.orders
  WHERE delivery_slot_id = NEW.delivery_slot_id 
    AND delivery_date = NEW.delivery_date
    AND status <> 'cancelado';

  IF v_current_orders >= v_max_orders THEN
    RAISE EXCEPTION 'Capacidade máxima para esta janela de entrega atingida para a data selecionada.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_validate_delivery_slot_capacity ON public.orders;
CREATE TRIGGER tr_validate_delivery_slot_capacity
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_delivery_slot_capacity();


-- =========== 19. TABELA DE ROTAS OTIMIZADAS PARA ENTREGADORES ===========
CREATE TABLE IF NOT EXISTS public.delivery_routes (
  id TEXT PRIMARY KEY DEFAULT 'route_' || md5(random()::text || clock_timestamp()::text),
  driver_id TEXT REFERENCES public.delivery_drivers(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'criada' CHECK (status IN ('criada', 'em_transito', 'concluida')),
  optimized_waypoints JSONB NOT NULL, -- Lista ordenada com latitude, longitude, endereço e ordem de paradas
  distance_meters NUMERIC DEFAULT 0,
  estimated_duration_seconds NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS nas rotas de entrega
ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Leitura pública de rotas de entrega" ON public.delivery_routes;
DROP POLICY IF EXISTS "Acesso total de rotas de entrega" ON public.delivery_routes;
CREATE POLICY "Leitura pública de rotas de entrega" ON public.delivery_routes FOR SELECT USING (true);
CREATE POLICY "Acesso total de rotas de entrega" ON public.delivery_routes FOR ALL USING (true) WITH CHECK (true);

-- Associar pedidos a rotas na tabela de pedidos
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_route_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_route_sequence INTEGER;
`;
