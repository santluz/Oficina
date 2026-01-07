
import React, { useState, useMemo } from 'react';
import { DataTable } from '../components/DataTable';
import { db } from '../services/db';
import { ServiceOrder, ServiceOrderStatus, Service, ServiceOrderItem } from '../types';
import { Edit, Trash2, X, Plus } from '../constants';
import { getStatusStyles } from './Dashboard';
import { useToast } from '../components/Toast';

const ServiceOrders: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOS, setEditingOS] = useState<ServiceOrder | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>(db.getOrders());
  const { showToast } = useToast();
  
  const clients = db.getClients();
  const allVehicles = db.getVehicles();
  const catalogServices = db.getServices();

  const [formData, setFormData] = useState<Partial<ServiceOrder>>({
    cliente_id: '',
    veiculo_id: '',
    status: ServiceOrderStatus.PENDING,
    observacoes: '',
    servicos: [],
    orcamento_total: 0
  });

  const filteredVehicles = useMemo(() => {
    return allVehicles.filter(v => v.cliente_id === formData.cliente_id);
  }, [formData.cliente_id, allVehicles]);

  const calculateTotal = (items: ServiceOrderItem[]) => {
    return items.reduce((sum, item) => sum + (item.preco_unitario * item.quantidade), 0);
  };

  const handleOpenModal = (order?: ServiceOrder) => {
    if (order) {
      setEditingOS(order);
      setFormData({ ...order });
    } else {
      setEditingOS(null);
      setFormData({
        cliente_id: '',
        veiculo_id: '',
        status: ServiceOrderStatus.PENDING,
        observacoes: '',
        servicos: [],
        orcamento_total: 0,
        data_entrada: new Date().toISOString().split('T')[0]
      });
    }
    setIsModalOpen(true);
  };

  const addServiceToOS = (service: Service) => {
    const newService: ServiceOrderItem = {
      id: Math.random().toString(36).substr(2, 9),
      servico_id: service.id,
      nome_servico: service.nome,
      quantidade: 1,
      preco_unitario: service.preco_base || 0,
      subtotal: service.preco_base || 0
    };
    const updatedServices = [...(formData.servicos || []), newService];
    setFormData({ 
      ...formData, 
      servicos: updatedServices,
      orcamento_total: calculateTotal(updatedServices)
    });
  };

  const removeServiceFromOS = (id: string) => {
    const updatedServices = (formData.servicos || []).filter(s => s.id !== id);
    setFormData({ 
      ...formData, 
      servicos: updatedServices,
      orcamento_total: calculateTotal(updatedServices)
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cliente_id || !formData.veiculo_id) {
        showToast("Selecione um cliente e um veículo.", "error");
        return;
    }

    const payload = {
        ...formData,
        user_id: 'u1',
        data_entrada: formData.data_entrada || new Date().toISOString()
    } as Omit<ServiceOrder, 'id' | 'created_at'>;

    if (editingOS) {
      db.updateOrder(editingOS.id, payload);
      showToast("✅ Ordem de Serviço atualizada!", "success");
    } else {
      db.addOrder(payload);
      showToast("✅ Ordem de Serviço salva!", "success");
    }
    setOrders(db.getOrders());
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja excluir permanentemente esta OS?')) {
      db.deleteOrder(id);
      setOrders(db.getOrders());
      showToast("🗑️ Ordem de Serviço removida.", "info");
    }
  };

  const columns = [
    { header: 'Nº OS', accessor: (o: ServiceOrder) => <span className="font-mono text-cyan-500 font-bold">#{o.id}</span> },
    { 
      header: 'Cliente / Veículo', 
      accessor: (o: ServiceOrder) => {
        const client = clients.find(c => c.id === o.cliente_id);
        const vehicle = allVehicles.find(v => v.id === o.veiculo_id);
        return (
          <div>
            <p className="font-medium">{client?.nome || 'N/A'}</p>
            <p className="text-xs text-zinc-500">{vehicle?.modelo} - <span className="uppercase font-mono">{vehicle?.placa}</span></p>
          </div>
        );
      }
    },
    { 
      header: 'Status', 
      accessor: (o: ServiceOrder) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusStyles(o.status)}`}>
          {o.status}
        </span>
      )
    },
    { 
      header: 'Total', 
      accessor: (o: ServiceOrder) => (
        <span className="font-bold text-zinc-100">
          R$ {o.orcamento_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    { 
      header: 'Ações', 
      accessor: (o: ServiceOrder) => (
        <div className="flex items-center gap-2">
          <button onClick={() => handleOpenModal(o)} className="p-2 text-zinc-400 hover:text-cyan-500 hover:bg-zinc-800 rounded-lg transition-all"><Edit size={16} /></button>
          <button onClick={() => handleDelete(o.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded-lg transition-all"><Trash2 size={16} /></button>
        </div>
      ),
      className: 'text-right'
    },
  ];

  return (
    <div className="animate-in">
      <DataTable 
        title="Ordens de Serviço"
        data={orders}
        columns={columns}
        onAdd={() => handleOpenModal()}
        addButtonLabel="Nova OS"
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-2xl overflow-hidden relative animate-in flex flex-col max-h-[90vh] shadow-2xl">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
              <h3 className="text-xl font-bold">{editingOS ? `Editar OS #${editingOS.id}` : 'Nova Ordem de Serviço'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Cliente</label>
                  <select 
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                    value={formData.cliente_id}
                    onChange={e => setFormData({ ...formData, cliente_id: e.target.value, veiculo_id: '' })}
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Veículo</label>
                  <select 
                    required
                    disabled={!formData.cliente_id}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 transition-all"
                    value={formData.veiculo_id}
                    onChange={e => setFormData({ ...formData, veiculo_id: e.target.value })}
                  >
                    <option value="">Selecione o veículo</option>
                    {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} ({v.placa})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Data Entrada</label>
                  <input 
                    type="date" required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                    value={formData.data_entrada?.split('T')[0] || ''}
                    onChange={e => setFormData({ ...formData, data_entrada: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Status</label>
                  <select 
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as ServiceOrderStatus })}
                  >
                    {Object.values(ServiceOrderStatus).map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Serviços / Peças</label>
                    <div className="relative group">
                        <button 
                            type="button" 
                            className="text-xs font-bold text-cyan-500 flex items-center gap-1 hover:text-cyan-400 transition-colors"
                        >
                            <Plus size={14} /> Adicionar Serviço
                        </button>
                        <div className="absolute right-0 mt-2 w-64 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl invisible group-hover:visible z-50 p-2 max-h-48 overflow-y-auto">
                            {catalogServices.map(s => (
                                <button 
                                    key={s.id} 
                                    type="button"
                                    onClick={() => addServiceToOS(s)}
                                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-zinc-700 transition-colors"
                                >
                                    {s.nome} (R$ {s.preco_base})
                                </button>
                            ))}
                            {catalogServices.length === 0 && <p className="text-xs text-zinc-500 p-2">Nenhum serviço no catálogo.</p>}
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-500">
                            <tr>
                                <th className="px-4 py-2">Item</th>
                                <th className="px-4 py-2 w-20">Qtd</th>
                                <th className="px-4 py-2 w-32">Preço</th>
                                <th className="px-4 py-2 w-32 text-right">Subtotal</th>
                                <th className="px-4 py-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {formData.servicos?.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-zinc-800/20">
                                    <td className="px-4 py-2 font-medium">{item.nome_servico}</td>
                                    <td className="px-4 py-2">
                                        <input 
                                            type="number" 
                                            min="1" 
                                            className="w-full bg-zinc-800 px-2 py-1 rounded border border-zinc-700 focus:border-cyan-500 outline-none" 
                                            value={item.quantidade} 
                                            onChange={(e) => {
                                                const q = parseInt(e.target.value) || 1;
                                                const updated = [...(formData.servicos || [])];
                                                updated[idx] = { ...updated[idx], quantidade: q, subtotal: q * updated[idx].preco_unitario };
                                                setFormData({ ...formData, servicos: updated, orcamento_total: calculateTotal(updated) });
                                            }}
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            className="w-full bg-zinc-800 px-2 py-1 rounded border border-zinc-700 focus:border-cyan-500 outline-none" 
                                            value={item.preco_unitario} 
                                            onChange={(e) => {
                                                const p = parseFloat(e.target.value) || 0;
                                                const updated = [...(formData.servicos || [])];
                                                updated[idx] = { ...updated[idx], preco_unitario: p, subtotal: p * updated[idx].quantidade };
                                                setFormData({ ...formData, servicos: updated, orcamento_total: calculateTotal(updated) });
                                            }}
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-zinc-400 text-right font-mono">R$ {item.subtotal.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right">
                                        <button type="button" onClick={() => removeServiceFromOS(item.id)} className="text-red-500 hover:text-red-400 transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {(!formData.servicos || formData.servicos.length === 0) && (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-600 italic">Adicione serviços ao orçamento</td></tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="bg-zinc-900 font-bold border-t border-zinc-800">
                                <td colSpan={3} className="px-4 py-3 text-right">TOTAL ESTIMADO</td>
                                <td colSpan={2} className="px-4 py-3 text-emerald-400 text-right font-mono">R$ {formData.orcamento_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase">Observações Internas</label>
                <textarea 
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500 resize-none transition-all"
                  value={formData.observacoes}
                  onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                />
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800 flex-shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-semibold text-zinc-400 hover:text-zinc-100 transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95">
                  {editingOS ? 'Salvar OS' : 'Gerar Ordem de Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;
