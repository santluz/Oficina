
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
    showToast(`"${service.nome}" adicionado!`, "success");
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
        showToast("Selecione cliente e veículo para gravar a OS.", "error");
        return;
    }

    try {
      if (editingOS) {
        db.updateOrder(editingOS.id, formData);
        showToast("✅ Registro de OS atualizado.", "success");
      } else {
        db.addOrder(formData);
        showToast("✅ Nova OS criada com sucesso.", "success");
      }
      setOrders(db.getOrders());
      setIsModalOpen(false);
    } catch (err) {
      showToast("Erro técnico ao processar salvamento.", "error");
    }
  };

  const handleConcluirRapido = (id: string) => {
    db.updateOrder(id, { status: ServiceOrderStatus.COMPLETED });
    setOrders(db.getOrders());
    showToast("✅ OS Concluída com sucesso.", "success");
  };

  const confirmDelete = (id: string) => {
    setOrderToDelete(id);
    setIsAlertOpen(true);
  };

  const handleDelete = () => {
    if (orderToDelete) {
      db.deleteOrder(orderToDelete);
      setOrders(db.getOrders());
      showToast("🗑️ OS removida do sistema.", "info");
      setOrderToDelete(null);
    }
  };

  const columns = [
    { header: 'ID OS', accessor: (o: ServiceOrder) => <span className="font-mono text-cyan-500 font-black">#{o.id}</span> },
    { 
      header: 'Cliente / Veículo', 
      accessor: (o: ServiceOrder) => {
        const client = clients.find(c => c.id === o.cliente_id);
        const vehicle = allVehicles.find(v => v.id === o.veiculo_id);
        return (
          <div className="py-2">
            <p className="font-black text-zinc-100 text-sm leading-none mb-1">{client?.nome || '---'}</p>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{vehicle?.marca} {vehicle?.modelo} ({vehicle?.placa})</p>
          </div>
        );
      }
    },
    { 
      header: 'Status', 
      accessor: (o: ServiceOrder) => (
        <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase border tracking-[0.1em] ${getStatusStyles(o.status)}`}>
          {o.status}
        </span>
      )
    },
    { 
      header: 'Valor Total', 
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
          {o.status !== ServiceOrderStatus.COMPLETED && (
             <button onClick={() => handleConcluirRapido(o.id)} title="Concluir OS" className="p-2.5 text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all"><CheckCircle2 size={16} /></button>
          )}
          <button onClick={() => handleOpenModal(o)} className="p-2.5 text-zinc-400 hover:text-cyan-500 hover:bg-zinc-800 rounded-xl transition-all"><Edit size={16} /></button>
          <button onClick={() => confirmDelete(o.id)} className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded-xl transition-all"><Trash2 size={16} /></button>
        </div>
      ),
      className: 'text-right'
    },
  ];

  return (
    <div className="animate-in space-y-8">
      <DataTable 
        title="Gerenciamento de Ordens de Serviço"
        data={orders}
        columns={columns}
        onAdd={() => handleOpenModal()}
        addButtonLabel="Nova Ordem de Serviço"
      />

      <AlertDialog 
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Ordem de Serviço?"
        description="Atenção: Esta ação removerá permanentemente o histórico técnico e financeiro desta OS."
        confirmLabel="Sim, Excluir OS"
        cancelLabel="Cancelar"
        variant="danger"
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col animate-in fade-in duration-300">
          
          {/* Header Superior - Sempre Visível */}
          <div className="px-8 sm:px-12 py-8 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-6 sm:gap-10">
              <div className="w-16 h-16 bg-cyan-600/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20 rounded-2xl shadow-xl">
                <ClipboardList size={32} />
              </div>
              <div>
                <h3 className="text-2xl sm:text-4xl font-black text-zinc-100 uppercase tracking-tighter">
                  {editingOS ? `ORDEM DE SERVIÇO #${editingOS.id}` : 'NOVA ORDEM DE SERVIÇO'}
                </h3>
                <p className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-[0.5em] font-black mt-2 flex items-center gap-3">
                  <Zap size={14} className="text-cyan-500" /> JV AUTOMÓVEIS • SISTEMA DE GESTÃO 2026
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-4 text-zinc-400 hover:text-white bg-zinc-800 rounded-2xl border border-zinc-700 hover:bg-zinc-700 transition-all shadow-xl"
              >
                <X size={32} />
              </button>
            </div>
          </div>

          {/* Área de Formulário - Scrollable e Ampla */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950 p-6 sm:p-14">
            <form id="os-form" onSubmit={handleSave} className="max-w-[1400px] mx-auto space-y-16 pb-20">
              
              {/* Seção 1: Identificação */}
              <section className="bg-zinc-900/50 p-10 sm:p-14 rounded-[3rem] border border-zinc-800 shadow-2xl">
                <div className="flex items-center gap-4 mb-12">
                  <Users size={24} className="text-cyan-500" />
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-[0.4em]">Triagem e Identificação</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest ml-1">Proprietário / Cliente</label>
                    <select 
                      required
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 font-bold text-lg shadow-inner appearance-none transition-all"
                      value={formData.cliente_id}
                      onChange={e => setFormData(p => ({ ...p, cliente_id: e.target.value, veiculo_id: '' }))}
                    >
                      <option value="">Selecione o Cliente...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest ml-1">Veículo Relacionado</label>
                    <select 
                      required
                      disabled={!formData.cliente_id}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-30 font-bold text-lg shadow-inner appearance-none transition-all"
                      value={formData.veiculo_id}
                      onChange={e => setFormData(p => ({ ...p, veiculo_id: e.target.value }))}
                    >
                      <option value="">Selecione o Veículo...</option>
                      {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} • {v.placa}</option>)}
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest ml-1">Data de Entrada</label>
                    <div className="relative">
                       <Clock size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700" />
                       <input 
                        type="date" required
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-16 pr-6 py-5 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 font-bold text-lg shadow-inner"
                        value={formData.data_entrada.split('T')[0]}
                        onChange={e => setFormData(p => ({ ...p, data_entrada: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest ml-1">Situação da OS</label>
                    <select 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 font-black uppercase text-xs sm:text-sm tracking-widest shadow-inner transition-all"
                      value={formData.status}
                      onChange={e => setFormData(p => ({ ...p, status: e.target.value as ServiceOrderStatus }))}
                    >
                      {Object.values(ServiceOrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {/* Seção 2: Itens do Orçamento */}
              <section className="space-y-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-xl">
                      <ShoppingCart size={28} />
                    </div>
                    <h4 className="text-2xl font-black text-zinc-100 uppercase tracking-widest">Orçamento de Peças e Mão de Obra</h4>
                  </div>
                  <button 
                      type="button" 
                      onClick={() => setIsServicePickerOpen(true)}
                      className="px-10 py-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-[2rem] text-sm font-black flex items-center gap-4 transition-all shadow-2xl shadow-cyan-900/40 uppercase tracking-[0.2em] active:scale-95"
                  >
                      <Plus size={24} /> Adicionar Item do Catálogo
                  </button>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl min-h-[400px]">
                  <table className="w-full text-left">
                      <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-500 font-black uppercase text-[11px] tracking-[0.4em]">
                          <tr>
                              <th className="px-12 py-8">Discriminação Detalhada</th>
                              <th className="px-12 py-8 w-40 text-center">Qtd</th>
                              <th className="px-12 py-8 w-64 text-center">Unitário (R$)</th>
                              <th className="px-12 py-8 w-72 text-right">Subtotal</th>
                              <th className="px-12 py-8 w-28"></th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                          {formData.servicos.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-zinc-800/40 group transition-all duration-300">
                                  <td className="px-12 py-8">
                                    <div className="flex items-center gap-4">
                                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)]" />
                                      <span className="font-black text-zinc-100 text-2xl tracking-tight leading-none">{item.nome_servico}</span>
                                    </div>
                                  </td>
                                  <td className="px-12 py-8">
                                      <input 
                                          type="number" min="1" 
                                          className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-5 text-center font-black text-2xl outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner" 
                                          value={item.quantidade} 
                                          onChange={(e) => updateItem(idx, { quantidade: parseInt(e.target.value) || 1 })}
                                      />
                                  </td>
                                  <td className="px-12 py-8">
                                      <input 
                                          type="number" step="0.01"
                                          className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-5 font-mono text-center font-black text-2xl outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner" 
                                          value={item.preco_unitario} 
                                          onChange={(e) => updateItem(idx, { preco_unitario: parseFloat(e.target.value) || 0 })}
                                      />
                                  </td>
                                  <td className="px-12 py-8 text-zinc-100 text-right font-mono font-black text-4xl tracking-tighter tabular-nums">
                                    <span className="text-xl text-zinc-600 mr-3 opacity-40 font-sans tracking-normal">R$</span>
                                    {(Number(item.subtotal) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-12 py-8 text-right">
                                      <button 
                                        type="button" 
                                        onClick={() => removeServiceFromOS(item.id)} 
                                        className="text-zinc-600 hover:text-red-500 transition-all p-5 hover:bg-red-500/10 rounded-2xl"
                                      >
                                          <Trash2 size={28} />
                                      </button>
                                  </td>
                              </tr>
                          ))}
                          {formData.servicos.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-12 py-48 text-center bg-zinc-950/20">
                                  <div className="flex flex-col items-center gap-8 opacity-20">
                                    <ShoppingCart size={100} className="text-zinc-500" />
                                    <div className="space-y-4">
                                      <p className="font-black text-zinc-500 uppercase tracking-[0.8em] text-2xl">Orçamento Vazio</p>
                                      <p className="text-zinc-600 font-black text-sm tracking-widest">Inclua serviços do catálogo para calcular os valores da OS</p>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
                </div>

                {/* Resumo Financeiro em Card Gigante */}
                {formData.servicos.length > 0 && (
                  <div className="flex justify-end pt-5 animate-in">
                    <div className="bg-zinc-900 border-2 border-zinc-800 p-12 rounded-[4rem] flex flex-col sm:flex-row items-center gap-16 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.8)] relative overflow-hidden min-w-[600px] border-t-zinc-700">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] -mr-32 -mt-32" />
                      <div className="text-right flex-1 relative z-10">
                        <p className="text-[12px] font-black text-zinc-500 uppercase tracking-[0.8em] mb-4">Valor Total Final Consolidado</p>
                        <h5 className="text-8xl font-black text-emerald-400 font-mono tracking-tighter flex items-baseline justify-end gap-6 leading-none">
                          <span className="text-4xl opacity-20 font-sans tracking-normal font-medium">R$</span>
                          {(Number(formData.orcamento_total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h5>
                      </div>
                      <div className="w-px h-28 bg-zinc-800 hidden sm:block" />
                      <div className="space-y-6 relative z-10">
                         <div className="flex items-center gap-4 text-sm font-black text-zinc-300 uppercase tracking-widest">
                           <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-lg">
                              <Zap size={20} />
                           </div>
                           Pronto para Entrega
                         </div>
                         <div className="flex items-center gap-4 text-sm font-black text-zinc-300 uppercase tracking-widest">
                           <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 shadow-lg">
                              <ShieldCheck size={20} />
                           </div>
                           Cálculo Auditado
                         </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Seção 3: Observações Técnicas */}
              <section className="space-y-8 bg-zinc-900/40 p-12 rounded-[3.5rem] border border-zinc-800 shadow-2xl">
                <div className="flex items-center gap-4">
                  <Edit size={24} className="text-zinc-500" />
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-[0.4em]">Laudo do Mecânico e Observações do Cliente</h4>
                </div>
                <textarea 
                  rows={6}
                  placeholder="Insira aqui o diagnóstico completo, notas sobre peças enviadas pelo cliente, orientações técnicas ou detalhes da garantia do serviço realizado..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-[3rem] px-12 py-12 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all font-black text-3xl leading-relaxed shadow-inner placeholder:text-zinc-800 scroll-smooth custom-scrollbar"
                  value={formData.observacoes}
                  onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))}
                />
              </section>
            </form>
          </div>

          {/* Rodapé Fixo (Sticky Footer) - Sempre Visível e Acessível */}
          <div className="px-10 sm:px-16 py-10 sm:py-14 bg-zinc-900 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-10 flex-shrink-0 z-50 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] border-t-zinc-700">
             <div className="flex items-center gap-6 text-zinc-500">
                <AlertCircle size={28} className="text-amber-500 animate-pulse" />
                <p className="text-xs sm:text-sm font-black uppercase tracking-[0.4em] leading-relaxed">
                  Confirme todos os itens e valores antes da gravação definitiva.<br />
                  <span className="text-zinc-600 opacity-60">JV AUTOMÓVEIS • GESTÃO TÉCNICA CLOUD • 2026</span>
                </p>
             </div>
             <div className="flex items-center gap-8 w-full sm:w-auto">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 sm:flex-none px-12 py-8 text-base font-black text-zinc-500 hover:text-white transition-all uppercase tracking-[0.5em] hover:bg-zinc-800 rounded-3xl"
                >
                  Descartar
                </button>
                {editingOS && editingOS.status !== ServiceOrderStatus.COMPLETED && (
                  <button 
                    onClick={() => {
                        setFormData(prev => ({ ...prev, status: ServiceOrderStatus.COMPLETED }));
                        handleSave();
                    }}
                    className="flex-1 sm:flex-none px-12 py-8 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-[2.5rem] transition-all shadow-2xl shadow-emerald-900/40 uppercase tracking-[0.3em] text-xl flex items-center gap-4 justify-center"
                  >
                    <CheckCircle2 size={24} /> Concluir OS
                  </button>
                )}
                <button 
                  onClick={handleSave}
                  className="flex-1 sm:flex-none px-20 sm:px-32 py-8 sm:py-10 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-[2.5rem] sm:rounded-[3.5rem] transition-all shadow-[0_25px_80px_-15px_rgba(6,182,212,0.6)] active:scale-[0.96] uppercase tracking-[0.4em] text-xl sm:text-3xl"
                >
                  {editingOS ? 'Gravar Registro' : 'Gravar e Abrir OS'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Seletor de Serviços (Picker) - Melhorado */}
      {isServicePickerOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/98 backdrop-blur-[50px] animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-[1200px] rounded-[4rem] overflow-hidden relative animate-in zoom-in-95 duration-200 shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col h-[85vh] my-auto">
            <div className="p-12 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
              <div className="flex items-center gap-8">
                <div className="w-16 h-16 rounded-[2rem] bg-zinc-800 border border-zinc-700 flex items-center justify-center text-cyan-500 shadow-2xl">
                  <Search size={32} />
                </div>
                <h4 className="text-3xl sm:text-5xl font-black uppercase tracking-widest text-zinc-100 leading-none">Consultar Catálogo</h4>
              </div>
              <button onClick={() => setIsServicePickerOpen(false)} className="text-zinc-500 hover:text-white transition-all bg-zinc-800 p-6 rounded-[2rem] border border-zinc-700"><X size={40} /></button>
            </div>
            
            <div className="p-10 border-b border-zinc-800 bg-zinc-950/60">
              <div className="relative">
                <Search className="absolute left-10 top-1/2 -translate-y-1/2 text-zinc-500" size={40} />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Pesquisar serviço, peça ou categoria técnica..."
                  className="w-full bg-zinc-800 border-2 border-zinc-700 rounded-[3rem] pl-28 pr-12 py-10 text-zinc-100 outline-none focus:ring-4 focus:ring-cyan-500/30 font-black text-2xl sm:text-4xl shadow-inner transition-all placeholder:text-zinc-700"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-6 bg-zinc-950/10 custom-scrollbar">
              {filteredCatalog.length > 0 ? filteredCatalog.map(s => (
                <button 
                  key={s.id}
                  onClick={() => addServiceToOS(s)}
                  className="w-full text-left p-10 rounded-[3rem] hover:bg-zinc-800/80 transition-all flex items-center justify-between group border border-transparent hover:border-zinc-700 active:scale-[0.98] shadow-2xl"
                >
                  <div className="flex items-center gap-10">
                    <div className="w-20 h-20 rounded-[2rem] bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white transition-all shadow-2xl">
                      <Wrench size={36} />
                    </div>
                    <div>
                      <p className="font-black text-zinc-100 uppercase text-2xl sm:text-4xl tracking-tighter leading-none">{s.nome}</p>
                      <p className="text-xl text-zinc-500 italic font-bold tracking-tight mt-2">{s.descricao || 'Item técnico do catálogo geral.'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-mono font-black text-3xl sm:text-5xl tracking-tighter tabular-nums">R$ {s.preco_base?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.5em] flex items-center justify-end gap-3 mt-4 group-hover:text-cyan-500 transition-colors">
                      <Plus size={16} /> Selecionar Registro
                    </p>
                  </div>
                </button>
              )) : (
                <div className="p-32 text-center space-y-8 opacity-30">
                   <AlertCircle size={80} className="text-zinc-800 mx-auto" />
                   <p className="text-zinc-500 font-black uppercase tracking-[0.8em] text-3xl italic">Nenhum registro encontrado.</p>
                </div>
              )}
            </div>

            <div className="p-12 border-t border-zinc-800 text-center bg-zinc-950/60">
              <button 
                onClick={() => setIsServicePickerOpen(false)}
                className="text-lg font-black text-cyan-500 hover:text-cyan-400 flex items-center justify-center gap-6 mx-auto uppercase tracking-[0.6em] px-16 py-8 bg-cyan-500/5 rounded-[3rem] border-2 border-cyan-500/10 transition-all hover:bg-cyan-500/10 shadow-2xl active:scale-95"
              >
                <CheckCircle2 size={32} /> Finalizar Seleção e Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;
