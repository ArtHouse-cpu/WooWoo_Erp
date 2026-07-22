import {useState} from 'react';
import {
  X,
  HelpCircle,
  ShoppingBag,
  Wrench,
  Calendar,
  Coffee,
  User,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Crown,
  Ticket,
} from 'lucide-react';
import {motion, AnimatePresence} from 'framer-motion';

function WhatsAppIcon({className, ...props}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
    </svg>
  );
}

type HelpSupportBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

type CategoryId = 'general' | 'supplies' | 'space' | 'services' | 'events' | 'woofoo' | 'membership' | 'account';

type PillItem = {
  id: CategoryId;
  label: string;
  icon: any;
};

type FaqItem = {
  question: string;
  answer: string;
};

export function HelpSupportBottomSheet({isOpen, onClose}: HelpSupportBottomSheetProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('general');
  const [openFaqs, setOpenFaqs] = useState<Record<number, boolean>>({});

  const pills: PillItem[] = [
    {id: 'general', label: 'General', icon: HelpCircle},
    {id: 'supplies', label: 'Store Supplies', icon: ShoppingBag},
    {id: 'space', label: 'Space Booking', icon: Calendar},
    {id: 'services', label: 'Services', icon: Wrench},
    {id: 'events', label: 'Events', icon: Ticket},
    {id: 'woofoo', label: 'WOO FOO', icon: Coffee},
    {id: 'membership', label: 'Membership', icon: Crown},
    {id: 'account', label: 'Account', icon: User},
  ];

  const faqs: FaqItem[] = [
    {
      question: 'How do I create an account?',
      answer: "Simply click on the Profile tab and click 'Sign Up'. Fill in your email and password, and you are ready to explore WooWoo Art House!",
    },
    {
      question: 'How do I reset my password?',
      answer: "Go to the login screen, click 'Forgot Password?', and enter your registered email. We will send you a password reset link instantly.",
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit/debit cards, UPI, net banking, and popular mobile wallets. Cash payments are also accepted at the physical Art Café.',
    },
    {
      question: 'How can I track my order?',
      answer: "For store supplies or cafe orders, you can track them in real-time under the 'Orders' tab in your Profile dashboard.",
    },
    {
      question: 'How do I contact customer support?',
      answer: 'You can contact us via live chat, email, or telephone using the quick contact buttons provided at the bottom of this support panel.',
    },
  ];

  const toggleFaq = (index: number) => {
    setOpenFaqs(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Bottom Sheet Panel */}
          <motion.div
            initial={{y: '100%'}}
            animate={{y: 0}}
            exit={{y: '100%'}}
            transition={{type: 'spring', damping: 26, stiffness: 240}}
            className="relative z-10 flex max-h-[90dvh] h-auto w-full max-w-lg flex-col rounded-t-[32px] bg-white shadow-2xl overflow-hidden border-t border-slate-100"
          >
            {/* Top Drag Handle */}
            <div className="flex shrink-0 justify-center py-3">
              <div className="h-1.5 w-12 rounded-full bg-[#E5E7EB]" />
            </div>

            {/* Close Button & Header Info */}
            <div className="relative shrink-0 px-5 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Help Icon inside soft peach rounded square */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-[#FFF0EB] text-[#EA580C]">
                  <HelpCircle className="h-7 w-7" strokeWidth={2} />
                </div>
                <div className="text-left mt-0.5">
                  <h3 className="text-[19px] font-extrabold tracking-tight text-[#111111] leading-none">
                    Help & Support
                  </h3>
                  <p className="mt-1.5 text-[12px] font-bold text-[#6B7280] leading-none">
                    How can we help you?
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-[#4B5563] transition hover:bg-[#E5E7EB]"
                aria-label="Close support sheet"
              >
                <X className="h-4.5 w-4.5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Scrollable Contents */}
            <div className="flex-1 overflow-y-auto pb-6">
              {/* FAQs Section */}
              <div className="px-5 mb-3 text-left">
                <h4 className="text-[15px] font-black text-[#111111] leading-tight">
                  FAQs
                </h4>
              </div>

              {/* Horizontally Scrollable FAQ Categories list row */}
              <div
                className="px-5 mb-4 flex gap-2 overflow-x-auto flex-nowrap scrollbar-hide py-1"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                <style dangerouslySetInnerHTML={{__html: `
                  .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                  }
                `}} />
                {pills.map(pill => {
                  const PillIcon = pill.icon;
                  const isActive = activeCategory === pill.id;
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setActiveCategory(pill.id)}
                      className={`relative shrink-0 flex flex-col items-center justify-center text-center h-[72px] w-[64px] rounded-[16px] border transition-colors cursor-pointer ${
                        isActive
                          ? 'border-[#EA580C]/20 bg-white shadow-3xs'
                          : 'border-[#E5E7EB] bg-white hover:bg-slate-50'
                      }`}
                    >
                      <PillIcon className={`h-4.5 w-4.5 ${isActive ? 'text-[#EA580C]' : 'text-slate-600'}`} strokeWidth={isActive ? 2.5 : 2} />
                      <span className={`text-[8.5px] font-black leading-tight text-center mt-1.5 px-0.5 ${isActive ? 'text-[#EA580C]' : 'text-[#4B5563]'}`}>
                        {pill.label}
                      </span>
                      {isActive && (
                        <div className="absolute bottom-0 inset-x-0 h-0.75 bg-[#EA580C]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* FAQ Accordion Cards */}
              <div className="px-5 mb-6 flex flex-col gap-3">
                {faqs.map((faq, index) => {
                  const isOpen = !!openFaqs[index];
                  return (
                    <div
                      key={index}
                      className="rounded-[16px] border border-slate-100 bg-white transition-all shadow-3xs overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleFaq(index)}
                        className="w-full py-4 px-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-slate-50/50"
                      >
                        <span className="text-[12.5px] font-black text-[#111111] leading-snug">
                          {faq.question}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="h-4.5 w-4.5 text-[#9CA3AF] shrink-0" strokeWidth={2.5} />
                        ) : (
                          <ChevronDown className="h-4.5 w-4.5 text-[#9CA3AF] shrink-0" strokeWidth={2.5} />
                        )}
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{height: 0, opacity: 0}}
                            animate={{height: 'auto', opacity: 1}}
                            exit={{height: 0, opacity: 0}}
                            transition={{duration: 0.2, ease: 'easeInOut'}}
                          >
                            <div className="px-4 pb-4 border-t border-slate-50 pt-2 text-[11.5px] font-bold text-[#6B7280] leading-relaxed text-left bg-slate-50/20">
                              {faq.answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Contact Support Cards Row */}
              <div className="px-5 grid grid-cols-3 gap-3 mb-6">
                {/* Chat Card */}
                <a
                  href="https://wa.me/918073988123"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-[20px] p-3 text-center flex flex-col items-center justify-center min-h-[90px] bg-[#F0FDF4] border border-[#DCFCE7] shadow-3xs hover:bg-[#E8FBF0] transition"
                >
                  <WhatsAppIcon className="h-5 w-5 text-[#16A34A] mb-1.5" />
                  <span className="text-[12px] font-black text-[#16A34A]">Chat</span>
                </a>

                {/* Email Card */}
                <a
                  href="mailto:hello@woowooarthouse.in"
                  className="rounded-[20px] p-3 text-center flex flex-col items-center justify-center min-h-[90px] bg-[#EFF6FF] border border-[#DBEAFE] shadow-3xs hover:bg-[#E0F2FE] transition"
                >
                  <Mail className="h-5 w-5 text-[#2563EB] mb-1.5" strokeWidth={2.5} />
                  <span className="text-[12px] font-black text-[#2563EB]">Email</span>
                </a>

                {/* Call Card */}
                <a
                  href="tel:8073988123"
                  className="rounded-[20px] p-3 text-center flex flex-col items-center justify-center min-h-[90px] bg-[#F3F4F6] border border-[#E5E7EB] shadow-3xs hover:bg-[#E5E7EB]/50 transition"
                >
                  <Phone className="h-5 w-5 text-[#111111] mb-1.5" strokeWidth={2.5} />
                  <span className="text-[12px] font-black text-[#111111]">Call</span>
                </a>
              </div>

              {/* Footer Links & Divider */}
              <div className="mx-5 border-t border-slate-100 pt-4 flex items-center justify-center gap-2.5 text-[#4B5563] text-[11px] font-bold">
                <span>Terms</span>
                <span className="text-slate-200">|</span>
                <span>About</span>
                <span className="text-slate-200">|</span>
                <span>Jobs</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
