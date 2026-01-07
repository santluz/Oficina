
import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  Wrench, 
  ClipboardList, 
  ShieldCheck, 
  Zap, 
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  Edit,
  Trash2,
  LogOut,
  ChevronRight,
  Menu,
  X,
  User as UserIcon
} from 'lucide-react';

export const COLORS = {
  primary: 'cyan-600',
  primaryHover: 'cyan-500',
  bg: 'zinc-950',
  card: 'zinc-900',
  border: 'zinc-800',
  text: 'zinc-100',
  textMuted: 'zinc-400',
  accent: 'emerald-400',
  danger: 'red-600',
  dangerHover: 'red-500'
};

export const NAV_ITEMS = [
  { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
  { label: 'Clientes', icon: <Users size={20} />, path: '/clientes' },
  { label: 'Veículos', icon: <Car size={20} />, path: '/veiculos' },
  { label: 'Serviços', icon: <Wrench size={20} />, path: '/servicos' },
  { label: 'Ordens de Serviço', icon: <ClipboardList size={20} />, path: '/ordens-servico' },
];

export { 
  LayoutDashboard, Users, Car, Wrench, ClipboardList, ShieldCheck, Zap, 
  BarChart3, Clock, CheckCircle2, AlertCircle, Search, Plus, Edit, Trash2, 
  LogOut, ChevronRight, Menu, X, UserIcon 
};
