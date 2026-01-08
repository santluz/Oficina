
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

  const addManualItem = () => {
    const newItem: ServiceOrderItem = {
      id: Math.random().toString(36).substr(2, 9),
      servico_id: 'manual',
      nome_servico: '',
      quantidade: 1,
      preco_unitario: 0,
      subtotal: 0
    };
    const updatedServices = [...formData.servicos, newItem];
    setFormData(prev => ({ 
      ...prev, 
      servicos: updatedServices,
      orcamento_total: calculateTotal(updatedServices)
    }));
  };

  const addServiceFromCatalog = (service: Service) => {
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
    setIsServicePickerOpen(false);
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
        showToast("Selecione o cliente e o veículo para prosseguir.", "error");
        return;
    }

    try {
      if (editingOS) {
        db.updateOrder(editingOS.id, formData);
        showToast("Alterações salvas.", "success");
      } else {
        db.addOrder(formData);
        showToast("Ordem de Serviço gerada.", "success");
      }
      setOrders(db.getOrders());
      setIsModalOpen(false);
    } catch (err) {
      showToast("Erro ao gravar dados.", "error");
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
      showToast("OS removida.", "info");
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
            <p className="font-bold text-zinc-100 text-sm">{client?.nome || '---'}</p>
            <p className="text-[10px] text-zinc-500 uppercase">{vehicle?.marca} {vehicle?.modelo} ({vehicle?.placa})</p>
          </div>
        );
      }
    },
    { 
      header: 'Situação', 
      accessor: (o: ServiceOrder) => (
        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border tracking-widest ${getStatusStyles(o.status)}`}>
          {o.status}
        </span>
      )
    },
    { 
      header: 'Total Geral', 
      accessor: (o: ServiceOrder) => (
        <span className="font-bold text-zinc-100 font-mono">
          R$ {(Number(o.orcamento_total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    { 
      header: 'Gerenciar', 
      accessor: (o: ServiceOrder) => (
        <div className="flex items-center gap-1">
          <button onClick={() => handleOpenModal(o)} className="p-2 text-zinc-400 hover:text-cyan-500 hover:bg-zinc-800 rounded-lg"><Edit size={16} /></button>
          <button onClick={() => confirmDelete(o.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded-lg"><Trash2 size={16} /></button>
        </div>
      ),
      className: 'text-right'
    },
  ];

  return (
    <div className="animate-in space-y-6">
      <DataTable 
        title="Gestão de Ordens de Serviço"
        data={orders}
        columns={columns}
        onAdd={() => handleOpenModal()}
        addButtonLabel="Nova OS"
      />

      <AlertDialog 
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        onConfirm={handleDelete}
        title="Excluir OS?"
        description="Esta ação removerá todos os registros técnicos e financeiros vinculados."
        confirmLabel="Confirmar Exclusão"
        cancelLabel="Cancelar"
        variant="danger"
      />

      {/* WORKSPACE DE TELA CHEIA - TOTALMENTE ABERTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col animate-in fade-in duration-300">
          
          {/* Barra de Título (Header) Workspace */}
          <div className="px-10 py-6 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-cyan-600/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.1)]">
                <ClipboardList size={28} />
              </div>
              <div>
                <h3 className="text-3xl font-black text-zinc-100 uppercase tracking-tighter">
                  {editingOS ? `ORDEM DE SERVIÇO #${editingOS.id}` : 'ABERTURA DE NOVA ORDEM DE SERVIÇO'}
                </h3>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-zinc-500 uppercase tracking-[0.4em] font-black">JV AUTOMÓVEIS OPERATIONAL CENTER</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/40 animate-pulse" />
                  <span className="text-xs text-cyan-500 uppercase tracking-[0.4em] font-black">SISTEMA INTEGRADO 2026</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="group p-4 text-zinc-500 hover:text-white bg-zinc-800 rounded-2xl hover:bg-red-600 transition-all border border-zinc-700 shadow-2xl"
            >
              <X size={28} />
            </button>
          </div>

          {/* Área de Trabalho - Workspace Expansivo */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950 p-12">
            <form id="os-form" onSubmit={handleSave} className="max-w-[1600px] mx-auto space-y-12">
              
              {/* Card de Identificação em Grade Ampla */}
              <section className="bg-zinc-900/30 p-10 rounded-[2.5rem] border border-zinc-800/40 shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-4 mb-10 border-l-4 border-cyan-500 pl-6">
                  <h4 className="text-sm font-black text-zinc-300 uppercase tracking-[0.5em]">Identificação Técnica do Chamado</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Proprietário (Cliente)</label>
                    <select 
                      required
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 font-black text-lg transition-all shadow-inner appearance-none cursor-pointer"
                      value={formData.cliente_id}
                      onChange={e => setFormData(p => ({ ...p, cliente_id: e.target.value, veiculo_id: '' }))}
                    >
                      <option value="">Buscar Cliente...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Veículo Relacionado</label>
                    <select 
                      required
                      disabled={!formData.cliente_id}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-10 font-black text-lg transition-all shadow-inner appearance-none cursor-pointer"
                      value={formData.veiculo_id}
                      onChange={e => setFormData(p => ({ ...p, veiculo_id: e.target.value }))}
                    >
                      <option value="">Selecionar Veículo...</option>
                      {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} • {v.placa}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Data de Ingresso</label>
                    <div className="relative">
                      <Clock size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-cyan-500" />
                      <input 
                        type="date" required
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-16 pr-6 py-5 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 font-black text-lg transition-all shadow-inner"
                        value={formData.data_entrada.split('T')[0]}
                        onChange={e => setFormData(p => ({ ...p, data_entrada: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Situação Operacional</label>
                    <select 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 font-black uppercase text-sm tracking-widest transition-all shadow-inner cursor-pointer"
                      value={formData.status}
                      onChange={e => setFormData(p => ({ ...p, status: e.target.value as ServiceOrderStatus }))}
                    >
                      {Object.values(ServiceOrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {/* Seção Principal: Orçamento Detalhado */}
              <section className="space-y-8">
                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center gap-5">
                    <div className="p-3 bg-cyan-500/10 rounded-xl">
                      <ShoppingCart size={24} className="text-cyan-500" />
                    </div>
                    <h4 className="text-lg font-black text-zinc-200 uppercase tracking-[0.5em]">Itens e Mão de Obra do Orçamento</h4>
                  </div>
                  <div className="flex items-center gap-6">
                    <button 
                        type="button" 
                        onClick={addManualItem}
                        className="px-8 py-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl text-xs font-black flex items-center gap-3 transition-all uppercase tracking-widest border border-zinc-700 shadow-xl"
                    >
                        <Plus size={20} /> Inclusão Manual
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setIsServicePickerOpen(true)}
                        className="px-10 py-5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl text-xs font-black flex items-center gap-3 transition-all uppercase tracking-widest shadow-[0_20px_40px_-10px_rgba(6,182,212,0.4)] active:scale-95"
                    >
                        <Search size={20} /> Consultar Catálogo
                    </button>
                  </div>
                </div>

                <div className="bg-zinc-900/20 border border-zinc-800/60 rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
                  <table className="w-full text-left">
                      <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-500 font-black uppercase text-xs tracking-[0.2em]">
                          <tr>
                              <th className="px-10 py-6">Especificação do Item / Serviço</th>
                              <th className="px-10 py-6 w-40 text-center">Quant.</th>
                              <th className="px-10 py-6 w-56 text-center">Preço Unitário</th>
                              <th className="px-10 py-6 w-56 text-right">Subtotal Líquido</th>
                              <th className="px-10 py-6 w-24"></th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                          {formData.servicos.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-zinc-800/10 transition-all group">
                                  <td className="px-10 py-7">
                                      {item.servico_id === 'manual' ? (
                                        <input 
                                          autoFocus
                                          type="text"
                                          placeholder="Descreva o serviço ou peça..."
                                          className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-100 font-black text-lg outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner"
                                          value={item.nome_servico}
                                          onChange={(e) => updateItem(idx, { nome_servico: e.target.value })}
                                        />
                                      ) : (
                                        <div className="flex items-center gap-4">
                                          <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)]" />
                                          <span className="font-black text-zinc-100 text-xl tracking-tight">{item.nome_servico}</span>
                                        </div>
                                      )}
                                  </td>
                                  <td className="px-10 py-7">
                                      <input 
                                          type="number" min="1" 
                                          className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-center font-black text-xl outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner" 
                                          value={item.quantidade} 
                                          onChange={(e) => updateItem(idx, { quantidade: parseInt(e.target.value) || 1 })}
                                      />
                                  </td>
                                  <td className="px-10 py-7 text-center">
                                      <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 text-sm font-black">R$</span>
                                        <input 
                                            type="number" step="0.01"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-14 pr-6 py-4 font-mono text-center font-black text-xl outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner" 
                                            value={item.preco_unitario} 
                                            onChange={(e) => updateItem(idx, { preco_unitario: parseFloat(e.target.value) || 0 })}
                                        />
                                      </div>
                                  </td>
                                  <td className="px-10 py-7 text-zinc-100 text-right font-mono font-black text-2xl tracking-tighter">
                                    <span className="text-xs text-zinc-600 mr-3 font-sans font-bold uppercase">R$</span>
                                    {(Number(item.subtotal) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-10 py-7 text-right">
                                      <button 
                                        type="button" 
                                        onClick={() => removeServiceFromOS(item.id)} 
                                        className="text-zinc-600 hover:text-red-500 transition-all p-4 rounded-2xl hover:bg-red-500/10 group-hover:opacity-100"
                                      >
                                          <Trash2 size={24} />
                                      </button>
                                  </td>
                              </tr>
                          ))}
                          {formData.servicos.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-10 py-48 text-center bg-zinc-950/20">
                                  <div className="flex flex-col items-center gap-6 opacity-10">
                                    <ShoppingCart size={80} className="text-zinc-500" />
                                    <p className="font-black text-zinc-500 uppercase tracking-[0.8em] text-lg">ÁREA DE ORÇAMENTO DISPONÍVEL</p>
                                  </div>
                                </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
                </div>
              </section>

              {/* Notas e Observações */}
              <section className="space-y-6">
                <div className="flex items-center gap-4 px-4">
                  <div className="p-2 bg-zinc-800 rounded-lg">
                    <Edit size={20} className="text-zinc-500" />
                  </div>
                  <h4 className="text-sm font-black text-zinc-500 uppercase tracking-[0.5em]">Diagnóstico de Entrada e Notas Complementares</h4>
                </div>
                <textarea 
                  rows={5}
                  placeholder="Relatório detalhado sobre o estado do veículo, defeitos relatados pelo cliente e procedimentos técnicos sugeridos..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-[3rem] px-10 py-8 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-xl leading-relaxed placeholder:text-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
                  value={formData.observacoes}
                  onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))}
                />
              </section>
            </form>
          </div>

          {/* RODAPÉ DE CONTROLE E FATURAMENTO (Sticky) */}
          <div className="px-12 py-8 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between flex-shrink-0 z-50 shadow-[0_-30px_80px_rgba(0,0,0,0.7)]">
             <div className="flex items-center gap-16">
                <div className="flex flex-col">
                  <p className="text-xs font-black text-zinc-500 uppercase tracking-[0.4em] mb-2">Totalização Geral do Chamado</p>
                  <div className="flex items-baseline gap-4">
                    <span className="text-xl text-zinc-600 font-black">R$</span>
                    <h5 className="text-7xl font-black text-emerald-400 font-mono tracking-tighter leading-none tabular-nums">
                      {(Number(formData.orcamento_total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h5>
                  </div>
                </div>
                <div className="hidden 2xl:flex flex-col gap-2 border-l border-zinc-800 pl-16">
                  <span className="flex items-center gap-3 text-xs font-black text-zinc-400 uppercase tracking-widest">
                    <Zap size={18} className="text-cyan-500" /> Motor de Cálculo Ativo
                  </span>
                  <span className="flex items-center gap-3 text-xs font-black text-zinc-400 uppercase tracking-widest">
                    <ShieldCheck size={18} className="text-emerald-500" /> Garantia de Integridade JV 2026
                  </span>
                </div>
             </div>
             
             <div className="flex items-center gap-8">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-10 py-6 text-sm font-black text-zinc-500 hover:text-white transition-all uppercase tracking-[0.4em] hover:bg-zinc-800 rounded-3xl"
                >
                  Descartar Alterações
                </button>
                <button 
                  type="button"
                  onClick={() => handleSave()}
                  className="px-20 py-8 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-3xl transition-all shadow-[0_20px_60px_-10px_rgba(6,182,212,0.6)] active:scale-95 uppercase tracking-[0.5em] text-lg flex items-center gap-6"
                >
                  <CheckCircle2 size={32} /> {editingOS ? 'Salvar Registro' : 'Lançar Ordem de Serviço'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Catálogo Workspace Modificado para Tela Ampla */}
      {isServicePickerOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-10 bg-black/98 backdrop-blur-3xl animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-5xl rounded-[3.5rem] overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] flex flex-col max-h-[85vh]">
            <div className="p-10 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
              <div className="flex items-center gap-6">
                <Search size={32} className="text-cyan-500" />
                <h4 className="text-2xl font-black uppercase tracking-[0.3em] text-zinc-100">Catálogo de Serviços JV</h4>
              </div>
              <button onClick={() => setIsServicePickerOpen(false)} className="text-zinc-500 hover:text-white p-4 hover:bg-zinc-800 rounded-2xl transition-all">
                <X size={32} />
              </button>
            </div>
            
            <div className="p-10 bg-zinc-950/30">
              <input 
                autoFocus
                type="text"
                placeholder="Filtrar por nome do serviço ou palavra-chave..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-[2rem] px-10 py-6 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 font-black text-2xl shadow-inner placeholder:text-zinc-800"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-5 custom-scrollbar">
              {filteredCatalog.map(s => (
                <button 
                  key={s.id}
                  onClick={() => addServiceFromCatalog(s)}
                  className="w-full text-left p-8 rounded-[2rem] hover:bg-zinc-800/80 transition-all flex items-center justify-between border border-transparent hover:border-zinc-700 active:scale-98 group shadow-2xl"
                >
                  <div className="flex items-center gap-8">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-950 flex items-center justify-center text-zinc-500 group-hover:text-cyan-500 transition-colors shadow-inner border border-zinc-800">
                      <Wrench size={28} />
                    </div>
                    <div>
                      <p className="font-black text-zinc-100 text-2xl uppercase tracking-tighter leading-none group-hover:text-cyan-400 transition-colors">{s.nome}</p>
                      <p className="text-sm text-zinc-500 italic mt-3 font-bold opacity-60 line-clamp-1 max-w-[400px]">{s.descricao || 'Serviço técnico especializado de alta precisão.'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-mono font-black text-3xl tracking-tighter">R$ {s.preco_base?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.4em] mt-2 group-hover:text-cyan-500 transition-colors">Selecionar Item</p>
                  </div>
                </button>
              ))}
              {filteredCatalog.length === 0 && (
                <div className="text-center py-32 opacity-10 flex flex-col items-center gap-6">
                  <AlertCircle size={64} />
                  <p className="text-lg font-black uppercase tracking-[0.6em]">Nenhum registro localizado</p>
                </div>
              )}
            </div>
            
            <div className="p-8 bg-zinc-950/60 border-t border-zinc-800 text-center">
               <button onClick={() => setIsServicePickerOpen(false)} className="text-xs font-black text-zinc-500 uppercase tracking-[0.5em] hover:text-cyan-500 transition-colors">Retornar ao Orçamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;
