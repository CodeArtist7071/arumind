import { Notebook, Instagram, Twitter, Linkedin, Facebook } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="w-full bg-surface-container-low pt-24 pb-12 px-6 lg:px-12 border-t border-on-surface/5">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-16 mb-20 text-center lg:text-left">
          {/* Brand Section */}
          <div className="lg:col-span-5 space-y-8">
            <div className="flex items-center gap-3 text-primary justify-center lg:justify-start">
              <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center shadow-sm">
                <Notebook className="size-6" />
              </div>
              <div>
                <h2 className="text-3xl font-black leading-none tracking-tighter text-on-surface">Arumind</h2>
                <span className="text-[9px] font-technical font-black uppercase tracking-[0.3em] text-on-surface-variant opacity-40">The Living Journal</span>
              </div>
            </div>
            <p className="text-on-surface-variant text-lg font-medium leading-relaxed max-w-sm mx-auto lg:mx-0">
              Empowering Odisha's aspirants with a learning experience that breathes. Precision, dedication, and the right guidance.
            </p>
            <div className="flex gap-4 justify-center lg:justify-start">
              {[<Instagram size={18}/>, <Twitter size={18}/>, <Linkedin size={18}/>, <Facebook size={18}/>].map((icon, i) => (
                <a
                  key={i}
                  className="size-10 rounded-xl bg-surface flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-white transition-all duration-500 shadow-sm"
                  href="#"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links Grid */}
          <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-12">
            <div>
              <h4 className="text-[10px] font-technical font-black uppercase tracking-[0.4em] text-primary mb-8">Pathways</h4>
              <ul className="space-y-4">
                {["OPSC Civil Services", "OSSC CGL Exam", "OSSSC RI & ARI", "Odisha Police", "Teacher Eligibility"].map((item, i) => (
                  <li key={i}>
                    <a className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors duration-300" href="#">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-technical font-black uppercase tracking-[0.4em] text-primary mb-8">Navigation</h4>
              <ul className="space-y-4">
                {["Mock Tests", "Current Affairs", "Previous Papers", "Notifications", "Study Planner"].map((item, i) => (
                  <li key={i}>
                    <a className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors duration-300" href="#">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1 border-t border-on-surface/5 md:border-t-0 pt-12 md:pt-0">
               <div className="p-8 rounded-4xl bg-surface shadow-ambient space-y-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform duration-1000">
                    <Notebook size={80} />
                  </div>
                  <h5 className="text-[9px] font-technical font-black uppercase tracking-widest text-primary">Support Journal</h5>
                  <p className="text-xs font-bold text-on-surface leading-loose">Need technical guidance? Our experts are tracking.</p>
                  <button className="w-full bg-surface-container-high py-3 rounded-full text-[9px] font-technical font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                    Consult Expert
                  </button>
               </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-on-surface/10 flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
              <p className="text-[10px] font-technical font-black uppercase tracking-widest text-on-surface-variant opacity-40">© 2026 Arumind — Crafted in Odisha</p>
              <div className="hidden md:block w-1 h-1 bg-on-surface/10 rounded-full" />
              <div className="flex gap-6">
                {["Privacy", "Terms", "Refund"].map((item, i) => (
                  <a key={i} className="text-[10px] font-technical font-black uppercase tracking-widest text-on-surface-variant opacity-40 hover:opacity-100 transition-opacity" href="#">{item}</a>
                ))}
              </div>
           </div>
           
           <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10">
              <div className="size-2 bg-primary rounded-full animate-pulse" />
              <span className="text-[9px] font-technical font-black uppercase tracking-[0.2em] text-primary">All Systems Nominal</span>
           </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
