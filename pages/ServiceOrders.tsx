
import React, { useState, useMemo, useEffect } from 'react';
import { DataTable } from '../components/DataTable';
import { db } from '../services/db';
import { ServiceOrder, ServiceOrderStatus, Service, ServiceOrderItem } from '../types';
// Fixed: Added Users to the constants import list
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
  
  // Sincroniza as ordens ao carregar a página
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente_id || !formData.veiculo_id) {
        showToast("Selecione um cliente e um veículo.", "error");
        return;
    }

    const currentTotal = calculateTotal(formData.servicos);
    const finalData = {
      ...formData,
      orcamento_total: currentTotal
    };

    try {
      if (editingOS) {
        db.updateOrder(editingOS.id, finalData);
        showToast("✅ Ordem de Serviço atualizada com sucesso!", "success");
      } else {
        db.addOrder(finalData);
        showToast("✅ Nova Ordem de Serviço criada e registrada!", "success");
      }
      
      // Força recarregamento da lista
      const latestData = db.getOrders();
      setOrders([...latestData]);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Erro ao salvar OS:", err);
      showToast("Houve um problema ao salvar no banco de dados.", "error");
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
          <div className="py-2">
            <p className="font-extrabold text-zinc-100">{client?.nome || 'Cliente não identificado'}</p>
            <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">{vehicle?.marca} {vehicle?.modelo} • <span className="text-zinc-400 font-mono">{vehicle?.placa}</span></p>
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
      header: 'Total OS', 
      accessor: (o: ServiceOrder) => (
        <span className="font-black text-zinc-100 font-mono text-base">
          R$ {(Number(o.orcamento_total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    { 
      header: 'Ações', 
      accessor: (o: ServiceOrder) => (
        <div className="flex items-center gap-2">
          <button onClick={() => handleOpenModal(o)} className="p-2.5 text-zinc-400 hover:text-cyan-500 hover:bg-zinc-800 rounded-xl transition-all shadow-sm"><Edit size={16} /></button>
          <button onClick={() => confirmDelete(o.id)} className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded-xl transition-all shadow-sm"><Trash2 size={16} /></button>
        </div>
      ),
      className: 'text-right'
    },
  ];

  return (
    <div className="animate-in space-y-6">
      <DataTable 
        title="Controle de Ordens de Serviço"
        data={orders}
        columns={columns}
        onAdd={() => handleOpenModal()}
        addButtonLabel="Nova Ordem de Serviço"
      />

      <AlertDialog 
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        onConfirm={handleDelete}
        title="Confirmar Exclusão?"
        description="Esta ação é definitiva. Todos os dados técnicos e financeiros desta Ordem de Serviço serão excluídos do sistema."
        confirmLabel="Sim, Excluir OS"
        cancelLabel="Voltar"
        variant="danger"
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto flex justify-center items-start sm:items-center p-4 sm:p-8">
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl animate-in fade-in" onClick={() => setIsModalOpen(false)} />
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-6xl rounded-[2.5rem] overflow-hidden relative animate-in zoom-in-95 duration-300 flex flex-col max-h-[92vh] shadow-[0_0_100px_-20px_rgba(0,0,0,0.5)] my-auto border-t-zinc-700">
            {/* Header Amplo */}
            <div className="px-10 py-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50 flex-shrink-0">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-3xl bg-cyan-600/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20 shadow-inner">
                  <ClipboardList size={32} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-3xl font-black tracking-tighter text-zinc-100 uppercase">{editingOS ? `Edição da OS #${editingOS.id}` : 'Abertura de Nova OS'}</h3>
                    {!editingOS && <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-[10px] font-black tracking-widest border border-cyan-500/20 uppercase">Rascunho</span>}
                  </div>
                  <p className="text-xs text-zinc-500 uppercase tracking-[0.3em] font-black mt-1">JV Automóveis • Gestão Inteligente de Oficina</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 text-zinc-500 hover:text-white transition-all bg-zinc-800 hover:bg-zinc-700 rounded-2xl shadow-lg border border-zinc-700"><X size={28} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar">
              <form onSubmit={handleSave} className="p-10 space-y-12">
                
                {/* SEÇÃO 1: DADOS PRINCIPAIS */}
                <section className="space-y-6 animate-in" style={{ animationDelay: '0.1s' }}>
                  <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
                    <Users size={18} className="text-cyan-500" />
                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em]">Informações do Atendimento</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="md:col-span-2 space-y-3">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Proprietário / Cliente</label>
                      <select 
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-bold text-base shadow-inner appearance-none"
                        value={formData.cliente_id}
                        onChange={e => setFormData(prev => ({ ...prev, cliente_id: e.target.value, veiculo_id: '' }))}
                      >
                        <option value="">Clique para buscar cliente...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-3">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Veículo Relacionado</label>
                      <select 
                        required
                        disabled={!formData.cliente_id}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 disabled:opacity-20 transition-all font-bold text-base shadow-inner appearance-none"
                        value={formData.veiculo_id}
                        onChange={e => setFormData(prev => ({ ...prev, veiculo_id: e.target.value }))}
                      >
                        <option value="">Selecione o veículo do cliente...</option>
                        {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} - {v.placa}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-3">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Data de Abertura</label>
                      <div className="relative">
                        <Clock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input 
                          type="date" required
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-14 pr-6 py-5 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-bold"
                          value={formData.data_entrada.split('T')[0]}
                          onChange={e => setFormData(prev => ({ ...prev, data_entrada: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-3">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Status do Processo</label>
                      <div className="relative">
                        <Zap size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <select 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-14 pr-6 py-5 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-black uppercase tracking-[0.1em] appearance-none"
                          value={formData.status}
                          onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as ServiceOrderStatus }))}
                        >
                          {Object.values(ServiceOrderStatus).map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </section>

                {/* SEÇÃO 2: ITENS E ORÇAMENTO */}
                <section className="space-y-6 animate-in" style={{ animationDelay: '0.2s' }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                      <div className="flex items-center gap-3">
                        <ShoppingCart size={18} className="text-emerald-400" />
                        <h4 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em]">Serviços Executados e Peças</h4>
                      </div>
                      <button 
                          type="button" 
                          onClick={() => setIsServicePickerOpen(true)}
                          className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.2rem] text-xs font-black flex items-center gap-3 transition-all shadow-xl shadow-emerald-900/40 uppercase tracking-widest active:scale-95"
                      >
                          <Plus size={18} /> Adicionar Item do Catálogo
                      </button>
                  </div>

                  <div className="bg-zinc-950/40 border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm min-w-[800px]">
                          <thead className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-500 font-black uppercase text-[10px] tracking-[0.2em]">
                              <tr>
                                  <th className="px-10 py-6">Descrição Técnica</th>
                                  <th className="px-10 py-6 w-32 text-center">Quantidade</th>
                                  <th className="px-10 py-6 w-48 text-center">Valor Unitário</th>
                                  <th className="px-10 py-6 w-48 text-right">Subtotal</th>
                                  <th className="px-10 py-6 w-20"></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800">
                              {formData.servicos.map((item, idx) => (
                                  <tr key={item.id} className="hover:bg-zinc-800/20 group transition-colors">
                                      <td className="px-10 py-6">
                                        <div className="flex items-center gap-3">
                                          <div className="w-2 h-2 rounded-full bg-cyan-500" />
                                          <span className="font-extrabold text-zinc-100 text-base">{item.nome_servico}</span>
                                        </div>
                                      </td>
                                      <td className="px-10 py-6">
                                          <input 
                                              type="number" 
                                              min="1" 
                                              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-center font-black text-base outline-none focus:ring-1 focus:ring-cyan-500" 
                                              value={item.quantidade} 
                                              onChange={(e) => updateItem(idx, { quantidade: parseInt(e.target.value) || 1 })}
                                          />
                                      </td>
                                      <td className="px-10 py-6">
                                          <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px] font-black">R$</span>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-12 pr-4 py-3 font-mono text-center font-black text-base outline-none focus:ring-1 focus:ring-cyan-500" 
                                                value={item.preco_unitario} 
                                                onChange={(e) => updateItem(idx, { preco_unitario: parseFloat(e.target.value) || 0 })}
                                            />
                                          </div>
                                      </td>
                                      <td className="px-10 py-6 text-zinc-100 text-right font-mono font-black text-xl">
                                        R$ {(Number(item.subtotal) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="px-10 py-6 text-right">
                                          <button 
                                            type="button" 
                                            onClick={() => removeServiceFromOS(item.id)} 
                                            className="text-zinc-600 hover:text-red-500 transition-all p-3 hover:bg-red-500/10 rounded-2xl"
                                          >
                                              <Trash2 size={22} />
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                              {formData.servicos.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="px-10 py-24 text-center">
                                      <div className="flex flex-col items-center gap-6 text-zinc-800">
                                        <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800/50">
                                          <ShoppingCart size={40} className="opacity-20" />
                                        </div>
                                        <div className="space-y-1">
                                          <p className="font-black text-zinc-600 uppercase tracking-widest text-sm">O orçamento está vazio</p>
                                          <p className="text-xs text-zinc-700 font-medium">Use o botão acima para inserir itens do catálogo</p>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                              )}
                          </tbody>
                          {formData.servicos.length > 0 && (
                            <tfoot>
                                <tr className="bg-zinc-900/80 border-t-2 border-zinc-800">
                                    <td colSpan={3} className="px-10 py-10 text-right text-[11px] font-black text-zinc-500 uppercase tracking-[0.4em]">Resumo Financeiro da OS</td>
                                    <td colSpan={2} className="px-10 py-10 text-emerald-400 text-right font-mono text-4xl font-black tabular-nums">
                                      <span className="text-lg mr-2 opacity-50">R$</span>
                                      {(Number(formData.orcamento_total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                          )}
                      </table>
                    </div>
                  </div>
                </section>

                {/* SEÇÃO 3: OBSERVAÇÕES */}
                <section className="space-y-6 animate-in" style={{ animationDelay: '0.3s' }}>
                  <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
                    <Edit size={18} className="text-zinc-400" />
                    <h4 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em]">Diagnóstico e Notas Adicionais</h4>
                  </div>
                  <textarea 
                    rows={6}
                    placeholder="Descreva aqui o estado do veículo, falhas encontradas, peças externas enviadas pelo cliente ou qualquer observação técnica relevante para o registro histórico..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-[2rem] px-8 py-7 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all placeholder:text-zinc-700 font-medium text-lg leading-relaxed shadow-inner"
                    value={formData.observacoes}
                    onChange={e => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  />
                </section>
                
                {/* Rodapé do Modal */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-6 pt-12 border-t border-zinc-800 flex-shrink-0">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-5 text-sm font-black text-zinc-500 hover:text-zinc-100 transition-colors uppercase tracking-[0.2em]">Descartar Alterações</button>
                  <button type="submit" className="w-full sm:w-auto px-16 py-6 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-[1.5rem] transition-all shadow-2xl shadow-cyan-900/50 active:scale-95 uppercase tracking-[0.2em] text-sm">
                    {editingOS ? 'Confirmar Atualização' : 'Finalizar e Emitir OS'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Catálogo Picker */}
      {isServicePickerOpen && (
        <div className="fixed inset-0 z-[70] overflow-y-auto flex justify-center items-start sm:items-center p-6">
          <div className="absolute inset-0 bg-black/98 backdrop-blur-2xl animate-in fade-in" onClick={() => setIsServicePickerOpen(false)} />
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-3xl rounded-[3rem] overflow-hidden relative animate-in zoom-in-95 duration-200 shadow-2xl flex flex-col max-h-[85vh] my-auto">
            <div className="p-10 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-cyan-500">
                  <Search size={24} />
                </div>
                <h4 className="text-2xl font-black uppercase tracking-widest text-zinc-100">Catálogo de Serviços</h4>
              </div>
              <button onClick={() => setIsServicePickerOpen(false)} className="text-zinc-500 hover:text-white transition-all bg-zinc-800 p-3 rounded-2xl"><X size={24} /></button>
            </div>
            
            <div className="p-8 border-b border-zinc-800 bg-zinc-950/40">
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500" size={24} />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Pesquisar serviço ou peça específica..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-[1.5rem] pl-16 pr-8 py-5 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner text-lg font-bold"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-zinc-950/20 custom-scrollbar">
              {filteredCatalog.length > 0 ? filteredCatalog.map(s => (
                <button 
                  key={s.id}
                  onClick={() => addServiceToOS(s)}
                  className="w-full text-left p-6 rounded-[1.5rem] hover:bg-zinc-800 transition-all flex items-center justify-between group border border-transparent hover:border-zinc-700 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white transition-all shadow-lg">
                      <Wrench size={24} />
                    </div>
                    <div>
                      <p className="font-black text-zinc-100 uppercase text-sm tracking-widest">{s.nome}</p>
                      <p className="text-xs text-zinc-500 line-clamp-1 italic mt-1 font-medium">{s.descricao || 'Sem descrição técnica'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-mono font-black text-lg">R$ {s.preco_base?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] flex items-center justify-end gap-1 mt-2 group-hover:text-cyan-500 transition-colors">
                      <Plus size={10} /> Incluir no Orçamento
                    </p>
                  </div>
                </button>
              )) : (
                <div className="p-20 text-center space-y-4">
                  <Search size={64} className="text-zinc-800 mx-auto" />
                  <p className="text-zinc-500 font-black uppercase tracking-widest text-sm italic">Nenhum item encontrado.</p>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-zinc-800 text-center bg-zinc-950/40">
              <button 
                onClick={() => setIsServicePickerOpen(false)}
                className="text-[11px] font-black text-cyan-500 hover:text-cyan-400 flex items-center justify-center gap-2 mx-auto uppercase tracking-[0.3em] px-10 py-4 bg-cyan-500/5 rounded-2xl border border-cyan-500/10 transition-all hover:bg-cyan-500/10"
              >
                <CheckCircle2 size={18} /> Finalizar Seleção e Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;
