
import React, { useState, useMemo } from 'react';
import { DataTable } from '../components/DataTable';
import { db } from '../services/db';
import { ServiceOrder, ServiceOrderStatus, Service, ServiceOrderItem } from '../types';
import { Edit, Trash2, X, Plus, Search } from '../constants';
import { getStatusStyles } from './Dashboard';
import { useToast } from '../components/Toast';
import { AlertDialog } from '../components/AlertDialog';

const ServiceOrders: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [editingOS, setEditingOS] = useState<ServiceOrder | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>(db.getOrders());
  const { showToast } = useToast();
  
  const clients = db.getClients();
  const allVehicles = db.getVehicles();
  const catalogServices = db.getServices();

  const initialFormData: Omit<ServiceOrder, 'id' | 'created_at'> = {
    user_id: 'u1',
    cliente_id: '',
    veiculo_id: '',
    status: ServiceOrderStatus.PENDING,
    observacoes: '',
    servicos: [],
    orcamento_total: 0,
    data_entrada: new Date().toISOString().split('T')[0]
  };

  const [formData, setFormData] = useState<Omit<ServiceOrder, 'id' | 'created_at'>>(initialFormData);

  const filteredVehicles = useMemo(() => {
    return allVehicles.filter(v => v.cliente_id === formData.cliente_id);
  }, [formData.cliente_id, allVehicles]);

  const calculateTotal = (items: ServiceOrderItem[]) => {
    return items.reduce((sum, item) => sum + (item.preco_unitario * item.quantidade), 0);
  };

  const handleOpenModal = (order?: ServiceOrder) => {
    if (order) {
      setEditingOS(order);
      setFormData({
        user_id: order.user_id,
        cliente_id: order.cliente_id,
        veiculo_id: order.veiculo_id,
        status: order.status,
        observacoes: order.observacoes || '',
        servicos: [...order.servicos],
        orcamento_total: order.orcamento_total,
        data_entrada: order.data_entrada
      });
    } else {
      setEditingOS(null);
      setFormData(initialFormData);
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
    const updatedServices = [...formData.servicos, newService];
    setFormData({ 
      ...formData, 
      servicos: updatedServices,
      orcamento_total: calculateTotal(updatedServices)
    });
    setIsServiceDropdownOpen(false); // Fecha o dropdown após adicionar
    showToast(`Adicionado: ${service.nome}`, "success");
  };

  const removeServiceFromOS = (id: string) => {
    const updatedServices = formData.servicos.filter(s => s.id !== id);
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

    if (editingOS) {
      db.updateOrder(editingOS.id, formData);
      showToast("✅ Ordem de Serviço atualizada!", "success");
    } else {
      db.addOrder(formData);
      showToast("✅ Ordem de Serviço salva!", "success");
    }
    setOrders(db.getOrders());
    setIsModalOpen(false);
  };

  const confirmDelete = (id: string) => {
    setOrderToDelete(id);
    setIsAlertOpen(true);
  };

  const handleDelete = () => {
    if (orderToDelete) {
      db.deleteOrder(orderToDelete);
      setOrders(db.getOrders());
      showToast("🗑️ Ordem de Serviço removida.", "info");
      setOrderToDelete(null);
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
          R$ {o.orcamento_total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    { 
      header: 'Ações', 
      accessor: (o: ServiceOrder) => (
        <div className="flex items-center gap-2">
          <button onClick={() => handleOpenModal(o)} className="p-2 text-zinc-400 hover:text-cyan-500 hover:bg-zinc-800 rounded-lg transition-all"><Edit size={16} /></button>
          <button onClick={() => confirmDelete(o.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded-lg transition-all"><Trash2 size={16} /></button>
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

      <AlertDialog 
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        onConfirm={handleDelete}
        title="Remover Ordem de Serviço?"
        description="Esta ação não pode ser desfeita. Todos os dados desta Ordem de Serviço serão permanentemente removidos do sistema."
        confirmLabel="Excluir OS"
        cancelLabel="Voltar"
        variant="danger"
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-3xl rounded-2xl overflow-hidden relative animate-in flex flex-col max-h-[95vh] shadow-2xl my-4">
            <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
              <h3 className="text-xl font-bold">{editingOS ? `Editar OS #${editingOS.id}` : 'Nova Ordem de Serviço'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Cliente</label>
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
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Veículo</label>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Data Entrada</label>
                  <input 
                    type="date" required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                    value={formData.data_entrada.split('T')[0]}
                    onChange={e => setFormData({ ...formData, data_entrada: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</label>
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
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Itens do Orçamento</label>
                    <div className="relative">
                        <button 
                            type="button" 
                            onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${isServiceDropdownOpen ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-cyan-500 hover:bg-zinc-700'}`}
                        >
                            <Plus size={14} /> Adicionar Serviço/Peça
                        </button>
                        
                        {isServiceDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsServiceDropdownOpen(false)} />
                            <div className="absolute right-0 mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 p-2 overflow-hidden animate-in zoom-in-95 duration-200">
                                <div className="p-2 border-b border-zinc-800 mb-1">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Catálogo de Serviços</p>
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    {catalogServices.length > 0 ? catalogServices.map(s => (
                                        <button 
                                            key={s.id} 
                                            type="button"
                                            onClick={() => addServiceToOS(s)}
                                            className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-zinc-800 transition-colors flex justify-between items-center group"
                                        >
                                            <span className="font-medium group-hover:text-cyan-400 transition-colors">{s.nome}</span>
                                            <span className="text-xs text-emerald-500 font-mono">R${s.preco_base?.toFixed(2)}</span>
                                        </button>
                                    )) : (
                                        <p className="text-xs text-zinc-500 p-4 text-center italic">Nenhum serviço cadastrado.</p>
                                    )}
                                </div>
                            </div>
                          </>
                        )}
                    </div>
                </div>

                <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl overflow-hidden shadow-inner">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-500 font-bold uppercase text-[10px] tracking-widest">
                            <tr>
                                <th className="px-4 py-3">Item</th>
                                <th className="px-4 py-3 w-20 text-center">Qtd</th>
                                <th className="px-4 py-3 w-36 text-center">Preço Unit.</th>
                                <th className="px-4 py-3 w-36 text-right">Subtotal</th>
                                <th className="px-4 py-3 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {formData.servicos.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-zinc-800/20 group">
                                    <td className="px-4 py-3 font-medium text-zinc-200">{item.nome_servico}</td>
                                    <td className="px-4 py-3">
                                        <input 
                                            type="number" 
                                            min="1" 
                                            className="w-full bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700 focus:border-cyan-500 outline-none text-center transition-all" 
                                            value={item.quantidade} 
                                            onChange={(e) => {
                                                const q = parseInt(e.target.value) || 1;
                                                const updated = [...formData.servicos];
                                                updated[idx] = { ...updated[idx], quantidade: q, subtotal: q * updated[idx].preco_unitario };
                                                setFormData({ ...formData, servicos: updated, orcamento_total: calculateTotal(updated) });
                                            }}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="relative">
                                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">R$</span>
                                          <input 
                                              type="number" 
                                              step="0.01"
                                              className="w-full bg-zinc-800 pl-7 pr-2 py-1.5 rounded-lg border border-zinc-700 focus:border-cyan-500 outline-none font-mono text-center transition-all" 
                                              value={item.preco_unitario} 
                                              onChange={(e) => {
                                                  const p = parseFloat(e.target.value) || 0;
                                                  const updated = [...formData.servicos];
                                                  updated[idx] = { ...updated[idx], preco_unitario: p, subtotal: p * updated[idx].quantidade };
                                                  setFormData({ ...formData, servicos: updated, orcamento_total: calculateTotal(updated) });
                                              }}
                                          />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-zinc-100 text-right font-mono font-bold">R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button 
                                          type="button" 
                                          onClick={() => removeServiceFromOS(item.id)} 
                                          className="text-zinc-600 hover:text-red-500 transition-colors p-1"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {formData.servicos.length === 0 && (
                                <tr><td colSpan={5} className="px-4 py-12 text-center text-zinc-600 italic">O orçamento está vazio. Adicione serviços ou peças.</td></tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="bg-zinc-900 border-t border-zinc-800">
                                <td colSpan={3} className="px-6 py-4 text-right text-xs font-bold text-zinc-500 uppercase tracking-widest">Valor Total da OS</td>
                                <td colSpan={2} className="px-6 py-4 text-emerald-400 text-right font-mono text-xl font-black">R$ {formData.orcamento_total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Observações Internas / Diagnóstico</label>
                <textarea 
                  rows={3}
                  placeholder="Descreva o problema relatado pelo cliente ou detalhes técnicos..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500 resize-none transition-all placeholder:text-zinc-600"
                  value={formData.observacoes}
                  onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                />
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-800 flex-shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-semibold text-zinc-400 hover:text-zinc-100 transition-colors">Cancelar</button>
                <button type="submit" className="px-8 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-900/20 active:scale-95">
                  {editingOS ? 'Salvar Alterações' : 'Finalizar e Gerar OS'}
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
