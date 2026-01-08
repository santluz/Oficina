
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
        showToast("Por favor, selecione cliente e veículo antes de salvar.", "error");
        return;
    }

    try {
      if (editingOS) {
        db.updateOrder(editingOS.id, formData);
        showToast("✅ OS atualizada com sucesso!", "success");
      } else {
        db.addOrder(formData);
        showToast("✅ OS criada com sucesso!", "success");
      }
      setOrders(db.getOrders());
      setIsModalOpen(false);
    } catch (err) {
      showToast("Falha ao salvar a Ordem de Serviço.", "error");
    }
  };

  const handleConcluirOS = (id: string) => {
    db.updateOrder(id, { status: ServiceOrderStatus.COMPLETED });
    setOrders(db.getOrders());
    showToast("✅ Ordem de Serviço concluída!", "success");
  };

  const confirmDelete = (id: string) => {
    setOrderToDelete(id);
    setIsAlertOpen(true);
  };

  const handleDelete = () => {
    if (orderToDelete) {
      db.deleteOrder(orderToDelete);
      setOrders(db.getOrders());
      showToast("🗑️ Registro de OS removido.", "info");
      setOrderToDelete(null);
    }
  };

  const columns = [
    { header: 'Nº OS', accessor: (o: ServiceOrder) => <span className="font-mono text-cyan-500 font-black">#{o.id}</span> },
    { 
      header: 'Cliente / Veículo', 
      accessor: (o: ServiceOrder) => {
        const client = clients.find(c => c.id === o.cliente_id);
        const vehicle = allVehicles.find(v => v.id === o.veiculo_id);
        return (
          <div className="py-2">
            <p className="font-extrabold text-zinc-100 text-base">{client?.nome || '---'}</p>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{vehicle?.marca} {vehicle?.modelo} • {vehicle?.placa}</p>
          </div>
        );
      }
    },
    { 
      header: 'Situação', 
      accessor: (o: ServiceOrder) => (
        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border tracking-widest ${getStatusStyles(o.status)}`}>
          {o.status}
        </span>
      )
    },
    { 
      header: 'Total', 
      accessor: (o: ServiceOrder) => (
        <span className="font-black text-zinc-100 font-mono text-lg">
          R$ {(Number(o.orcamento_total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    { 
      header: 'Ações', 
      accessor: (o: ServiceOrder) => (
        <div className="flex items-center gap-2">
          {o.status !== ServiceOrderStatus.COMPLETED && (
            <button 
              onClick={() => handleConcluirOS(o.id)} 
              title="Concluir OS"
              className="p-2.5 text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all"
            >
              <CheckCircle2 size={18} />
            </button>
          )}
          <button onClick={() => handleOpenModal(o)} className="p-2.5 text-zinc-400 hover:text-cyan-500 hover:bg-zinc-800 rounded-xl transition-all"><Edit size={18} /></button>
          <button onClick={() => confirmDelete(o.id)} className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded-xl transition-all"><Trash2 size={18} /></button>
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
        title="Deseja excluir esta OS?"
        description="Esta ação removerá permanentemente todos os dados desta ordem de serviço."
        confirmLabel="Excluir Agora"
        cancelLabel="Voltar"
        variant="danger"
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 overflow-hidden bg-black/90 backdrop-blur-xl">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-[1700px] h-[98vh] rounded-[3rem] overflow-hidden relative animate-in zoom-in-95 duration-300 flex flex-col shadow-2xl border-t-zinc-700">
            
            {/* Header Amplo e Fixo */}
            <div className="px-8 sm:px-14 py-8 sm:py-12 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 flex-shrink-0">
              <div className="flex items-center gap-6 sm:gap-12">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-[2rem] bg-cyan-600/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20 shadow-xl">
                  <ClipboardList className="w-10 h-10 sm:w-14 sm:h-14" />
                </div>
                <div>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <h3 className="text-2xl sm:text-5xl font-black tracking-tighter text-zinc-100 uppercase">
                      {editingOS ? `ORDEM DE SERVIÇO #${editingOS.id}` : 'ABERTURA DE NOVA OS'}
                    </h3>
                    {editingOS?.status === ServiceOrderStatus.COMPLETED && (
                        <span className="px-4 sm:px-6 py-2 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] sm:text-xs font-black tracking-widest border border-emerald-500/20 uppercase shadow-lg shadow-emerald-500/5">Concluída</span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-sm text-zinc-500 uppercase tracking-[0.3em] sm:tracking-[0.5em] font-black mt-3 flex items-center gap-3">
                    <Wrench size={16} /> JV Automóveis • Excelência em Reparação Automotiva 2026
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-6">
                {editingOS && editingOS.status !== ServiceOrderStatus.COMPLETED && (
                  <button 
                    onClick={() => {
                        setFormData(prev => ({ ...prev, status: ServiceOrderStatus.COMPLETED }));
                        handleSave();
                    }}
                    className="px-6 sm:px-10 py-4 sm:py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl sm:rounded-3xl text-xs sm:text-sm font-black flex items-center gap-3 transition-all uppercase shadow-2xl shadow-emerald-900/40 active:scale-95"
                  >
                    <CheckCircle2 size={24} /> Concluir OS
                  </button>
                )}
                <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="p-3 sm:p-5 text-zinc-500 hover:text-white transition-all bg-zinc-800 hover:bg-zinc-700 rounded-2xl sm:rounded-3xl shadow-xl border border-zinc-700"
                >
                    <X size={32} />
                </button>
              </div>
            </div>
            
            {/* Área de Conteúdo Scrollável */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950/30 p-6 sm:p-14">
              <form onSubmit={handleSave} className="space-y-12 sm:space-y-20 max-w-[1500px] mx-auto pb-10">
                
                {/* Seção 1: Dados do Cliente e Veículo */}
                <section className="bg-zinc-900/60 p-8 sm:p-14 rounded-[2.5rem] sm:rounded-[3.5rem] border border-zinc-800 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-cyan-500/10 transition-all duration-700" />
                  <div className="flex items-center gap-5 mb-10 sm:mb-14 relative z-10">
                    <Users size={28} className="text-cyan-500" />
                    <h4 className="text-xs sm:text-sm font-black text-zinc-400 uppercase tracking-[0.4em]">Triagem e Identificação</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-14 relative z-10">
                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest ml-1">Proprietário / Cliente</label>
                      <select 
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-3xl px-8 py-7 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/50 font-black text-lg sm:text-2xl shadow-2xl transition-all"
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
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-3xl px-8 py-7 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-20 font-black text-lg sm:text-2xl shadow-2xl transition-all"
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
                        <Clock size={28} className="absolute left-7 top-1/2 -translate-y-1/2 text-zinc-700" />
                        <input 
                          type="date" required
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-3xl pl-16 sm:pl-20 pr-8 py-7 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/50 font-black text-lg sm:text-2xl shadow-2xl transition-all"
                          value={formData.data_entrada.split('T')[0]}
                          onChange={e => setFormData(p => ({ ...p, data_entrada: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest ml-1">Fluxo Operacional</label>
                      <select 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-3xl px-8 py-7 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/50 font-black uppercase tracking-widest text-xs sm:text-sm shadow-2xl transition-all appearance-none"
                        value={formData.status}
                        onChange={e => setFormData(p => ({ ...p, status: e.target.value as ServiceOrderStatus }))}
                      >
                        {Object.values(ServiceOrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </section>

                {/* Seção 2: Itens e Valores */}
                <section className="space-y-12 sm:space-y-16">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/10 text-emerald-400 rounded-[2rem] flex items-center justify-center border border-emerald-500/20 shadow-xl">
                        <ShoppingCart size={36} />
                      </div>
                      <h4 className="text-xl sm:text-3xl font-black text-zinc-100 uppercase tracking-widest leading-none">Detalhamento de Mão de Obra e Peças</h4>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => setIsServicePickerOpen(true)}
                        className="px-10 sm:px-14 py-6 sm:py-8 bg-cyan-600 hover:bg-cyan-500 text-white rounded-3xl sm:rounded-[2.5rem] text-xs sm:text-sm font-black flex items-center gap-5 transition-all shadow-2xl shadow-cyan-900/40 uppercase tracking-[0.2em] active:scale-95"
                    >
                        <Plus size={28} /> Adicionar do Catálogo
                    </button>
                  </div>

                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-[3rem] sm:rounded-[4rem] overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-500 font-black uppercase text-[10px] sm:text-xs tracking-[0.5em]">
                            <tr>
                                <th className="px-10 sm:px-16 py-10 sm:py-14">Discriminação do Item</th>
                                <th className="px-10 sm:px-16 py-10 sm:py-14 w-44 text-center">Quantidade</th>
                                <th className="px-10 sm:px-16 py-10 sm:py-14 w-72 text-center">Unitário (R$)</th>
                                <th className="px-10 sm:px-16 py-10 sm:py-14 w-80 text-right">Subtotal</th>
                                <th className="px-10 sm:px-16 py-10 sm:py-14 w-32"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                            {formData.servicos.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-zinc-800/40 group transition-all duration-300">
                                    <td className="px-10 sm:px-16 py-10 sm:py-14">
                                      <div className="flex items-center gap-6">
                                        <div className="w-3.5 h-3.5 rounded-full bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.8)] animate-pulse" />
                                        <span className="font-black text-zinc-100 text-xl sm:text-3xl tracking-tighter">{item.nome_servico}</span>
                                      </div>
                                    </td>
                                    <td className="px-10 sm:px-16 py-10 sm:py-14">
                                        <input 
                                            type="number" min="1" 
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl sm:rounded-3xl px-6 py-6 text-center font-black text-xl sm:text-3xl outline-none focus:ring-2 focus:ring-cyan-500 shadow-2xl transition-all" 
                                            value={item.quantidade} 
                                            onChange={(e) => updateItem(idx, { quantidade: parseInt(e.target.value) || 1 })}
                                        />
                                    </td>
                                    <td className="px-10 sm:px-16 py-10 sm:py-14">
                                        <div className="relative">
                                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 font-black text-[10px] uppercase">R$</span>
                                          <input 
                                              type="number" step="0.01"
                                              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl sm:rounded-3xl pl-16 pr-8 py-6 font-mono text-center font-black text-xl sm:text-3xl outline-none focus:ring-2 focus:ring-cyan-500 shadow-2xl transition-all" 
                                              value={item.preco_unitario} 
                                              onChange={(e) => updateItem(idx, { preco_unitario: parseFloat(e.target.value) || 0 })}
                                          />
                                        </div>
                                    </td>
                                    <td className="px-10 sm:px-16 py-10 sm:py-14 text-zinc-100 text-right font-mono font-black text-3xl sm:text-5xl tabular-nums tracking-tighter">
                                      <span className="text-xl sm:text-2xl text-zinc-600 mr-2 opacity-50 font-sans">R$</span>
                                      {(Number(item.subtotal) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-10 sm:px-16 py-10 sm:py-14 text-right">
                                        <button 
                                          type="button" 
                                          onClick={() => removeServiceFromOS(item.id)} 
                                          className="text-zinc-600 hover:text-red-500 transition-all p-5 sm:p-7 hover:bg-red-500/10 rounded-3xl"
                                        >
                                            <Trash2 size={36} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {formData.servicos.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="px-14 py-40 sm:py-60 text-center bg-zinc-950/20">
                                    <div className="flex flex-col items-center gap-12 opacity-20">
                                      <ShoppingCart size={120} className="text-zinc-500" />
                                      <div className="space-y-5">
                                        <p className="font-black text-zinc-500 uppercase tracking-[0.8em] text-xl sm:text-2xl">Orçamento Vazio</p>
                                        <p className="text-zinc-600 font-black text-sm sm:text-base tracking-widest">Inclua itens do catálogo para iniciar o faturamento desta OS</p>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                  </div>

                  {/* Resumo Financeiro Amplo em Destaque */}
                  {formData.servicos.length > 0 && (
                    <div className="flex justify-end pt-10 animate-in">
                      <div className="bg-zinc-900 border-2 border-zinc-800 p-12 sm:p-16 rounded-[4rem] sm:rounded-[5rem] flex flex-col sm:flex-row items-center gap-12 sm:gap-20 shadow-[0_0_100px_-20px_rgba(0,0,0,0.8)] relative overflow-hidden min-w-[600px] border-t-zinc-700">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] -mr-32 -mt-32" />
                        <div className="text-right flex-1 relative z-10">
                          <p className="text-[12px] sm:text-sm font-black text-zinc-500 uppercase tracking-[0.8em] mb-6">Total Geral Consolidado</p>
                          <h5 className="text-7xl sm:text-9xl font-black text-emerald-400 font-mono tracking-tighter flex items-baseline justify-end gap-6 leading-none">
                            <span className="text-3xl sm:text-5xl opacity-20 font-sans tracking-normal">R$</span>
                            {(Number(formData.orcamento_total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </h5>
                        </div>
                        <div className="w-px h-32 bg-zinc-800 hidden sm:block" />
                        <div className="space-y-6 relative z-10">
                           <div className="flex items-center gap-5 text-sm sm:text-base font-black text-zinc-200 uppercase tracking-widest">
                             <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-lg">
                                <Zap size={24} />
                             </div>
                             Pronto para Emissão
                           </div>
                           <div className="flex items-center gap-5 text-sm sm:text-base font-black text-zinc-200 uppercase tracking-widest">
                             <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 shadow-lg">
                                <ShieldCheck size={24} />
                             </div>
                             Cálculo Auditado
                           </div>
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                {/* Seção 3: Observações e Diagnóstico */}
                <section className="space-y-10 bg-zinc-900/40 p-10 sm:p-16 rounded-[3rem] sm:rounded-[4rem] border border-zinc-800 shadow-2xl group">
                  <div className="flex items-center gap-5">
                    <Edit size={28} className="text-zinc-500" />
                    <h4 className="text-xs sm:text-sm font-black text-zinc-400 uppercase tracking-[0.5em]">Diagnóstico e Notas do Especialista</h4>
                  </div>
                  <textarea 
                    rows={8}
                    placeholder="Insira aqui os detalhes do diagnóstico, observações do cliente, peças fornecidas externamente ou notas sobre a garantia do serviço..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-[3rem] px-10 sm:px-14 py-10 sm:py-14 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all font-black text-xl sm:text-3xl leading-relaxed shadow-2xl placeholder:text-zinc-800 scroll-smooth custom-scrollbar"
                    value={formData.observacoes}
                    onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))}
                  />
                </section>
              </form>
            </div>

            {/* Rodapé do Modal Fixo e Ultra-Pro */}
            <div className="px-10 sm:px-16 py-10 sm:py-14 bg-zinc-950/80 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between flex-shrink-0 gap-8">
               <div className="flex items-center gap-6 text-zinc-500">
                  <AlertCircle size={24} className="text-amber-500 animate-pulse" />
                  <p className="text-xs sm:text-sm font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] leading-relaxed">
                    Certifique-se de validar todos os itens do orçamento antes de confirmar.<br />
                    <span className="text-zinc-600 opacity-60">JV Automóveis • Cloud Integrated System • 2026</span>
                  </p>
               </div>
               <div className="flex items-center gap-8 sm:gap-12 w-full sm:w-auto">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 sm:flex-none px-10 py-8 text-base font-black text-zinc-500 hover:text-white transition-all uppercase tracking-[0.4em] hover:bg-zinc-900 rounded-[2rem]"
                  >
                    Descartar
                  </button>
                  <button 
                    onClick={handleSave}
                    className="flex-1 sm:flex-none px-16 sm:px-32 py-8 sm:py-10 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-[2.5rem] sm:rounded-[3.5rem] transition-all shadow-[0_25px_80px_-20px_rgba(6,182,212,0.6)] active:scale-[0.96] uppercase tracking-[0.4em] text-lg sm:text-2xl"
                  >
                    {editingOS ? 'Gravar Atualizações' : 'Gravar e Emitir OS'}
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Picker de Catálogo Ampliado e Ultra-Moderno */}
      {isServicePickerOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-12 bg-black/98 backdrop-blur-[100px] animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-[1300px] rounded-[4rem] sm:rounded-[6rem] overflow-hidden relative animate-in zoom-in-95 duration-200 shadow-[0_0_150px_rgba(0,0,0,1)] flex flex-col h-[90vh] my-auto border-t-zinc-700">
            <div className="p-10 sm:p-16 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
              <div className="flex items-center gap-8">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-[2rem] sm:rounded-[3rem] bg-zinc-800 border border-zinc-700 flex items-center justify-center text-cyan-500 shadow-2xl">
                  <Search className="w-8 h-8 sm:w-12 sm:h-12" />
                </div>
                <h4 className="text-3xl sm:text-5xl font-black uppercase tracking-widest text-zinc-100 leading-none">Consultar Catálogo</h4>
              </div>
              <button onClick={() => setIsServicePickerOpen(false)} className="text-zinc-500 hover:text-white transition-all bg-zinc-800 p-5 sm:p-7 rounded-[2rem] sm:rounded-[3rem] border border-zinc-700"><X size={40} /></button>
            </div>
            
            <div className="p-10 sm:p-16 border-b border-zinc-800 bg-zinc-950/60">
              <div className="relative">
                <Search className="absolute left-10 sm:left-14 top-1/2 -translate-y-1/2 text-zinc-500" size={40} />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Pesquisar por nome do serviço, peça ou categoria técnica..."
                  className="w-full bg-zinc-800 border-2 border-zinc-700 rounded-[3rem] sm:rounded-[4rem] pl-28 sm:pl-36 pr-12 py-10 sm:py-12 text-zinc-100 outline-none focus:ring-4 focus:ring-cyan-500/30 font-black text-2xl sm:text-4xl shadow-inner transition-all placeholder:text-zinc-700"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 sm:p-16 space-y-8 bg-zinc-950/20 custom-scrollbar">
              {filteredCatalog.length > 0 ? filteredCatalog.map(s => (
                <button 
                  key={s.id}
                  onClick={() => addServiceToOS(s)}
                  className="w-full text-left p-10 sm:p-14 rounded-[3.5rem] sm:rounded-[5rem] hover:bg-zinc-800/80 transition-all flex items-center justify-between group border border-transparent hover:border-zinc-700 active:scale-[0.98] shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/0 group-hover:bg-cyan-500/5 rounded-full blur-[80px] transition-all" />
                  <div className="flex items-center gap-10 sm:gap-14 relative z-10">
                    <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-[2rem] sm:rounded-[3rem] bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white transition-all shadow-2xl">
                      <Wrench className="w-10 h-10 sm:w-14 sm:h-14" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-black text-zinc-100 uppercase text-2xl sm:text-4xl tracking-tighter leading-none">{s.nome}</p>
                      <p className="text-lg sm:text-xl text-zinc-500 italic font-bold tracking-tight">{s.descricao || 'Nenhuma nota técnica disponível para este item.'}</p>
                    </div>
                  </div>
                  <div className="text-right relative z-10">
                    <p className="text-emerald-400 font-mono font-black text-3xl sm:text-5xl tabular-nums leading-none mb-3">R$ {s.preco_base?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] sm:text-xs text-zinc-600 font-black uppercase tracking-[0.5em] flex items-center justify-end gap-4 mt-6 group-hover:text-cyan-500 transition-colors">
                      <Plus size={16} /> Selecionar Registro
                    </p>
                  </div>
                </button>
              )) : (
                <div className="p-40 text-center space-y-8 opacity-40">
                   <AlertCircle size={100} className="text-zinc-800 mx-auto" />
                   <p className="text-zinc-500 font-black uppercase tracking-[1em] text-2xl italic">Catálogo Inexistente</p>
                </div>
              )}
            </div>

            <div className="p-12 sm:p-16 border-t border-zinc-800 text-center bg-zinc-950/60">
              <button 
                onClick={() => setIsServicePickerOpen(false)}
                className="text-sm sm:text-lg font-black text-cyan-500 hover:text-cyan-400 flex items-center justify-center gap-6 mx-auto uppercase tracking-[0.8em] px-20 py-8 bg-cyan-500/5 rounded-[3rem] border-2 border-cyan-500/10 transition-all hover:bg-cyan-500/10 shadow-2xl active:scale-95"
              >
                <CheckCircle2 size={32} /> Finalizar Seleção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;
