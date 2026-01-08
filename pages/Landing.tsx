
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  COLORS, 
  Wrench, 
  ShieldCheck, 
  Zap, 
  BarChart3, 
  ChevronRight,
  ClipboardList,
  Users,
  Car
} from '../constants';

const Landing: React.FC = () => {
  return (
    <div className={`min-h-screen bg-${COLORS.bg} text-${COLORS.text}`}>
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 bg-${COLORS.primary} rounded-lg flex items-center justify-center`}>
              <Wrench size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold">JV Automóveis</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 flex flex-col items-center justify-center text-center">
        <div className="animate-in">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Gerencie sua Oficina com <br />
            <span className="text-cyan-500">Máxima Eficiência</span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            Centralize clientes, veículos e serviços em um único lugar. 
            Simplifique sua gestão, reduza erros e lucre mais com o JV Automóveis.
          </p>
          <div className="flex justify-center">
            <Link 
              to="/auth" 
              className={`flex items-center justify-center gap-2 bg-${COLORS.primary} hover:bg-${COLORS.primaryHover} text-white px-10 py-4 rounded-xl font-semibold transition-all hover:scale-105 shadow-lg shadow-cyan-500/20`}
            >
              Acessar Sistema
              <ChevronRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Por que escolher o JV Automóveis?</h2>
            <p className="text-zinc-400">Tudo o que você precisa para uma gestão moderna e eficiente.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Users size={32} />}
              title="Gestão de Clientes"
              description="Cadastro completo com histórico de serviços e contatos rápidos."
            />
            <FeatureCard 
              icon={<Car size={32} />}
              title="Controle de Veículos"
              description="Vincule veículos a clientes e mantenha o registro técnico atualizado."
            />
            <FeatureCard 
              icon={<ClipboardList size={32} />}
              title="Ordens de Serviço"
              description="Crie OS profissionais com orçamentos detalhados e status de acompanhamento."
            />
            <FeatureCard 
              icon={<Wrench size={32} />}
              title="Catálogo de Serviços"
              description="Padronize seus preços e descrições para agilizar orçamentos."
            />
            <FeatureCard 
              icon={<BarChart3 size={32} />}
              title="Dashboard Analítico"
              description="Acompanhe faturamento, serviços realizados e crescimento em tempo real."
            />
            <FeatureCard 
              icon={<ShieldCheck size={32} />}
              title="Dados Seguros"
              description="Suas informações protegidas com criptografia de ponta a ponta."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-900 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 bg-${COLORS.primary} rounded flex items-center justify-center`}>
              <Wrench size={14} className="text-white" />
            </div>
            <span className="font-bold">JV Automóveis</span>
          </div>
          <p className="text-sm text-zinc-500">© 2026 JV Automóveis. Todos os direitos reservados.</p>
          <div className="flex gap-6 text-sm text-zinc-400">
            <a href="#" className="hover:text-white">Termos</a>
            <a href="#" className="hover:text-white">Privacidade</a>
            <a href="#" className="hover:text-white">Suporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
  <div className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 transition-all group">
    <div className={`text-${COLORS.primary} mb-6 group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-zinc-400 leading-relaxed">{description}</p>
  </div>
);

export default Landing;
