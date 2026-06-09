import React, { useState, useEffect } from 'react';
import { Settings, Plus, RefreshCw, Star, Trash2, Edit, Save, Tag, DollarSign, Truck, Database, AlertCircle, CheckCircle, HelpCircle, Eye, EyeOff, Users, TrendingUp, TrendingDown, BarChart3, Activity, ArrowUpRight, Award, Receipt, PiggyBank, Clock, Calendar } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend, Cell } from 'recharts';
import { db, supabase, getDbMode, SUPABASE_SQL_SCHEMA } from '../lib/supabase';
import { Order, Product, DeliveryConfig, DeliveryDriver, User, Delivery, StockMovement } from '../types';
import { CATEGORIES } from '../data/mockProducts';
import SeparationGuideModal from './SeparationGuideModal';

interface AdminPanelProps {
  onRefreshProducts: () => void;
  productsList: Product[];
  pointsActive: boolean;
  onTogglePointsActive: (active: boolean) => void;
}

export default function AdminPanel({ onRefreshProducts, productsList, pointsActive, onTogglePointsActive }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'products' | 'delivery' | 'drivers' | 'clients' | 'deliveries'>('dashboard');
  const [dashboardSubView, setDashboardSubView] = useState<'sales' | 'inventory'>('sales');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [globalMinStock, setGlobalMinStock] = useState<number>(() => {
    const saved = localStorage.getItem('O_FAVORITO_GLOBAL_MIN_STOCK');
    return saved ? parseInt(saved, 10) : 10;
  });
  const [replenishAmounts, setReplenishAmounts] = useState<Record<string, string>>({});
  const [customMinStocks, setCustomMinStocks] = useState<Record<string, string>>({});
  const [editingMinStockId, setEditingMinStockId] = useState<string | null>(null);
  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryConfig | null>(null);
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [separationOrder, setSeparationOrder] = useState<Order | null>(null);
  const [searchClient, setSearchClient] = useState('');
  const [searchOrderQuery, setSearchOrderQuery] = useState('');
  const [searchProductQuery, setSearchProductQuery] = useState('');

  // Deliveries filter states
  const [filterDriver, setFilterDriver] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchOrderVal, setSearchOrderVal] = useState('');

  const filteredDeliveries = () => {
    return deliveries.filter(del => {
      if (filterDriver && del.driverId !== filterDriver) return false;
      if (filterStatus && del.status !== filterStatus) return false;
      if (searchOrderVal) {
        const orderTerm = searchOrderVal.toLowerCase();
        return del.orderId.toLowerCase().includes(orderTerm) || del.id.toLowerCase().includes(orderTerm);
      }
      return true;
    });
  };

  // Delivery driver select state for sending orders
  const [driverSelectOrderId, setDriverSelectOrderId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  // Client registration form states
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientNeighborhood, setClientNeighborhood] = useState('');
  const [clientStreetNumber, setClientStreetNumber] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [showClientPassword, setShowClientPassword] = useState(false);
  const [clientSuccess, setClientSuccess] = useState('');
  const [clientError, setClientError] = useState('');

  // Delivery drivers form states
  const [driverName, setDriverName] = useState('');
  const [driverBirthDate, setDriverBirthDate] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverVehicleType, setDriverVehicleType] = useState<'carro' | 'moto'>('moto');
  const [driverLicensePlate, setDriverLicensePlate] = useState('');
  const [driverSuccess, setDriverSuccess] = useState('');
  const [driverError, setDriverError] = useState('');
  const [driverImage, setDriverImage] = useState('');
  const [uploadingDriverImage, setUploadingDriverImage] = useState(false);

  // Administrative authentication states
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminName, setAdminName] = useState('');

  // Loading state
  const [loading, setLoading] = useState(false);

  // Database testing states
  const [dbTestResult, setDbTestResult] = useState<{
    status: 'idle' | 'testing' | 'success' | 'partial' | 'failed';
    generalMessage: string;
    connectionCheck: {
      url: string;
      validConfig: boolean;
      networkCheck: 'pending' | 'success' | 'failed';
    };
    tables: {
      users: 'pending' | 'success' | 'failed' | 'not_tested';
      products: 'pending' | 'success' | 'failed' | 'not_tested';
      orders: 'pending' | 'success' | 'failed' | 'not_tested';
      admin_users: 'pending' | 'success' | 'failed' | 'not_tested';
      delivery_drivers: 'pending' | 'success' | 'failed' | 'not_tested';
      deliveries: 'pending' | 'success' | 'failed' | 'not_tested';
    };
    errors: string[];
  }>({
    status: 'idle',
    generalMessage: 'Clique em "Executar Diagnóstico" para testar a integração com o Supabase.',
    connectionCheck: {
      url: '',
      validConfig: false,
      networkCheck: 'pending',
    },
    tables: {
      users: 'not_tested',
      products: 'not_tested',
      orders: 'not_tested',
      admin_users: 'not_tested',
      delivery_drivers: 'not_tested',
      deliveries: 'not_tested',
    },
    errors: [],
  });

  const handleTestDatabase = async () => {
    const dbMode = getDbMode();
    const errorsList: string[] = [];
    
    setDbTestResult({
      status: 'testing',
      generalMessage: 'Conectando ao Supabase e testando tabelas... Por favor, aguarde.',
      connectionCheck: {
        url: dbMode.url || '',
        validConfig: dbMode.isSupabase,
        networkCheck: 'pending',
      },
      tables: {
        users: 'pending',
        products: 'pending',
        orders: 'pending',
        admin_users: 'pending',
        delivery_drivers: 'pending',
        deliveries: 'pending',
      },
      errors: [],
    });

    if (!dbMode.isSupabase || !supabase) {
      setDbTestResult(prev => ({
        ...prev,
        status: 'failed',
        generalMessage: 'Variáveis de ambiente para o Supabase não foram encontradas! O sistema está operando em Modo Mock Local.',
        tables: {
          users: 'failed',
          products: 'failed',
          orders: 'failed',
          admin_users: 'failed',
          delivery_drivers: 'failed',
          deliveries: 'failed',
        },
        errors: ['URL_SUPABASE ou KEY_SUPABASE estão vazios ou indefinidos em process.env.'],
      }));
      return;
    }

    const testResults = {
      users: 'pending' as any,
      products: 'pending' as any,
      orders: 'pending' as any,
      admin_users: 'pending' as any,
      delivery_drivers: 'pending' as any,
      deliveries: 'pending' as any,
    };

    let networkCheckOk = false;

    // 1. Users table check
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      if (error) {
        testResults.users = 'failed';
        errorsList.push(`Tabela 'users': ${error.message} (Código: ${error.code})`);
      } else {
        testResults.users = 'success';
        networkCheckOk = true;
      }
    } catch (e: any) {
      testResults.users = 'failed';
      errorsList.push(`Tabela 'users' erro inesperado: ${e.message || e}`);
    }

    // 2. Products table check
    try {
      const { error } = await supabase.from('products').select('id').limit(1);
      if (error) {
        testResults.products = 'failed';
        errorsList.push(`Tabela 'products': ${error.message} (Código: ${error.code})`);
      } else {
        testResults.products = 'success';
        networkCheckOk = true;
      }
    } catch (e: any) {
      testResults.products = 'failed';
      errorsList.push(`Tabela 'products' erro inesperado: ${e.message || e}`);
    }

    // 3. Orders table check
    try {
      const { error } = await supabase.from('orders').select('id').limit(1);
      if (error) {
        testResults.orders = 'failed';
        errorsList.push(`Tabela 'orders': ${error.message} (Código: ${error.code})`);
      } else {
        testResults.orders = 'success';
        networkCheckOk = true;
      }
    } catch (e: any) {
      testResults.orders = 'failed';
      errorsList.push(`Tabela 'orders' erro inesperado: ${e.message || e}`);
    }

    // 4. Admin Users check
    try {
      const { error } = await supabase.from('admin_users').select('id').limit(1);
      if (error) {
        testResults.admin_users = 'failed';
        errorsList.push(`Tabela 'admin_users': ${error.message} (Código: ${error.code})`);
      } else {
        testResults.admin_users = 'success';
        networkCheckOk = true;
      }
    } catch (e: any) {
      testResults.admin_users = 'failed';
      errorsList.push(`Tabela 'admin_users' erro inesperado: ${e.message || e}`);
    }

    // 5. Delivery Drivers check
    try {
      const { error } = await supabase.from('delivery_drivers').select('id').limit(1);
      if (error) {
        testResults.delivery_drivers = 'failed';
        errorsList.push(`Tabela 'delivery_drivers': ${error.message} (Código: ${error.code})`);
      } else {
        testResults.delivery_drivers = 'success';
        networkCheckOk = true;
      }
    } catch (e: any) {
      testResults.delivery_drivers = 'failed';
      errorsList.push(`Tabela 'delivery_drivers' erro inesperado: ${e.message || e}`);
    }

    // 6. Deliveries check
    try {
      const { error } = await supabase.from('deliveries').select('id').limit(1);
      if (error) {
        testResults.deliveries = 'failed';
        errorsList.push(`Tabela 'deliveries': ${error.message} (Código: ${error.code})`);
      } else {
        testResults.deliveries = 'success';
        networkCheckOk = true;
      }
    } catch (e: any) {
      testResults.deliveries = 'failed';
      errorsList.push(`Tabela 'deliveries' erro inesperado: ${e.message || e}`);
    }

    const allSuccess = Object.values(testResults).every(v => v === 'success');
    const allFailed = Object.values(testResults).every(v => v === 'failed');

    let finalStatus: 'success' | 'partial' | 'failed' = 'success';
    let finalMsg = 'Parabéns! Todas as tabelas necessárias foram encontradas e estão acessíveis no Supabase!';
    
    if (allFailed) {
      finalStatus = 'failed';
      finalMsg = 'As credenciais parecem válidas, mas as tabelas não existem no banco de dados do Supabase. Use o script abaixo para criá-las!';
    } else if (!allSuccess) {
      finalStatus = 'partial';
      finalMsg = 'Sucesso parcial! Algumas tabelas não foram encontradas. Certifique-se de executar o script SQL completo no painel do Supabase.';
    }

    setDbTestResult({
      status: finalStatus,
      generalMessage: finalMsg,
      connectionCheck: {
        url: dbMode.url,
        validConfig: dbMode.isSupabase,
        networkCheck: networkCheckOk ? 'success' : 'failed',
      },
      tables: testResults,
      errors: errorsList,
    });
  };

  // Editing state for delivery configurations
  const [baseFee, setBaseFee] = useState(0);
  const [feePerKm, setFeePerKm] = useState(0);
  const [freeThreshold, setFreeThreshold] = useState(0);

  // New product form
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Hortifrúti');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdCostPrice, setNewProdCostPrice] = useState('');
  const [newProdPromo, setNewProdPromo] = useState('');
  const [newProdIsPromo, setNewProdIsPromo] = useState(false);
  const [newProdUnit, setNewProdUnit] = useState('un');
  const [newProdStock, setNewProdStock] = useState('50');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdImage, setNewProdImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'product' | 'driver';
    id: string;
    category?: string;
    displayName: string;
  }>({
    isOpen: false,
    type: 'product',
    id: '',
    category: '',
    displayName: ''
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  const executeDeletion = async () => {
    const { type, id, category, displayName } = deleteConfirm;
    try {
      if (type === 'product') {
        await db.deleteProduct(id, category || '');
        showToast(`Produto "${displayName}" excluído com sucesso!`, 'success');
        onRefreshProducts();
        loadData();
      } else if (type === 'driver') {
        await db.deleteDriver(id);
        const allDrivers = await db.getDrivers();
        setDrivers(allDrivers);
        showToast(`Entregador "${displayName}" removido do sistema!`, 'success');
      }
    } catch (err: any) {
      console.error('Erro ao excluir:', err);
      showToast('Erro ao realizar a exclusão no Supabase: ' + (err.message || err), 'error');
    } finally {
      setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
    }
  };

  useEffect(() => {
    const cachedAdmin = sessionStorage.getItem('O_FAVORITO_ADMIN_LOGGED');
    if (cachedAdmin) {
      try {
        const parsed = JSON.parse(cachedAdmin);
        setIsAdminAuthorized(true);
        setAdminName(parsed.name || 'Gerência');
      } catch (e) {
        // Safe fallback
      }
    }
  }, []);

  useEffect(() => {
    if (isAdminAuthorized) {
      loadData();
    }
  }, [productsList, isAdminAuthorized]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allOrders = await db.getOrders();
      setOrders(allOrders);

      const allProducts = await db.getProducts();
      setProducts(allProducts);

      try {
        const movementsList = await db.getStockMovements();
        setStockMovements(movementsList);
      } catch (moveErr) {
        console.error('Error loading stock movements:', moveErr);
      }

      const config = db.getDeliveryConfig();
      setDeliveryConfig(config);
      setBaseFee(config.baseFee);
      setFeePerKm(config.feePerKm);
      setFreeThreshold(config.freeDeliveryThreshold);

      const allDrivers = await db.getDrivers();
      setDrivers(allDrivers);

      const allClients = await db.getUsers();
      setClients(allClients);

      const allDeliveries = await db.getDeliveries();
      setDeliveries(allDeliveries);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Search filter for similar products as the user type
  const typedNameClean = newProdName.trim().toUpperCase();
  const similarProducts = typedNameClean.length >= 2
    ? products.filter(p => p.id !== editingProductId && p.name.toUpperCase().includes(typedNameClean))
    : [];

  // Driver submit and deletion controllers
  const handleDriverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDriverImage(true);
    try {
      if (!supabase) {
        throw new Error('Supabase não está configurado. Verifique as credenciais no painel.');
      }

      const folderName = 'entregadores';
      
      // Limpar o nome do arquivo para evitar problemas de codificação e mantendo a extensão
      const fileExt = file.name.split('.').pop();
      const cleanFileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${folderName}/${cleanFileName}`;

      const { data, error } = await supabase.storage
        .from('SUPERMERCADO FAVORITO')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Recuperar URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('SUPERMERCADO FAVORITO')
        .getPublicUrl(filePath);

      setDriverImage(publicUrl);
    } catch (err: any) {
      console.error('Erro no upload de foto do entregador:', err);
      showToast('Erro ao enviar imagem ao Supabase Storage: ' + (err.message || err), 'error');
    } finally {
      setUploadingDriverImage(false);
    }
  };

  const handleAddDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDriverError('');
    setDriverSuccess('');

    if (!driverName.trim() || !driverBirthDate || !driverPhone.trim() || !driverLicensePlate.trim()) {
      setDriverError('Preencha todos os campos obrigatórios (*).');
      return;
    }

    try {
      const newDriverId = await db.createDriver({
        name: driverName.trim(),
        birthDate: driverBirthDate,
        phone: driverPhone.trim(),
        email: driverEmail.trim() || undefined,
        vehicleType: driverVehicleType,
        licensePlate: driverLicensePlate.trim(),
        imgEntregador: driverImage || undefined
      });

      setDriverSuccess(`Entregador cadastrado com sucesso! ID gerado pelo sistema: ${newDriverId}`);
      
      // Limpar formulário
      setDriverName('');
      setDriverBirthDate('');
      setDriverPhone('');
      setDriverEmail('');
      setDriverVehicleType('moto');
      setDriverLicensePlate('');
      setDriverImage('');

      // Recarregar motoristas
      const allDrivers = await db.getDrivers();
      setDrivers(allDrivers);
    } catch (err: any) {
      setDriverError(err.message || 'Falha ao processar o cadastro do entregador.');
    }
  };

  const handleDeleteDriverClick = (driverId: string, driverName: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'driver',
      id: driverId,
      displayName: driverName
    });
  };

  const formatClientPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const truncated = numbers.slice(0, 11);
    if (truncated.length <= 2) {
      return truncated;
    } else if (truncated.length <= 3) {
      return `${truncated.slice(0, 2)} ${truncated.slice(2)}`;
    } else if (truncated.length <= 7) {
      return `${truncated.slice(0, 2)} ${truncated.slice(2, 3)} ${truncated.slice(3)}`;
    } else {
      return `${truncated.slice(0, 2)} ${truncated.slice(2, 3)} ${truncated.slice(3, 7)}-${truncated.slice(7)}`;
    }
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError('');
    setClientSuccess('');

    if (!clientName.trim() || !clientPhone.trim() || !clientCity.trim() || !clientNeighborhood.trim() || !clientStreetNumber.trim()) {
      setClientError('Preencha todos os campos obrigatórios (*).');
      return;
    }

    const phoneRegex = /^\d{2} \d \d{4}-\d{4}$/;
    if (!phoneRegex.test(clientPhone)) {
      setClientError('O Telefone / WhatsApp deve estar exatamente no formato: ## # ####-####');
      return;
    }

    try {
      await db.registerClient({
        name: clientName.trim(),
        email: clientEmail.trim() || undefined,
        whatsapp: clientPhone.trim(),
        city: clientCity.trim(),
        neighborhood: clientNeighborhood.trim(),
        streetNumber: clientStreetNumber.trim(),
        password: clientPassword || undefined
      });

      setClientSuccess('Cliente cadastrado com sucesso!');
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      setClientCity('');
      setClientNeighborhood('');
      setClientStreetNumber('');
      setClientPassword('');

      // Reload
      const allClients = await db.getUsers();
      setClients(allClients);
    } catch (err: any) {
      setClientError('Erro ao cadastrar o cliente. Verifique se o E-mail ou Telefone já estão em uso.');
    }
  };

  // Move order delivery status
  const handleOrderStatusUpdate = async (orderId: string, nextStatus: Order['status'], driverId?: string) => {
    let description = '';
    let dId = driverId;
    let dName = undefined;

    if (nextStatus === 'processing') {
      description = 'Suas compras já entraram na área de separação. Nossos atendentes estão embalando os melhores itens!';
    } else if (nextStatus === 'shipped') {
      const driver = drivers.find(d => d.id === driverId);
      if (driver) {
        dName = driver.name;
        const vehicle = driver.vehicleType === 'moto' ? 'Moto' : 'Carro';
        description = `Sacolas prontas! O entregador parceiro ${driver.name} (${vehicle} - placa ${driver.licensePlate}) retirou suas compras e já está a caminho do seu endereço!`;
      } else {
        description = 'Sacolas prontas! O entregador parceiro retirou suas compras e já está saindo em direção ao seu endereço!';
      }
    } else if (nextStatus === 'delivered') {
      description = 'Pedido entregue com sucesso! Agradecemos a sua preferência pelo Supermercado O Favorito.';
    }

    try {
      const updated = await db.updateOrderStatus(orderId, nextStatus, description, dId, dName);
      setOrders(updated);
      const allDeliveries = await db.getDeliveries();
      setDeliveries(allDeliveries);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdminVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    if (!adminUsername.trim() || !adminPassword.trim()) {
      setAdminError('Preencha o usuário e a senha para autenticar.');
      return;
    }
    setAdminLoading(true);
    try {
      const result = await db.adminLogin(adminUsername, adminPassword);
      if (result.success) {
        setIsAdminAuthorized(true);
        setAdminName(result.name || 'Gerência');
        sessionStorage.setItem('O_FAVORITO_ADMIN_LOGGED', JSON.stringify({ name: result.name }));
      } else {
        setAdminError(result.message);
      }
    } catch (err) {
      setAdminError('Erro temporário ao conectar às tabelas do Supabase.');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthorized(false);
    setAdminPassword('');
    sessionStorage.removeItem('O_FAVORITO_ADMIN_LOGGED');
  };

  // Add neighborhood rate
  const [nbName, setNbName] = useState('');
  const [nbFee, setNbFee] = useState('');

  const handleAddNeighborhoodFee = () => {
    if (!nbName.trim() || !nbFee.trim() || !deliveryConfig) return;
    const updatedFees = {
      ...deliveryConfig.neighborhoodFees,
      [nbName.trim()]: Number(nbFee)
    };
    const newConfig = { ...deliveryConfig, neighborhoodFees: updatedFees };
    db.saveDeliveryConfig(newConfig);
    setDeliveryConfig(newConfig);
    setNbName('');
    setNbFee('');
  };

  const handleRemoveNeighborhoodFee = (nameToRem: string) => {
    if (!deliveryConfig) return;
    const updatedFees = { ...deliveryConfig.neighborhoodFees };
    delete updatedFees[nameToRem];
    const newConfig = { ...deliveryConfig, neighborhoodFees: updatedFees };
    db.saveDeliveryConfig(newConfig);
    setDeliveryConfig(newConfig);
  };

  const handleSaveGeneralDelivery = () => {
    if (!deliveryConfig) return;
    const newConfig: DeliveryConfig = {
      ...deliveryConfig,
      baseFee,
      feePerKm,
      freeDeliveryThreshold: freeThreshold
    };
    db.saveDeliveryConfig(newConfig);
    setDeliveryConfig(newConfig);
    showToast('Configurações de taxas salvas com sucesso!', 'success');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      if (!supabase) {
        throw new Error('Supabase não está configurado. Verifique as credenciais no painel.');
      }

      // Mapeamento correto de categoria para o respectivo subdiretório do Bucket do Supabase conforme solicitado pelo usuário
      const categoryFolders: Record<string, string> = {
        'Açougue': 'acougue',
        'Bebês': 'bebes',
        'Bebidas': 'bebidas',
        'Carvões': 'carvoes',
        'Chocolates e Balas': 'chocolates e balas',
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

      const folderName = categoryFolders[newProdCategory] || 'utilidades';
      
      // Limpar o nome do arquivo para evitar problemas de codificação e mantendo a extensão
      const fileExt = file.name.split('.').pop();
      const cleanFileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${folderName}/${cleanFileName}`;

      const { data, error } = await supabase.storage
        .from('SUPERMERCADO FAVORITO')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Recuperar URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('SUPERMERCADO FAVORITO')
        .getPublicUrl(filePath);

      setNewProdImage(publicUrl);
    } catch (err: any) {
      console.error('Erro no upload de foto:', err);
      showToast('Erro ao enviar imagem ao Supabase Storage: ' + (err.message || err), 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setNewProdName(p.name.toUpperCase());
    setNewProdCategory(p.category);
    setNewProdPrice(String(p.price));
    setNewProdCostPrice(p.costPrice ? String(p.costPrice) : '');
    setNewProdPromo(p.promoPrice ? String(p.promoPrice) : '');
    setNewProdIsPromo(p.isPromo);
    setNewProdUnit(p.unit);
    setNewProdStock(String(p.stock));
    setNewProdDesc(p.description || '');
    setNewProdImage(p.image);
    
    // Smooth scroll to top of the area or main element
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setNewProdName('');
    setNewProdPrice('');
    setNewProdCostPrice('');
    setNewProdPromo('');
    setNewProdIsPromo(false);
    setNewProdDesc('');
    setNewProdImage('');
    setNewProdStock('55');
    setNewProdUnit('un');
  };

  const handleDeleteProductClick = (p: Product) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'product',
      id: p.id,
      category: p.category,
      displayName: p.name.toUpperCase()
    });
  };

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdPrice.trim()) return;

    const nameUpper = newProdName.trim().toUpperCase();

    // Impedir duplicados exatos (ignorando se for a edição do próprio produto)
    const isEditing = !!editingProductId;
    const isDuplicate = products.some(p => {
      if (isEditing && p.id === editingProductId) return false;
      return p.name.toUpperCase() === nameUpper;
    });

    if (isDuplicate) {
      showToast(`⚠️ DUPLICIDADE: O produto "${nameUpper}" já está cadastrado no sistema!`, 'warning');
      return;
    }

    const priceNum = Number(newProdPrice);
    const promoNum = newProdPromo.trim() ? Number(newProdPromo) : undefined;

    // Default beautiful fallback images based on category
    let defaultImg = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80';
    if (newProdCategory === 'Hortifrúti') {
      defaultImg = 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=400&auto=format&fit=crop&q=80';
    } else if (newProdCategory === 'Açougue') {
      defaultImg = 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=400&auto=format&fit=crop&q=80';
    } else if (newProdCategory === 'Bebidas') {
      defaultImg = 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&auto=format&fit=crop&q=80';
    } else if (newProdCategory === 'Padaria') {
      defaultImg = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80';
    }

    const payload: Product = {
      id: editingProductId || ('p_' + Math.random().toString(36).substr(2, 9)),
      name: nameUpper,
      description: newProdDesc || 'Produto selecionado do Supermercado O Favorito.',
      category: newProdCategory,
      price: priceNum,
      promoPrice: promoNum,
      isPromo: newProdIsPromo,
      image: newProdImage.trim() || defaultImg,
      pointsAwarded: Math.max(1, Math.round(priceNum / 3)), // automatic rules
      stock: Number(newProdStock) || 50,
      unit: newProdUnit,
      costPrice: newProdCostPrice.trim() ? Number(newProdCostPrice) : undefined
    };

    try {
      await db.updateProduct(payload);
      showToast(isEditing ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!', 'success');
      onRefreshProducts();
      loadData();
    } catch (err: any) {
      console.error('Erro ao salvar produto:', err);
      showToast('Erro ao salvar produto no Supabase: ' + (err.message || err), 'error');
    }

    // Reset form
    setEditingProductId(null);
    setNewProdName('');
    setNewProdPrice('');
    setNewProdCostPrice('');
    setNewProdPromo('');
    setNewProdIsPromo(false);
    setNewProdDesc('');
    setNewProdImage('');
    setNewProdStock('50');
    setNewProdUnit('un');
  };

  const handleToggleProductPromo = async (p: Product) => {
    const updated: Product = {
      ...p,
      isPromo: !p.isPromo,
      promoPrice: p.promoPrice || Math.round(p.price * 0.8 * 100) / 100 // default 20% off
    };
    await db.updateProduct(updated);
    onRefreshProducts();
    loadData();
  };

  if (!isAdminAuthorized) {
    return (
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-xl max-w-sm mx-auto p-8 text-gray-800 relative overflow-hidden" id="admin-auth-card">
        {/* Top Accent Bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-600" />
        
        <div className="text-center space-y-3 mb-6">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-100">
            <Settings size={32} className="animate-spin text-amber-500" />
          </div>
          <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Acesso ao Gerente</h3>
          <p className="text-xs text-gray-500">Insira as credenciais administrativas para gerenciar pedidos, estoque e taxas.</p>
        </div>

        {adminError && (
          <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 font-semibold animate-pulse text-center">
            {adminError}
          </div>
        )}

        <form onSubmit={handleAdminVerify} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Usuário Gerente</label>
            <input
              type="text"
              required
              placeholder="ex: admin"
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-gray-150 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all text-slate-800 font-semibold"
              id="admin-username-input"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Senha do Painel</label>
            <div className="relative">
              <input
                type={showAdminPassword ? 'text' : 'password'}
                required
                placeholder="Sua senha secreta"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-150 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all text-slate-800 font-semibold"
                id="admin-password-input"
              />
              <button
                type="button"
                onClick={() => setShowAdminPassword(!showAdminPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={adminLoading}
            className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
            id="admin-auth-submit"
          >
            {adminLoading ? 'Autenticando...' : 'Liberar Painel'}
          </button>
        </form>
        
        <div className="mt-6 pt-4 border-t border-dashed border-gray-100 text-center">
          <span className="text-[11px] text-gray-400 font-bold block">Conexão ativa com o Supabase</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" id="admin-panel">
      {/* Admin header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <Settings className="text-emerald-700 font-bold" />
            Painel do Gerente (O Favorito)
          </h2>
          <div className="flex items-center gap-2.5 flex-wrap mt-1">
            <p className="text-xs text-gray-500">Controles de pedidos, edição de taxas de entrega e catalogação</p>
            <span className="w-1 h-1 bg-gray-300 rounded-full" />
            <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              Gerente: {adminName}
            </span>
            <button
              onClick={handleAdminLogout}
              className="text-[10px] text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer ml-1"
            >
              (Sair da Gerência)
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'dashboard' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            📊 Painel de Estoque
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'orders' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Pedidos ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'products' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Produtos
          </button>
          <button
            onClick={() => setActiveTab('delivery')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'delivery' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Taxas de Entrega
          </button>
          <button
            onClick={() => setActiveTab('drivers')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'drivers' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Entregadores ({drivers.length})
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'clients' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Clientes ({clients.length})
          </button>
          <button
            onClick={() => setActiveTab('deliveries')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'deliveries' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Monitorar Entregas ({deliveries.length})
          </button>

        </div>
      </div>

      {loading && (
        <div className="text-center py-10 flex flex-col items-center gap-2">
          <RefreshCw className="animate-spin text-emerald-700" size={24} />
          <span className="text-xs text-gray-400 font-bold">Atualizando painel...</span>
        </div>
      )}

      {!loading && (
        <div className="pt-6">
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (() => {
            // Calculate general indicators
            const totalProducts = products.length;
            const outOfStockProducts = products.filter(p => Number(p.stock) === 0);
            
            // Critical items: stock <= custom recommended minimum OR recommended minimum
            const criticalProducts = products.filter(p => {
              const recommendedMin = p.minStock !== undefined ? p.minStock : globalMinStock;
              return Number(p.stock) <= recommendedMin;
            });

            // Calculate total units and asset valuation
            const totalStockUnits = products.reduce((sum, p) => sum + Number(p.stock), 0);
            const totalInventoryValuation = products.reduce((sum, p) => sum + (Number(p.stock) * Number(p.price)), 0);

            // Parse sales data from orders list
            const productSales: Record<string, { product: Product; quantity: number; revenue: number }> = {};
            
            // Initialize all products with 0 sales
            products.forEach(p => {
              productSales[p.id] = { product: p, quantity: 0, revenue: 0 };
            });

            // Aggregate real orders
            orders.forEach(order => {
              if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                  if (item.product && item.product.id) {
                    const prodId = item.product.id;
                    if (!productSales[prodId]) {
                      productSales[prodId] = { product: item.product, quantity: 0, revenue: 0 };
                    }
                    productSales[prodId].quantity += Number(item.quantity);
                    productSales[prodId].revenue += Number(item.quantity) * Number(item.product.price);
                  }
                });
              }
            });

            const salesList = Object.values(productSales);
            
            // Sort to get best sellers
            const topSellers = [...salesList]
              .filter(s => s.quantity > 0)
              .sort((a, b) => b.quantity - a.quantity)
              .slice(0, 5);

            // Sort to get least sold / dead stock
            const deadStock = [...salesList]
              .sort((a, b) => a.quantity - b.quantity)
              .slice(0, 10);

            const maxTopSold = topSellers.length > 0 ? topSellers[0].quantity : 1;

            // Handle Repor e Alterar Mínimo submit actions
            const handleQuickReplenish = async (productId: string, productName: string) => {
              const amountStr = replenishAmounts[productId] || '50';
              const toAdd = parseInt(amountStr, 10);
              if (isNaN(toAdd) || toAdd <= 0) {
                alert('Por favor, digite uma quantidade positiva válida.');
                return;
              }

              const prod = products.find(p => p.id === productId);
              if (!prod) return;

              const updatedStock = Number(prod.stock || 0) + toAdd;
              const updatedProduct = {
                ...prod,
                stock: updatedStock
              };

              try {
                await db.updateProduct(updatedProduct);
                await db.recordStockMovement({
                  productId,
                  productName,
                  quantity: toAdd,
                  movementType: 'reposicao'
                });
                setReplenishAmounts(prev => ({ ...prev, [productId]: '' }));
                onRefreshProducts();
                loadData();
              } catch (err) {
                console.error(err);
              }
            };

            const handleUpdateCustomMinStock = async (productId: string) => {
              const minValStr = customMinStocks[productId];
              const minVal = parseInt(minValStr, 10);
              if (isNaN(minVal) || minVal < 0) {
                alert('Insira um valor mínimo válido maior ou igual a zero.');
                return;
              }

              const prod = products.find(p => p.id === productId);
              if (!prod) return;

              const updatedProduct = {
                ...prod,
                minStock: minVal
              };

              try {
                await db.updateProduct(updatedProduct);
                setEditingMinStockId(null);
                setCustomMinStocks(prev => ({ ...prev, [productId]: '' }));
                onRefreshProducts();
                loadData();
              } catch (err) {
                console.error(err);
              }
            };

            return (
              <div className="space-y-6">
                
                {/* DYNAMIC EXECUTIVE SUB-TAB SWITCHER */}
                <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-fit gap-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setDashboardSubView('sales')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 font-black text-xs rounded-lg transition-all cursor-pointer ${
                      dashboardSubView === 'sales'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    📈 Relatórios & Gráficos Executivos
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashboardSubView('inventory')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 font-black text-xs rounded-lg transition-all cursor-pointer ${
                      dashboardSubView === 'inventory'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    📦 Controle & Alertas de Estoque
                  </button>
                </div>

                {dashboardSubView === 'sales' ? (
                  <div className="space-y-6 animate-fadeIn">
                    {(() => {
                      const activeOrders = orders;
                      const totalSalesCount = activeOrders.length;
                      const totalSalesRevenue = activeOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
                      const averageTicket = totalSalesCount > 0 ? (totalSalesRevenue / totalSalesCount) : 0;
                      
                      const categoryMarginMap: Record<string, number> = {
                        'Açougue': 30, 'Hortifrúti': 45, 'Padaria': 40, 'Bebidas': 25, 'PetShop': 35, 'Mercearia': 32
                      };
                      
                      let overallProfit = 0;
                      let overallRevenue = 0;
                      const sectorData: Record<string, { category: string; revenue: number; cost: number; profit: number }> = {};
                      const itemSalesByCategory: Record<string, Record<string, { name: string; quantity: number; revenue: number }>> = {};
                      
                      const sectorsList = ['Açougue', 'Bebês', 'Bebidas', 'Carvões', 'Chocolates e Balas', 'Descartáveis', 'Gelos', 'Higiene', 'Hortifrúti', 'Laticínios', 'Limpeza', 'Mercearia', 'Padaria', 'Ração', 'Salgadinhos', 'Sorvetes', 'Utilidades', 'Papelaria', 'Frios e Congelados'];
                      sectorsList.forEach(sec => {
                        sectorData[sec] = { category: sec, revenue: 0, cost: 0, profit: 0 };
                        itemSalesByCategory[sec] = {};
                      });

                      activeOrders.forEach(o => {
                        if (o.items && Array.isArray(o.items)) {
                          o.items.forEach(it => {
                            if (it.product) {
                              const pricePaid = Number(it.product.price);
                              const qty = Number(it.quantity || 0);
                              const rev = qty * pricePaid;
                              const cat = it.product.category || 'Outros';
                              
                              if (!sectorData[cat]) {
                                sectorData[cat] = { category: cat, revenue: 0, cost: 0, profit: 0 };
                              }
                              if (!itemSalesByCategory[cat]) {
                                itemSalesByCategory[cat] = {};
                              }
                              
                              const fallbackMargin = categoryMarginMap[cat] || 35;
                              const itemCost = it.product.costPrice !== undefined && it.product.costPrice !== null && Number(it.product.costPrice) > 0
                                ? Number(it.product.costPrice)
                                : (pricePaid * (1 - fallbackMargin / 100));
                              const totalCost = qty * itemCost;
                              const profit = rev - totalCost;
                              
                              sectorData[cat].revenue += rev;
                              sectorData[cat].cost += totalCost;
                              sectorData[cat].profit += profit;
                              
                              overallRevenue += rev;
                              overallProfit += profit;
                              
                              const prodId = it.product.id || it.product.name;
                              if (!itemSalesByCategory[cat][prodId]) {
                                itemSalesByCategory[cat][prodId] = { name: it.product.name, quantity: 0, revenue: 0 };
                              }
                              itemSalesByCategory[cat][prodId].quantity += qty;
                              itemSalesByCategory[cat][prodId].revenue += rev;
                            }
                          });
                        }
                      });

                      const overallMarginPct = overallRevenue > 0 ? Math.round((overallProfit / overallRevenue) * 100) : 0;

                      // Past 7 Days timeline
                      const dailyRevenueMap: Record<string, number> = {};
                      for (let i = 6; i >= 0; i--) {
                        const d = new Date();
                        d.setDate(d.getDate() - i);
                        const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                        dailyRevenueMap[dateStr] = 0;
                      }
                      
                      activeOrders.forEach(o => {
                        if (o.createdAt) {
                          const dateObj = new Date(o.createdAt);
                          if (!isNaN(dateObj.getTime())) {
                            const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                            dailyRevenueMap[dateStr] = (dailyRevenueMap[dateStr] || 0) + Number(o.total || 0);
                          }
                        }
                      });
                      
                      const dailyTimelineData = Object.keys(dailyRevenueMap).map(key => ({
                        date: key,
                        faturamento: Number(dailyRevenueMap[key].toFixed(2)),
                      }));

                      // Hourly tracking
                      const standardHourWindows = [
                        { label: '08:00 - 11:00', start: 8, end: 11 },
                        { label: '11:00 - 14:00', start: 11, end: 14 },
                        { label: '14:00 - 17:00', start: 14, end: 17 },
                        { label: '17:00 - 20:00', start: 17, end: 20 },
                        { label: '20:00 - 23:00', start: 20, end: 23 },
                      ];
                      
                      const hourlySalesMap: Record<string, { hour: string; count: number; faturamento: number }> = {};
                      standardHourWindows.forEach(win => {
                        hourlySalesMap[win.label] = { hour: win.label, count: 0, faturamento: 0 };
                      });
                      
                      activeOrders.forEach(o => {
                        if (o.createdAt) {
                          const dateObj = new Date(o.createdAt);
                          if (!isNaN(dateObj.getTime())) {
                            const hour = dateObj.getHours();
                            const matchedWindow = standardHourWindows.find(w => hour >= w.start && hour < w.end);
                            if (matchedWindow) {
                              hourlySalesMap[matchedWindow.label].count += 1;
                              hourlySalesMap[matchedWindow.label].faturamento += Number(o.total || 0);
                            }
                          }
                        }
                      });
                      const hourlyChartData = Object.values(hourlySalesMap);

                      // Weekday distribution
                      const weekdaysMap: Record<number, { day: string; vendas: number; faturamento: number }> = {
                        1: { day: 'Segunda', vendas: 0, faturamento: 0 },
                        2: { day: 'Terça', vendas: 0, faturamento: 0 },
                        3: { day: 'Quarta', vendas: 0, faturamento: 0 },
                        4: { day: 'Quinta', vendas: 0, faturamento: 0 },
                        5: { day: 'Sexta', vendas: 0, faturamento: 0 },
                        6: { day: 'Sábado', vendas: 0, faturamento: 0 },
                        0: { day: 'Domingo', vendas: 0, faturamento: 0 },
                      };
                      
                      activeOrders.forEach(o => {
                        if (o.createdAt) {
                          const dateObj = new Date(o.createdAt);
                          if (!isNaN(dateObj.getTime())) {
                            const dayOfWeek = dateObj.getDay();
                            if (weekdaysMap[dayOfWeek]) {
                              weekdaysMap[dayOfWeek].vendas += 1;
                              weekdaysMap[dayOfWeek].faturamento += Number(o.total || 0);
                            }
                          }
                        }
                      });
                      const weekdaysTimelineData = Object.values(weekdaysMap);

                      // Margins Analysis
                      const marginAnalysisData = Object.keys(sectorData)
                        .map(cat => {
                          const sec = sectorData[cat];
                          const profitMargin = sec.revenue > 0 ? (sec.profit / sec.revenue) * 100 : 0;
                          return {
                            category: cat,
                            revenue: Number(sec.revenue.toFixed(2)),
                            profit: Number(sec.profit.toFixed(2)),
                            margin: Math.round(profitMargin),
                          };
                        })
                        .filter(s => s.revenue > 0);

                      // Category Best Sellers champions
                      const categoryBestSellerList = Object.keys(itemSalesByCategory)
                        .map(cat => {
                          const items = Object.values(itemSalesByCategory[cat]);
                          if (items.length === 0) return null;
                          const sorted = items.sort((a, b) => b.quantity - a.quantity);
                          const bs = sorted[0];
                          return {
                            category: cat,
                            productName: bs.name,
                            quantity: bs.quantity,
                            revenue: bs.revenue,
                          };
                        })
                        .filter(Boolean) as { category: string; productName: string; quantity: number; revenue: number }[];

                      return (
                        <div className="space-y-6">
                          
                          {/* SALES KPI CARDS */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            
                            <div className="bg-white p-4.5 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-4">
                              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
                                <DollarSign size={22} />
                              </div>
                              <div>
                                <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Faturamento Acumulado</span>
                                <span className="text-xl font-black text-slate-800 tracking-tight">R$ {totalSalesRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>

                            <div className="bg-white p-4.5 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-4">
                              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-700">
                                <Receipt size={22} />
                              </div>
                              <div>
                                <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Ticket Médio</span>
                                <span className="text-xl font-black text-slate-800 tracking-tight bg-slate-50 border border-slate-100 rounded-md px-1 py-0.5 inline-block">R$ {averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>

                            <div className="bg-white p-4.5 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-4">
                              <div className="p-3 rounded-xl bg-amber-50 text-amber-700">
                                <Receipt size={22} />
                              </div>
                              <div>
                                <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Número de Pedidos</span>
                                <span className="text-xl font-black text-slate-800 tracking-tight">{totalSalesCount} <span className="text-xs text-gray-400 font-medium">vendas</span></span>
                              </div>
                            </div>

                            <div className="bg-white p-4.5 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-4">
                              <div className="p-3 rounded-xl bg-blue-50 text-blue-700">
                                <PiggyBank size={22} />
                              </div>
                              <div>
                                <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Lucro Realizado Estimado</span>
                                <span className="text-xl font-black text-emerald-600 tracking-tight">
                                  R$ {overallProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                                  <span className="text-xs ml-1 px-1 py-0.5 bg-emerald-50 text-emerald-800 rounded-sm font-extrabold">{overallMarginPct}% margem</span>
                                </span>
                              </div>
                            </div>

                          </div>

                          {/* FINANCIAL CHARTS INTERACTIVE GRID */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* CHART 1: DAILY REVENUE */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs space-y-4">
                              <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                                  <TrendingUp size={16} className="text-emerald-600" />
                                  Faturamento Diário Ultimos 7 Dias
                                </h4>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">DIÁRIO</span>
                              </div>
                              <div className="h-64 w-full">
                                {totalSalesCount === 0 ? (
                                  <div className="h-full flex items-center justify-center text-xs text-gray-400 font-bold">Aguardando pedidos para gerar gráficos.</div>
                                ) : (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dailyTimelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                      <defs>
                                        <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} />
                                      <YAxis stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                                      <Tooltip formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Faturamento']} labelStyle={{ fontWeight: 'bold' }} />
                                      <Area type="monotone" dataKey="faturamento" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorFaturamento)" />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                )}
                              </div>
                            </div>

                            {/* CHART 2: MOVT BY HOUR WINDOWS */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs space-y-4">
                              <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                                  <Clock size={16} className="text-indigo-650" />
                                  Volume Faturamento por Faixa de Horário
                                </h4>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">PICO DE VENDAS</span>
                              </div>
                              <div className="h-64 w-full">
                                {totalSalesCount === 0 ? (
                                  <div className="h-full flex items-center justify-center text-xs text-gray-400 font-bold">Aguardando pedidos para gerar gráficos.</div>
                                ) : (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={hourlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                      <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} />
                                      <YAxis stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                                      <Tooltip formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Faturamento']} labelStyle={{ fontWeight: 'bold' }} />
                                      <Bar dataKey="faturamento" radius={[8, 8, 0, 0]}>
                                        {hourlyChartData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#6366f1'} />
                                        ))}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                )}
                              </div>
                            </div>

                            {/* CHART 3: WEEKDAY PEAKS */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs space-y-4">
                              <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                                  <Calendar size={16} className="text-amber-600" />
                                  Distribuição de Faturamento por Dia da Semana
                                </h4>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">SEMANAL</span>
                              </div>
                              <div className="h-64 w-full">
                                {totalSalesCount === 0 ? (
                                  <div className="h-full flex items-center justify-center text-xs text-gray-400 font-bold">Aguardando pedidos no sistema.</div>
                                ) : (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weekdaysTimelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} />
                                      <YAxis stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                                      <Tooltip formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Faturamento']} labelStyle={{ fontWeight: 'bold' }} />
                                      <Bar dataKey="faturamento" fill="#d97706" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                )}
                              </div>
                            </div>

                            {/* CHART 4: PROFIT MARGIN PER SECTOR */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs space-y-4">
                              <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                                  <Award size={16} className="text-blue-600" />
                                  Análise Real de Margem de Lucro por Setor (%)
                                </h4>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">RENTABILIDADE</span>
                              </div>
                              <div className="h-64 w-full">
                                {marginAnalysisData.length === 0 ? (
                                  <div className="h-full flex items-center justify-center text-xs text-gray-400 font-bold">Sem vendas registradas para estimar margens de setores.</div>
                                ) : (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={marginAnalysisData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                                      <XAxis type="number" stroke="#94a3b8" fontSize={11} fontWeight="bold" tickLine={false} tickFormatter={(v) => `${v}%`} />
                                      <YAxis dataKey="category" type="category" stroke="#475569" fontSize={10} fontWeight="bold" tickLine={false} />
                                      <Tooltip formatter={(value) => [`${value}%`, 'Margem Média']} labelStyle={{ fontWeight: 'bold' }} />
                                      <Bar dataKey="margin" radius={[0, 6, 6, 0]}>
                                        {marginAnalysisData.map((entry, index) => {
                                          let color = '#10b981'; // High
                                          if (entry.margin < 30) color = '#f43f5e'; // Low
                                          else if (entry.margin < 38) color = '#3b82f6'; // Med
                                          return <Cell key={`cell-${index}`} fill={color} />;
                                        })}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                )}
                              </div>
                            </div>

                          </div>

                          {/* CHAMPIONS DIRECTORY: BEST SELLING BY CATEGORY */}
                          <div className="bg-white rounded-2xl border border-slate-150 shadow-xs p-5 space-y-4">
                            <div className="border-b border-slate-50 pb-3">
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                                <Award size={15} className="text-emerald-600" />
                                Produtos Mais Vendidos por Categoria (Campeões de Vendas)
                              </h4>
                              <p className="text-[11px] text-gray-400 leading-normal">Identificação dinâmica do produto campeão absoluto de faturamento e vendas por setor.</p>
                            </div>

                            {categoryBestSellerList.length === 0 ? (
                              <div className="py-8 text-center text-xs text-gray-400 font-bold">Nenhum dado de venda registrado ainda.</div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {categoryBestSellerList.map((c) => (
                                  <div key={c.category} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between gap-2">
                                    <div className="space-y-1">
                                      <span className="text-[9px] px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-md font-extrabold uppercase">
                                        {c.category}
                                      </span>
                                      <h5 className="text-xs font-black text-slate-800 line-clamp-1 uppercase">{c.productName}</h5>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px] font-bold">
                                      <span className="text-slate-500">Qtd Saídas: <strong className="text-slate-800 font-black">{c.quantity} un</strong></span>
                                      <span className="text-emerald-700">Faturou: <strong className="font-extrabold">R$ {c.revenue.toFixed(2)}</strong></span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                          </div>

                        </div>
                      );
                    })()}

                  </div>
                ) : (
                  <div className="space-y-6 animate-fadeIn">
                    
                    {/* TOP INVENTORY METRIC CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-4.5 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-indigo-50 text-indigo-700">
                          <Activity size={22} />
                        </div>
                        <div>
                          <span className="text-[11px] text-gray-405 font-bold uppercase tracking-wider block">Itens em Estoque</span>
                          <span className="text-xl font-black text-slate-800 tracking-tight">{totalStockUnits.toLocaleString()} <span className="text-xs text-gray-500 font-medium">unidades</span></span>
                        </div>
                      </div>

                      <div className="bg-white p-4.5 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
                          <DollarSign size={22} />
                        </div>
                        <div>
                          <span className="text-[11px] text-gray-405 font-bold uppercase tracking-wider block">Valor do Estoque (Custo)</span>
                          <span className="text-xl font-black text-slate-800 tracking-tight">R$ {totalInventoryValuation.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      <div className="bg-white p-4.5 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-rose-50 text-rose-700">
                          <AlertCircle size={22} />
                        </div>
                        <div>
                          <span className="text-[11px] text-gray-405 font-bold uppercase tracking-wider block">Produtos Esgotados</span>
                          <span className="text-xl font-black text-rose-600 tracking-tight">{outOfStockProducts.length} <span className="text-xs text-gray-500 font-medium font-bold">itens</span></span>
                        </div>
                      </div>

                      <div className="bg-white p-4.5 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-amber-50 text-amber-700">
                          <TrendingDown size={22} />
                        </div>
                        <div>
                          <span className="text-[11px] text-gray-450 font-bold uppercase tracking-wider block">Estoque Crítico</span>
                          <span className="text-xl font-black text-amber-600 tracking-tight">{criticalProducts.length} <span className="text-xs text-gray-500 font-medium font-bold">itens</span></span>
                        </div>
                      </div>
                    </div>

                    {/* CONFIGURAÇÃO DE ESTOQUE MÍNIMO PADRÃO */}
                    <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            ⚙️ Alerta Geral de Estoque Mínimo Recomendado
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
                            Configure o limite de estoque padrão geral da loja. Quando um produto atingir ou ficar abaixo desse estoque, ele entrará na lista de Alerta Crítico.
                          </p>
                        </div>
                        <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-2xs w-full md:w-auto">
                          <span className="text-xs font-black text-slate-600 whitespace-nowrap">Mínimo Padrão:</span>
                          <input
                            type="range"
                            min="5"
                            max="50"
                            value={globalMinStock}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setGlobalMinStock(val);
                              localStorage.setItem('O_FAVORITO_GLOBAL_MIN_STOCK', val.toString());
                            }}
                            className="w-24 md:w-32 accent-emerald-600 cursor-ew-resize"
                          />
                          <span className="text-sm font-black bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-100">
                            {globalMinStock}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CHARTS / TOP & DEAD SALES */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                            <TrendingUp size={16} className="text-emerald-600" />
                            Produtos Mais Vendidos (Saídas de Estoque)
                          </h4>
                          <span className="text-[10px] text-gray-400 font-bold uppercase font-bold">Volume</span>
                        </div>
                        {topSellers.length === 0 ? (
                          <div className="py-12 text-center text-xs text-gray-400 font-bold">
                            Aguardando faturamento de compras para gerar relatórios.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {topSellers.map((item, index) => {
                              const percentage = Math.min(100, Math.round((item.quantity / maxTopSold) * 100));
                              return (
                                <div key={item.product.id} className="space-y-1">
                                  <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-800 line-clamp-1">
                                      #{index + 1} {item.product.name}
                                    </span>
                                    <span className="text-emerald-700 whitespace-nowrap font-black">
                                      {item.quantity} {item.product.unit} (R$ {item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                          <h4 className="text-xs font-black text-slate-805 uppercase tracking-widest flex items-center gap-1.5">
                            <BarChart3 size={16} className="text-amber-500" />
                            Sem Saídas / Giro Lento (Dead Stock)
                          </h4>
                          <span className="text-[10px] text-gray-400 font-bold uppercase font-bold">Saídas</span>
                        </div>
                        <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto pr-1">
                          {deadStock.slice(0, 10).map((item) => (
                            <div key={item.product.id} className="py-2.5 flex items-center justify-between text-xs font-bold first:pt-0">
                              <div className="space-y-0.5">
                                <span className="text-gray-700 block line-clamp-1">{item.product.name}</span>
                                <span className="text-[9.5px] text-gray-400 uppercase tracking-wider block font-bold">{item.product.category}</span>
                              </div>
                              <div className="text-right">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${item.quantity === 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                                  {item.quantity === 0 ? 'Sem nenhuma saída ⚠️' : `${item.quantity} saídas`}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* REPLENISHMENT / CRITICAL STOCK LIST */}
                    <div className="bg-white rounded-2xl border border-slate-110 shadow-xs p-5 space-y-4">
                      <div className="border-b border-slate-50 pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                            <AlertCircle size={15} className="text-amber-500" />
                            Produtos em Alerta Crítico (Reposição)
                          </h4>
                          <p className="text-[11px] text-slate-400 leading-normal">Selecione e configure limites especiais ou reponha o estoque rapidamente com apenas um clique.</p>
                        </div>
                        <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg border border-amber-100 font-extrabold self-start whitespace-nowrap">
                          {criticalProducts.length} itens precisando reposição
                        </span>
                      </div>

                      {criticalProducts.length === 0 ? (
                        <div className="text-center py-10 text-xs text-emerald-800 font-black bg-emerald-50/20 rounded-xl border border-emerald-100 flex flex-col items-center gap-1.5">
                          <CheckCircle size={22} className="text-emerald-700" />
                          Loja Abastecida! Todos os produtos estão com níveis de estoque saudáveis e acima do limite mínimo recomendado.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs min-w-[700px]">
                            <thead>
                              <tr className="border-b border-gray-100 text-slate-400 font-black uppercase tracking-widest text-[9.5px]">
                                <th className="pb-2 w-1/3">Produto</th>
                                <th className="pb-2 text-center w-24">Estoque</th>
                                <th className="pb-2 text-center w-48">Nível Mínimo</th>
                                <th className="pb-2 text-center w-28">Status</th>
                                <th className="pb-2 text-right w-1/4">Reposição Imediata</th>
                              </tr>
                            </thead>
                          </table>
                          <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                            {criticalProducts.map((p) => {
                              const isCustom = p.minStock !== undefined;
                              const currentMin = p.minStock !== undefined ? p.minStock : globalMinStock;
                              const isOutOfStock = Number(p.stock) === 0;

                              return (
                                <div key={p.id} className="py-3 flex items-center justify-between text-xs font-bold gap-4">
                                  <div className="flex items-center gap-3 w-1/3 min-w-[153px]">
                                    <img 
                                      src={p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e'} 
                                      className="w-10 h-10 object-cover rounded-lg border border-slate-100 shrink-0" 
                                      alt=""
                                    />
                                    <div className="space-y-0.5 text-slate-800">
                                      <span className="line-clamp-1 font-black uppercase text-[11px]">{p.name}</span>
                                      <span className="text-[9.5px] text-gray-400 uppercase tracking-wider block font-bold">{p.category}</span>
                                    </div>
                                  </div>

                                  <div className="text-center w-24 text-slate-800 font-black">
                                    <span className={isOutOfStock ? 'text-rose-600 font-extrabold' : 'text-amber-700'}>{p.stock}</span> <span className="text-[10px] text-gray-400 font-medium">{p.unit}</span>
                                  </div>

                                  <div className="text-center w-48 text-slate-700 font-black flex flex-col items-center">
                                    {editingMinStockId === p.id ? (
                                      <div className="flex items-center gap-1.5 animate-slideUp">
                                        <input
                                          type="number"
                                          placeholder={currentMin.toString()}
                                          value={customMinStocks[p.id] || ''}
                                          onChange={(e) => setCustomMinStocks(prev => ({ ...prev, [p.id]: e.target.value }))}
                                          className="w-14 bg-white border border-indigo-200 px-1.5 py-0.5 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden"
                                        />
                                        <button
                                          onClick={() => handleUpdateCustomMinStock(p.id)}
                                          className="bg-indigo-650 hover:bg-indigo-700 text-white px-2 py-0.5 rounded-md text-[9.5px] font-extrabold cursor-pointer transition-colors"
                                        >
                                          Slv
                                        </button>
                                        <button
                                          onClick={() => setEditingMinStockId(null)}
                                          className="text-gray-400 hover:text-gray-600 font-black text-xs px-1"
                                        >
                                          X
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5">
                                        <span>{currentMin} {p.unit}</span>
                                        <button
                                          onClick={() => {
                                            setEditingMinStockId(p.id);
                                            setCustomMinStocks(prev => ({ ...prev, [p.id]: currentMin.toString() }));
                                          }}
                                          className="text-indigo-650 hover:text-indigo-850 text-[9.5px] font-extrabold hover:underline cursor-pointer"
                                        >
                                          Ajustar ⚙️
                                        </button>
                                      </div>
                                    )}
                                    {isCustom && (
                                      <span className="text-[9px] text-indigo-500 uppercase tracking-wider block font-black">Mínimo Especial</span>
                                    )}
                                  </div>

                                  <div className="text-center w-28">
                                    {isOutOfStock ? (
                                      <span className="inline-block text-[9.5px] px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg font-black uppercase tracking-wider animate-pulse">
                                        ACABOU O ESTOQUE ❌
                                      </span>
                                    ) : (
                                      <span className="inline-block text-[9.5px] px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-700 rounded-lg font-black uppercase tracking-wider">
                                        ESTOQUE BAIXO ⚠️
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-right w-1/4 min-w-[180px] flex items-center justify-end gap-1.5">
                                    <input
                                      type="number"
                                      min="1"
                                      placeholder="+50"
                                      value={replenishAmounts[p.id] || ''}
                                      onChange={(e) => setReplenishAmounts(prev => ({ ...prev, [p.id]: e.target.value }))}
                                      className="w-16 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg font-black text-slate-850 text-center focus:outline-hidden"
                                    />
                                    <button
                                      onClick={() => handleQuickReplenish(p.id, p.name)}
                                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-black px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all flex items-center gap-1 shadow-2xs shrink-0 whitespace-nowrap"
                                    >
                                      Repor 📦
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RECENT MOVEMENT FEEDBACK PANEL */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                      <div className="border-b border-slate-50 pb-3">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                          <Activity size={15} className="text-indigo-600" />
                          Histórico Recente de Movimentações de Estoque (Auditoria)
                        </h4>
                        <p className="text-[11px] text-gray-455 leading-normal">Confira o fluxo detalhado das últimas entradas e saídas de produtos no sistema.</p>
                      </div>

                      {stockMovements.length === 0 ? (
                        <div className="text-center py-8 text-xs text-gray-400 font-semibold">
                          Sem registros de movimentações recentes no estoque.
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-50 max-h-[350px] overflow-y-auto pr-1">
                          {stockMovements.slice(0, 15).map((log) => {
                            const isSale = Number(log.quantity) < 0;
                            return (
                              <div key={log.id} className="py-2.5 flex justify-between items-center text-xs font-bold first:pt-0">
                                <div className="space-y-0.5">
                                  <span className="text-slate-800 uppercase text-[11px] font-black">{log.productName}</span>
                                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                    <span className={`uppercase tracking-widest font-black ${isSale ? 'text-slate-500' : 'text-emerald-700'}`}>
                                      {log.movementType === 'venda' ? 'Venda (Saída)' : log.movementType === 'reposicao' ? 'Abastecimento (Entrada)' : 'Ajuste'}
                                    </span>
                                    {log.orderId && (
                                      <span className="bg-slate-50 border border-slate-100 px-1 rounded-sm text-slate-500 font-mono">
                                        Pedido: #{log.orderId.substring(0, 8)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="text-right space-y-0.5">
                                  <span className={`text-[12px] font-black ${isSale ? 'text-slate-650' : 'text-emerald-700'}`}>
                                    {isSale ? '' : '+'}{log.quantity} {log.quantity === 1 ? 'unidade' : 'unidades'}
                                  </span>
                                  <span className="text-[10px] text-gray-400 block font-bold">
                                    {new Date(log.createdAt).toLocaleString('pt-BR')}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                )}

              </div>
            );
          })()}

          {/* ORDERS TAB */}
          {activeTab === 'orders' && (() => {
            const filteredOrders = orders.filter((order) => {
              if (!searchOrderQuery.trim()) return true;
              const query = searchOrderQuery.toLowerCase();
              return (
                order.id.toLowerCase().includes(query) ||
                (order.userContact && order.userContact.toLowerCase().includes(query))
              );
            });

            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Acompanhar Pedidos</h3>
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <div className="relative flex-1 sm:w-64">
                      <input
                        type="text"
                        placeholder="Buscar por Nº Pedido ou Cliente..."
                        value={searchOrderQuery}
                        onChange={(e) => setSearchOrderQuery(e.target.value)}
                        className="w-full px-3 py-1.5 pl-8 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-xs text-slate-800 font-medium placeholder-gray-400"
                        id="order-search-filter-input"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                    </div>

                    <button
                      onClick={loadData}
                      className="p-1.5 px-3 border border-gray-250 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:shadow-xs transition-all cursor-pointer shrink-0"
                    >
                      <RefreshCw size={12} />
                      <span className="hidden sm:inline">Atualizar Lista</span>
                    </button>
                  </div>
                </div>

                {orders.length === 0 ? (
                  <div className="text-center p-12 bg-gray-50 rounded-xl text-xs text-gray-400">
                    Nenhum pedido efetuado até o momento. Faça uma compra para simular o workflow do gerente!
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center p-12 bg-gray-55 rounded-xl text-xs text-gray-400" id="no-orders-search-result">
                    Nenhum pedido encontrado para o termo de busca "{searchOrderQuery}".
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 border border-gray-150 rounded-xl hover:border-gray-300 transition-all bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs text-gray-800"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-black text-emerald-900">{order.id}</strong>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                            order.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.status === 'shipped'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}>
                            {order.status === 'pending' && 'Recebido / Aguardando'}
                            {order.status === 'processing' && 'Em Separação'}
                            {order.status === 'shipped' && 'Saiu para Entrega'}
                            {order.status === 'delivered' && 'Entregue'}
                          </span>
                        </div>

                        <p className="text-gray-500 font-medium">
                          Cliente: <strong className="text-gray-700 font-semibold">{order.userContact}</strong> - 
                          Data: <strong className="text-gray-700 font-semibold">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</strong>
                        </p>

                        {order.deliveryDriverName && (
                          <p className="text-indigo-800 font-extrabold flex items-center gap-1.5 text-[11px] mt-1 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1 w-fit">
                            <span>🚀 Designado para entrega:</span>
                            <span className="font-black text-indigo-950">{order.deliveryDriverName}</span>
                          </p>
                        )}

                        <p className="text-gray-500 max-w-2xl font-medium">
                          Destino: <span className="text-gray-700 font-semibold">{order.address}, {order.number} - {order.neighborhood}, {order.city} (CEP: {order.cep})</span>
                        </p>

                        <div className="flex gap-2 flex-wrap text-[10px] text-gray-400 font-medium">
                          <span>Subtotal: R$ {order.subtotal.toFixed(2).replace('.', ',')}</span> |
                          <span>Taxa: R$ {order.deliveryFee.toFixed(2).replace('.', ',')}</span> |
                          <span>Fidelidade Usada: R$ {order.discountUsed.toFixed(2).replace('.', ',')}</span> |
                          <span className="font-extrabold text-emerald-800">Total: R$ {order.total.toFixed(2).replace('.', ',')}</span>
                        </div>
                      </div>

                      {/* Workflow Actions Controls */}
                      <div className="flex gap-2 flex-wrap items-center">
                        <button
                          onClick={() => setSeparationOrder(order)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold px-3 py-1.5 rounded-lg border-b-2 border-slate-300 transition-all cursor-pointer text-xs flex items-center gap-1"
                          title="Visualizar Itens do Pedido e Imprimir Guia de Separação"
                        >
                          Ver Guia / Imprimir 🖨️
                        </button>

                        {order.status === 'pending' && (
                          <button
                            onClick={async () => {
                              await handleOrderStatusUpdate(order.id, 'processing');
                              setSeparationOrder(order);
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-3 py-1.5 rounded-lg border-b-2 border-amber-800 transition-colors cursor-pointer text-xs"
                          >
                            Iniciar Separação 🤝
                          </button>
                        )}
                        {order.status === 'processing' && (
                          <div className="flex flex-col items-end gap-1.5 animate-fadeIn" id={`driver-select-container-${order.id}`}>
                            {driverSelectOrderId === order.id ? (
                              <div className="flex flex-col gap-2 bg-slate-50 border border-indigo-200 p-2.5 rounded-xl text-left max-w-xs animate-slideUp">
                                <span className="text-[10px] font-black text-indigo-950 uppercase tracking-wider block">🗣️ Entregador do Pedido:</span>
                                {drivers.length === 0 ? (
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] text-amber-700 font-semibold leading-normal">
                                      Nenhum entregador cadastrado no sistema. Cadastre na aba "Entregadores" ao lado!
                                    </p>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => setDriverSelectOrderId(null)}
                                        className="px-2 py-1 bg-gray-200 text-gray-700 text-[10px] font-bold rounded-lg cursor-pointer hover:bg-gray-300"
                                      >
                                        Voltar
                                      </button>
                                      <button
                                        onClick={() => {
                                          handleOrderStatusUpdate(order.id, 'shipped');
                                          setDriverSelectOrderId(null);
                                        }}
                                        className="px-2 py-1 bg-amber-600 text-white text-[10px] font-bold rounded-lg cursor-pointer hover:bg-amber-700"
                                      >
                                        Enviar s/ Entregador
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    <select
                                      value={selectedDriverId}
                                      onChange={(e) => setSelectedDriverId(e.target.value)}
                                      className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-[11px] font-bold text-gray-800 focus:outline-hidden"
                                    >
                                      <option value="">-- Selecione o Entregador --</option>
                                      {drivers.map(d => (
                                        <option key={d.id} value={d.id}>
                                          {d.name} ({d.vehicleType === 'moto' ? 'Moto' : 'Carro'} - {d.licensePlate})
                                        </option>
                                      ))}
                                    </select>
                                    <div className="flex gap-1.5 justify-end">
                                      <button
                                        onClick={() => setDriverSelectOrderId(null)}
                                        className="px-2.5 py-1 bg-gray-200 text-slate-700 text-[10.5px] font-extrabold rounded-lg cursor-pointer hover:bg-gray-300"
                                      >
                                        Voltar
                                      </button>
                                      <button
                                        onClick={() => {
                                          handleOrderStatusUpdate(order.id, 'shipped', selectedDriverId);
                                          setDriverSelectOrderId(null);
                                        }}
                                        disabled={!selectedDriverId}
                                        className="px-2.5 py-1 bg-indigo-650 disabled:opacity-50 text-white text-[10.5px] font-extrabold rounded-lg cursor-pointer hover:bg-indigo-700"
                                      >
                                        Confirmar 🚚
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setDriverSelectOrderId(order.id);
                                  setSelectedDriverId('');
                                }}
                                className="bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold px-3 py-1.5 rounded-lg border-b-2 border-indigo-850 transition-colors cursor-pointer text-xs"
                              >
                                Mandar p/ Entrega 🚚
                              </button>
                            )}
                          </div>
                        )}
                        {order.status === 'shipped' && (
                          <button
                            onClick={() => handleOrderStatusUpdate(order.id, 'delivered')}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold px-3 py-1.5 rounded-lg border-b-2 border-emerald-950 transition-colors cursor-pointer text-xs"
                          >
                            Confirmar Entregue ✅
                          </button>
                        )}
                        {order.status === 'delivered' && (
                          <span className="text-[10.5px] px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-150 font-bold block">
                            Concluído com Sucesso
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

          {/* PRODUCTS TAB */}
          {activeTab === 'products' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Left Column (Add Product) - 5 Cols */}
              <form onSubmit={handleAddProductSubmit} className="md:col-span-5 space-y-3.5 p-4 border border-gray-150 rounded-xl bg-gray-50 text-xs text-gray-800 transition-all duration-300">
                <h4 className={`text-xs font-bold uppercase tracking-widest block border-b pb-1.5 ${editingProductId ? 'text-indigo-650 animate-pulse font-black' : 'text-gray-700'}`}>
                  {editingProductId ? '⚠️ Editando Produto (Caixa Alta)' : 'Cadastrar Novo Produto'}
                </h4>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Nome do Produto</label>
                  <input
                    type="text"
                    required
                    placeholder="EX: CEBOLA BRANCA ESPECIAL"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-gray-800 font-bold uppercase tracking-wide placeholder:font-normal"
                  />
                  {similarProducts.length > 0 && (
                    <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg space-y-1 block animate-fadeIn">
                      <span className="text-[9px] text-amber-800 font-extrabold flex items-center gap-1 uppercase tracking-wider">
                        ⚠️ Produtos semelhantes já na base:
                      </span>
                      <div className="flex flex-col gap-1 max-h-24 overflow-y-auto mt-1">
                        {similarProducts.slice(0, 4).map(p => (
                          <div key={p.id} className="flex justify-between items-center text-[9.5px] text-amber-900 border-b border-amber-100 pb-1 last:border-0 last:pb-0">
                            <span className="font-extrabold truncate max-w-[130px]">{p.name}</span>
                            <span className="text-[8px] bg-amber-200 text-amber-800 px-1 py-0.2 rounded font-extrabold">{p.category}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[8px] text-amber-600 font-bold mt-1">Nomes idênticos serão bloqueados ao gravar para evitar duplicados.</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Categoria</label>
                    <select
                      value={newProdCategory}
                      onChange={(e) => setNewProdCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-gray-800 font-bold"
                    >
                      {CATEGORIES.filter(c => c !== 'Todos').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                   <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Unidade de Medida</label>
                    <select
                      value={newProdUnit}
                      onChange={(e) => setNewProdUnit(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-gray-800 font-bold"
                    >
                      <option value="kg">Quilo (kg)</option>
                      <option value="g">Gramas (g)</option>
                      <option value="un">Unidade (un)</option>
                      <option value="pct">Pacote (pct)</option>
                      <option value="litro">Litro (l)</option>
                      <option value="ml">Mililitros (ml)</option>
                      <option value="garrafa">Garrafa</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-550 uppercase tracking-wider block">Preço Venda (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="9.90"
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(e.target.value)}
                      className="w-full px-2 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-gray-800 font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-550 uppercase tracking-wider block" title="Preço de Custo para cálculo de margem">Preço Custo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 5.90"
                      value={newProdCostPrice}
                      onChange={(e) => setNewProdCostPrice(e.target.value)}
                      className="w-full px-2 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-emerald-900 bg-emerald-50/20 border-emerald-100 font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-550 uppercase tracking-wider block">Estoque Inicial</label>
                    <input
                      type="number"
                      required
                      placeholder="50"
                      value={newProdStock}
                      onChange={(e) => setNewProdStock(e.target.value)}
                      className="w-full px-2 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-gray-800 font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Promo switches */}
                <div className="p-2.5 bg-white border border-gray-150 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-700">Ativar Promoção Especial</span>
                    <input
                      type="checkbox"
                      checked={newProdIsPromo}
                      onChange={(e) => setNewProdIsPromo(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-sm"
                    />
                  </div>
                  {newProdIsPromo && (
                    <div className="space-y-1 animate-fadeIn">
                      <label className="text-[10px] font-bold text-rose-600 block">Preço Promocional (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 7.49"
                        value={newProdPromo}
                        onChange={(e) => setNewProdPromo(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-gray-50 border border-rose-300 rounded-lg text-rose-700 focus:outline-hidden focus:bg-white"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2 p-2.5 bg-white border border-gray-150 rounded-xl">
                  <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">Foto do Produto</label>
                  
                  {/* File upload input */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-gray-400 font-bold block mb-0.5">Enviar foto para o Bucket ({newProdCategory}):</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingImage}
                      onChange={handleImageUpload}
                      className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-extrabold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                    />
                    {uploadingImage && (
                      <span className="text-[10px] text-emerald-600 font-bold block animate-pulse mt-1">
                        Subindo imagem para a pasta "{newProdCategory.toLowerCase()}"...
                      </span>
                    )}
                  </div>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink mx-2 text-[9px] text-gray-400 font-bold">OU ADICIONAR LINK</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>

                  <div className="space-y-1">
                    <input
                      type="url"
                      placeholder="https://... (URL da imagem)"
                      value={newProdImage}
                      onChange={(e) => setNewProdImage(e.target.value)}
                      className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden text-gray-600 font-mono text-[10px]"
                    />
                  </div>
                  
                  {newProdImage && (
                    <div className="pt-1 flex items-center gap-2">
                      <img src={newProdImage} alt="Preview" className="w-8 h-8 object-cover rounded-md border border-gray-200" referrerPolicy="no-referrer" />
                      <span className="text-[9px] text-emerald-700 font-bold truncate flex-1">Imagem vinculada com sucesso!</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Breve Descrição</label>
                  <textarea
                    placeholder="Descrição para saladas, origem do produtor..."
                    value={newProdDesc}
                    onChange={(e) => setNewProdDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-gray-600 h-14 resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  {editingProductId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="w-1/3 py-2.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold rounded-lg cursor-pointer transition-colors text-xs"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    className={`${editingProductId ? 'w-2/3 bg-emerald-500 hover:bg-emerald-700 active:bg-emerald-800' : 'w-full bg-emerald-700 hover:bg-emerald-800'} py-2.5 px-4 text-white font-black rounded-lg cursor-pointer transition-colors shadow-2xs text-xs`}
                  >
                    {editingProductId ? 'Gravar Alterações' : 'Confirmar Cadastro'}
                  </button>
                </div>
              </form>

              {/* Right Column (Products list edit/toggle promo) - 7 Cols */}
              <div className="md:col-span-7 space-y-3.5 text-xs text-gray-800">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Produtos Ativos</h4>
                  
                  {/* Search products filter */}
                  <div className="relative w-full sm:w-56 shrink-0">
                    <input
                      type="text"
                      placeholder="Buscar produto por nome ou setor..."
                      value={searchProductQuery}
                      onChange={(e) => setSearchProductQuery(e.target.value)}
                      className="w-full px-2.5 py-1.5 pl-8 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-xs text-slate-800 font-medium placeholder-gray-400"
                      id="product-search-filter-input"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                  </div>
                </div>
                
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {(() => {
                    const filteredProd = products.filter((p) => {
                      if (!searchProductQuery.trim()) return true;
                      const q = searchProductQuery.toLowerCase();
                      return (
                        p.name.toLowerCase().includes(q) ||
                        (p.category && p.category.toLowerCase().includes(q))
                      );
                    });

                    if (filteredProd.length === 0) {
                      return (
                        <div className="text-center p-12 bg-gray-50 rounded-xl text-gray-450 text-xs font-medium" id="no-products-search-result">
                          Nenhum produto cadastrado corresponde à busca "{searchProductQuery}".
                        </div>
                      );
                    }

                    return filteredProd.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 bg-white border border-gray-150 rounded-xl hover:border-gray-250 hover:bg-gray-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-10 h-10 object-cover rounded-lg shrink-0 border border-gray-200 bg-gray-150"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0 flex-1">
                            <h5 className="font-bold text-gray-800 truncate leading-relaxed">{p.name}</h5>
                            <div className="flex gap-1.5 items-center flex-wrap text-[10px] text-gray-400 font-medium mt-1">
                              <span className="bg-emerald-50 px-1.5 py-0.5 rounded-sm border border-emerald-100 text-emerald-800 font-bold uppercase">{p.category}</span>
                              <span className="bg-slate-50 px-1.5 py-0.5 rounded-sm border border-slate-100 text-slate-700 font-bold">Est: {p.stock} {p.unit}</span>
                              {(() => {
                                const activePrice = p.isPromo && p.promoPrice ? p.promoPrice : p.price;
                                const categoryMarginMap: Record<string, number> = {
                                  'Açougue': 30, 'Hortifrúti': 45, 'Padaria': 40, 'Bebidas': 25, 'PetShop': 35, 'Mercearia': 32
                                };
                                const fallbackMarginPercent = categoryMarginMap[p.category] || 35;
                                const costVal = p.costPrice !== undefined && p.costPrice !== null && Number(p.costPrice) > 0 ? Number(p.costPrice) : (activePrice * (1 - fallbackMarginPercent / 100));
                                const actMargin = Math.round(((activePrice - costVal) / activePrice) * 100);
                                return (
                                  <>
                                    <span className="bg-indigo-50 px-1.5 py-0.5 rounded-sm border border-indigo-100 text-indigo-800 font-bold">
                                      Custo: R$ {p.costPrice !== undefined && p.costPrice !== null ? Number(p.costPrice).toFixed(2) : costVal.toFixed(2)}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded-sm border font-black ${actMargin >= 35 ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                                      Margem: {actMargin}%
                                    </span>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto border-t sm:border-t-0 border-dashed border-gray-150 pt-2 sm:pt-0">
                          <div className="text-left sm:text-right">
                            {p.isPromo && p.promoPrice ? (
                              <div>
                                <span className="text-[10px] text-gray-400 line-through mr-1">R${p.price.toFixed(2)}</span>
                                <strong className="text-rose-600 font-black">R${p.promoPrice.toFixed(2)}</strong>
                              </div>
                            ) : (
                              <strong className="text-emerald-800 font-extrabold">R${p.price.toFixed(2)}</strong>
                            )}
                            <span className="text-[10px] text-gray-400 font-bold block">Preço / {p.unit}</span>
                          </div>

                          {/* Toggle Promo button */}
                          <button
                            type="button"
                            onClick={() => handleToggleProductPromo(p)}
                            className={`p-1.5 px-3 rounded-lg font-bold border cursor-pointer transition-all ${
                              p.isPromo
                                ? 'border-rose-250 bg-rose-50 text-rose-700 font-extrabold hover:bg-rose-100'
                                : 'border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                            }`}
                            title="Alternar Promoção Semanal"
                          >
                            <Tag size={13} className="inline mr-1" />
                            {p.isPromo ? 'Promo Ativa' : 'Ativar Promo'}
                          </button>
                          {/* Edit & Delete Action buttons */}
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditProduct(p)}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-150 border border-indigo-205 text-indigo-700 rounded-lg cursor-pointer transition-all flex items-center justify-center"
                              title="Editar Informações do Produto"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProductClick(p)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-150 border border-rose-205 text-rose-700 rounded-lg cursor-pointer transition-all flex items-center justify-center"
                              title="Excluir produto definitivamente"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* DELIVERY SETTINGS TAB */}
          {activeTab === 'delivery' && deliveryConfig && (
            <div className="space-y-8 text-xs text-gray-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Side: General rates */}
                <div className="p-4 border border-gray-155 rounded-xl bg-gray-50/50 space-y-4">
                  <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-widest block border-b pb-1.5 flex items-center gap-1.5">
                    <DollarSign size={14} className="text-emerald-700" />
                    Configuração Geral de Taxas
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-550 block">Taxa de Entrega Base (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={baseFee}
                      onChange={(e) => setBaseFee(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden font-semibold"
                    />
                    <p className="text-[10px] text-gray-400">Cobrada como valor padrão para bairros sem taxa especial cadastrada.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-550 block">Taxa Adicional por Quilômetro (R$/km)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={feePerKm}
                      onChange={(e) => setFeePerKm(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-550 block">Teto para Isenção de Frete (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={freeThreshold}
                      onChange={(e) => setFreeThreshold(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden font-semibold"
                    />
                    <p className="text-[10px] text-gray-400">Pedidos com subtotal igual ou superior a esse valor terão frete grátis.</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveGeneralDelivery}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    id="save-general-delivery-button"
                  >
                    <Save size={14} />
                    Salvar Parâmetros
                  </button>
                </div>

                {/* Right Side: Neighborhood list */}
                <div className="p-4 border border-gray-155 rounded-xl space-y-4">
                  <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-widest block border-b pb-1.5 flex items-center gap-1.5">
                    <Truck size={14} className="text-emerald-700" />
                    Taxas Específicas por Bairro
                  </h4>

                  {/* Form to insert neighborhood rate */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 block uppercase">Nome do Bairro</label>
                      <input
                        type="text"
                        placeholder="Ex: Centro"
                        value={nbName || ''}
                        onChange={(e) => setNbName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-250 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1 flex flex-col justify-between">
                      <label className="text-[10px] font-bold text-gray-400 block uppercase">Valor da Taxa (R$)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="5.00"
                          value={nbFee || ''}
                          onChange={(e) => setNbFee(e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-gray-250 rounded-lg text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleAddNeighborhoodFee}
                          className="p-1 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center justify-center cursor-pointer shadow-3xs hover:shadow-xs transition-all"
                          id="add-neighborhood-fee"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Neighborhood fees list table */}
                  <div className="space-y-2 limit-scroll max-h-[190px] overflow-y-auto">
                    {Object.entries(deliveryConfig.neighborhoodFees).map(([nb, fee]) => (
                      <div
                        key={nb}
                        className="p-2.5 bg-white border border-gray-150 rounded-xl flex justify-between items-center"
                      >
                        <span className="font-extrabold text-gray-800">{nb}</span>
                        <div className="flex items-center gap-2.5 text-xs">
                          <strong className="text-emerald-800 font-extrabold">R$ {Number(fee).toFixed(2).replace('.', ',')}</strong>
                          <button
                            type="button"
                            onClick={() => handleRemoveNeighborhoodFee(nb)}
                            className="p-1 text-rose-500 hover:text-white hover:bg-rose-600 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Loyalty System Toggle Card */}
              <div className="p-5 border border-amber-200 rounded-2xl bg-amber-50/20 space-y-4 max-w-2xl">
                <div className="flex items-start gap-3">
                  <Star size={20} className="text-amber-500 fill-amber-400 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-amber-900">
                      Programa de Fidelidade e Pontuação de Clientes
                    </h4>
                    <p className="text-xs text-amber-800/80 leading-relaxed">
                      Gerencie se a pontuação automática está ativa para os clientes. Quando desativada, referências ao saldo de pontos e descontos no checkout serão totalmente removidos da interface do cliente.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white border border-gray-150 rounded-xl shadow-3xs">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-bold text-gray-800 block">Status de Ativação do Sistema</span>
                    <span className="text-[11px] text-gray-400 block font-medium">
                      {pointsActive ? '🟢 ATIVO — Os clientes acumulam pontos nas compras e podem resgatar descontos' : '🔴 DESATIVADO — Sistema de pontuação oculto do frontend e finalização de compras'}
                    </span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={pointsActive}
                      onChange={(e) => {
                        onTogglePointsActive(e.target.checked);
                      }}
                      className="sr-only peer"
                      id="loyalty-admin-toggle"
                    />
                    <div className="w-10 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* DELIVERY DRIVERS TAB (MANAGEMENT, TRIGGERS, PROCEDURE, POLICIES VIEWER) */}
          {activeTab === 'drivers' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-xs text-gray-800">
              {/* Left Column: Register Form */}
              <form onSubmit={handleAddDriverSubmit} className="lg:col-span-5 space-y-3.5 p-5 border border-gray-150 rounded-xl bg-gray-50 text-xs shadow-3xs">
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest block border-b pb-1.5">Cadastrar Novo Entregador</h4>
                  <p className="text-[10px] text-gray-450 mt-1 leading-relaxed">
                    Este formulário armazena entregadores no Supabase. Placas são automaticamente formatadas em maiúsculas por uma DB Trigger.
                  </p>
                </div>

                {driverError && (
                  <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg font-semibold animate-shake">
                    ⚠️ {driverError}
                  </div>
                )}

                {driverSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-250 rounded-lg font-bold">
                    ✅ {driverSuccess}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo de Souza"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-gray-800 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Nascimento *</label>
                    <input
                      type="date"
                      required
                      value={driverBirthDate}
                      onChange={(e) => setDriverBirthDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-gray-800 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">WhatsApp / Tel *</label>
                    <input
                      type="tel"
                      required
                      placeholder="Ex: (11) 99999-9999"
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-gray-800 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">E-mail (Opcional)</label>
                  <input
                    type="email"
                    placeholder="Ex: carlos.motos@email.com"
                    value={driverEmail}
                    onChange={(e) => setDriverEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-gray-800 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Veículo *</label>
                    <select
                      value={driverVehicleType}
                      onChange={(e) => setDriverVehicleType(e.target.value as 'carro' | 'moto')}
                      className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-gray-800 font-bold text-xs"
                    >
                      <option value="moto">🏍️ Moto</option>
                      <option value="carro">🚗 Carro</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Placa do Veículo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: ABC1D23 ou XYZ-9876"
                      value={driverLicensePlate}
                      onChange={(e) => setDriverLicensePlate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-gray-800 font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2 p-2.5 bg-white border border-gray-150 rounded-xl">
                  <label className="text-[10px] font-bold text-gray-650 uppercase tracking-wider block">Foto do Entregador</label>
                  
                  {/* File upload input */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-gray-400 font-bold block mb-0.5">Enviar foto para o Bucket (entregadores):</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingDriverImage}
                      onChange={handleDriverImageUpload}
                      className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-extrabold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                    />
                    {uploadingDriverImage && (
                      <span className="text-[10px] text-emerald-600 font-bold block animate-pulse mt-1">
                        Subindo imagem para a pasta "entregadores"...
                      </span>
                    )}
                  </div>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink mx-2 text-[9px] text-gray-400 font-bold">OU ADICIONAR LINK</span>
                    <div className="flex-grow border-t border-gray-250"></div>
                  </div>

                  <div className="space-y-1">
                    <input
                      type="url"
                      placeholder="https://... (URL da imagem)"
                      value={driverImage}
                      onChange={(e) => setDriverImage(e.target.value)}
                      className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden text-gray-600 font-mono text-[10px]"
                    />
                  </div>
                  
                  {driverImage && (
                    <div className="pt-1 flex items-center gap-2">
                      <img src={driverImage} alt="Preview" className="w-8 h-8 object-cover rounded-md border border-gray-200" referrerPolicy="no-referrer" />
                      <span className="text-[9px] text-emerald-700 font-bold truncate flex-1">Imagem vinculada com sucesso!</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={uploadingDriverImage}
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-55 text-white font-black rounded-lg cursor-pointer transition-colors shadow-2xs text-xs flex justify-center items-center gap-1.5 mt-2"
                >
                  <Plus size={14} />
                  Cadastrar Entregador
                </button>
              </form>

              {/* Right Column: Drivers List */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Entregadores Cadastrados</h4>
                  <button
                    type="button"
                    onClick={loadData}
                    className="p-1 px-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <RefreshCw size={10} />
                    Sincronizar
                  </button>
                </div>

                {drivers.length === 0 ? (
                  <div className="text-center p-12 bg-gray-55/60 rounded-xl text-xs text-gray-400 border border-dashed border-gray-200">
                    Nenhum entregador cadastrado. Use o formulário à esquerda para cadastrar ou verifique sua conexão com o Supabase.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 limit-scroll">
                    {drivers.map((driver) => (
                      <div
                        key={driver.id}
                        className="p-3.5 bg-white border border-gray-150 rounded-xl hover:border-gray-250 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-3xs relative overflow-hidden"
                      >
                        {/* Status ribbon for vehicle */}
                        <div className={`absolute top-0 right-0 w-1.5 h-full ${
                          driver.vehicleType === 'moto' ? 'bg-orange-500' : 'bg-indigo-500'
                        }`} />

                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          {driver.imgEntregador ? (
                            <img
                              src={driver.imgEntregador}
                              alt={driver.name}
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-full object-cover shrink-0 border-2 border-slate-100 shadow-sm"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center font-black text-slate-500 text-sm">
                              {driver.name.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <strong className="text-[13px] font-extrabold text-gray-900">{driver.name}</strong>
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                driver.vehicleType === 'moto' 
                                  ? 'bg-orange-50 text-orange-700 border border-orange-200' 
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              }`}>
                                {driver.vehicleType === 'moto' ? '🏍️ Moto' : '🚗 Carro'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4 text-[11px] text-gray-500">
                              <div>
                                Tel: <strong className="text-gray-700">{driver.phone}</strong>
                              </div>
                              <div>
                                Nasc: <strong className="text-gray-700">{
                                  new Date(driver.birthDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                                }</strong>
                              </div>
                              {driver.email && (
                                <div className="sm:col-span-2 truncate">
                                  E-mail: <strong className="text-gray-700 font-sans">{driver.email}</strong>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end border-t sm:border-0 border-gray-100 pt-2 sm:pt-0">
                          {/* Brazilian formatted license plate display */}
                          <div className="flex flex-col items-center bg-blue-50 border border-blue-200 rounded-sm p-1 px-2 shrink-0 select-all font-mono">
                            <div className="bg-blue-600 text-white font-extrabold text-[8px] w-full text-center tracking-tight leading-none py-0.5 px-1 uppercase rounded-2xs">
                              BRASIL
                            </div>
                            <strong className="text-slate-900 font-extrabold text-[12px] tracking-wider uppercase mt-0.5 leading-none px-1">
                              {driver.licensePlate}
                            </strong>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteDriverClick(driver.id, driver.name)}
                            className="p-2 text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-all cursor-pointer shadow-3xs"
                            title="Remover Entregador"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CLIENTS TAB (MANAGEMENT & REGISTRATION) */}
          {activeTab === 'clients' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-xs text-gray-800 animate-fadeIn" id="admin-clients-tab">
              {/* Left Column: Register Form */}
              <form onSubmit={handleClientSubmit} className="lg:col-span-5 space-y-3.5 p-5 border border-gray-150 rounded-xl bg-gray-50 text-xs shadow-3xs" id="admin-client-register-form">
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest block border-b pb-1.5 flex items-center gap-2">
                    <Plus size={14} className="text-emerald-700" />
                    Cadastrar Novo Cliente
                  </h4>
                  <p className="text-[10px] text-gray-450 mt-1 leading-relaxed">
                    Cadastre clientes diretamente no banco de dados. Telefones/WhatsApp serão validados estritamente no formato exigido.
                  </p>
                </div>

                {clientError && (
                  <div className="p-3 bg-rose-50 text-rose-800 border border-rose-250 rounded-lg font-semibold animate-shake">
                    ⚠️ {clientError}
                  </div>
                )}

                {clientSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-250 rounded-lg font-bold">
                    ✅ {clientSuccess}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Eduardo Souza Morais"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-gray-800 text-xs font-medium"
                    id="client-name-input"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      placeholder="Ex: ## # ####-####"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(formatClientPhone(e.target.value))}
                      maxLength={14}
                      className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-gray-800 text-xs font-mono font-bold"
                      id="client-phone-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">E-mail (Opcional)</label>
                    <input
                      type="email"
                      placeholder="Ex: eduardo@email.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-gray-800 text-xs font-medium"
                      id="client-email-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Cidade *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Belo Horizonte"
                      value={clientCity}
                      onChange={(e) => setClientCity(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-gray-800 text-xs font-medium"
                      id="client-city-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Bairro *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Centro"
                      value={clientNeighborhood}
                      onChange={(e) => setClientNeighborhood(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-gray-800 text-xs font-medium"
                      id="client-neighborhood-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Rua / Número *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Av. Paulista, 1000"
                      value={clientStreetNumber}
                      onChange={(e) => setClientStreetNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-gray-800 text-xs font-medium"
                      id="client-address-input"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Senha de Acesso (Opcional)</label>
                  <div className="relative">
                    <input
                      type={showClientPassword ? "text" : "password"}
                      placeholder="Deixe em branco para login livre"
                      value={clientPassword}
                      onChange={(e) => setClientPassword(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-gray-800 text-xs"
                      id="client-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowClientPassword(!showClientPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650 cursor-pointer"
                      id="toggle-client-pass-button"
                    >
                      {showClientPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-lg text-xs tracking-wider uppercase cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  id="submit-register-client-button"
                >
                  <Plus size={14} />
                  Cadastrar Cliente no Banco
                </button>
              </form>

              {/* Right Column: Clients List with filtering */}
              <div className="lg:col-span-7 space-y-4" id="admin-clients-list">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-gray-750 uppercase tracking-wider">Lista de Clientes Cadastrados</h4>
                    <p className="text-[10px] text-gray-450 mt-0.5">Filtre ou veja detalhes dos clientes e seus saldos de pontos.</p>
                  </div>

                  {/* Search Bar */}
                  <div className="w-full sm:w-auto min-w-[200px]">
                    <input
                      type="text"
                      placeholder="🔍 Buscar por nome, whatsapp..."
                      value={searchClient}
                      onChange={(e) => setSearchClient(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-gray-250 rounded-lg focus:outline-hidden text-xs text-slate-800 font-medium"
                      id="client-search-filter-input"
                    />
                  </div>
                </div>

                {clients.filter(c => {
                  if (!searchClient) return true;
                  const term = searchClient.toLowerCase();
                  return c.name.toLowerCase().includes(term) || 
                         (c.email && c.email.toLowerCase().includes(term)) || 
                         (c.whatsapp && c.whatsapp.includes(term));
                }).length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl bg-gray-50" id="no-clients-found-alert">
                    <Users className="mx-auto text-gray-300 mb-2 animate-bounce" size={28} />
                    <p className="text-xs font-extrabold text-gray-500">Nenhum cliente cadastrado ou encontrado.</p>
                    <p className="text-[10px] text-gray-400 mt-1 font-sans">Cadastre um cliente usando o formulário ao lado.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {clients.filter(c => {
                      if (!searchClient) return true;
                      const term = searchClient.toLowerCase();
                      return c.name.toLowerCase().includes(term) || 
                             (c.email && c.email.toLowerCase().includes(term)) || 
                             (c.whatsapp && c.whatsapp.includes(term));
                    }).map((client) => (
                      <div 
                        key={client.id}
                        className="bg-white border border-gray-150 p-4 rounded-xl shadow-3xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-emerald-250 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-150 shrink-0 flex items-center justify-center font-black text-emerald-800 text-sm">
                            {client.name.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <strong className="text-xs font-bold text-gray-950 font-sans">{client.name}</strong>
                              <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] px-1.5 py-0.5 rounded font-black flex items-center gap-1">
                                🌟 {client.points} Pontos
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-0.5 gap-x-4 text-[10px] text-gray-500">
                              <div>
                                WhatsApp / Cel: <strong className="text-gray-700 font-mono">{client.whatsapp || 'Não informado'}</strong>
                              </div>
                              {client.email && (
                                <div className="truncate">
                                  E-mail: <strong className="text-gray-700 font-sans">{client.email}</strong>
                                </div>
                              )}
                              <div className="sm:col-span-2 text-slate-500 text-[9.5px]">
                                Endereço: <strong className="text-slate-700">{client.streetNumber ? `${client.streetNumber}, ${client.neighborhood} - ${client.city}` : 'Nenhum endereço salvo'}</strong>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-[10px] text-gray-400 italic font-mono shrink-0 select-all">
                          {client.id}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'deliveries' && (
            <div className="space-y-4 animate-fadeIn" id="deliveries-log-panel">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-150">
                <div>
                  <h3 className="text-sm font-black text-gray-950 flex items-center gap-1.5 font-sans">
                    Ref: 🛵 Log e Rastreamento de Entregas
                  </h3>
                  <p className="text-[10.5px] text-gray-400 font-medium">
                    Acompanhe em detalhes quais entregas cada entregador está realizando ou já realizou com sucesso.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadData}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer flex items-center gap-1 shrink-0 self-end md:self-auto"
                >
                  <RefreshCw size={12} className="animate-pulse" />
                  Atualizar Tabela
                </button>
              </div>

              {/* Filtros */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-gray-150 p-3.5 rounded-2xl">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1 font-sans">Filtrar por Entregador:</label>
                  <select
                    id="filter-driver-select"
                    className="w-full bg-white border border-gray-250 rounded-lg py-1.5 px-2.5 text-xs font-bold text-gray-800 focus:outline-hidden"
                    onChange={(e) => setFilterDriver(e.target.value)}
                    value={filterDriver}
                  >
                    <option value="">-- Todos os Entregadores --</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.vehicleType === 'moto' ? 'Moto' : 'Carro'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1 font-sans">Filtrar por Status:</label>
                  <select
                    id="filter-status-select"
                    className="w-full bg-white border border-gray-250 rounded-lg py-1.5 px-2.5 text-xs font-bold text-gray-800 focus:outline-hidden"
                    onChange={(e) => setFilterStatus(e.target.value)}
                    value={filterStatus}
                  >
                    <option value="">-- Todos os Status --</option>
                    <option value="shipped">🛵 Em Rota (Saindo)</option>
                    <option value="delivered">✅ Entregue com Sucesso</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1 font-sans">Buscar Código de Pedido:</label>
                  <input
                    type="text"
                    placeholder="Ex: #ped_123..."
                    className="w-full bg-white border border-gray-250 rounded-lg py-1.5 px-2.5 text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-hidden"
                    value={searchOrderVal}
                    onChange={(e) => setSearchOrderVal(e.target.value)}
                  />
                </div>
              </div>

              {/* Lista/Tabela de Entregas */}
              {filteredDeliveries().length === 0 ? (
                <div className="bg-white border border-gray-150 p-10 text-center rounded-2xl flex flex-col items-center justify-center gap-1.5">
                  <Truck size={36} className="text-gray-300 animate-pulse" />
                  <span className="text-xs text-gray-400 font-bold font-sans">Nenhuma entrega de motorista cadastrada com os filtros selecionados.</span>
                  <span className="text-[10px] text-gray-400 max-w-md">As entregas são geradas automaticamente quando você envia um pedido do painel ("Mandar p/ Entrega") selecionando o entregador parceiro.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredDeliveries().map((del) => (
                    <div
                      key={del.id}
                      className={`bg-white border p-4 rounded-2xl shadow-3xs hover:shadow-2xs transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                        del.status === 'delivered' ? 'border-emerald-100 hover:border-emerald-200 bg-emerald-50/10' : 'border-indigo-100 hover:border-indigo-200'
                      }`}
                    >
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-mono font-black px-2 py-0.5 rounded-md">
                            Pedido #{del.orderId}
                          </span>
                          
                          {del.status === 'shipped' ? (
                            <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                              🚀 EM ROTA DE ENTREGA
                            </span>
                          ) : (
                            <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                              ✅ ENTREGUE / CONCLUÍDO
                            </span>
                          )}

                          <span className="text-gray-400 text-[10px] font-mono select-all shrink-0">
                            ID: {del.id}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-gray-500 font-medium">
                          <p>
                            👤 Cliente: <strong className="text-gray-800 font-bold">{del.clientName}</strong>
                          </p>
                          <p>
                            🚀 Entregador: <strong className="text-indigo-950 font-black">{del.driverName}</strong>
                          </p>
                          <p className="sm:col-span-2">
                            📍 Endereço de Destino: <strong className="text-gray-700 font-semibold">{del.deliveryAddress}</strong>
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-4 text-[9.5px] text-gray-400 pt-1 border-t border-dashed border-gray-100">
                          <div>
                            Designado em: <strong className="text-gray-600">{new Date(del.assignedAt).toLocaleString('pt-BR')}</strong>
                          </div>
                          {del.deliveredAt ? (
                            <div>
                              Entregue em: <strong className="text-emerald-700 font-bold">{new Date(del.deliveredAt).toLocaleString('pt-BR')}</strong>
                            </div>
                          ) : (
                            <div className="text-indigo-700 font-semibold animate-pulse flex items-center gap-1">
                              <span>⏳ Entrega ativa (em trânsito)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Ações rápidas sobre a entrega */}
                      {del.status === 'shipped' && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const updated = await db.updateOrderStatus(del.orderId, 'delivered', 'Pedido entregue com sucesso!');
                              setOrders(updated);
                              const allDeliveries = await db.getDeliveries();
                              setDeliveries(allDeliveries);
                              showToast('Entrega marcada como CONCLUÍDA com sucesso!', 'success');
                            } catch (e) {
                              console.error(e);
                              showToast('Erro ao concluir entrega.', 'error');
                            }
                          }}
                          className="bg-emerald-650 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl border-b-2 border-emerald-850 text-[11px] cursor-pointer flex items-center gap-1 shrink-0 self-end md:self-auto shadow-2xs hover:scale-[1.02] active:scale-95 transition-all text-xs"
                        >
                          Concluir Entrega ✅
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}


        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-55 flex items-center gap-2 p-3.5 px-4 rounded-xl shadow-lg border text-xs font-extrabold font-sans animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
          toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
          'bg-indigo-50 border-indigo-200 text-indigo-800'
        }`} id="admin-active-toast">
          <AlertCircle size={15} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Delete Confirmation Modal Overlay */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn" id="delete-confirm-modal">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-scaleUp">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-100">
                <Trash2 size={24} className="text-rose-500 animate-pulse" />
              </div>
              <h4 className="text-base font-extrabold text-gray-900">Confirmar Exclusão</h4>
              <p className="text-xs text-gray-500 leading-relaxed font-sans font-medium">
                Tem certeza de que realmente deseja excluir permanentemente <strong className="text-gray-800">{deleteConfirm.displayName}</strong> de todas as tabelas? Esta ação deletará do banco de dados do Supabase imediatamente.
              </p>
            </div>

            <div className="flex gap-2.5 pt-1.5">
              <button
                type="button"
                onClick={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
                className="w-1/2 py-2 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold rounded-lg cursor-pointer transition-all text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeDeletion}
                className="w-1/2 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg cursor-pointer transition-all text-xs"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {separationOrder && (
        <SeparationGuideModal
          order={separationOrder}
          onClose={() => setSeparationOrder(null)}
        />
      )}
    </div>
  );
}
