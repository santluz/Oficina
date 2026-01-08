
import React, { useState, useMemo, useEffect } from 'react';
import { DataTable } from '../components/DataTable';
import { db } from '../services/db';
import { ServiceOrder, ServiceOrderStatus, Service, ServiceOrderItem } from '../types';
import { Edit, Trash2, X, Plus, Search, ShoppingCart, CheckCircle2, ClipboardList, Wrench, Zap, Clock, Users, AlertCircle, ShieldCheck } from '../constants';
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
  
  useEffect(() => {
    const data = db.getOrders();
    setOrders(data);
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
    showToast(`"${service.nome}" adicionado.`, "success");
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

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!formData.cliente_id || !formData.veiculo_id) {
        showToast("Selecione cliente e veículo para salvar.", "error");
        return;
    }

    try {
      if (editingOS) {
        db.updateOrder(editingOS.id, formData);
        showToast("OS atualizada com sucesso.", "success");
      } else {
        db.addOrder(formData);
        showToast("Nova OS gerada com sucesso.", "success");
      }
      setOrders(db.getOrders());
      setIsModalOpen(false);
    } catch (err) {
      showToast("Erro ao processar salvamento.", "error");
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
      showToast("OS excluída.", "info");
      setOrderToDelete(null);
    }
  };

  const columns = [
    { header: 'ID', accessor: (o: ServiceOrder) => <span className="font-mono text-cyan-500 font-bold">#{o.id}</span> },
    { 
      header: 'Cliente / Veículo', 
      accessor: (o: ServiceOrder) => {
        const client = clients.find(c => c.id === o.cliente_id);
        const vehicle = allVehicles.find(v => v.id === o.veiculo_id);
        return (
          <div className="py-1">
            <p className="font-bold text-zinc-100 text-sm leading-tight">{client?.nome || '---'}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-tight">{vehicle?.marca} {vehicle?.modelo} ({vehicle?.placa})</p>
          </div>
        );
      }
    },
    { 
      header: 'Status', 
      accessor: (o: ServiceOrder) => (
        <span className={`px-3 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-widest ${getStatusStyles(o.status)}`}>
          {o.status}
        </span>
      )
    },
    { 
      header: 'Total', 
      accessor: (o: ServiceOrder) => (
        <span className="font-bold text-zinc-100 font-mono text-sm">
          R$ {(Number(o.orcamento_total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    { 
      header: 'Ações', 
      accessor: (o: ServiceOrder) => (
        <div className="flex items-center gap-1">
          <button onClick={() => handleOpenModal(o)} className="p-2 text-zinc-400 hover:text-cyan-500 hover:bg-zinc-800 rounded-lg transition-colors"><Edit size={16} /></button>
          <button onClick={() => confirmDelete(o.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded-lg transition-colors"><Trash2 size={16} /></button>
        </div>
      ),
      className: 'text-right'
    },
  ];

  return (
    <div className="animate-in space-y-6">
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
        title="Remover OS?"
        description="Esta ação removerá o registro permanentemente do sistema."
        confirmLabel="Excluir"
        cancelLabel="Voltar"
        variant="danger"
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-6xl h-[90vh] rounded-3xl overflow-hidden relative animate-in zoom-in-95 duration-200 flex flex-col shadow-2xl">
            
            {/* Header Pro - Mais compacto e sofisticado */}
            <div className="px-8 py-5 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-5">
                <div className="w-10 h-10 bg-cyan-600/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20 rounded-xl">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-100 uppercase tracking-tight">
                    {editingOS ? `OS #${editingOS.id}` : 'Nova Ordem de Serviço'}
                  </h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold">Oficina Automotiva JV • Gestão 2026</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-500 hover:text-white transition-all bg-zinc-800 rounded-lg border border-zinc-700">
                <X size={20} />
              </button>
            </div>
            
            {/* Corpo do Formulário - Melhor aproveitamento de espaço */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-zinc-950/30">
              <form id="os-form" onSubmit={handleSave} className="space-y-8 max-w-5xl mx-auto">
                
                {/* Section: Identificação */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800/50 shadow-sm">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Cliente</label>
                    <select 
                      required
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500 font-semibold text-sm"
                      value={formData.cliente_id}
                      onChange={e => setFormData(p => ({ ...p, cliente_id: e.target.value, veiculo_id: '' }))}
                    >
                      <option value="">Selecionar...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Veículo</label>
                    <select 
                      required
                      disabled={!formData.cliente_id}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-20 font-semibold text-sm"
                      value={formData.veiculo_id}
                      onChange={e => setFormData(p => ({ ...p, veiculo_id: e.target.value }))}
                    >
                      <option value="">Selecionar...</option>
                      {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} • {v.placa}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Entrada</label>
                    <input 
                      type="date" required
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500 font-semibold text-sm"
                      value={formData.data_entrada.split('T')[0]}
                      onChange={e => setFormData(p => ({ ...p, data_entrada: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Status</label>
                    <select 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500 font-bold uppercase text-[10px]"
                      value={formData.status}
                      onChange={e => setFormData(p => ({ ...p, status: e.target.value as ServiceOrderStatus }))}
                    >
                      {Object.values(ServiceOrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Section: Orçamento */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      <ShoppingCart size={14} className="text-emerald-500" /> Itens do Orçamento
                    </h4>
                    <button 
                        type="button" 
                        onClick={() => setIsServicePickerOpen(true)}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-cyan-500 rounded-xl text-[10px] font-black flex items-center gap-2 transition-all uppercase tracking-widest border border-zinc-700"
                    >
                        <Plus size={14} /> Adicionar Serviço/Peça
                    </button>
                  </div>

                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-950/50 border-b border-zinc-800 text-zinc-500 font-black uppercase text-[9px] tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Item</th>
                                <th className="px-6 py-4 w-24 text-center">Qtd</th>
                                <th className="px-6 py-4 w-40 text-center">Unitário</th>
                                <th className="px-6 py-4 w-40 text-right">Subtotal</th>
                                <th className="px-6 py-4 w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/30">
                            {formData.servicos.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-zinc-800/20 transition-all">
                                    <td className="px-6 py-4">
                                      <span className="font-bold text-zinc-100 text-sm">{item.nome_servico}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <input 
                                            type="number" min="1" 
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-center font-bold text-sm outline-none focus:ring-1 focus:ring-cyan-500" 
                                            value={item.quantidade} 
                                            onChange={(e) => updateItem(idx, { quantidade: parseInt(e.target.value) || 1 })}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input 
                                            type="number" step="0.01"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 font-mono text-center font-bold text-sm outline-none focus:ring-1 focus:ring-cyan-500" 
                                            value={item.preco_unitario} 
                                            onChange={(e) => updateItem(idx, { preco_unitario: parseFloat(e.target.value) || 0 })}
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-zinc-100 text-right font-mono font-bold text-sm">
                                      R$ {(Number(item.subtotal) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                          type="button" 
                                          onClick={() => removeServiceFromOS(item.id)} 
                                          className="text-zinc-600 hover:text-red-500 transition-all p-2"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {formData.servicos.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="px-6 py-20 text-center text-zinc-600 text-[10px] uppercase tracking-widest italic opacity-40">
                                    Nenhum item adicionado ao orçamento
                                  </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                  </div>
                </div>

                {/* Section: Observações */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Edit size={12} /> Diagnóstico / Observações Técnicas
                  </label>
                  <textarea 
                    rows={4}
                    placeholder="Descreva o problema e os reparos necessários..."
                    className="w-full bg-zinc-900/40 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all text-sm placeholder:text-zinc-800"
                    value={formData.observacoes}
                    onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))}
                  />
                </div>
              </form>
            </div>

            {/* Sticky Footer Pro - Compacto e Elegante */}
            <div className="px-8 py-5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between flex-shrink-0 z-10 shadow-2xl">
               <div className="flex items-center gap-6">
                  <div className="hidden sm:block">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Consolidado</p>
                    <h5 className="text-3xl font-black text-emerald-400 font-mono tracking-tighter leading-none">
                      <span className="text-xs opacity-40 mr-1 font-sans">R$</span>
                      {(Number(formData.orcamento_total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h5>
                  </div>
                  <div className="hidden lg:flex flex-col gap-0.5 border-l border-zinc-800 pl-6 ml-6">
                    <span className="flex items-center gap-2 text-[9px] font-bold text-zinc-400 uppercase tracking-tight">
                      <Zap size={10} className="text-cyan-500" /> Cálculo Automático
                    </span>
                    <span className="flex items-center gap-2 text-[9px] font-bold text-zinc-400 uppercase tracking-tight">
                      <ShieldCheck size={10} className="text-emerald-500" /> Auditado pela Gestão 2026
                    </span>
                  </div>
               </div>
               
               <div className="flex items-center gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-6 py-3 text-xs font-black text-zinc-500 hover:text-white transition-all uppercase tracking-widest"
                  >
                    Descartar
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleSave()}
                    className="px-10 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-widest text-xs"
                  >
                    {editingOS ? 'Salvar OS' : 'Emitir Ordem de Serviço'}
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Catalog Picker - Compacto e Funcional */}
      {isServicePickerOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h4 className="text-sm font-black uppercase tracking-widest text-zinc-100 flex items-center gap-3">
                <Search size={16} className="text-cyan-500" /> Catálogo de Serviços
              </h4>
              <button onClick={() => setIsServicePickerOpen(false)} className="text-zinc-500 hover:text-white p-1 bg-zinc-800 rounded-md">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 bg-zinc-950/20">
              <input 
                autoFocus
                type="text"
                placeholder="Pesquisar no catálogo..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500 font-semibold text-sm"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {filteredCatalog.length > 0 ? filteredCatalog.map(s => (
                <button 
                  key={s.id}
                  onClick={() => addServiceToOS(s)}
                  className="w-full text-left p-4 rounded-xl hover:bg-zinc-800 transition-all flex items-center justify-between border border-transparent hover:border-zinc-700 active:scale-95 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-zinc-950 flex items-center justify-center text-zinc-500 group-hover:text-cyan-500 transition-colors">
                      <Wrench size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-zinc-100 text-sm">{s.nome}</p>
                      <p className="text-[10px] text-zinc-500 italic truncate max-w-[300px]">{s.descricao || 'Item padrão do sistema'}</p>
                    </div>
                  </div>
                  <p className="text-emerald-400 font-mono font-bold text-sm">R$ {s.preco_base?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </button>
              )) : (
                <div className="text-center py-20 opacity-20">
                  <AlertCircle size={40} className="mx-auto mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhum item encontrado</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-800 text-center">
              <button onClick={() => setIsServicePickerOpen(false)} className="text-[10px] font-black text-cyan-500 hover:text-cyan-400 uppercase tracking-widest underline decoration-2 underline-offset-4">
                Finalizar e Voltar para OS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;
