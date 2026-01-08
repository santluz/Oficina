
import React, { useState, useMemo } from 'react';
import { DataTable } from '../components/DataTable';
import { db } from '../services/db';
import { ServiceOrder, ServiceOrderStatus, Service, ServiceOrderItem } from '../types';
import { Edit, Trash2, X, Plus, Search, ShoppingCart, CheckCircle2, ClipboardList, Wrench } from '../constants';
import { getStatusStyles } from './Dashboard';
import { useToast } from '../components/Toast';
import { AlertDialog } from '../components/AlertDialog';

const ServiceOrders: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isServicePickerOpen, setIsServicePickerOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [editingOS, setEditingOS] = useState<ServiceOrder | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>(db.getOrders());
  const { showToast } = useToast();
  
  const clients = db.getClients();
  const allVehicles = db.getVehicles();
  const catalogServices = db.getServices();

  const filteredCatalog = useMemo(() => {
    return catalogServices.filter(s => 
      s.nome.toLowerCase().includes(serviceSearch.toLowerCase())
    );
  }, [catalogServices, serviceSearch]);

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

  const updateItem = (idx: number, updates: Partial<ServiceOrderItem>) => {
    const updated = [...formData.servicos];
    const item = { ...updated[idx], ...updates };
    item.subtotal = item.quantidade * item.preco_unitario;
    updated[idx] = item;
    setFormData({ ...formData, servicos: updated, orcamento_total: calculateTotal(updated) });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cliente_id || !formData.veiculo_id) {
        showToast("Selecione um cliente e um veículo.", "error");
        return;
    }

    // Garante que o total está atualizado antes de salvar
    const finalData = {
      ...formData,
      orcamento_total: calculateTotal(formData.servicos)
    };

    if (editingOS) {
      db.updateOrder(editingOS.id, finalData);
      showToast("✅ Ordem de Serviço atualizada!", "success");
    } else {
      db.addOrder(finalData);
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-5xl rounded-2xl overflow-hidden relative animate-in flex flex-col max-h-[92vh] shadow-2xl">
            {/* Header */}
            <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-600/10 flex items-center justify-center text-cyan-500">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{editingOS ? `Editar OS #${editingOS.id}` : 'Nova Ordem de Serviço'}</h3>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">JV Automóveis - Sistema de Gestão</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-500 hover:text-white transition-colors bg-zinc-800 rounded-lg"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <form onSubmit={handleSave} className="p-6 space-y-8">
                {/* Info Geral */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-2 space-y-2">
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
                  <div className="md:col-span-2 space-y-2">
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
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Data de Entrada</label>
                    <input 
                      type="date" required
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                      value={formData.data_entrada.split('T')[0]}
                      onChange={e => setFormData({ ...formData, data_entrada: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Status da OS</label>
                    <select 
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-semibold"
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as ServiceOrderStatus })}
                    >
                      {Object.values(ServiceOrderStatus).map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </div>
                </div>

                {/* Itens da OS */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <h4 className="text-sm font-black text-zinc-100 uppercase tracking-widest flex items-center gap-2">
                        <ShoppingCart size={16} className="text-cyan-500" />
                        Serviços e Peças
                      </h4>
                      <button 
                          type="button" 
                          onClick={() => setIsServicePickerOpen(true)}
                          className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-black flex items-center gap-2 transition-all shadow-lg shadow-cyan-900/20"
                      >
                          <Plus size={14} /> BUSCAR NO CATÁLOGO
                      </button>
                  </div>

                  <div className="bg-zinc-950/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-zinc-900/50 border-b border-zinc-800 text-zinc-500 font-bold uppercase text-[10px] tracking-widest">
                              <tr>
                                  <th className="px-6 py-4">Descrição do Item</th>
                                  <th className="px-6 py-4 w-24 text-center">Qtd</th>
                                  <th className="px-6 py-4 w-40 text-center">Valor Unit.</th>
                                  <th className="px-6 py-4 w-40 text-right">Subtotal</th>
                                  <th className="px-6 py-4 w-16"></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800">
                              {formData.servicos.map((item, idx) => (
                                  <tr key={item.id} className="hover:bg-zinc-800/30 group">
                                      <td className="px-6 py-4 font-semibold text-zinc-100">{item.nome_servico}</td>
                                      <td className="px-6 py-4">
                                          <input 
                                              type="number" 
                                              min="1" 
                                              className="w-full bg-zinc-800 px-3 py-2 rounded-lg border border-zinc-700 focus:border-cyan-500 outline-none text-center font-bold" 
                                              value={item.quantidade} 
                                              onChange={(e) => updateItem(idx, { quantidade: parseInt(e.target.value) || 1 })}
                                          />
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">R$</span>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                className="w-full bg-zinc-800 pl-8 pr-3 py-2 rounded-lg border border-zinc-700 focus:border-cyan-500 outline-none font-mono text-center" 
                                                value={item.preco_unitario} 
                                                onChange={(e) => updateItem(idx, { preco_unitario: parseFloat(e.target.value) || 0 })}
                                            />
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-zinc-100 text-right font-mono font-black text-base">
                                        R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <button 
                                            type="button" 
                                            onClick={() => removeServiceFromOS(item.id)} 
                                            className="text-zinc-600 hover:text-red-500 transition-all p-2 hover:bg-red-500/10 rounded-lg"
                                          >
                                              <Trash2 size={18} />
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                              {formData.servicos.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                      <div className="flex flex-col items-center gap-3 text-zinc-600">
                                        <ShoppingCart size={40} className="opacity-20" />
                                        <p className="italic font-medium">Nenhum item adicionado ao orçamento.</p>
                                        <button 
                                          type="button" 
                                          onClick={() => setIsServicePickerOpen(true)}
                                          className="text-cyan-500 hover:underline text-xs font-bold"
                                        >
                                          Clique aqui para buscar no catálogo
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                              )}
                          </tbody>
                          {formData.servicos.length > 0 && (
                            <tfoot>
                                <tr className="bg-zinc-900/80 border-t-2 border-zinc-800">
                                    <td colSpan={3} className="px-6 py-5 text-right text-xs font-black text-zinc-400 uppercase tracking-[0.2em]">Total da Ordem de Serviço</td>
                                    <td colSpan={2} className="px-6 py-5 text-emerald-400 text-right font-mono text-2xl font-black">
                                      R$ {formData.orcamento_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                          )}
                      </table>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Observações / Diagnóstico Técnico</label>
                  <textarea 
                    rows={4}
                    placeholder="Descreva o estado do veículo, peças trocadas ou observações importantes para o cliente..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-4 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500 resize-none transition-all placeholder:text-zinc-600"
                    value={formData.observacoes}
                    onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                  />
                </div>
                
                <div className="flex items-center justify-end gap-4 pt-6 border-t border-zinc-800 flex-shrink-0">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-sm font-bold text-zinc-400 hover:text-zinc-100 transition-colors">Cancelar</button>
                  <button type="submit" className="px-10 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl transition-all shadow-xl shadow-cyan-900/30 active:scale-95">
                    {editingOS ? 'SALVAR ALTERAÇÕES' : 'FINALIZAR E GERAR OS'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Picker de Serviços (Modal de Seleção) */}
      {isServicePickerOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsServicePickerOpen(false)} />
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-3xl overflow-hidden relative animate-in zoom-in-95 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h4 className="text-lg font-bold">Buscar no Catálogo</h4>
              <button onClick={() => setIsServicePickerOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/30">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Pesquisar serviço ou peça..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-12 pr-4 py-3 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredCatalog.length > 0 ? filteredCatalog.map(s => (
                <button 
                  key={s.id}
                  onClick={() => {
                    addServiceToOS(s);
                  }}
                  className="w-full text-left p-4 rounded-xl hover:bg-zinc-800 transition-all flex items-center justify-between group border border-transparent hover:border-zinc-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white transition-all">
                      <Wrench size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-zinc-100">{s.nome}</p>
                      <p className="text-xs text-zinc-500 line-clamp-1 italic">{s.descricao || 'Sem descrição'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-mono font-bold">R$ {s.preco_base?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest flex items-center justify-end gap-1">
                      <Plus size={10} /> Adicionar
                    </p>
                  </div>
                </button>
              )) : (
                <div className="p-12 text-center space-y-4">
                  <Search size={48} className="text-zinc-800 mx-auto" />
                  <p className="text-zinc-500 italic">Nenhum serviço encontrado para "{serviceSearch}"</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 text-center">
              <button 
                onClick={() => setIsServicePickerOpen(false)}
                className="text-xs font-black text-cyan-500 hover:text-cyan-400 flex items-center justify-center gap-2 mx-auto"
              >
                <CheckCircle2 size={14} /> CONCLUIR SELEÇÃO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;
