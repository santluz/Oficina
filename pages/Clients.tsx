
import React, { useState } from 'react';
import { DataTable } from '../components/DataTable';
import { db } from '../services/db';
import { Client } from '../types';
import { Edit, Trash2, X } from '../constants';
import { useToast } from '../components/Toast';

const Clients: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>(db.getClients());
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    endereco: ''
  });

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        nome: client.nome,
        telefone: client.telefone || '',
        email: client.email || '',
        endereco: client.endereco || ''
      });
    } else {
      setEditingClient(null);
      setFormData({ nome: '', telefone: '', email: '', endereco: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      db.updateClient(editingClient.id, formData);
      showToast("✅ Cliente atualizado!", "success");
    } else {
      db.addClient({ ...formData, user_id: 'u1' });
      showToast("✅ Cliente criado com sucesso!", "success");
    }
    setClients(db.getClients());
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Esta ação não pode ser desfeita. O cliente será permanentemente removido. Tem certeza?')) {
      db.deleteClient(id);
      setClients(db.getClients());
      showToast("🗑️ Cliente removido.", "info");
    }
  };

  const columns = [
    { header: 'Nome', accessor: 'nome' as const, className: 'font-bold text-zinc-200' },
    { header: 'Telefone', accessor: 'telefone' as const, className: 'font-medium' },
    { header: 'E-mail', accessor: 'email' as const, className: 'hidden md:table-cell text-zinc-400' },
    { header: 'Endereço', accessor: 'endereco' as const, className: 'hidden lg:table-cell max-w-xs truncate text-zinc-500 italic' },
    { 
      header: 'Ações', 
      accessor: (client: Client) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleOpenModal(client)}
            className="p-2 text-zinc-400 hover:text-cyan-500 hover:bg-zinc-800 rounded-xl transition-all"
          >
            <Edit size={16} />
          </button>
          <button 
            onClick={() => handleDelete(client.id)}
            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded-xl transition-all"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
      className: 'text-right'
    },
  ];

  return (
    <div className="animate-in space-y-6">
      <DataTable 
        title="Gerenciar Clientes"
        data={clients}
        columns={columns}
        onAdd={() => handleOpenModal()}
        addButtonLabel="Novo Cliente"
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden relative animate-in shadow-2xl">
            <div className="px-8 py-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-xl font-black tracking-tight">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Nome Completo</label>
                <input 
                  type="text" 
                  required
                  placeholder="Nome do cliente"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-4 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Telefone</label>
                  <input 
                    type="tel" 
                    placeholder="(00) 00000-0000"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-4 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                    value={formData.telefone}
                    onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-widest">E-mail</label>
                  <input 
                    type="email" 
                    placeholder="cliente@email.com"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-4 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Endereço Residencial</label>
                <textarea 
                  rows={3}
                  placeholder="Rua, número, bairro e cidade"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-4 text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500 resize-none transition-all"
                  value={formData.endereco}
                  onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                />
              </div>
              
              <div className="flex items-center justify-end gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-black rounded-2xl transition-all shadow-lg shadow-cyan-900/20 active:scale-95"
                >
                  {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
