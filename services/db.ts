
import { Client, Vehicle, Service, ServiceOrder, ServiceOrderStatus } from '../types';

const STORAGE_KEYS = {
  CLIENTS: 'workshop_clients',
  VEHICLES: 'workshop_vehicles',
  SERVICES: 'workshop_services',
  ORDERS: 'workshop_orders',
  USER: 'workshop_user'
};

const getFromStorage = <T,>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveToStorage = <T,>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const db = {
  // Auth
  getCurrentUser: () => {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  },
  login: (email: string, name: string) => {
    const user = { id: 'u1', email, name };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    return user;
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  // Clients
  getClients: (): Client[] => getFromStorage(STORAGE_KEYS.CLIENTS),
  addClient: (client: Omit<Client, 'id' | 'created_at'>) => {
    const clients = db.getClients();
    const newClient = { ...client, id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
    saveToStorage(STORAGE_KEYS.CLIENTS, [newClient, ...clients]);
    return newClient;
  },
  updateClient: (id: string, updates: Partial<Client>) => {
    const clients = db.getClients();
    const index = clients.findIndex(c => c.id === id);
    if (index !== -1) {
      clients[index] = { ...clients[index], ...updates };
      saveToStorage(STORAGE_KEYS.CLIENTS, clients);
    }
  },
  deleteClient: (id: string) => {
    const clients = db.getClients().filter(c => c.id !== id);
    saveToStorage(STORAGE_KEYS.CLIENTS, clients);
  },

  // Vehicles
  getVehicles: (): Vehicle[] => getFromStorage(STORAGE_KEYS.VEHICLES),
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'created_at'>) => {
    const vehicles = db.getVehicles();
    const newVehicle = { ...vehicle, id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
    saveToStorage(STORAGE_KEYS.VEHICLES, [newVehicle, ...vehicles]);
    return newVehicle;
  },
  updateVehicle: (id: string, updates: Partial<Vehicle>) => {
    const vehicles = db.getVehicles();
    const index = vehicles.findIndex(v => v.id === id);
    if (index !== -1) {
      vehicles[index] = { ...vehicles[index], ...updates };
      saveToStorage(STORAGE_KEYS.VEHICLES, vehicles);
    }
  },
  deleteVehicle: (id: string) => {
    const vehicles = db.getVehicles().filter(v => v.id !== id);
    saveToStorage(STORAGE_KEYS.VEHICLES, vehicles);
  },

  // Services
  getServices: (): Service[] => getFromStorage(STORAGE_KEYS.SERVICES),
  addService: (service: Omit<Service, 'id' | 'created_at'>) => {
    const services = db.getServices();
    const newService = { ...service, id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
    saveToStorage(STORAGE_KEYS.SERVICES, [newService, ...services]);
    return newService;
  },
  updateService: (id: string, updates: Partial<Service>) => {
    const services = db.getServices();
    const index = services.findIndex(s => s.id === id);
    if (index !== -1) {
      services[index] = { ...services[index], ...updates };
      saveToStorage(STORAGE_KEYS.SERVICES, services);
    }
  },
  deleteService: (id: string) => {
    const services = db.getServices().filter(s => s.id !== id);
    saveToStorage(STORAGE_KEYS.SERVICES, services);
  },

  // Orders
  getOrders: (): ServiceOrder[] => getFromStorage(STORAGE_KEYS.ORDERS),
  addOrder: (order: Omit<ServiceOrder, 'id' | 'created_at'>) => {
    const orders = db.getOrders();
    const nextId = (orders.reduce((max, o) => Math.max(max, parseInt(o.id)), 0) + 1).toString().padStart(4, '0');
    const newOrder = { 
      ...order, 
      id: nextId, 
      created_at: new Date().toISOString() 
    };
    // Adiciona ao início da lista para que apareça como "recente"
    saveToStorage(STORAGE_KEYS.ORDERS, [newOrder, ...orders]);
    return newOrder;
  },
  updateOrder: (id: string, updates: Partial<ServiceOrder>) => {
    const orders = db.getOrders();
    const index = orders.findIndex(o => o.id === id);
    if (index !== -1) {
      orders[index] = { ...orders[index], ...updates };
      saveToStorage(STORAGE_KEYS.ORDERS, orders);
    }
  },
  deleteOrder: (id: string) => {
    const orders = db.getOrders().filter(o => o.id !== id);
    saveToStorage(STORAGE_KEYS.ORDERS, orders);
  }
};
