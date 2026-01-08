
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

      {/* MODAL DE OS - TELA CHEIA PROFISSIONAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col animate-in fade-in duration-200">
          
          {/* Header Compacto e Fixo */}
          <div className="px-6 sm:px-10 py-5 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-cyan-600/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20 rounded-xl">
                <ClipboardList size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-100">
                  {editingOS ? `ORDEM DE SERVIÇO #${editingOS.id}` : 'ABERTURA DE NOVA OS'}
                </h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Sistema de Gestão Automotiva • JV 2026</p>
              </div>
            </div>
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-all border border-zinc-700"
            >
              <X size={20} />
            </button>
          </div>

          {/* Área de Conteúdo Scrollable com Densidade Equilibrada */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950/20 p-6 sm:p-10">
            <form id="os-form" onSubmit={handleSave} className="max-w-6xl mx-auto space-y-8">
              
              {/* Seção 1: Dados do Cliente/Veículo */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800/50 shadow-sm">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Cliente</label>
                  <select 
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500 font-semibold text-sm"
                    value={formData.cliente_id}
                    onChange={e => setFormData(p => ({ ...p, cliente_id: e.target.value, veiculo_id: '' }))}
                  >
                    <option value="">Selecionar Cliente...</option>
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
                    <option value="">Selecionar Veículo...</option>
                    {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} • {v.placa}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Data Entrada</label>
                  <input 
                    type="date" required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500 font-semibold text-sm"
                    value={formData.data_entrada.split('T')[0]}
                    onChange={e => setFormData(p => ({ ...p, data_entrada: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Situação</label>
                  <select 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500 font-bold uppercase text-[10px]"
                    value={formData.status}
                    onChange={e => setFormData(p => ({ ...p, status: e.target.value as ServiceOrderStatus }))}
                  >
                    {Object.values(ServiceOrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Seção 2: Tabela de Itens com BOTÕES DE INCLUSÃO */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <ShoppingCart size={14} className="text-cyan-500" /> Detalhamento do Orçamento
                  </h4>
                  <div className="flex items-center gap-3">
                    <button 
                        type="button" 
                        onClick={addManualItem}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-[10px] font-black flex items-center gap-2 transition-all uppercase tracking-widest border border-zinc-700"
                    >
                        <Plus size={14} /> Item Avulso
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setIsServicePickerOpen(true)}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-[10px] font-black flex items-center gap-2 transition-all uppercase tracking-widest shadow-lg"
                    >
                        <Search size={14} /> Buscar no Catálogo
                    </button>
                  </div>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                  <table className="w-full text-left">
                      <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-500 font-black uppercase text-[9px] tracking-widest">
                          <tr>
                              <th className="px-6 py-4">Descrição do Serviço / Peça</th>
                              <th className="px-6 py-4 w-24 text-center">Qtd</th>
                              <th className="px-6 py-4 w-40 text-center">Valor Unitário</th>
                              <th className="px-6 py-4 w-40 text-right">Subtotal</th>
                              <th className="px-6 py-4 w-16"></th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                          {formData.servicos.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-zinc-800/30 transition-all">
                                  <td className="px-6 py-4">
                                      {item.servico_id === 'manual' ? (
                                        <input 
                                          autoFocus
                                          type="text"
                                          placeholder="Digite a descrição..."
                                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 font-bold text-sm outline-none focus:ring-1 focus:ring-cyan-500"
                                          value={item.nome_servico}
                                          onChange={(e) => updateItem(idx, { nome_servico: e.target.value })}
                                        />
                                      ) : (
                                        <span className="font-bold text-zinc-100 text-sm">{item.nome_servico}</span>
                                      )}
                                  </td>
                                  <td className="px-6 py-4">
                                      <input 
                                          type="number" min="1" 
                                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-center font-bold text-sm outline-none focus:ring-1 focus:ring-cyan-500" 
                                          value={item.quantidade} 
                                          onChange={(e) => updateItem(idx, { quantidade: parseInt(e.target.value) || 1 })}
                                      />
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px] font-bold">R$</span>
                                        <input 
                                            type="number" step="0.01"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 font-mono text-center font-bold text-sm outline-none focus:ring-1 focus:ring-cyan-500" 
                                            value={item.preco_unitario} 
                                            onChange={(e) => updateItem(idx, { preco_unitario: parseFloat(e.target.value) || 0 })}
                                        />
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 text-zinc-100 text-right font-mono font-bold text-sm">
                                    R$ {(Number(item.subtotal) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <button 
                                        type="button" 
                                        /* Corrected: Use item.id instead of id */
                                        onClick={() => removeServiceFromOS(item.id)} 
                                        className="text-zinc-600 hover:text-red-500 transition-all p-2 rounded-lg hover:bg-red-500/10"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </td>
                              </tr>
                          ))}
                          {formData.servicos.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-6 py-20 text-center bg-zinc-950/10">
                                  <div className="flex flex-col items-center gap-3 opacity-20">
                                    <ShoppingCart size={32} className="text-zinc-500" />
                                    <p className="font-black text-zinc-500 uppercase tracking-widest text-[9px]">Aguardando inclusão de itens</p>
                                  </div>
                                </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
                </div>
              </div>

              {/* Seção 3: Diagnóstico e Notas */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Edit size={12} className="text-zinc-500" /> Notas Técnicas e Diagnóstico
                </label>
                <textarea 
                  rows={3}
                  placeholder="Descreva observações sobre o veículo, peças pendentes ou detalhes da execução..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all text-sm placeholder:text-zinc-800"
                  value={formData.observacoes}
                  onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))}
                />
              </div>
            </form>
          </div>

          {/* Rodapé Fixo (Sticky Footer) - Visibilidade Total das Ações */}
          <div className="px-8 sm:px-12 py-5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between flex-shrink-0 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
             <div className="flex items-center gap-8">
                <div>
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total do Orçamento</p>
                  <h5 className="text-3xl font-black text-emerald-400 font-mono tracking-tighter flex items-center gap-2">
                    <span className="text-xs opacity-30 font-sans tracking-normal">R$</span>
                    {(Number(formData.orcamento_total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h5>
                </div>
                <div className="hidden lg:flex flex-col gap-0.5 border-l border-zinc-800 pl-8 ml-4">
                  <span className="flex items-center gap-2 text-[9px] font-bold text-zinc-400 uppercase tracking-tight">
                    <Zap size={10} className="text-cyan-500" /> Cálculo em Tempo Real
                  </span>
                  <span className="flex items-center gap-2 text-[9px] font-bold text-zinc-400 uppercase tracking-tight">
                    <ShieldCheck size={10} className="text-emerald-500" /> Protocolo de Segurança 2026
                  </span>
                </div>
             </div>
             <div className="flex items-center gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-6 py-3 text-xs font-black text-zinc-500 hover:text-white transition-all uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={() => handleSave()}
                  className="px-12 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl transition-all shadow-xl shadow-cyan-900/20 active:scale-95 uppercase tracking-widest text-xs"
                >
                  {editingOS ? 'Salvar Alterações' : 'Emitir e Iniciar OS'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Picker de Catálogo Otimizado */}
      {isServicePickerOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[75vh]">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h4 className="text-sm font-black uppercase tracking-widest text-zinc-100 flex items-center gap-3">
                <Search size={16} className="text-cyan-500" /> Selecionar Serviço
              </h4>
              <button onClick={() => setIsServicePickerOpen(false)} className="text-zinc-500 hover:text-white p-2 hover:bg-zinc-800 rounded-lg">
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
              {filteredCatalog.map(s => (
                <button 
                  key={s.id}
                  onClick={() => addServiceFromCatalog(s)}
                  className="w-full text-left p-4 rounded-xl hover:bg-zinc-800 transition-all flex items-center justify-between border border-transparent hover:border-zinc-700 active:scale-95 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-zinc-950 flex items-center justify-center text-zinc-500 group-hover:text-cyan-500">
                      <Wrench size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-zinc-100 text-sm">{s.nome}</p>
                      <p className="text-[10px] text-zinc-500 italic max-w-[200px] truncate">{s.descricao || 'Serviço padrão'}</p>
                    </div>
                  </div>
                  <p className="text-emerald-400 font-mono font-bold text-sm">R$ {s.preco_base?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;
