
import React, { useMemo } from 'react';
import { 
  Users, 
  Car, 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  BarChart3,
  AlertCircle
} from '../constants';
import { db } from '../services/db';
import { ServiceOrderStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const clients = db.getClients();
  const vehicles = db.getVehicles();
  const orders = db.getOrders();

  const stats = useMemo(() => {
    const openOrdersList = orders.filter(o => o.status !== ServiceOrderStatus.COMPLETED && o.status !== ServiceOrderStatus.CANCELLED);
    const openOrders = openOrdersList.length;
    
    const completedMonth = orders.filter(o => {
      const date = new Date(o.created_at);
      const now = new Date();
      return o.status === ServiceOrderStatus.COMPLETED && date.getMonth() === now.getMonth();
    }).length;
    
    const estimatedRevenue = orders
      .filter(o => o.status === ServiceOrderStatus.COMPLETED)
      .reduce((sum, o) => sum + (o.orcamento_total || 0), 0);

    return {
      totalClients: clients.length,
      totalVehicles: vehicles.length,
      openOrders,
      completedMonth,
      estimatedRevenue,
      openOrdersList
    };
  }, [clients, vehicles, orders]);

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      o.servicos.forEach(s => {
        counts[s.nome_servico] = (counts[s.nome_servico] || 0) + s.quantidade;
      });
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [orders]);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="animate-in">
          <h2 className="text-3xl font-extrabold text-zinc-100 tracking-tight">Visão Geral</h2>
          <p className="text-zinc-500">Acompanhe o desempenho da sua oficina em tempo real.</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl shadow-sm">
          <Clock size={18} className="text-cyan-500" />
          <span className="text-sm font-semibold capitalize">{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<Users size={20} />} label="Total de Clientes" value={stats.totalClients} color="cyan" />
        <StatCard icon={<Car size={20} />} label="Frota Cadastrada" value={stats.totalVehicles} color="emerald" />
        <StatCard icon={<ClipboardList size={20} />} label="OS em Aberto" value={stats.openOrders} color="amber" />
        <StatCard icon={<CheckCircle2 size={20} />} label="Concluídas no Mês" value={stats.completedMonth} color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity Column */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col shadow-xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Clock size={20} className="text-zinc-500" />
                Ordens de Serviço Recentes
              </h3>
              <Link to="/ordens-servico" className="text-sm text-cyan-500 hover:text-cyan-400 font-bold transition-colors">Ver todas</Link>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-950/30 text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                    <th className="px-6 py-4">OS #</th>
                    <th className="px-6 py-4">Veículo</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {orders.slice(0, 6).map((order) => {
                    const vehicle = vehicles.find(v => v.id === order.veiculo_id);
                    return (
                      <tr key={order.id} className="hover:bg-zinc-800/30 transition-all group">
                        <td className="px-6 py-4 font-mono text-cyan-500 font-bold">#{order.id}</td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-zinc-200">{vehicle?.modelo || 'N/A'}</p>
                          <p className="text-xs text-zinc-500 uppercase font-mono">{vehicle?.placa || '------'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border transition-all ${getStatusStyles(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-zinc-100">
                          R$ {order.orcamento_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-zinc-600 italic">
                        Nenhuma ordem de serviço registrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                <BarChart3 size={20} />
              </div>
              <h3 className="text-lg font-bold">Distribuição de Serviços</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#a1a1aa" 
                    fontSize={12} 
                    width={100}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: '#27272a' }}
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    itemStyle={{ color: '#06b6d4', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={20}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#0891b2' : '#27272a'} className="transition-all hover:opacity-80" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Stats Column */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
            <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-2">Faturamento Total</h4>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-black text-zinc-100">
                R$ {stats.estimatedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full w-fit">
              <CheckCircle2 size={12} />
              Valor de OS Concluídas
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
            <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Alertas e Pendências</h4>
            <div className="space-y-4">
              {stats.openOrdersList.length > 0 ? (
                stats.openOrdersList.slice(0, 3).map(os => (
                  <div key={os.id} className="flex gap-4 p-3 rounded-xl bg-zinc-950/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 flex-shrink-0">
                      <AlertCircle size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-200">OS #{os.id} pendente</p>
                      <p className="text-[10px] text-zinc-500 uppercase font-mono">Entrada: {new Date(os.data_entrada).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <CheckCircle2 size={32} className="text-zinc-800 mx-auto mb-2" />
                  <p className="text-xs text-zinc-600 font-medium">Tudo em dia!</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-gradient-to-br from-cyan-600 to-cyan-800 text-white shadow-lg shadow-cyan-900/20 relative overflow-hidden group">
            <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform">
              <Wrench size={120} />
            </div>
            <h4 className="text-lg font-bold mb-2">Gestão Inteligente</h4>
            <p className="text-sm text-cyan-100 opacity-80 leading-relaxed mb-6">
              Mantenha o catálogo de serviços atualizado para agilizar seus orçamentos diários.
            </p>
            <Link to="/servicos" className="inline-flex items-center gap-2 text-xs font-black bg-white text-cyan-700 px-4 py-2 rounded-xl hover:bg-cyan-50 transition-colors shadow-sm">
              Atualizar Catálogo
            </Link>
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
    <div className={`p-6 rounded-3xl bg-zinc-900 border border-zinc-800 transition-all hover:border-zinc-700 hover:scale-[1.02] shadow-xl group`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border transition-transform group-hover:scale-110 ${colors[color] || colors.cyan}`}>
        {icon}
      </div>
      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-zinc-100">{value}</p>
    </div>
  );
};

const Wrench = ({ size, className }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

export const getStatusStyles = (status: ServiceOrderStatus) => {
  switch (status) {
    case ServiceOrderStatus.COMPLETED: return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case ServiceOrderStatus.IN_PROGRESS: return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
    case ServiceOrderStatus.CANCELLED: return 'bg-red-500/10 text-red-500 border-red-500/20';
    default: return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  }
};

export default Dashboard;
