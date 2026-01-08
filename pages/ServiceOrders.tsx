
import React, { useState, useMemo } from 'react';
import { DataTable } from '../components/DataTable';
import { db } from '../services/db';
import { ServiceOrder, ServiceOrderStatus, Service, ServiceOrderItem } from '../types';
import { Edit, Trash2, X, Plus, Search, ShoppingCart, CheckCircle2, ClipboardList, Wrench } from '../constants';
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
  const [orders, setOrders] = useState<ServiceOrder[]>(db.getOrders());
  const { showToast } = useToast();
  
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
    return items.reduce((sum, item) => sum + (Number(item.preco_unitario) * Number(item.quantidade)), 0);
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
    setFormData({ 
      ...formData, 
      servicos: updatedServices,
      orcamento_total: calculateTotal(updatedServices)
    });
    showToast(`Adicionado: ${service.nome}`, "success");
  };

  const removeServiceFromOS = (id: string) => {
    const updatedServices = formData.servicos.filter(s => s.id !== id);
    setFormData({ 
      ...formData, 
      servicos: updatedServices,
      orcamento_total: calculateTotal(updatedServices)
    });
  };

  const updateItem = (idx: number, updates: Partial<ServiceOrderItem>) => {
    const updated = [...formData.servicos];
    const item = { ...updated[idx], ...updates };
    item.subtotal = Number(item.quantidade) * Number(item.preco_unitario);
    updated[idx] = item;
    setFormData({ ...formData, servicos: updated, orcamento_total: calculateTotal(updated) });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cliente_id || !formData.veiculo_id) {
        showToast("Selecione um cliente e um veículo.", "error");
        return;
    }

    // Garante que o total está atualizado e é numérico antes de salvar
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
        showToast("✅ Nova Ordem de Serviço cadastrada!", "success");
      }
      
      // Força a atualização da lista local
      const updatedOrders = db.getOrders();
      setOrders(updatedOrders);
      setIsModalOpen(false);
    } catch (error) {
      showToast("Erro ao salvar ordem de serviço. Tente novamente.", "error");
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
      showToast("🗑️ Ordem de Serviço removida do sistema.", "info");
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
          <div>
            <p className="font-bold text-zinc-200">{client?.nome || 'N/A'}</p>
            <p className="text-xs text-zinc-500">{vehicle?.modelo} - <span className="uppercase font-mono">{vehicle?.placa}</span></p>
          </div>
        );
      }
    },
    { 
      header: 'Status', 
      accessor: (o: ServiceOrder) => (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusStyles(o.status)}`}>
          {o.status}
        </span>
      )
    },
    { 
      header: 'Faturamento', 
      accessor: (o: ServiceOrder) => (
        <span className="font-black text-zinc-100 font-mono">
          R$ {Number(o.orcamento_total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    { 
      header: 'Ações', 
      accessor: (o: ServiceOrder) => (
        <div className="flex items-center gap-2">
          <button onClick={() => handleOpenModal(o)} title="Editar OS" className="p-2 text-zinc-400 hover:text-cyan-500 hover:bg-zinc-800 rounded-lg transition-all"><Edit size={16} /></button>
          <button onClick={() => confirmDelete(o.id)} title="Excluir OS" className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded-lg transition-all"><Trash2 size={16} /></button>
        </div>
      ),
      className: 'text-right'
    },
  ];

  return (
    <div className="animate-in">
      <DataTable 
        title="Gerenciamento de Ordens"
        data={orders}
        columns={columns}
        onAdd={() => handleOpenModal()}
        addButtonLabel="Abrir Nova OS"
      />

      <AlertDialog 
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        onConfirm={handleDelete}
        title="Deseja excluir esta Ordem?"
        description="Esta ação é permanente e removerá todos os registros financeiros associados a esta OS do banco de dados."
        confirmLabel="Confirmar Exclusão"
        cancelLabel="Voltar"
        variant="danger"
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-5xl rounded-3xl overflow-hidden relative animate-in flex flex-col max-h-[92vh] shadow-2xl">
            {/* Header */}
            <div className="px-8 py-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40 flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-600/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20">
                  <ClipboardList size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">{editingOS ? `ORDEM DE SERVIÇO #${editingOS.id}` : 'ABERTURA DE NOVA OS'}</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black">Preencha os dados do cliente e serviços realizados</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-500 hover:text-white transition-colors bg-zinc-800 rounded-xl"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <form onSubmit={handleSave} className="p-8 space-y-10">
                {/* Seleção de Cliente e Veículo */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Selecione o Cliente</label>
                    <select 
                      required
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-4 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-semibold"
                      value={formData.cliente_id}
                      onChange={e => setFormData({ ...formData, cliente_id: e.target.value, veiculo_id: '' })}
                    >
                      <option value="">Buscar cliente...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Selecione o Veículo</label>
                    <select 
                      required
                      disabled={!formData.cliente_id}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-4 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-30 transition-all font-semibold"
                      value={formData.veiculo_id}
                      onChange={e => setFormData({ ...formData, veiculo_id: e.target.value })}
                    >
                      <option value="">Buscar veículo do cliente...</option>
                      {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.marca} {v.modelo} ({v.placa})</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data de Entrada</label>
                    <input 
                      type="date" required
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-4 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                      value={formData.data_entrada.split('T')[0]}
                      onChange={e => setFormData({ ...formData, data_entrada: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Situação Atual</label>
                    <select 
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-4 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-black uppercase tracking-widest"
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as ServiceOrderStatus })}
                    >
                      {Object.values(ServiceOrderStatus).map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </div>
                </div>

                {/* Itens da OS */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-zinc-950/20 p-4 rounded-2xl border border-zinc-800">
                      <div className="flex items-center gap-3">
                        <ShoppingCart size={20} className="text-cyan-500" />
                        <h4 className="text-xs font-black text-zinc-200 uppercase tracking-[0.2em]">Serviços e Peças Aplicadas</h4>
                      </div>
                      <button 
                          type="button" 
                          onClick={() => setIsServicePickerOpen(true)}
                          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-xl shadow-cyan-900/40"
                      >
                          <Plus size={16} /> ADICIONAR ITEM DO CATÁLOGO
                      </button>
                  </div>

                  <div className="bg-zinc-950/40 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em]">
                              <tr>
                                  <th className="px-8 py-5">Descrição do Item</th>
                                  <th className="px-8 py-5 w-24 text-center">Qtd</th>
                                  <th className="px-8 py-5 w-44 text-center">Valor Unit.</th>
                                  <th className="px-8 py-5 w-44 text-right">Subtotal</th>
                                  <th className="px-8 py-5 w-16"></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800">
                              {formData.servicos.map((item, idx) => (
                                  <tr key={item.id} className="hover:bg-zinc-800/40 group transition-colors">
                                      <td className="px-8 py-5 font-bold text-zinc-100">{item.nome_servico}</td>
                                      <td className="px-8 py-5">
                                          <input 
                                              type="number" 
                                              min="1" 
                                              className="w-full bg-zinc-800 px-3 py-2 rounded-xl border border-zinc-700 focus:border-cyan-500 outline-none text-center font-black" 
                                              value={item.quantidade} 
                                              onChange={(e) => updateItem(idx, { quantidade: parseInt(e.target.value) || 1 })}
                                          />
                                      </td>
                                      <td className="px-8 py-5">
                                          <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px] font-black">R$</span>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                className="w-full bg-zinc-800 pl-8 pr-3 py-2 rounded-xl border border-zinc-700 focus:border-cyan-500 outline-none font-mono text-center font-bold" 
                                                value={item.preco_unitario} 
                                                onChange={(e) => updateItem(idx, { preco_unitario: parseFloat(e.target.value) || 0 })}
                                            />
                                          </div>
                                      </td>
                                      <td className="px-8 py-5 text-zinc-100 text-right font-mono font-black text-lg">
                                        R$ {Number(item.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="px-8 py-5 text-right">
                                          <button 
                                            type="button" 
                                            onClick={() => removeServiceFromOS(item.id)} 
                                            className="text-zinc-600 hover:text-red-500 transition-all p-2 hover:bg-red-500/10 rounded-xl"
                                          >
                                              <Trash2 size={20} />
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                              {formData.servicos.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                      <div className="flex flex-col items-center gap-4 text-zinc-700">
                                        <ShoppingCart size={56} className="opacity-10" />
                                        <p className="italic font-bold text-zinc-500">O orçamento está vazio. Adicione itens para começar.</p>
                                      </div>
                                    </td>
                                  </tr>
                              )}
                          </tbody>
                          {formData.servicos.length > 0 && (
                            <tfoot>
                                <tr className="bg-zinc-900 border-t-2 border-zinc-800">
                                    <td colSpan={3} className="px-8 py-6 text-right text-xs font-black text-zinc-400 uppercase tracking-[0.3em]">Total Acumulado da Ordem</td>
                                    <td colSpan={2} className="px-8 py-6 text-emerald-400 text-right font-mono text-3xl font-black">
                                      R$ {Number(formData.orcamento_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                          )}
                      </table>
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Diagnóstico Técnico / Observações</label>
                  <textarea 
                    rows={4}
                    placeholder="Descreva problemas encontrados, diagnósticos ou instruções para o próximo mecânico..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-3xl px-6 py-5 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 resize-none transition-all placeholder:text-zinc-600 font-medium"
                    value={formData.observacoes}
                    onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                  />
                </div>
                
                {/* Rodapé do Modal */}
                <div className="flex items-center justify-end gap-6 pt-10 border-t border-zinc-800 flex-shrink-0">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-sm font-black text-zinc-500 hover:text-zinc-100 transition-colors uppercase tracking-widest">Descartar</button>
                  <button type="submit" className="px-12 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-2xl transition-all shadow-2xl shadow-cyan-900/50 active:scale-95 uppercase tracking-widest">
                    {editingOS ? 'Salvar Alterações' : 'Finalizar e Gravar OS'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Seletor de Serviços */}
      {isServicePickerOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setIsServicePickerOpen(false)} />
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-[2.5rem] overflow-hidden relative animate-in zoom-in-95 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/20">
              <h4 className="text-xl font-black uppercase tracking-widest">Buscar no Catálogo</h4>
              <button onClick={() => setIsServicePickerOpen(false)} className="text-zinc-500 hover:text-white transition-colors bg-zinc-800 p-2 rounded-xl"><X size={20} /></button>
            </div>
            
            <div className="p-6 border-b border-zinc-800 bg-zinc-950/40">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Pesquise por serviço ou peça..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl pl-14 pr-6 py-4 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-zinc-950/20">
              {filteredCatalog.length > 0 ? filteredCatalog.map(s => (
                <button 
                  key={s.id}
                  onClick={() => addServiceToOS(s)}
                  className="w-full text-left p-5 rounded-2xl hover:bg-zinc-800 transition-all flex items-center justify-between group border border-transparent hover:border-zinc-700 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white transition-all shadow-lg">
                      <Wrench size={22} />
                    </div>
                    <div>
                      <p className="font-black text-zinc-100 uppercase text-xs tracking-wider">{s.nome}</p>
                      <p className="text-xs text-zinc-500 line-clamp-1 italic mt-1">{s.descricao || 'Nenhuma descrição técnica disponível'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-mono font-black text-base">R$ {s.preco_base?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest flex items-center justify-end gap-1 mt-1">
                      <Plus size={10} /> Incluir
                    </p>
                  </div>
                </button>
              )) : (
                <div className="p-16 text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mx-auto text-zinc-800">
                    <Search size={40} />
                  </div>
                  <p className="text-zinc-500 font-bold italic">Nenhum item encontrado para sua busca.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-800 text-center bg-zinc-950/40">
              <button 
                onClick={() => setIsServicePickerOpen(false)}
                className="text-xs font-black text-cyan-500 hover:text-cyan-400 flex items-center justify-center gap-2 mx-auto uppercase tracking-widest px-8 py-3 bg-cyan-500/5 rounded-xl border border-cyan-500/10 transition-all hover:bg-cyan-500/10"
              >
                <CheckCircle2 size={16} /> Finalizar Seleção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;
