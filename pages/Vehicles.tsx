
import React, { useState, useMemo } from 'react';
import { DataTable } from '../components/DataTable';
import { db } from '../services/db';
import { Vehicle, Client } from '../types';
import { Edit, Trash2, X } from '../constants';

const Vehicles: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>(db.getVehicles());
  const clients = db.getClients();

  const [formData, setFormData] = useState({
    cliente_id: '',
    placa: '',
    marca: '',
    modelo: '',
    ano: new Date().getFullYear(),
    chassi: ''
  });

  const handleOpenModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        cliente_id: vehicle.cliente_id,
        placa: vehicle.placa,
        marca: vehicle.marca,
        modelo: vehicle.modelo,
        ano: vehicle.ano || new Date().getFullYear(),
        chassi: vehicle.chassi || ''
      });
    } else {
      setEditingVehicle(null);
      setFormData({
        cliente_id: clients[0]?.id || '',
        placa: '',
        marca: '',
        modelo: '',
        ano: new Date().getFullYear(),
        chassi: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVehicle) {
      db.updateVehicle(editingVehicle.id, formData);
    } else {
      db.addVehicle({ ...formData, user_id: 'u1' });
    }
    setVehicles(db.getVehicles());
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente remover este veículo?')) {
      db.deleteVehicle(id);
      setVehicles(db.getVehicles());
    }
  };

  const columns = [
    { header: 'Placa', accessor: (v: Vehicle) => <span className="font-mono text-cyan-500 font-bold uppercase">{v.placa}</span> },
    { header: 'Marca/Modelo', accessor: (v: Vehicle) => `${v.marca} ${v.modelo}` },
    { header: 'Ano', accessor: 'ano' as const },
    { 
      header: 'Cliente', 
      accessor: (v: Vehicle) => {
        const client = clients.find(c => c.id === v.cliente_id);
        return client?.nome || 'Desconhecido';
      }
    },
    { 
      header: 'Ações', 
      accessor: (v: Vehicle) => (
        <div className="flex items-center gap-2">
          <button onClick={() => handleOpenModal(v)} className="p-2 text-zinc-400 hover:text-cyan-500 hover:bg-zinc-800 rounded-lg"><Edit size={16} /></button>
          <button onClick={() => handleDelete(v.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded-lg"><Trash2 size={16} /></button>
        </div>
      ),
      className: 'text-right'
    },
  ];

  return (
    <div className="animate-in">
      <DataTable 
        title="Gerenciar Veículos"
        data={vehicles}
        columns={columns}
        onAdd={() => handleOpenModal()}
        addButtonLabel="Novo Veículo"
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-2xl overflow-hidden relative animate-in">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-xl font-bold">{editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase">Proprietário</label>
                <select 
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500"
                  value={formData.cliente_id}
                  onChange={e => setFormData({ ...formData, cliente_id: e.target.value })}
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Placa</label>
                  <input 
                    type="text" required placeholder="ABC-1234"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500 uppercase font-mono"
                    value={formData.placa}
                    onChange={e => setFormData({ ...formData, placa: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Ano</label>
                  <input 
                    type="number" required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500"
                    value={formData.ano}
                    onChange={e => setFormData({ ...formData, ano: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Marca</label>
                  <input 
                    type="text" required placeholder="Ex: Toyota"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500"
                    value={formData.marca}
                    onChange={e => setFormData({ ...formData, marca: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Modelo</label>
                  <input 
                    type="text" required placeholder="Ex: Corolla"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500"
                    value={formData.modelo}
                    onChange={e => setFormData({ ...formData, modelo: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase">Nº Chassi (Opcional)</label>
                <input 
                  type="text"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:ring-1 focus:ring-cyan-500"
                  value={formData.chassi}
                  onChange={e => setFormData({ ...formData, chassi: e.target.value })}
                />
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-zinc-400 hover:text-zinc-100">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all">
                  {editingVehicle ? 'Salvar Alterações' : 'Cadastrar Veículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vehicles;
