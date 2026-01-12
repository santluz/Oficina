
import React, { useState, useMemo, useEffect } from 'react';
import { DataTable } from '../components/DataTable';
import { db } from '../services/db';
import { ServiceOrder, ServiceOrderStatus, Service, ServiceOrderItem } from '../types';
import { 
  Edit, Trash2, X, Plus, Search, ShoppingCart, 
  CheckCircle2, ClipboardList, Wrench, Zap, 
  Clock, Users, AlertCircle, ShieldCheck, Eye 
} from '../constants';
import { getStatusStyles } from './Dashboard';
import { useToast } from '../components/Toast';
import { AlertDialog } from '../components/AlertDialog';

const ServiceOrders: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isServicePickerOpen, setIsServicePickerOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [editingOS, setEditingOS] = useState<ServiceOrder | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const { showToast } = useToast();
  
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isModalOpen]);

  useEffect(() => {
    setOrders(db.getOrders());
  }, []);

  const clients = db.getClients();
  const allVehicles = db.getVehicles();
  const catalogServices = db.getServices();

  // Fix: Added filteredCatalog memoized variable to support search in service picker
  const filteredCatalog = useMemo(() => {
    return catalogServices.filter(s => 
      s.nome.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      (s.descricao && s.descricao.toLowerCase().includes(serviceSearch.toLowerCase()))
    );
  }, [catalogServices, serviceSearch]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Função para converter string do input (com vírgula) em número
  const parseInputValue = (val: string): number => {
    const cleanVal = val.replace(',', '.');
    const parsed = parseFloat(cleanVal);
    return isNaN(parsed) ? 0 : parsed;
  };

  const calculateTotal = (items: ServiceOrderItem[]): number => {
    return items.reduce((sum, item) => {
      const preco = Number(item.preco_unitario) || 0;
      const qtd = Number(item.quantidade) || 0;
      return sum + (preco * qtd);
    }, 0);
  };

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

  const handleOpenModal = (order?: ServiceOrder, viewOnly: boolean = false) => {
    setIsViewMode(viewOnly);
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
    if (isViewMode) return;
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
    if (isViewMode) return;
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
    if (isViewMode) return;
    const updatedServices = formData.servicos.filter(s => s.id !== id);
    setFormData(prev => ({ 
      ...prev, 
      servicos: updatedServices,
      orcamento_total: calculateTotal(updatedServices)
    }));
  };

  const updateItem = (idx: number, updates: Partial<ServiceOrderItem>) => {
    if (isViewMode) return;
    const updated = [...formData.servicos];
    const item = { ...updated[idx], ...updates };
    
    // Garantir que preco e quantidade sejam números
    const preco = Number(item.preco_unitario) || 0;
    const qtd = Number(item.quantidade) || 0;
    
    item.subtotal = Number((preco * qtd).toFixed(2));
    updated[idx] = item;
    
    const newTotal = calculateTotal(updated);
    
    setFormData(prev => ({ 
      ...prev, 
      servicos: updated, 
      orcamento_total: newTotal 
    }));
  };

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isViewMode) return;
    if (!formData.cliente_id || !formData.veiculo_id) {
        showToast("Selecione o cliente e o veículo.", "error");
        return;
    }

    try {
      if (editingOS) {
        db.updateOrder(editingOS.id, formData);
        showToast("OS Atualizada com sucesso!", "success");
      } else {
        db.addOrder(formData);
        showToast("OS Gerada com sucesso!", "success");
      }
      setOrders(db.getOrders());
      setIsModalOpen(false);
    } catch (err) {
      showToast("Falha ao salvar a Ordem de Serviço.", "error");
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
      showToast("Ordem de serviço excluída.", "info");
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
            <p className="text-[10px] text-zinc-500 uppercase font-mono">{vehicle?.marca} {vehicle?.modelo} ({vehicle?.placa})</p>
          </div>
        );
      }
    },
    { 
      header: 'Status', 
      accessor: (o: ServiceOrder) => (
        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase border tracking-widest ${getStatusStyles(o.status)}`}>
          {o.status}
        </span>
      )
    },
    { 
      header: 'Total Geral', 
      accessor: (o: ServiceOrder) => (
        <span className="font-bold text-zinc-100 font-mono">
          {formatCurrency(o.orcamento_total)}
        </span>
      )
    },
    { 
      header: 'Gerenciar', 
      accessor: (o: ServiceOrder) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => handleOpenModal(o, true)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all" title="Consultar Conteúdo"><Eye size={16} /></button>
          <button onClick={() => handleOpenModal(o)} className="p-2 text-zinc-400 hover:text-cyan-500 hover:bg-zinc-800 rounded-lg transition-all"><Edit size={16} /></button>
          <button onClick={() => confirmDelete(o.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded-lg transition-all"><Trash2 size={16} /></button>
        </div>
      ),
      className: 'text-right'
    },
  ];

  const currentClientName = clients.find(c => c.id === formData.cliente_id)?.nome || 'Não Selecionado';
  const currentVehicleInfo = allVehicles.find(v => v.id === formData.veiculo_id);

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
        title="Excluir Ordem de Serviço?"
        description="Esta ação removerá permanentemente o histórico técnico e financeiro."
        confirmLabel="Excluir Agora"
        variant="danger"
      />

      {/* WORKSPACE DE GESTÃO DA OS - FULL SCREEN COM SCROLL CORRIGIDO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col animate-in fade-in duration-200">
          
          {/* Header Workspace (Sempre no topo) */}
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between shadow-xl flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-cyan-600/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20 rounded-lg">
                <ClipboardList size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-zinc-100 uppercase tracking-tight">
                  {isViewMode ? 'Consulta de Ordem de Serviço' : editingOS ? 'Edição de Ordem de Serviço' : 'Abertura de Chamado'}
                  <span className="ml-3 text-cyan-500 font-mono">#{editingOS?.id || 'NOVA'}</span>
                </h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Centro de Operações JV Automóveis</p>
              </div>
            </div>
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="p-2 text-zinc-500 hover:text-white bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-all border border-zinc-700"
            >
              <X size={20} />
            </button>
          </div>

          {/* Área de Scroll Principal */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950 px-4 py-8 lg:px-10">
            <div className="max-w-6xl mx-auto space-y-8 pb-10">
              
              {/* Seção 1: Identificação do Chamado */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 flex flex-col justify-between shadow-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <Users size={18} className="text-cyan-500" />
                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Identificação da Unidade</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Proprietário</label>
                      {isViewMode ? (
                        <p className="text-lg font-bold text-zinc-100">{currentClientName}</p>
                      ) : (
                        <select 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 font-bold transition-all"
                          value={formData.cliente_id}
                          onChange={e => setFormData(p => ({ ...p, cliente_id: e.target.value, veiculo_id: '' }))}
                        >
                          <option value="">Selecione...</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Veículo Vinculado</label>
                      {isViewMode ? (
                        <p className="text-lg font-bold text-zinc-100">
                          {currentVehicleInfo ? `${currentVehicleInfo.marca} ${currentVehicleInfo.modelo} (${currentVehicleInfo.placa})` : '---'}
                        </p>
                      ) : (
                        <select 
                          disabled={!formData.cliente_id}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-20 font-bold transition-all"
                          value={formData.veiculo_id}
                          onChange={e => setFormData(p => ({ ...p, veiculo_id: e.target.value }))}
                        >
                          <option value="">Selecione...</option>
                          {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} • {v.placa}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 shadow-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <Clock size={18} className="text-cyan-500" />
                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Controle Operacional</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data de Registro</label>
                      <input 
                        type="date" disabled={isViewMode}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 font-bold disabled:opacity-50 transition-all"
                        value={formData.data_entrada.split('T')[0]}
                        onChange={e => setFormData(p => ({ ...p, data_entrada: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status de Execução</label>
                      <select 
                        disabled={isViewMode}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 font-black uppercase text-[10px] tracking-widest transition-all"
                        value={formData.status}
                        onChange={e => setFormData(p => ({ ...p, status: e.target.value as ServiceOrderStatus }))}
                      >
                        {Object.values(ServiceOrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 2: Detalhamento de Itens */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <ShoppingCart size={20} className="text-cyan-500" />
                    <h4 className="text-xs font-black text-zinc-300 uppercase tracking-[0.4em]">Serviços e Peças Aplicadas</h4>
                  </div>
                  {!isViewMode && (
                    <div className="flex items-center gap-3">
                      <button 
                          type="button" onClick={addManualItem}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-black flex items-center gap-2 transition-all uppercase tracking-widest border border-zinc-700"
                      >
                          <Plus size={14} /> Item Manual
                      </button>
                      <button 
                          type="button" onClick={() => setIsServicePickerOpen(true)}
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-black flex items-center gap-2 transition-all uppercase tracking-widest shadow-lg shadow-cyan-900/10"
                      >
                          <Search size={14} /> Catálogo JV
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-x-auto custom-scrollbar shadow-xl">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-zinc-950 sticky top-0 z-10 border-b border-zinc-800 text-zinc-500 font-black uppercase text-[10px] tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Descrição do Lançamento</th>
                        <th className="px-6 py-4 w-24 text-center">Quant.</th>
                        <th className="px-6 py-4 w-40 text-center">Valor Unit. (R$)</th>
                        <th className="px-6 py-4 w-44 text-right">Subtotal</th>
                        {!isViewMode && <th className="px-6 py-4 w-16"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {formData.servicos.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-zinc-800/20 transition-all">
                          <td className="px-6 py-4">
                            {!isViewMode && item.servico_id === 'manual' ? (
                              <input 
                                autoFocus
                                type="text" placeholder="Nome da peça ou mão de obra..."
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 font-bold text-sm outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                                value={item.nome_servico}
                                onChange={(e) => updateItem(idx, { nome_servico: e.target.value })}
                              />
                            ) : (
                              <div className="flex items-center gap-2 py-1">
                                <div className="w-2 h-2 rounded-full bg-cyan-500/50" />
                                <span className="font-bold text-zinc-100 text-sm">{item.nome_servico}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isViewMode ? (
                              <span className="font-bold text-zinc-300">{item.quantidade}</span>
                            ) : (
                              <input 
                                type="number" min="1"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-center font-bold text-sm outline-none focus:ring-1 focus:ring-cyan-500 tabular-nums transition-all"
                                value={item.quantidade}
                                onChange={(e) => updateItem(idx, { quantidade: parseInt(e.target.value) || 1 })}
                              />
                            )}
                          </td>
                          <td className="px-6 py-4 text-center font-mono">
                            {isViewMode ? (
                              <span className="text-zinc-300">{formatCurrency(item.preco_unitario)}</span>
                            ) : (
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px] font-black uppercase">R$</span>
                                <input 
                                  type="text"
                                  placeholder="0,00"
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-center font-bold text-sm outline-none focus:ring-1 focus:ring-cyan-500 tabular-nums transition-all"
                                  value={String(item.preco_unitario).replace('.', ',')}
                                  onChange={(e) => updateItem(idx, { preco_unitario: parseInputValue(e.target.value) })}
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-black text-zinc-100 text-base">
                            {formatCurrency(item.subtotal)}
                          </td>
                          {!isViewMode && (
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => removeServiceFromOS(item.id)} className="text-zinc-600 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-all active:scale-90">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {formData.servicos.length === 0 && (
                        <tr>
                          <td colSpan={isViewMode ? 4 : 5} className="px-6 py-24 text-center text-zinc-600 italic text-sm bg-zinc-950/20">
                            <div className="flex flex-col items-center gap-3 opacity-30">
                              <ShoppingCart size={40} />
                              <p>Aguardando lançamentos técnicos.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Seção 3: Notas Técnicas */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-2">
                  <Edit size={16} className="text-zinc-500" />
                  <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Diagnóstico e Notas do Mecânico</h4>
                </div>
                {isViewMode ? (
                  <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-zinc-300 text-sm leading-relaxed min-h-[120px] shadow-lg whitespace-pre-wrap">
                    {formData.observacoes || 'Nenhum registro adicional.'}
                  </div>
                ) : (
                  <textarea 
                    rows={5}
                    placeholder="Descreva problemas relatados, diagnósticos e peças que necessitam de atenção futura..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all text-sm leading-relaxed shadow-lg resize-none"
                    value={formData.observacoes}
                    onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Footer Workspace (Travado na base) */}
          <div className="px-6 py-6 lg:px-10 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between shadow-2xl flex-shrink-0 z-50">
            <div className="flex items-center gap-10">
              <div className="flex flex-col">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">TOTAL CONSOLIDADO</p>
                <div className="flex items-baseline gap-2">
                  <h5 className="text-3xl lg:text-4xl font-black text-emerald-400 font-mono tracking-tighter leading-none tabular-nums">
                    {formatCurrency(formData.orcamento_total)}
                  </h5>
                </div>
              </div>
              <div className="hidden xl:flex flex-col gap-1 border-l border-zinc-800 pl-10 opacity-30">
                <span className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                  <Zap size={14} className="text-cyan-500" /> Sincronização JV Ativa
                </span>
                <span className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                  <ShieldCheck size={14} className="text-emerald-500" /> Banco de Dados Seguro
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                type="button" onClick={() => setIsModalOpen(false)} 
                className="px-6 py-3 text-[10px] font-black text-zinc-500 hover:text-white transition-all uppercase tracking-widest hover:bg-zinc-800 rounded-xl"
              >
                {isViewMode ? 'Fechar Consulta' : 'Cancelar Operação'}
              </button>
              {!isViewMode && (
                <button 
                  type="button" onClick={() => handleSave()}
                  className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl transition-all shadow-xl active:scale-95 uppercase tracking-widest text-xs flex items-center gap-3"
                >
                  <CheckCircle2 size={18} /> {editingOS ? 'Salvar Registro' : 'Lançar Ordem de Serviço'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Catálogo Workspace */}
      {isServicePickerOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
              <div className="flex items-center gap-3">
                <Search size={20} className="text-cyan-500" />
                <h4 className="text-sm font-black uppercase tracking-widest text-zinc-100">Catálogo de Serviços JV</h4>
              </div>
              <button onClick={() => setIsServicePickerOpen(false)} className="text-zinc-500 hover:text-white p-2 hover:bg-zinc-800 rounded-lg transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 bg-zinc-950/20 border-b border-zinc-800">
              <input 
                autoFocus
                type="text" placeholder="Filtrar por nome do serviço..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 font-bold transition-all"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {filteredCatalog.map(s => (
                <button 
                  key={s.id}
                  onClick={() => addServiceFromCatalog(s)}
                  className="w-full text-left p-4 rounded-xl hover:bg-zinc-800 transition-all flex items-center justify-between border border-transparent hover:border-zinc-700 active:scale-98 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center text-zinc-500 group-hover:text-cyan-500 border border-zinc-800 shadow-inner transition-colors">
                      <Wrench size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-zinc-100 text-sm">{s.nome}</p>
                      <p className="text-[10px] text-zinc-500 italic line-clamp-1 opacity-70">R$ {Number(s.preco_base).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-mono font-bold">R$ {Number(s.preco_base).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest mt-1 group-hover:text-cyan-500">Selecionar</p>
                  </div>
                </button>
              ))}
              {filteredCatalog.length === 0 && (
                <div className="text-center py-12 opacity-20">
                  <p className="text-sm italic">Nenhum serviço correspondente.</p>
                </div>
              )}
            </div>
            <div className="p-4 bg-zinc-950/40 border-t border-zinc-800 text-center">
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Lançamento de itens vinculados ao orçamento</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;
