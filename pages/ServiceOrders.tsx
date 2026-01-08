
import React, { useState, useMemo, useEffect } from 'react';
import { DataTable } from '../components/DataTable';
import { db } from '../services/db';
import { ServiceOrder, ServiceOrderStatus, Service, ServiceOrderItem } from '../types';
import { Edit, Trash2, X, Plus, Search, ShoppingCart, CheckCircle2, ClipboardList, Wrench, Zap, Clock, Users } from '../constants';
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
    showToast(`"${service.nome}" adicionado com sucesso!`, "success");
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
        showToast("Por favor, selecione cliente e veículo antes de salvar.", "error");
        return;
    }

    try {
      if (editingOS) {
        db.updateOrder(editingOS.id, formData);
        showToast("✅ OS atualizada!", "success");
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
          <div className="py-3">
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
      header: 'Faturamento', 
      accessor: (o: ServiceOrder) => (
        <span className="font-black text-zinc-100 font-mono text-lg">
          R$ {(Number(o.orcamento_total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    { 
      header: 'Ações', 
      accessor: (o: ServiceOrder) => (
        <div className="flex items-center gap-3">
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
        title="Gestão de Ordens de Serviço"
        data={orders}
        columns={columns}
        onAdd={() => handleOpenModal()}
        addButtonLabel="Abrir Nova OS"
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-6 overflow-hidden">
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl animate-in fade-in" onClick={() => setIsModalOpen(false)} />
          <div className="bg-zinc-900 border border-zinc-800 w-[98%] max-w-[1600px] rounded-[2.5rem] overflow-hidden relative animate-in zoom-in-95 duration-300 flex flex-col h-[95vh] shadow-[0_0_120px_-20px_rgba(0,0,0,0.8)] border-t-zinc-700">
            
            {/* Header Amplo */}
            <div className="px-10 py-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 flex-shrink-0">
              <div className="flex items-center gap-8">
                <div className="w-16 h-16 rounded-[1.5rem] bg-cyan-600/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20 shadow-lg">
                  <ClipboardList size={34} />
                </div>
                <div>
                  <div className="flex items-center gap-4">
                    <h3 className="text-4xl font-black tracking-tighter text-zinc-100 uppercase leading-none">
                      {editingOS ? `ORDEM DE SERVIÇO #${editingOS.id}` : 'ABERTURA DE NOVA OS'}
                    </h3>
                    <span className="px-4 py-1.5 bg-cyan-500/10 text-cyan-400 rounded-full text-[11px] font-black tracking-[0.2em] border border-cyan-500/20 uppercase">Rascunho Técnico</span>
                  </div>
                  <p className="text-xs text-zinc-500 uppercase tracking-[0.4em] font-bold mt-2">JV Automóveis • Gestão Inteligente de Processos</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-4 text-zinc-500 hover:text-white transition-all bg-zinc-800 hover:bg-red-600 rounded-2xl shadow-xl border border-zinc-700"
              >
                <X size={32} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950/20">
              <form onSubmit={handleSave} className="p-10 space-y-16 max-w-[1500px] mx-auto">
                
                {/* DADOS PRINCIPAIS EM LINHA */}
                <section className="bg-zinc-900/40 p-10 rounded-[2rem] border border-zinc-800/50 shadow-inner">
                  <div className="flex items-center gap-3 mb-8">
                    <Users size={20} className="text-cyan-500" />
                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em]">Dados do Atendimento</h4>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Proprietário</label>
                      <select 
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/50 font-bold text-lg shadow-xl"
                        value={formData.cliente_id}
                        onChange={e => setFormData(p => ({ ...p, cliente_id: e.target.value, veiculo_id: '' }))}
                      >
                        <option value="">Selecione o Cliente</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Veículo</label>
                      <select 
                        required
                        disabled={!formData.cliente_id}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-20 font-bold text-lg shadow-xl"
                        value={formData.veiculo_id}
                        onChange={e => setFormData(p => ({ ...p, veiculo_id: e.target.value }))}
                      >
                        <option value="">Selecione o Veículo</option>
                        {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} ({v.placa})</option>)}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Data de Entrada</label>
                      <input 
                        type="date" required
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/50 font-bold text-lg shadow-xl"
                        value={formData.data_entrada.split('T')[0]}
                        onChange={e => setFormData(p => ({ ...p, data_entrada: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Status Operacional</label>
                      <select 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/50 font-black uppercase tracking-wider text-sm shadow-xl"
                        value={formData.status}
                        onChange={e => setFormData(p => ({ ...p, status: e.target.value as ServiceOrderStatus }))}
                      >
                        {Object.values(ServiceOrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </section>

                {/* ITENS DO ORÇAMENTO - TABELA LARGA */}
                <section className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                        <ShoppingCart size={24} />
                      </div>
                      <h4 className="text-xl font-black text-zinc-100 uppercase tracking-widest">Discriminação de Serviços e Peças</h4>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => setIsServicePickerOpen(true)}
                        className="px-10 py-5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-[1.5rem] text-sm font-black flex items-center gap-4 transition-all shadow-2xl shadow-cyan-900/40 uppercase tracking-[0.1em]"
                    >
                        <Plus size={22} /> Incluir Item do Catálogo
                    </button>
                  </div>

                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-500 font-black uppercase text-[11px] tracking-[0.3em]">
                            <tr>
                                <th className="px-12 py-8">Descrição Técnica</th>
                                <th className="px-12 py-8 w-40 text-center">Quantidade</th>
                                <th className="px-12 py-8 w-64 text-center">Valor Unitário</th>
                                <th className="px-12 py-8 w-64 text-right">Subtotal</th>
                                <th className="px-12 py-8 w-24"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {formData.servicos.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-zinc-800/30 group transition-colors">
                                    <td className="px-12 py-8">
                                      <div className="flex items-center gap-4">
                                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                                        <span className="font-extrabold text-zinc-100 text-xl tracking-tight">{item.nome_servico}</span>
                                      </div>
                                    </td>
                                    <td className="px-12 py-8">
                                        <input 
                                            type="number" min="1" 
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-center font-black text-xl outline-none focus:ring-2 focus:ring-cyan-500/40" 
                                            value={item.quantidade} 
                                            onChange={(e) => updateItem(idx, { quantidade: parseInt(e.target.value) || 1 })}
                                        />
                                    </td>
                                    <td className="px-12 py-8">
                                        <div className="relative">
                                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 font-black text-xs uppercase">R$</span>
                                          <input 
                                              type="number" step="0.01"
                                              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-16 pr-6 py-4 font-mono text-center font-black text-xl outline-none focus:ring-2 focus:ring-cyan-500/40" 
                                              value={item.preco_unitario} 
                                              onChange={(e) => updateItem(idx, { preco_unitario: parseFloat(e.target.value) || 0 })}
                                          />
                                        </div>
                                    </td>
                                    <td className="px-12 py-8 text-zinc-100 text-right font-mono font-black text-2xl">
                                      R$ {(Number(item.subtotal) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-12 py-8 text-right">
                                        <button 
                                          type="button" 
                                          onClick={() => removeServiceFromOS(item.id)} 
                                          className="text-zinc-600 hover:text-red-500 transition-all p-4 hover:bg-red-500/10 rounded-[1.2rem]"
                                        >
                                            <Trash2 size={26} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {formData.servicos.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="px-12 py-32 text-center bg-zinc-950/10">
                                    <div className="flex flex-col items-center gap-8">
                                      <div className="w-24 h-24 rounded-[2rem] bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                        <ShoppingCart size={48} className="text-zinc-800" />
                                      </div>
                                      <div className="space-y-2">
                                        <p className="font-black text-zinc-500 uppercase tracking-[0.4em] text-sm">O orçamento está vazio</p>
                                        <p className="text-zinc-700 font-bold">Clique em "Adicionar Item" para iniciar o registro técnico.</p>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                  </div>

                  {/* BOX DE TOTAL GERAL EM DESTAQUE */}
                  {formData.servicos.length > 0 && (
                    <div className="flex justify-end animate-in">
                      <div className="bg-zinc-900 border-2 border-zinc-800 p-10 rounded-[2.5rem] flex items-center gap-12 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
                        <div className="text-right">
                          <p className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.5em] mb-2">Total Consolidado da Ordem</p>
                          <h5 className="text-6xl font-black text-emerald-400 font-mono tracking-tighter flex items-end justify-end gap-3">
                            <span className="text-2xl mb-2 opacity-40">R$</span>
                            {(Number(formData.orcamento_total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </h5>
                        </div>
                        <div className="w-px h-16 bg-zinc-800" />
                        <div className="flex flex-col gap-2">
                          <span className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                            <CheckCircle2 size={16} className="text-emerald-500" /> Itens validados
                          </span>
                          <span className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                            <Zap size={16} className="text-cyan-500" /> Cálculo em tempo real
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                {/* NOTAS E DIAGNÓSTICO */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Edit size={20} className="text-zinc-500" />
                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em]">Notas e Diagnóstico Técnico</h4>
                  </div>
                  <textarea 
                    rows={6}
                    placeholder="Insira detalhes técnicos, diagnósticos, peças trazidas pelo cliente ou qualquer observação relevante para o histórico deste veículo..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-[2.5rem] px-10 py-8 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-medium text-xl leading-relaxed shadow-inner placeholder:text-zinc-800"
                    value={formData.observacoes}
                    onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))}
                  />
                </section>
                
                {/* BOTÕES DE AÇÃO RODAPÉ */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-8 pt-12 border-t border-zinc-800">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-10 py-6 text-sm font-black text-zinc-500 hover:text-white transition-all uppercase tracking-[0.3em]"
                  >
                    Descartar Rascunho
                  </button>
                  <button 
                    type="submit" 
                    className="w-full sm:w-auto px-20 py-8 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-[2rem] transition-all shadow-[0_15px_40px_-10px_rgba(6,182,212,0.4)] active:scale-[0.97] uppercase tracking-[0.2em] text-lg"
                  >
                    {editingOS ? 'Confirmar Atualizações' : 'Gravar e Emitir OS'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CATÁLOGO DE SERVIÇOS (PICKER) */}
      {isServicePickerOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl animate-in fade-in" onClick={() => setIsServicePickerOpen(false)} />
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl rounded-[3rem] overflow-hidden relative animate-in zoom-in-95 duration-200 shadow-2xl flex flex-col max-h-[85vh] my-auto">
            <div className="p-10 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-cyan-500 shadow-xl">
                  <Search size={28} />
                </div>
                <h4 className="text-3xl font-black uppercase tracking-widest text-zinc-100">Selecionar do Catálogo</h4>
              </div>
              <button onClick={() => setIsServicePickerOpen(false)} className="text-zinc-500 hover:text-white transition-all bg-zinc-800 p-3 rounded-2xl border border-zinc-700"><X size={28} /></button>
            </div>
            
            <div className="p-10 border-b border-zinc-800 bg-zinc-950/60">
              <div className="relative">
                <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-zinc-500" size={28} />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Pesquisar por nome do serviço ou palavra-chave..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-[2rem] pl-20 pr-10 py-6 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 font-bold text-xl shadow-inner"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-zinc-950/10 custom-scrollbar">
              {filteredCatalog.length > 0 ? filteredCatalog.map(s => (
                <button 
                  key={s.id}
                  onClick={() => addServiceToOS(s)}
                  className="w-full text-left p-8 rounded-[2rem] hover:bg-zinc-800 transition-all flex items-center justify-between group border border-transparent hover:border-zinc-700 active:scale-[0.98] shadow-lg"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white transition-all">
                      <Wrench size={28} />
                    </div>
                    <div>
                      <p className="font-black text-zinc-100 uppercase text-lg tracking-wider">{s.nome}</p>
                      <p className="text-sm text-zinc-500 line-clamp-1 italic mt-1">{s.descricao || 'Sem descrição cadastrada'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-mono font-black text-2xl">R$ {s.preco_base?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em] flex items-center justify-end gap-2 mt-2 group-hover:text-cyan-500 transition-colors">
                      <Plus size={12} /> Adicionar
                    </p>
                  </div>
                </button>
              )) : (
                <div className="p-20 text-center">
                  <p className="text-zinc-500 font-black uppercase tracking-widest text-lg italic">Nenhum serviço disponível.</p>
                </div>
              )}
            </div>

            <div className="p-10 border-t border-zinc-800 text-center bg-zinc-950/40">
              <button 
                onClick={() => setIsServicePickerOpen(false)}
                className="text-[12px] font-black text-cyan-500 hover:text-cyan-400 flex items-center justify-center gap-3 mx-auto uppercase tracking-[0.4em] px-12 py-5 bg-cyan-500/5 rounded-[1.5rem] border border-cyan-500/10 transition-all"
              >
                <CheckCircle2 size={20} /> Concluir Seleção e Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;
