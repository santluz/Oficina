
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

      {/* WORKSPACE ULTRA-WIDE - TELA TOTALMENTE ABERTA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col animate-in fade-in duration-300">
          
          {/* Barra de Título (Header) - Escala Aumentada */}
          <div className="px-12 py-8 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between flex-shrink-0 shadow-2xl">
            <div className="flex items-center gap-8">
              <div className="w-16 h-16 bg-cyan-600/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20 rounded-[1.5rem] shadow-[0_0_50px_rgba(6,182,212,0.15)]">
                <ClipboardList size={36} />
              </div>
              <div>
                <h3 className="text-4xl font-black text-zinc-100 uppercase tracking-tighter leading-none">
                  {editingOS ? `ORDEM DE SERVIÇO #${editingOS.id}` : 'ABERTURA DE NOVA ORDEM DE SERVIÇO'}
                </h3>
                <div className="flex items-center gap-6 mt-3">
                  <span className="text-xs text-zinc-500 uppercase tracking-[0.6em] font-black">CENTRAL DE OPERAÇÕES JV AUTOMÓVEIS</span>
                  <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,1)]" />
                  <span className="text-xs text-cyan-500 uppercase tracking-[0.6em] font-black">AMBIENTE DE GESTÃO FULL-SCREEN 2026</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="group p-5 text-zinc-500 hover:text-white bg-zinc-800 rounded-3xl hover:bg-red-600 transition-all border border-zinc-700 shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
            >
              <X size={36} />
            </button>
          </div>

          {/* Área de Trabalho - Workspace Expansivo Sem Limites de Largura */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950 px-12 py-12 lg:px-20">
            <form id="os-form" onSubmit={handleSave} className="w-full max-w-[1920px] mx-auto space-y-16">
              
              {/* Seção 1: Triagem e Identificação */}
              <section className="bg-zinc-900/30 p-12 rounded-[3.5rem] border border-zinc-800/40 shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-5 mb-12 border-l-[6px] border-cyan-500 pl-8">
                  <h4 className="text-base font-black text-zinc-200 uppercase tracking-[0.6em]">Informações de Registro do Chamado</h4>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-12">
                  <div className="space-y-4">
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] ml-1">Proprietário do Veículo</label>
                    <select 
                      required
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-[1.5rem] px-8 py-6 text-zinc-100 outline-none focus:ring-4 focus:ring-cyan-500/20 font-black text-2xl transition-all shadow-inner appearance-none cursor-pointer"
                      value={formData.cliente_id}
                      onChange={e => setFormData(p => ({ ...p, cliente_id: e.target.value, veiculo_id: '' }))}
                    >
                      <option value="">Buscar no Banco de Clientes...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] ml-1">Identificação do Veículo</label>
                    <select 
                      required
                      disabled={!formData.cliente_id}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-[1.5rem] px-8 py-6 text-zinc-100 outline-none focus:ring-4 focus:ring-cyan-500/20 disabled:opacity-10 font-black text-2xl transition-all shadow-inner appearance-none cursor-pointer"
                      value={formData.veiculo_id}
                      onChange={e => setFormData(p => ({ ...p, veiculo_id: e.target.value }))}
                    >
                      <option value="">Selecionar Unidade Relacionada...</option>
                      {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} • {v.placa}</option>)}
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] ml-1">Cronograma de Entrada</label>
                    <div className="relative">
                      <Clock size={28} className="absolute left-8 top-1/2 -translate-y-1/2 text-cyan-500" />
                      <input 
                        type="date" required
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-[1.5rem] pl-20 pr-8 py-6 text-zinc-100 outline-none focus:ring-4 focus:ring-cyan-500/20 font-black text-2xl transition-all shadow-inner"
                        value={formData.data_entrada.split('T')[0]}
                        onChange={e => setFormData(p => ({ ...p, data_entrada: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] ml-1">Status Operacional</label>
                    <select 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-[1.5rem] px-8 py-6 text-zinc-100 outline-none focus:ring-4 focus:ring-cyan-500/20 font-black uppercase text-base tracking-[0.2em] transition-all shadow-inner cursor-pointer"
                      value={formData.status}
                      onChange={e => setFormData(p => ({ ...p, status: e.target.value as ServiceOrderStatus }))}
                    >
                      {Object.values(ServiceOrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {/* Seção 2: Tabela de Itens em Escala Máxima */}
              <section className="space-y-10">
                <div className="flex items-center justify-between px-6">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
                      <ShoppingCart size={32} className="text-cyan-500" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-zinc-100 uppercase tracking-[0.4em]">Detalhamento Técnico do Orçamento</h4>
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1 opacity-50">Adicione peças, fluidos e mão de obra especializada</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <button 
                        type="button" 
                        onClick={addManualItem}
                        className="px-10 py-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-[1.5rem] text-sm font-black flex items-center gap-4 transition-all uppercase tracking-[0.2em] border border-zinc-700 shadow-2xl active:scale-95"
                    >
                        <Plus size={24} /> Item Fora do Catálogo
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setIsServicePickerOpen(true)}
                        className="px-12 py-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-[1.5rem] text-sm font-black flex items-center gap-4 transition-all uppercase tracking-[0.2em] shadow-[0_25px_50px_-12px_rgba(6,182,212,0.5)] active:scale-95"
                    >
                        <Search size={24} /> Consultar Catálogo JV
                    </button>
                  </div>
                </div>

                <div className="bg-zinc-900/20 border border-zinc-800/60 rounded-[4rem] overflow-hidden shadow-[0_50px_120px_rgba(0,0,0,0.6)]">
                  <table className="w-full text-left">
                      <thead className="bg-zinc-950/90 border-b border-zinc-800 text-zinc-500 font-black uppercase text-sm tracking-[0.3em]">
                          <tr>
                              <th className="px-12 py-8">Discriminação de Peças e Mão de Obra</th>
                              <th className="px-12 py-8 w-48 text-center">Quantidade</th>
                              <th className="px-12 py-8 w-64 text-center">Valor Unitário</th>
                              <th className="px-12 py-8 w-72 text-right">Subtotal Líquido</th>
                              <th className="px-12 py-8 w-28"></th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                          {formData.servicos.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-zinc-800/10 transition-all group">
                                  <td className="px-12 py-10">
                                      {item.servico_id === 'manual' ? (
                                        <input 
                                          autoFocus
                                          type="text"
                                          placeholder="Descreva o item com clareza técnica..."
                                          className="w-full bg-zinc-950 border border-zinc-800 rounded-[1.25rem] px-8 py-5 text-zinc-100 font-black text-2xl outline-none focus:ring-4 focus:ring-cyan-500/20 shadow-inner"
                                          value={item.nome_servico}
                                          onChange={(e) => updateItem(idx, { nome_servico: e.target.value })}
                                        />
                                      ) : (
                                        <div className="flex items-center gap-6">
                                          <div className="w-4 h-4 rounded-full bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.8)]" />
                                          <span className="font-black text-zinc-100 text-3xl tracking-tighter leading-none">{item.nome_servico}</span>
                                        </div>
                                      )}
                                  </td>
                                  <td className="px-12 py-10">
                                      <input 
                                          type="number" min="1" 
                                          className="w-full bg-zinc-950 border border-zinc-800 rounded-[1.25rem] px-8 py-5 text-center font-black text-3xl outline-none focus:ring-4 focus:ring-cyan-500/20 shadow-inner tabular-nums" 
                                          value={item.quantidade} 
                                          onChange={(e) => updateItem(idx, { quantidade: parseInt(e.target.value) || 1 })}
                                      />
                                  </td>
                                  <td className="px-12 py-10 text-center">
                                      <div className="relative">
                                        <span className="absolute left-8 top-1/2 -translate-y-1/2 text-zinc-600 text-lg font-black">R$</span>
                                        <input 
                                            type="number" step="0.01"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-[1.25rem] pl-20 pr-8 py-5 font-mono text-center font-black text-3xl outline-none focus:ring-4 focus:ring-cyan-500/20 shadow-inner tabular-nums" 
                                            value={item.preco_unitario} 
                                            onChange={(e) => updateItem(idx, { preco_unitario: parseFloat(e.target.value) || 0 })}
                                        />
                                      </div>
                                  </td>
                                  <td className="px-12 py-10 text-zinc-100 text-right font-mono font-black text-4xl tracking-tighter leading-none tabular-nums">
                                    <span className="text-sm text-zinc-600 mr-4 font-sans font-black uppercase tracking-widest">R$</span>
                                    {(Number(item.subtotal) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-12 py-10 text-right">
                                      <button 
                                        type="button" 
                                        onClick={() => removeServiceFromOS(item.id)} 
                                        className="text-zinc-700 hover:text-red-500 transition-all p-5 rounded-[1.25rem] hover:bg-red-500/10 group-hover:scale-110 active:scale-90"
                                      >
                                          <Trash2 size={32} />
                                      </button>
                                  </td>
                              </tr>
                          ))}
                          {formData.servicos.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-12 py-64 text-center bg-zinc-950/20">
                                  <div className="flex flex-col items-center gap-10 opacity-10">
                                    <ShoppingCart size={120} className="text-zinc-500" />
                                    <p className="font-black text-zinc-500 uppercase tracking-[1em] text-2xl">WORKSPACE AGUARDANDO DADOS</p>
                                  </div>
                                </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
                </div>
              </section>

              {/* Seção 3: Notas Técnicas */}
              <section className="space-y-8">
                <div className="flex items-center gap-6 px-6">
                  <div className="p-3 bg-zinc-800 rounded-xl border border-zinc-700">
                    <Edit size={24} className="text-zinc-500" />
                  </div>
                  <h4 className="text-base font-black text-zinc-400 uppercase tracking-[0.6em]">Histórico Técnico e Diagnóstico de Diagnóstico</h4>
                </div>
                <textarea 
                  rows={6}
                  placeholder="Relatório executivo sobre a condição mecânica, peças indicadas para manutenção futura e considerações sobre a garantia dos serviços prestados..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-[3.5rem] px-12 py-10 text-zinc-100 outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all text-2xl leading-relaxed placeholder:text-zinc-800 shadow-[0_30px_70px_rgba(0,0,0,0.4)]"
                  value={formData.observacoes}
                  onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))}
                />
              </section>
            </form>
          </div>

          {/* RODAPÉ ESTRATÉGICO - CONTROLE FINANCEIRO (Sticky) */}
          <div className="px-16 py-10 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between flex-shrink-0 z-50 shadow-[0_-40px_100px_rgba(0,0,0,0.8)]">
             <div className="flex items-center gap-20">
                <div className="flex flex-col">
                  <p className="text-sm font-black text-zinc-500 uppercase tracking-[0.5em] mb-4">Valor Consolidado do Chamado</p>
                  <div className="flex items-baseline gap-6">
                    <span className="text-2xl text-zinc-600 font-black tracking-widest uppercase">Total R$</span>
                    <h5 className="text-[7rem] font-black text-emerald-400 font-mono tracking-tighter leading-none tabular-nums shadow-emerald-500/10 drop-shadow-2xl">
                      {(Number(formData.orcamento_total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h5>
                  </div>
                </div>
                <div className="hidden 2xl:flex flex-col gap-4 border-l-2 border-zinc-800 pl-20">
                  <span className="flex items-center gap-4 text-sm font-black text-zinc-400 uppercase tracking-[0.4em]">
                    <Zap size={24} className="text-cyan-500" /> Sincronização em Tempo Real Ativa
                  </span>
                  <span className="flex items-center gap-4 text-sm font-black text-zinc-400 uppercase tracking-[0.4em]">
                    <ShieldCheck size={24} className="text-emerald-500" /> Protocolo de Segurança JV 2026.04
                  </span>
                </div>
             </div>
             
             <div className="flex items-center gap-10">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-12 py-8 text-sm font-black text-zinc-500 hover:text-white transition-all uppercase tracking-[0.6em] hover:bg-zinc-800 rounded-[2rem]"
                >
                  Cancelar Operação
                </button>
                <button 
                  type="button"
                  onClick={() => handleSave()}
                  className="px-24 py-10 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-[2.5rem] transition-all shadow-[0_30px_80px_-15px_rgba(6,182,212,0.6)] active:scale-95 uppercase tracking-[0.6em] text-xl flex items-center gap-8"
                >
                  <CheckCircle2 size={40} /> {editingOS ? 'Salvar Registro' : 'Lançar Ordem de Serviço'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Catálogo Workspace em Tela Ampla */}
      {isServicePickerOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-16 bg-black/98 backdrop-blur-3xl animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-7xl rounded-[4.5rem] overflow-hidden shadow-[0_0_200px_rgba(0,0,0,1)] flex flex-col max-h-[90vh]">
            <div className="p-12 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
              <div className="flex items-center gap-8">
                <Search size={40} className="text-cyan-500" />
                <h4 className="text-3xl font-black uppercase tracking-[0.5em] text-zinc-100 leading-none">Catálogo Geral JV</h4>
              </div>
              <button onClick={() => setIsServicePickerOpen(false)} className="text-zinc-500 hover:text-white p-6 hover:bg-zinc-800 rounded-3xl transition-all">
                <X size={48} />
              </button>
            </div>
            
            <div className="p-12 bg-zinc-950/40">
              <input 
                autoFocus
                type="text"
                placeholder="Pesquisar por descrição, código ou categoria de serviço..."
                className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-[2.5rem] px-12 py-8 text-zinc-100 outline-none focus:border-cyan-500 font-black text-3xl shadow-inner placeholder:text-zinc-800 transition-all"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-12 space-y-6 custom-scrollbar bg-zinc-900/40">
              {filteredCatalog.map(s => (
                <button 
                  key={s.id}
                  onClick={() => addServiceFromCatalog(s)}
                  className="w-full text-left p-10 rounded-[3rem] hover:bg-zinc-800 transition-all flex items-center justify-between border-2 border-transparent hover:border-zinc-700 active:scale-98 group shadow-2xl"
                >
                  <div className="flex items-center gap-10">
                    <div className="w-20 h-20 rounded-3xl bg-zinc-950 flex items-center justify-center text-zinc-500 group-hover:text-cyan-500 transition-colors shadow-inner border-2 border-zinc-800">
                      <Wrench size={36} />
                    </div>
                    <div>
                      <p className="font-black text-zinc-100 text-3xl uppercase tracking-tighter leading-none group-hover:text-cyan-400 transition-colors">{s.nome}</p>
                      <p className="text-base text-zinc-500 italic mt-4 font-bold opacity-60 line-clamp-1 max-w-[600px]">{s.descricao || 'Serviço padronizado JV Automóveis.'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-mono font-black text-5xl tracking-tighter leading-none">R$ {s.preco_base?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-zinc-600 font-black uppercase tracking-[0.6em] mt-4 group-hover:text-cyan-500 transition-colors">Vincular Item</p>
                  </div>
                </button>
              ))}
              {filteredCatalog.length === 0 && (
                <div className="text-center py-48 opacity-10 flex flex-col items-center gap-10">
                  <AlertCircle size={96} />
                  <p className="text-2xl font-black uppercase tracking-[1em]">RESULTADO VAZIO</p>
                </div>
              )}
            </div>
            
            <div className="p-10 bg-zinc-950/80 border-t border-zinc-800 text-center">
               <button onClick={() => setIsServicePickerOpen(false)} className="text-xs font-black text-zinc-500 uppercase tracking-[0.8em] hover:text-cyan-500 transition-colors">Voltar para a Ordem de Serviço</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;
