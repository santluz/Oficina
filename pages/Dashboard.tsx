
import React, { useMemo, useState, useEffect } from 'react';
import { 
  Users, 
  Car, 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  BarChart3,
  AlertCircle,
  Zap
} from '../constants';
import { db } from '../services/db';
import { ServiceOrder, ServiceOrderStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [data, setData] = useState({
    clients: [] as any[],
    vehicles: [] as any[],
    orders: [] as ServiceOrder[]
  });

  // Carrega dados toda vez que o componente monta
  useEffect(() => {
    const orders = db.getOrders();
    const clients = db.getClients();
    const vehicles = db.getVehicles();
    setData({ clients, vehicles, orders });
  }, []);

  const stats = useMemo(() => {
    const { orders, clients, vehicles } = data;
    
    // Ordens que não estão concluídas nem canceladas
    const openOrdersList = orders.filter(o => o.status !== ServiceOrderStatus.COMPLETED && o.status !== ServiceOrderStatus.CANCELLED);
    
    // Faturamento REALIZADO (Apenas Concluídas)
    const realizedRevenue = orders
      .filter(o => o.status === ServiceOrderStatus.COMPLETED)
      .reduce((sum, o) => sum + (Number(o.orcamento_total) || 0), 0);
    
    // Previsão de Receita (Pendente + Em Andamento)
    const pendingRevenue = orders
      .filter(o => o.status === ServiceOrderStatus.PENDING || o.status === ServiceOrderStatus.IN_PROGRESS)
      .reduce((sum, o) => sum + (Number(o.orcamento_total) || 0), 0);

    const completedMonth = orders.filter(o => {
      const date = new Date(o.created_at);
      const now = new Date();
      return o.status === ServiceOrderStatus.COMPLETED && date.getMonth() === now.getMonth();
    }).length;

    return {
      totalClients: clients.length,
      totalVehicles: vehicles.length,
      openOrders: openOrdersList.length,
      completedMonth,
      realizedRevenue,
      pendingRevenue,
      totalPotential: realizedRevenue + pendingRevenue,
      openOrdersList
    };
  }, [data]);

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.orders.forEach(o => {
      o.servicos.forEach(s => {
        counts[s.nome_servico] = (counts[s.nome_servico] || 0) + s.quantidade;
      });
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [data.orders]);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="animate-in">
          <h2 className="text-3xl font-extrabold text-zinc-100 tracking-tight">Painel de Controle</h2>
          <p className="text-zinc-500">Acompanhe o desempenho da JV Automóveis em tempo real.</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl shadow-sm">
          <Clock size={18} className="text-cyan-500" />
          <span className="text-sm font-semibold capitalize">{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<Users size={20} />} label="Total Clientes" value={stats.totalClients} color="cyan" />
        <StatCard icon={<ClipboardList size={20} />} label="OS em Aberto" value={stats.openOrders} color="amber" />
        <StatCard icon={<CheckCircle2 size={20} />} label="Concluídas (Mês)" value={stats.completedMonth} color="indigo" />
        <StatCard icon={<Zap size={20} />} label="Previsão Financeira" value={`R$ ${stats.totalPotential.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Faturamento Detalhado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Faturamento Realizado</h4>
              <p className="text-3xl font-black text-emerald-400 mb-4">
                R$ {stats.realizedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-2 text-[10px] font-bold px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full w-fit uppercase">
                <CheckCircle2 size={12} /> Somente Ordens Concluídas
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all" />
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Valor Total em Aberto</h4>
              <p className="text-3xl font-black text-cyan-500 mb-4">
                R$ {stats.pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-2 text-[10px] font-bold px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full w-fit uppercase">
                <Clock size={12} /> Pendentes e Em Andamento
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col shadow-xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <ClipboardList size={20} className="text-zinc-500" />
                Ordens Recentes
              </h3>
              <Link to="/ordens-servico" className="text-sm text-cyan-500 hover:text-cyan-400 font-bold transition-colors">Ver listagem completa</Link>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-950/30 text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                    <th className="px-6 py-4">OS #</th>
                    <th className="px-6 py-4">Veículo</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Orçamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {data.orders.slice(0, 6).map((order) => {
                    const vehicle = data.vehicles.find(v => v.id === order.veiculo_id);
                    return (
                      <tr key={order.id} className="hover:bg-zinc-800/30 transition-all group">
                        <td className="px-6 py-4 font-mono text-cyan-500 font-bold">#{order.id}</td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-zinc-200">{vehicle?.modelo || 'Desconhecido'}</p>
                          <p className="text-xs text-zinc-500 uppercase font-mono">{vehicle?.placa || '---'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black border transition-all uppercase ${getStatusStyles(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-zinc-100">
                          R$ {Number(order.orcamento_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                  {data.orders.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-zinc-600 italic">Nenhuma OS encontrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Coluna Lateral */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
            <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Aguardando Execução</h4>
            <div className="space-y-4">
              {stats.openOrdersList.length > 0 ? (
                stats.openOrdersList.slice(0, 5).map(os => (
                  <div key={os.id} className="flex gap-4 p-3 rounded-xl bg-zinc-950/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 flex-shrink-0">
                      <AlertCircle size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="text-xs font-bold text-zinc-200">OS #{os.id}</p>
                        <p className="text-xs font-black text-amber-500">R$ {os.orcamento_total.toFixed(2)}</p>
                      </div>
                      <p className="text-[10px] text-zinc-500 uppercase font-mono mt-1">Entrada: {new Date(os.data_entrada).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <CheckCircle2 size={32} className="text-zinc-800 mx-auto mb-2" />
                  <p className="text-xs text-zinc-600 font-medium">Nenhuma OS pendente.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                <BarChart3 size={16} />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Serviços Populares</h3>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" stroke="#a1a1aa" fontSize={10} width={80} axisLine={false} tickLine={false} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#0891b2' : '#27272a'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, color: string }> = ({ icon, label, value, color }) => {
  const colors: Record<string, string> = {
    cyan: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20 shadow-cyan-500/5',
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/5',
    indigo: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 shadow-indigo-500/5',
  };

  return (
    <div className={`p-6 rounded-3xl bg-zinc-900 border border-zinc-800 transition-all hover:border-zinc-700 shadow-xl group`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border transition-transform group-hover:scale-110 ${colors[color] || colors.cyan}`}>
        {icon}
      </div>
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-1">{label}</p>
      <p className="text-2xl font-black text-zinc-100">{value}</p>
    </div>
  );
};

export const getStatusStyles = (status: ServiceOrderStatus) => {
  switch (status) {
    case ServiceOrderStatus.COMPLETED: return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case ServiceOrderStatus.IN_PROGRESS: return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
    case ServiceOrderStatus.CANCELLED: return 'bg-red-500/10 text-red-500 border-red-500/20';
    default: return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  }
};

export default Dashboard;
