
import React, { useState, useMemo, useEffect } from 'react';
import { DataTable } from '../components/DataTable';
import { db } from '../services/db';
import { ServiceOrder, ServiceOrderStatus, Service, ServiceOrderItem } from '../types';
// Added missing ShieldCheck import from constants
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-black/80 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-[1600px] rounded-[3rem] overflow-hidden relative animate-in zoom-in-95 duration-300 flex flex-col h-[92vh] shadow-2xl">
            
            {/* Header Amplo e Fixo */}
            <div className="px-12 py-10 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40 flex-shrink-0">
              <div className="flex items-center gap-10">
                <div className="w-20 h-20 rounded-[2rem] bg-cyan-600/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20 shadow-xl">
                  <ClipboardList size={40} />
                </div>
                <div>
                  <div className="flex items-center gap-5">
                    <h3 className="text-4xl font-black tracking-tighter text-zinc-100 uppercase">
                      {editingOS ? `Visualização da OS #${editingOS.id}` : 'Nova Ordem de Serviço'}
                    </h3>
                    {editingOS?.status === ServiceOrderStatus.COMPLETED && (
                        <span className="px-5 py-2 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-black tracking-widest border border-emerald-500/20 uppercase">Concluída</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 uppercase tracking-[0.4em] font-bold mt-2">Centro Automotivo JV • Sistema de Gestão Técnica</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {editingOS && editingOS.status !== ServiceOrderStatus.COMPLETED && (
                  <button 
                    onClick={() => {
                        setFormData(prev => ({ ...prev, status: ServiceOrderStatus.COMPLETED }));
                        handleSave();
                    }}
                    className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-black flex items-center gap-3 transition-all uppercase shadow-lg shadow-emerald-900/40"
                  >
                    <CheckCircle2 size={20} /> Concluir OS
                  </button>
                )}
                <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="p-4 text-zinc-500 hover:text-white transition-all bg-zinc-800 hover:bg-zinc-700 rounded-2xl shadow-xl border border-zinc-700"
                >
                    <X size={32} />
                </button>
              </div>
            </div>
            
            {/* Área de Conteúdo Scrollável */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950/20 p-12">
              <form onSubmit={handleSave} className="space-y-16 max-w-[1400px] mx-auto pb-10">
                
                {/* Seção 1: Dados do Cliente e Veículo */}
                <section className="bg-zinc-900/50 p-12 rounded-[2.5rem] border border-zinc-800 shadow-xl">
                  <div className="flex items-center gap-4 mb-10">
                    <Users size={22} className="text-cyan-500" />
                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em]">Identificação do Atendimento</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="space-y-4">
                      <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Proprietário / Cliente</label>
                      <select 
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-8 py-6 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 font-bold text-xl shadow-inner appearance-none"
                        value={formData.cliente_id}
                        onChange={e => setFormData(p => ({ ...p, cliente_id: e.target.value, veiculo_id: '' }))}
                      >
                        <option value="">Selecione o Cliente...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    </div>
                    <div className="space-y-4">
                      <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Veículo Relacionado</label>
                      <select 
                        required
                        disabled={!formData.cliente_id}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-8 py-6 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-30 font-bold text-xl shadow-inner appearance-none"
                        value={formData.veiculo_id}
                        onChange={e => setFormData(p => ({ ...p, veiculo_id: e.target.value }))}
                      >
                        <option value="">Selecione o Veículo...</option>
                        {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} ({v.placa})</option>)}
                      </select>
                    </div>
                    <div className="space-y-4">
                      <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Data de Entrada</label>
                      <div className="relative">
                        <Clock size={24} className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700" />
                        <input 
                          type="date" required
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-16 pr-8 py-6 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 font-bold text-xl shadow-inner"
                          value={formData.data_entrada.split('T')[0]}
                          onChange={e => setFormData(p => ({ ...p, data_entrada: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Situação da OS</label>
                      <select 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-8 py-6 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 font-black uppercase tracking-wider text-sm shadow-inner appearance-none"
                        value={formData.status}
                        onChange={e => setFormData(p => ({ ...p, status: e.target.value as ServiceOrderStatus }))}
                      >
                        {Object.values(ServiceOrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </section>

                {/* Seção 2: Itens e Valores */}
                <section className="space-y-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-[1.5rem] flex items-center justify-center border border-emerald-500/20">
                        <ShoppingCart size={30} />
                      </div>
                      <h4 className="text-2xl font-black text-zinc-100 uppercase tracking-widest">Orçamento Técnico de Peças e Serviços</h4>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => setIsServicePickerOpen(true)}
                        className="px-10 py-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-[1.8rem] text-sm font-black flex items-center gap-4 transition-all shadow-2xl shadow-cyan-900/40 uppercase tracking-[0.1em]"
                    >
                        <Plus size={24} /> Buscar no Catálogo
                    </button>
                  </div>

                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-500 font-black uppercase text-[12px] tracking-[0.4em]">
                            <tr>
                                <th className="px-14 py-10">Discriminação</th>
                                <th className="px-14 py-10 w-44 text-center">Quantidade</th>
                                <th className="px-14 py-10 w-72 text-center">Unitário (R$)</th>
                                <th className="px-14 py-10 w-72 text-right">Subtotal</th>
                                <th className="px-14 py-10 w-28"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                            {formData.servicos.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-zinc-800/40 group transition-colors">
                                    <td className="px-14 py-10">
                                      <div className="flex items-center gap-5">
                                        <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)]" />
                                        <span className="font-black text-zinc-100 text-2xl tracking-tight">{item.nome_servico}</span>
                                      </div>
                                    </td>
                                    <td className="px-14 py-10">
                                        <input 
                                            type="number" min="1" 
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-center font-black text-2xl outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner" 
                                            value={item.quantidade} 
                                            onChange={(e) => updateItem(idx, { quantidade: parseInt(e.target.value) || 1 })}
                                        />
                                    </td>
                                    <td className="px-14 py-10">
                                        <input 
                                            type="number" step="0.01"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 font-mono text-center font-black text-2xl outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner" 
                                            value={item.preco_unitario} 
                                            onChange={(e) => updateItem(idx, { preco_unitario: parseFloat(e.target.value) || 0 })}
                                        />
                                    </td>
                                    <td className="px-14 py-10 text-zinc-100 text-right font-mono font-black text-3xl tabular-nums">
                                      R$ {(Number(item.subtotal) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-14 py-10 text-right">
                                        <button 
                                          type="button" 
                                          onClick={() => removeServiceFromOS(item.id)} 
                                          className="text-zinc-600 hover:text-red-500 transition-all p-5 hover:bg-red-500/10 rounded-[1.5rem]"
                                        >
                                            <Trash2 size={30} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {formData.servicos.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="px-14 py-40 text-center bg-zinc-950/20">
                                    <div className="flex flex-col items-center gap-10 opacity-30">
                                      <ShoppingCart size={80} className="text-zinc-500" />
                                      <div className="space-y-3">
                                        <p className="font-black text-zinc-500 uppercase tracking-[0.6em] text-lg">Orçamento Vazio</p>
                                        <p className="text-zinc-600 font-bold text-sm">Adicione serviços ou peças para calcular o faturamento</p>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                  </div>

                  {/* Resumo Financeiro Amplo */}
                  {formData.servicos.length > 0 && (
                    <div className="flex justify-end pt-5 animate-in">
                      <div className="bg-zinc-900 border-2 border-zinc-800 p-12 rounded-[3.5rem] flex items-center gap-16 shadow-2xl relative overflow-hidden min-w-[500px]">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[80px]" />
                        <div className="text-right flex-1">
                          <p className="text-[12px] font-black text-zinc-500 uppercase tracking-[0.6em] mb-4">Total Consolidado OS</p>
                          <h5 className="text-7xl font-black text-emerald-400 font-mono tracking-tighter flex items-baseline justify-end gap-5">
                            <span className="text-3xl opacity-30 font-sans">R$</span>
                            {(Number(formData.orcamento_total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </h5>
                        </div>
                        <div className="w-px h-24 bg-zinc-800" />
                        <div className="space-y-4">
                           <div className="flex items-center gap-4 text-sm font-bold text-zinc-300">
                             <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <Zap size={16} />
                             </div>
                             Pronto para Emissão
                           </div>
                           <div className="flex items-center gap-4 text-sm font-bold text-zinc-300">
                             <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                                <ShieldCheck size={16} />
                             </div>
                             Cálculo Auditado
                           </div>
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                {/* Seção 3: Observações e Diagnóstico */}
                <section className="space-y-8 bg-zinc-900/30 p-12 rounded-[3rem] border border-zinc-800">
                  <div className="flex items-center gap-4">
                    <Edit size={22} className="text-zinc-500" />
                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-[0.4em]">Diagnóstico e Laudo do Especialista</h4>
                  </div>
                  <textarea 
                    rows={8}
                    placeholder="Descreva aqui o estado de conservação do veículo, peças trazidas pelo cliente, garantia estipulada ou qualquer observação técnica relevante para o histórico..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-[2.5rem] px-12 py-10 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/40 transition-all font-medium text-2xl leading-relaxed shadow-inner placeholder:text-zinc-800 scroll-smooth"
                    value={formData.observacoes}
                    onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))}
                  />
                </section>
              </form>
            </div>

            {/* Rodapé do Modal Fixo */}
            <div className="px-14 py-10 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-between flex-shrink-0">
               <div className="flex items-center gap-5 text-zinc-500">
                  <AlertCircle size={20} />
                  <p className="text-xs font-bold uppercase tracking-widest">Todos os campos marcados com * são de preenchimento obrigatório.</p>
               </div>
               <div className="flex items-center gap-10">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-12 py-6 text-base font-black text-zinc-500 hover:text-white transition-all uppercase tracking-[0.4em]"
                  >
                    Descartar
                  </button>
                  <button 
                    onClick={handleSave}
                    className="px-24 py-8 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-[2.5rem] transition-all shadow-[0_20px_60px_-15px_rgba(6,182,212,0.5)] active:scale-[0.97] uppercase tracking-[0.3em] text-xl"
                  >
                    {editingOS ? 'Salvar Registro Técnico' : 'Finalizar e Gravar OS'}
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Picker de Catálogo Ampliado */}
      {isServicePickerOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-8 bg-black/95 backdrop-blur-2xl">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-5xl rounded-[4rem] overflow-hidden relative animate-in zoom-in-95 duration-200 shadow-2xl flex flex-col max-h-[90vh] my-auto">
            <div className="p-12 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-3xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-cyan-500 shadow-2xl">
                  <Search size={32} />
                </div>
                <h4 className="text-4xl font-black uppercase tracking-widest text-zinc-100 leading-none">Catálogo de Serviços</h4>
              </div>
              <button onClick={() => setIsServicePickerOpen(false)} className="text-zinc-500 hover:text-white transition-all bg-zinc-800 p-4 rounded-3xl border border-zinc-700"><X size={32} /></button>
            </div>
            
            <div className="p-12 border-b border-zinc-800 bg-zinc-950/60">
              <div className="relative">
                <Search className="absolute left-10 top-1/2 -translate-y-1/2 text-zinc-500" size={32} />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Pesquisar serviço, peça ou categoria..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-[2.5rem] pl-24 pr-12 py-8 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 font-bold text-2xl shadow-inner"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 space-y-6 bg-zinc-950/10 custom-scrollbar">
              {filteredCatalog.length > 0 ? filteredCatalog.map(s => (
                <button 
                  key={s.id}
                  onClick={() => addServiceToOS(s)}
                  className="w-full text-left p-10 rounded-[2.5rem] hover:bg-zinc-800/80 transition-all flex items-center justify-between group border border-transparent hover:border-zinc-700 active:scale-[0.98] shadow-xl"
                >
                  <div className="flex items-center gap-8">
                    <div className="w-20 h-20 rounded-[1.8rem] bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white transition-all">
                      <Wrench size={36} />
                    </div>
                    <div>
                      <p className="font-black text-zinc-100 uppercase text-2xl tracking-tight">{s.nome}</p>
                      <p className="text-base text-zinc-500 italic mt-2 font-medium">{s.descricao || 'Sem descrição técnica adicional'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-mono font-black text-3xl">R$ {s.preco_base?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[11px] text-zinc-600 font-black uppercase tracking-[0.4em] flex items-center justify-end gap-3 mt-4 group-hover:text-cyan-500 transition-colors">
                      <Plus size={14} /> Selecionar Item
                    </p>
                  </div>
                </button>
              )) : (
                <div className="p-32 text-center space-y-5">
                   <AlertCircle size={64} className="text-zinc-800 mx-auto" />
                   <p className="text-zinc-500 font-black uppercase tracking-[0.5em] text-xl italic">Nenhum registro no catálogo.</p>
                </div>
              )}
            </div>

            <div className="p-12 border-t border-zinc-800 text-center bg-zinc-950/40">
              <button 
                onClick={() => setIsServicePickerOpen(false)}
                className="text-sm font-black text-cyan-500 hover:text-cyan-400 flex items-center justify-center gap-4 mx-auto uppercase tracking-[0.5em] px-16 py-6 bg-cyan-500/5 rounded-[2rem] border border-cyan-500/10 transition-all hover:bg-cyan-500/10 shadow-lg"
              >
                <CheckCircle2 size={24} /> Concluir e Voltar para OS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;
