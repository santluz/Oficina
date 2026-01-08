
import React, { useState, useMemo, useEffect } from 'react';
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
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const { showToast } = useToast();
  
  // Carrega as ordens inicialmente
  useEffect(() => {
    setOrders(db.getOrders());
  }, []);

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
    return items.reduce((sum, item) => {
      const preco = parseFloat(String(item.preco_unitario)) || 0;
      const qtd = parseInt(String(item.quantidade)) || 0;
      return sum + (preco * qtd);
    }, 0);
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
    setFormData(prev => ({ 
      ...prev, 
      servicos: updatedServices,
      orcamento_total: calculateTotal(updatedServices)
    }));
    showToast(`Adicionado: ${service.nome}`, "success");
  };

  const removeServiceFromOS = (id: string) => {
    const updatedServices = formData.servicos.filter(s => s.id !== id);
    setFormData(prev => ({ 
      ...prev, 
      servicos: updatedServices,
      orcamento_total: calculateTotal(updatedServices)
    }));
  };

  const updateItem = (idx: number, updates: Partial<ServiceOrderItem>) => {
    const updated = [...formData.servicos];
    const item = { ...updated[idx], ...updates };
    const preco = parseFloat(String(item.preco_unitario)) || 0;
    const qtd = parseInt(String(item.quantidade)) || 0;
    item.subtotal = qtd * preco;
    updated[idx] = item;
    setFormData(prev => ({ ...prev, servicos: updated, orcamento_total: calculateTotal(updated) }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cliente_id || !formData.veiculo_id) {
        showToast("Selecione um cliente e um veículo.", "error");
        return;
    }

    const currentTotal = calculateTotal(formData.servicos);
    const finalData = {
      ...formData,
      orcamento_total: currentTotal
    };

    try {
      if (editingOS) {
        db.updateOrder(editingOS.id, finalData);
        showToast("✅ Ordem de Serviço atualizada!", "success");
      } else {
        db.addOrder(finalData);
        showToast("✅ Nova Ordem de Serviço cadastrada!", "success");
      }
      
      // Atualiza lista e fecha modal
      const latestOrders = db.getOrders();
      setOrders(latestOrders);
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      showToast("Erro ao processar a Ordem de Serviço.", "error");
    }
  };

  const confirmDelete = (id: string) => {
    setOrderToDelete(id);
    setIsAlertOpen(true);
  };

  const handleDelete = () => {
    if (orderToDelete) {
      db.deleteOrder(orderToDelete);
      setOrders(db.getOrders());
      showToast("🗑️ Ordem removida.", "info");
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
          <div className="py-1">
            <p className="font-bold text-zinc-200">{client?.nome || 'N/A'}</p>
            <p className="text-[11px] text-zinc-500">{vehicle?.modelo} • <span className="uppercase font-mono">{vehicle?.placa}</span></p>
          </div>
        );
      }
    },
    { 
      header: 'Status', 
      accessor: (o: ServiceOrder) => (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusStyles(o.status)}`}>
          {o.status}
        </span>
      )
    },
    { 
      header: 'Faturamento', 
      accessor: (o: ServiceOrder) => (
        <span className="font-black text-zinc-100 font-mono">
          R$ {(Number(o.orcamento_total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
        title="Gerenciamento de Ordens"
        data={orders}
        columns={columns}
        onAdd={() => handleOpenModal()}
        addButtonLabel="Abrir Nova OS"
      />

      <AlertDialog 
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        onConfirm={handleDelete}
        title="Deseja excluir esta Ordem?"
        description="Esta ação é permanente e removerá todos os registros desta OS do banco de dados."
        confirmLabel="Confirmar Exclusão"
        cancelLabel="Voltar"
        variant="danger"
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto flex justify-center items-start sm:items-center p-2 sm:p-4">
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-5xl rounded-2xl sm:rounded-3xl overflow-hidden relative animate-in flex flex-col max-h-[90vh] shadow-2xl my-auto">
            {/* Header */}
            <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40 flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-cyan-600/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20">
                  <ClipboardList size={22} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-2xl font-black tracking-tight uppercase">{editingOS ? `OS #${editingOS.id}` : 'Nova Ordem de Serviço'}</h3>
                  <p className="hidden sm:block text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black">JV Automóveis • Controle de Oficina</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-500 hover:text-white transition-colors bg-zinc-800 rounded-xl"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-8 sm:space-y-10">
                {/* Seleção de Cliente e Veículo */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8">
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Cliente</label>
                    <select 
                      required
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-4 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-semibold"
                      value={formData.cliente_id}
                      onChange={e => setFormData(prev => ({ ...prev, cliente_id: e.target.value, veiculo_id: '' }))}
                    >
                      <option value="">Selecione o cliente...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Veículo</label>
                    <select 
                      required
                      disabled={!formData.cliente_id}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-4 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-30 transition-all font-semibold"
                      value={formData.veiculo_id}
                      onChange={e => setFormData(prev => ({ ...prev, veiculo_id: e.target.value }))}
                    >
                      <option value="">Selecione o veículo...</option>
                      {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} ({v.placa})</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data de Entrada</label>
                    <input 
                      type="date" required
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-4 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                      value={formData.data_entrada.split('T')[0]}
                      onChange={e => setFormData(prev => ({ ...prev, data_entrada: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status da Ordem</label>
                    <select 
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-4 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-black uppercase tracking-widest"
                      value={formData.status}
                      onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as ServiceOrderStatus }))}
                    >
                      {Object.values(ServiceOrderStatus).map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </div>
                </div>

                {/* Itens da OS */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-zinc-950/20 p-4 rounded-xl sm:rounded-2xl border border-zinc-800">
                      <div className="flex items-center gap-3">
                        <ShoppingCart size={18} className="text-cyan-500" />
                        <h4 className="text-[10px] sm:text-xs font-black text-zinc-200 uppercase tracking-[0.2em]">Itens do Orçamento</h4>
                      </div>
                      <button 
                          type="button" 
                          onClick={() => setIsServicePickerOpen(true)}
                          className="px-4 py-2 sm:px-6 sm:py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black flex items-center gap-2 transition-all shadow-xl shadow-cyan-900/40 uppercase"
                      >
                          <Plus size={14} /> Adicionar Item
                      </button>
                  </div>

                  <div className="bg-zinc-950/40 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm min-w-[600px]">
                          <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-500 font-bold uppercase text-[9px] tracking-[0.2em]">
                              <tr>
                                  <th className="px-6 py-4 sm:px-8 sm:py-5">Descrição</th>
                                  <th className="px-6 py-4 sm:px-8 sm:py-5 w-20 text-center">Qtd</th>
                                  <th className="px-6 py-4 sm:px-8 sm:py-5 w-32 text-center">Unitário</th>
                                  <th className="px-6 py-4 sm:px-8 sm:py-5 w-32 text-right">Subtotal</th>
                                  <th className="px-6 py-4 sm:px-8 sm:py-5 w-12"></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800">
                              {formData.servicos.map((item, idx) => (
                                  <tr key={item.id} className="hover:bg-zinc-800/40 group transition-colors">
                                      <td className="px-6 py-4 sm:px-8 sm:py-5 font-bold text-zinc-100">{item.nome_servico}</td>
                                      <td className="px-6 py-4 sm:px-8 sm:py-5">
                                          <input 
                                              type="number" 
                                              min="1" 
                                              className="w-full bg-zinc-800 px-2 py-2 rounded-lg border border-zinc-700 focus:border-cyan-500 outline-none text-center font-black text-xs" 
                                              value={item.quantidade} 
                                              onChange={(e) => updateItem(idx, { quantidade: parseInt(e.target.value) || 1 })}
                                          />
                                      </td>
                                      <td className="px-6 py-4 sm:px-8 sm:py-5">
                                          <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600 text-[9px] font-black">R$</span>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                className="w-full bg-zinc-800 pl-6 pr-2 py-2 rounded-lg border border-zinc-700 focus:border-cyan-500 outline-none font-mono text-center font-bold text-xs" 
                                                value={item.preco_unitario} 
                                                onChange={(e) => updateItem(idx, { preco_unitario: parseFloat(e.target.value) || 0 })}
                                            />
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 sm:px-8 sm:py-5 text-zinc-100 text-right font-mono font-black text-sm">
                                        R$ {(Number(item.subtotal) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="px-6 py-4 sm:px-8 sm:py-5 text-right">
                                          <button 
                                            type="button" 
                                            onClick={() => removeServiceFromOS(item.id)} 
                                            className="text-zinc-600 hover:text-red-500 transition-all p-2 hover:bg-red-500/10 rounded-lg"
                                          >
                                              <Trash2 size={16} />
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                              {formData.servicos.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="px-8 py-16 text-center">
                                      <div className="flex flex-col items-center gap-4 text-zinc-700">
                                        <ShoppingCart size={48} className="opacity-10" />
                                        <p className="italic font-bold text-zinc-500 text-xs">Orçamento vazio. Adicione itens para calcular o total.</p>
                                      </div>
                                    </td>
                                  </tr>
                              )}
                          </tbody>
                          {formData.servicos.length > 0 && (
                            <tfoot>
                                <tr className="bg-zinc-900 border-t-2 border-zinc-800">
                                    <td colSpan={3} className="px-8 py-5 text-right text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Total Geral</td>
                                    <td colSpan={2} className="px-8 py-5 text-emerald-400 text-right font-mono text-xl sm:text-2xl font-black">
                                      R$ {(Number(formData.orcamento_total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                          )}
                      </table>
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Observações e Diagnóstico Técnico</label>
                  <textarea 
                    rows={4}
                    placeholder="Descreva o estado do veículo ou detalhes técnicos importantes..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-4 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 resize-none transition-all placeholder:text-zinc-600 font-medium text-sm"
                    value={formData.observacoes}
                    onChange={e => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  />
                </div>
                
                {/* Rodapé */}
                <div className="flex items-center justify-end gap-6 pt-10 border-t border-zinc-800 flex-shrink-0 pb-6 sm:pb-0">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-xs font-black text-zinc-500 hover:text-zinc-100 transition-colors uppercase tracking-widest">Cancelar</button>
                  <button type="submit" className="px-10 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl sm:rounded-2xl transition-all shadow-2xl shadow-cyan-900/50 active:scale-95 uppercase tracking-widest text-xs">
                    {editingOS ? 'Salvar Alterações' : 'Finalizar e Gravar OS'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Seletor de Itens */}
      {isServicePickerOpen && (
        <div className="fixed inset-0 z-[70] overflow-y-auto flex justify-center items-start sm:items-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setIsServicePickerOpen(false)} />
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-[2rem] overflow-hidden relative animate-in zoom-in-95 shadow-2xl flex flex-col max-h-[80vh] my-auto">
            <div className="p-6 sm:p-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/20">
              <h4 className="text-lg font-black uppercase tracking-widest">Catálogo de Serviços</h4>
              <button onClick={() => setIsServicePickerOpen(false)} className="text-zinc-500 hover:text-white transition-colors bg-zinc-800 p-2 rounded-xl"><X size={18} /></button>
            </div>
            
            <div className="p-4 sm:p-6 border-b border-zinc-800 bg-zinc-950/40">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Pesquisar no catálogo..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl sm:rounded-2xl pl-12 pr-6 py-3 sm:py-4 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner text-sm"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-1 bg-zinc-950/20">
              {filteredCatalog.length > 0 ? filteredCatalog.map(s => (
                <button 
                  key={s.id}
                  onClick={() => addServiceToOS(s)}
                  className="w-full text-left p-4 rounded-xl sm:rounded-2xl hover:bg-zinc-800 transition-all flex items-center justify-between group border border-transparent hover:border-zinc-700 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg sm:rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white transition-all shadow-lg">
                      <Wrench size={18} />
                    </div>
                    <div>
                      <p className="font-black text-zinc-100 uppercase text-[10px] tracking-wider">{s.nome}</p>
                      <p className="text-[10px] text-zinc-500 line-clamp-1 italic mt-1">{s.descricao || 'Sem descrição técnica'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-mono font-black text-xs sm:text-sm">R$ {s.preco_base?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest flex items-center justify-end gap-1 mt-1 group-hover:text-cyan-500 transition-colors">
                      <Plus size={8} /> Adicionar
                    </p>
                  </div>
                </button>
              )) : (
                <div className="p-12 text-center">
                  <p className="text-zinc-500 font-bold italic text-sm">Nenhum serviço encontrado.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-800 text-center bg-zinc-950/40">
              <button 
                onClick={() => setIsServicePickerOpen(false)}
                className="text-[10px] font-black text-cyan-500 hover:text-cyan-400 flex items-center justify-center gap-2 mx-auto uppercase tracking-widest px-8 py-3 bg-cyan-500/5 rounded-xl border border-cyan-500/10 transition-all hover:bg-cyan-500/10"
              >
                <CheckCircle2 size={14} /> Concluir Seleção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;
