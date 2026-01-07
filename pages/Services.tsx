
import React, { useState } from 'react';
import { DataTable } from '../components/DataTable';
import { db } from '../services/db';
import { Service } from '../types';
import { Edit, Trash2, X, Wrench } from '../constants';

const Services: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [services, setServices] = useState<Service[]>(db.getServices());

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco_base: 0
  });

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        nome: service.nome,
        descricao: service.descricao || '',
        preco_base: service.preco_base || 0
      });
    } else {
      setEditingService(null);
      setFormData({ nome: '', descricao: '', preco_base: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      db.updateService(editingService.id, formData);
    } else {
      db.addService({ ...formData, user_id: 'u1' });
    }
    setServices(db.getServices());
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja remover este serviço do catálogo?')) {
      db.deleteService(id);
      setServices(db.getServices());
    }
  };

  const columns = [
    { 
      header: 'Serviço', 
      accessor: (s: Service) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-cyan-500">
            <Wrench size={14} />
          </div>
          <span className="font-semibold">{s.nome}</span>
        </div>
      )
    },
    { header: 'Descrição', accessor: 'descricao' as const, className: 'hidden sm:table-cell text-zinc-500 italic max-w-xs truncate' },
    { 
      header: 'Preço Sugerido', 
      accessor: (s: Service) => (
        <span className="font-medium text-emerald-400">
          R$ {s.preco_base?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    { 
      header: 'Ações', 
      accessor: (s: Service) => (
        <div className="flex items-center gap-2">
          <button onClick={() => handleOpenModal(s)} className="p-2 text-zinc-400 hover:text-cyan-500 hover:bg-zinc-800 rounded-lg"><Edit size={16} /></button>
          <button onClick={() => handleDelete(s.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded-lg"><Trash2 size={16} /></button>
        </div>
      ),
      className: 'text-right'
    },
  ];

  return (
    <div className="animate-in">
      <DataTable 
        title="Catálogo de Serviços"
        data={services}
        columns={columns}
        onAdd={() => handleOpenModal()}
        addButtonLabel="Novo Serviço"
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-2xl overflow-hidden relative animate-in">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-xl font-bold">{editingService ? 'Editar Serviço' : 'Novo Serviço'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase">Nome do Serviço</label>
                <input 
                  type="text" required placeholder="Ex: Troca de Óleo 10w40"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500"
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase">Preço Base Sugerido (R$)</label>
                <input 
                  type="number" step="0.01" required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500"
                  value={formData.preco_base}
                  onChange={e => setFormData({ ...formData, preco_base: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase">Descrição Técnica</label>
                <textarea 
                  rows={4}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
                  value={formData.descricao}
                  onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                />
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-zinc-400 hover:text-zinc-100">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all">
                  {editingService ? 'Salvar Serviço' : 'Adicionar ao Catálogo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
