
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

      {/* WORKSPACE - TELA CHEIA AJUSTADA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col animate-in fade-in duration-300">
          
          {/* Header Workspace - Escala Refinada */}
          <div className="px-8 py-4 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between flex-shrink-0 shadow-lg">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-cyan-600/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20 rounded-xl">
                <ClipboardList size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-zinc-100 uppercase tracking-tight">
                  {editingOS ? `ORDEM DE SERVIÇO #${editingOS.id}` : 'NOVA ORDEM DE SERVIÇO'}
                </h3>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-[0.4em] font-black">JV AUTOMÓVEIS</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                  <span className="text-[10px] text-cyan-500 uppercase tracking-[0.4em] font-black">SISTEMA INTEGRADO</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="p-3 text-zinc-500 hover:text-white bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-all border border-zinc-700 shadow-lg"
            >
              <X size={24} />
            </button>
          </div>

          {/* Área Principal Workspace */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950 px-8 py-8 lg:px-12">
            <form id="os-form" onSubmit={handleSave} className="w-full max-w-7xl mx-auto space-y-10">
              
              {/* Seção 1: Identificação do Chamado */}
              <section className="bg-zinc-900/40 p-8 rounded-[2rem] border border-zinc-800/50 shadow-xl">
                <div className="flex items-center gap-4 mb-8 border-l-4 border-cyan-500 pl-5">
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-[0.4em]">Triagem e Registro</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Proprietário (Cliente)</label>
                    <select 
                      required
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 font-bold text-base transition-all appearance-none cursor-pointer"
                      value={formData.cliente_id}
                      onChange={e => setFormData(p => ({ ...p, cliente_id: e.target.value, veiculo_id: '' }))}
                    >
                      <option value="">Selecionar Cliente...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Veículo Relacionado</label>
                    <select 
                      required
                      disabled={!formData.cliente_id}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-20 font-bold text-base transition-all appearance-none cursor-pointer"
                      value={formData.veiculo_id}
                      onChange={e => setFormData(p => ({ ...p, veiculo_id: e.target.value }))}
                    >
                      <option value="">Selecionar Veículo...</option>
                      {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} • {v.placa}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Data de Entrada</label>
                    <div className="relative">
                      <Clock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-cyan-500" />
                      <input 
                        type="date" required
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-12 pr-5 py-4 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 font-bold text-base transition-all"
                        value={formData.data_entrada.split('T')[0]}
                        onChange={e => setFormData(p => ({ ...p, data_entrada: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Status Operacional</label>
                    <select 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 font-black uppercase text-xs tracking-widest transition-all cursor-pointer"
                      value={formData.status}
                      onChange={e => setFormData(p => ({ ...p, status: e.target.value as ServiceOrderStatus }))}
                    >
                      {Object.values(ServiceOrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {/* Seção 2: Itens do Orçamento */}
              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-cyan-500/10 rounded-lg">
                      <ShoppingCart size={20} className="text-cyan-500" />
                    </div>
                    <h4 className="text-xs font-black text-zinc-300 uppercase tracking-[0.4em]">Itens de Peças e Serviços</h4>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                        type="button" 
                        onClick={addManualItem}
                        className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-[10px] font-black flex items-center gap-2 transition-all uppercase tracking-widest border border-zinc-700 shadow-md"
                    >
                        <Plus size={16} /> Item Avulso
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setIsServicePickerOpen(true)}
                        className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-[10px] font-black flex items-center gap-2 transition-all uppercase tracking-widest shadow-lg shadow-cyan-900/20"
                    >
                        <Search size={16} /> Buscar Catálogo
                    </button>
                  </div>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800 rounded-[1.5rem] overflow-hidden shadow-xl">
                  <table className="w-full text-left">
                      <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-500 font-black uppercase text-[10px] tracking-widest">
                          <tr>
                              <th className="px-8 py-4">Discriminação Técnica</th>
                              <th className="px-8 py-4 w-32 text-center">Quant.</th>
                              <th className="px-8 py-4 w-44 text-center">Preço Unitário</th>
                              <th className="px-8 py-4 w-48 text-right">Subtotal</th>
                              <th className="px-8 py-4 w-20"></th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                          {formData.servicos.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-zinc-800/10 transition-all">
                                  <td className="px-8 py-5">
                                      {item.servico_id === 'manual' ? (
                                        <input 
                                          autoFocus
                                          type="text"
                                          placeholder="Ex: Óleo de Motor 5w30..."
                                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 font-bold text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                                          value={item.nome_servico}
                                          onChange={(e) => updateItem(idx, { nome_servico: e.target.value })}
                                        />
                                      ) : (
                                        <div className="flex items-center gap-3">
                                          <div className="w-2 h-2 rounded-full bg-cyan-500" />
                                          <span className="font-bold text-zinc-100 text-base">{item.nome_servico}</span>
                                        </div>
                                      )}
                                  </td>
                                  <td className="px-8 py-5">
                                      <input 
                                          type="number" min="1" 
                                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-center font-bold text-base outline-none focus:ring-2 focus:ring-cyan-500 tabular-nums" 
                                          value={item.quantidade} 
                                          onChange={(e) => updateItem(idx, { quantidade: parseInt(e.target.value) || 1 })}
                                      />
                                  </td>
                                  <td className="px-8 py-5 text-center">
                                      <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px] font-black">R$</span>
                                        <input 
                                            type="number" step="0.01"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 font-mono text-center font-bold text-base outline-none focus:ring-2 focus:ring-cyan-500 tabular-nums" 
                                            value={item.preco_unitario} 
                                            onChange={(e) => updateItem(idx, { preco_unitario: parseFloat(e.target.value) || 0 })}
                                        />
                                      </div>
                                  </td>
                                  <td className="px-8 py-5 text-zinc-100 text-right font-mono font-black text-lg tabular-nums">
                                    <span className="text-[10px] text-zinc-600 mr-2 font-sans font-bold">R$</span>
                                    {(Number(item.subtotal) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-8 py-5 text-right">
                                      <button 
                                        type="button" 
                                        onClick={() => removeServiceFromOS(item.id)} 
                                        className="text-zinc-600 hover:text-red-500 transition-all p-2 rounded-lg hover:bg-red-500/10"
                                      >
                                          <Trash2 size={18} />
                                      </button>
                                  </td>
                              </tr>
                          ))}
                          {formData.servicos.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-8 py-24 text-center bg-zinc-950/20">
                                  <div className="flex flex-col items-center gap-4 opacity-10">
                                    <ShoppingCart size={48} className="text-zinc-500" />
                                    <p className="font-black text-zinc-500 uppercase tracking-[0.5em] text-xs">Aguardando Lançamentos</p>
                                  </div>
                                </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
                </div>
              </section>

              {/* Seção 3: Notas Técnicas */}
              <section className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                  <Edit size={16} className="text-zinc-500" />
                  <h4 className="text-xs font-black text-zinc-500 uppercase tracking-[0.4em]">Diagnóstico e Notas do Técnico</h4>
                </div>
                <textarea 
                  rows={4}
                  placeholder="Relato de problemas encontrados, diagnóstico preliminar ou recomendações técnicas..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-[1.5rem] px-8 py-6 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all text-base leading-relaxed placeholder:text-zinc-800 shadow-lg"
                  value={formData.observacoes}
                  onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))}
                />
              </section>
            </form>
          </div>

          {/* RODAPÉ DE CONTROLE (Sticky) - Escala Ajustada */}
          <div className="px-10 py-6 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between flex-shrink-0 z-50 shadow-2xl">
             <div className="flex items-center gap-12">
                <div className="flex flex-col">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">Valor Total Consolidado</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-sm text-zinc-600 font-black">R$</span>
                    <h5 className="text-5xl font-black text-emerald-400 font-mono tracking-tighter leading-none tabular-nums">
                      {(Number(formData.orcamento_total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h5>
                  </div>
                </div>
                <div className="hidden xl:flex flex-col gap-1 border-l border-zinc-800 pl-10">
                  <span className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                    <Zap size={14} className="text-cyan-500" /> Sincronização Ativa
                  </span>
                  <span className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                    <ShieldCheck size={14} className="text-emerald-500" /> Segurança dos Dados JV
                  </span>
                </div>
             </div>
             
             <div className="flex items-center gap-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-6 py-4 text-[10px] font-black text-zinc-500 hover:text-white transition-all uppercase tracking-[0.3em] hover:bg-zinc-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={() => handleSave()}
                  className="px-10 py-5 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-2xl transition-all shadow-xl active:scale-95 uppercase tracking-[0.3em] text-sm flex items-center gap-3"
                >
                  <CheckCircle2 size={20} /> {editingOS ? 'Salvar Registro' : 'Lançar Ordem de Serviço'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Catálogo Workspace AJUSTADO */}
      {isServicePickerOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
              <div className="flex items-center gap-4">
                <Search size={24} className="text-cyan-500" />
                <h4 className="text-lg font-black uppercase tracking-widest text-zinc-100">Catálogo JV</h4>
              </div>
              <button onClick={() => setIsServicePickerOpen(false)} className="text-zinc-500 hover:text-white p-2 hover:bg-zinc-800 rounded-lg transition-all">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 bg-zinc-950/20">
              <input 
                autoFocus
                type="text"
                placeholder="Filtrar serviços..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 font-bold text-base shadow-inner"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
              {filteredCatalog.map(s => (
                <button 
                  key={s.id}
                  onClick={() => addServiceFromCatalog(s)}
                  className="w-full text-left p-5 rounded-xl hover:bg-zinc-800 transition-all flex items-center justify-between border border-transparent hover:border-zinc-700 active:scale-98 group"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 rounded-lg bg-zinc-950 flex items-center justify-center text-zinc-500 group-hover:text-cyan-500 transition-colors border border-zinc-800">
                      <Wrench size={20} />
                    </div>
                    <div>
                      <p className="font-black text-zinc-100 text-base uppercase tracking-tight leading-none">{s.nome}</p>
                      <p className="text-[10px] text-zinc-500 italic mt-2 font-bold opacity-60 line-clamp-1">{s.descricao || 'Serviço técnico padrão.'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-mono font-black text-lg">R$ {s.preco_base?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest mt-1">Selecionar</p>
                  </div>
                </button>
              ))}
              {filteredCatalog.length === 0 && (
                <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4">
                  <AlertCircle size={48} />
                  <p className="text-xs font-black uppercase tracking-widest">Nenhum serviço encontrado</p>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-zinc-950/60 border-t border-zinc-800 text-center">
               <button onClick={() => setIsServicePickerOpen(false)} className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.4em] hover:text-cyan-500 transition-colors">Fechar Catálogo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;
