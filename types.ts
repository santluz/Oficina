
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}

export interface Client {
  id: string;
  user_id: string;
  nome: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  user_id: string;
  cliente_id: string;
  placa: string;
  marca: string;
  modelo: string;
  ano?: number;
  chassi?: string;
  created_at: string;
}

export interface Service {
  id: string;
  user_id: string;
  nome: string;
  descricao?: string;
  preco_base?: number;
  created_at: string;
}

export enum ServiceOrderStatus {
  PENDING = "Orçamento Pendente",
  IN_PROGRESS = "Em Andamento",
  COMPLETED = "Concluído",
  CANCELLED = "Cancelado"
}

export interface ServiceOrderItem {
  id: string;
  servico_id: string;
  nome_servico: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

export interface ServiceOrder {
  id: string;
  user_id: string;
  cliente_id: string;
  veiculo_id: string;
  data_entrada: string;
  data_saida_prevista?: string;
  status: ServiceOrderStatus;
  observacoes?: string;
  orcamento_total: number;
  servicos: ServiceOrderItem[];
  created_at: string;
}
