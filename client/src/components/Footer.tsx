import { ChatBubbleOvalLeftIcon } from "@heroicons/react/24/solid";
import { Library, LocationEdit, Mail, Phone, School, User } from "lucide-react";

const Footer = () => {
  return (
    <footer className="w-full px-30 mx-auto bg-slate-900 py-10  text-slate-400 mt-10">
        <div>
          <span className="flex items-center gap-2 text-white">
            <School className="text-3xl" />
            <h2 className="text-3xl font-bold">Arumind</h2>
          </span>
          <p className="text-sm leading-relaxed">
            Empowering aspirants across Odisha to crack competitive exams with
            precision, dedication, and the right guidance.
          </p>
          <div className="flex gap-4">
            {[<User size={20}/>, <Library size={20}/>, <ChatBubbleOvalLeftIcon />].map((icon, i) => (
              <a
                key={i}
                className="w-10 h-10 my-4 p-2 rounded-full bg-slate-800 flex items-center justify-center hover:bg-[#1e3a5f] hover:text-white transition-colors duration-200"
                href="#"
              >
                {icon}
              </a>
            ))}
          </div>
        </div>
      <div className="grid xs:grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div className="pt-10">
          <h4 className="text-white font-bold mb-6">Popular Exams</h4>
          <ul className="space-y-4 text-sm">
            {[
              "OPSC Civil Services (OAS)",
              "OSSC CGL Exam",
              "OSSSC RI & ARI",
              "Odisha Police Exams",
              "Odisha Teacher Eligibility",
            ].map((item, i) => (
              <li key={i}>
                <a
                  className="hover:text-[#1e3a5f] transition-colors duration-200"
                  href="#"
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="pt-10">
          <h4 className="text-white font-bold mb-6">Resources</h4>
          <ul className="space-y-4 gap-4 text-sm">
            {[
              "Free Mock Tests",
              "Daily Current Affairs",
              "Previous Year Papers",
              "Exam Notifications",
              "Study Planner",
            ].map((item, i) => (
              <li key={i}>
                <a
                  className="hover:text-[#1e3a5f] transition-colors duration-200"
                  href="#"
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>
        {/* <div className="py-10 sm:col-span-2 md:col-span-1">
          <h4 className="text-white font-bold mb-6">Contact Us</h4>
          <ul className="space-y-4 gap-4 text-sm">
            <li className="flex items-start gap-3">
              <LocationEdit className="text-[#1e3a5f] text-xl mt-0.5" />
              <span>
                Plot No. 45, Jayadev Vihar, Bhubaneswar, Odisha - 751013
              </span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="text-[#1e3a5f] text-xl" />
              <span>+91 789 456 1230</span>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="text-[#1e3a5f] text-xl" />
              <span>support@odishaexamprep.com</span>
            </li>
          </ul>
        </div> */}
        </div>
        <div className="border-t border-slate-800 mt-10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>© 2026 Arumind. All rights reserved.</p>
          <div className="flex gap-6">
            {["Privacy Policy", "Terms of Service", "Refund Policy"].map(
              (item, i) => (
                <a
                  key={i}
                  className="hover:text-white transition-colors duration-200"
                  href="#"
                >
                  {item}
                </a>
              ),
            )}
          </div>
        </div>
    </footer>
  );
};

export default Footer