import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Coffee,
  Menu,
  Music2,
  Palette,
  ShoppingBag,
  Sparkles,
  Users,
  UtensilsCrossed,
} from "lucide-react";

import { useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import logo from "@/assets/woo_woo_art_house_logo.png";
import EntryPassFormModal from "../../components/exhibition/EntryPassFormModal";
import EntryPassPreviewModal from "../../components/exhibition/EntryPassPreviewModal";
import {
  createPasses,
  loadSavedPasses,
  savePasses,
  type EntryPass,
  type PassPerson,
} from "../../components/exhibition/entryPass";


// ================= TYPES =================

type ExploreItem = {
  title: string;
  subtitle: string;
  image: string;
  icon: ReactNode;
};


// ================= COMPONENT =================

const Exhibition = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [passFormOpen, setPassFormOpen] = useState(false);
  const [previewPasses, setPreviewPasses] = useState<EntryPass[]>([]);
  const [savedPasses, setSavedPasses] = useState<EntryPass[]>(loadSavedPasses);

  const openPassForm = () => {
    setMenuOpen(false);
    setPreviewPasses([]);
    setPassFormOpen(true);
  };

  const handleGeneratePasses = (people: PassPerson[]) => {
    const passes = createPasses(people);
    const allPasses = [...passes, ...savedPasses];
    savePasses(allPasses);
    setSavedPasses(allPasses);
    setPassFormOpen(false);
    setPreviewPasses(passes);
    toast.success(passes.length > 1 ? `${passes.length} entry passes generated` : "Entry pass generated");
  };

  // ================= EXPLORE DATA =================

  const exploreItems: ExploreItem[] = [
    {
      title: "Art",
      subtitle: "Paintings, Illustrations & More",
      image:
        "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=700&q=80",
      icon: <Palette size={18} />,
    },

    {
      title: "Fashion",
      subtitle: "Handmade, Sustainable & Unique",
      image:
        "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=700&q=80",
      icon: <Sparkles size={18} />,
    },

    {
      title: "Craft",
      subtitle: "Home Decor, Ceramics & More",
      image:
        "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=700&q=80",
      icon: <ShoppingBag size={18} />,
    },

    {
      title: "Live Workshops",
      subtitle: "Fun for kids & grown-ups",
      image:
        "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=700&q=80",
      icon: <Users size={18} />,
    },

    {
      title: "Food",
      subtitle: "Enjoy delicious food",
      image:
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=700&q=80",
      icon: <Coffee size={18} />,
    },

    {
      title: "Music & Activities",
      subtitle: "Good music & creative vibes",
      image:
        "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=700&q=80",
      icon: <Music2 size={18} />,
    },
  ];

  // ================= GALLERY DATA =================

  const galleryImages: string[] = [
    "https://images.unsplash.com/photo-1764788127528-1bce10c424f3?auto=format&fit=crop&w=1200&q=85",

    "https://plus.unsplash.com/premium_photo-1714347051169-d82d571fe26b?auto=format&fit=crop&w=1200&q=85",

   
   "https://images.unsplash.com/photo-1743976955434-a3c0b060142e?auto=format&fit=crop&w=1200&q=85"
    
  ];

  // ================= JSX =================

  return (
    <>
    <div id="top" className="min-h-screen bg-[#f8f3ec] text-[#181818] print:hidden">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-50 flex items-center justify-between bg-[#f8f3ec]/95 px-5 py-4 backdrop-blur-md md:px-12">

        {/* Logo */}
        <a href="#top" className="flex items-center">
          <img
            src={logo}
            alt="Woo Woo Art House Logo"
            className="h-10 w-auto object-contain sm:h-12"
          />
        </a>

        {/* Menu Button */}
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="rounded-lg p-2 hover:bg-white"
        >
          <Menu size={22} />
        </button>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="absolute right-5 top-16 w-48 rounded-2xl bg-white p-3 shadow-xl">

            <a
              href="#about"
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm hover:bg-orange-50"
            >
              About
            </a>

            <a
              href="#explore"
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm hover:bg-orange-50"
            >
              Explore
            </a>

            <a
              href="#vibes"
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-5 text-sm hover:bg-orange-50"
            >
              Event Vibes
            </a>

            <a
              href="#register"
              onClick={(e) => {
                e.preventDefault();
                openPassForm();
              }}
              className="mt-2 block rounded-lg bg-orange-500 px-3 py-2 text-center text-sm font-semibold text-white"
            >
              Get Entry Pass
            </a>

          </div>
        )}

      </header>


      {/* =====================================================
          HERO SECTION
      ====================================================== */}

      <section className="px-5 pb-7 pt-4 md:px-12">

        <div className="grid items-center gap-8 md:grid-cols-2">

          {/* Hero Content */}
          <div>

            <span className="inline-block rounded-full bg-orange-100 px-3 py-1.5 text-[18px] font-extrabold tracking-wider text-orange-500">
              3RD PREMIUM
            </span>

            <div className="relative">

              {/* Decorative Text */}
            

              {/* Heading */}
              <h1 className="mt-4 font-serif text-[48px] font-black leading-[0.82] tracking-[-3px] md:text-[65px]">
                CREATIVE
                <br />

                <span className="text-orange-500">
                  EXHIBITION
                </span>
              </h1>

            </div>

            <p className="mt-4 text-[15px] font-bold tracking-wider">
              ART • FASHION • CRAFT • COMMUNITY
            </p>

            <p className="mt-2 max-w-md text-[13px] leading-relaxed text-gray-500">
              Explore unique creations, meet amazing artists, enjoy great food
              and experience a weekend full of creativity.
            </p>

          </div>


          {/* Hero Image */}
          <div className="rotate-1 overflow-hidden rounded-bl-[50px] rounded-br-md rounded-t-md">

            <img
              src="https://plus.unsplash.com/premium_photo-1673514503694-f60953735e72?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=85&w=1200"
              alt="Art exhibition"
              className="h-[270px] w-full object-cover md:h-[390px]"
            />

          </div>

        </div>


        {/* =====================================================
            EVENT DETAILS
        ====================================================== */}

        <div className="mt-7 grid grid-cols-2 gap-5">

          {/* Date */}
          <div className="flex gap-2">

            <CalendarDays
              className="mt-1 text-orange-500"
              size={18}
            />

            <div>

              <p className="text-[18px] font-bold">
                10th &amp; 11th
                <br />
                October 2026
              </p>

              <p className="mt-1 text-[13px] text-gray-500">
                (10:00 AM – 9:00 PM)
              </p>

            </div>

          </div>


          {/* Location */}
          <div className="flex gap-2">

            <span className="text-xl leading-none text-orange-500">
              ●
            </span>

            <div>

              <p className="text-[18px] font-bold">
                WOO WOO Art House
              </p>

              <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
                Bhilai, Chhattisgarh
                <br />
                India
              </p>

            </div>

          </div>

        </div>


        {/* =====================================================
            FEATURES
        ====================================================== */}

        <div className="mt-8 grid grid-cols-4 border-y border-[#e7ddd2] py-6 sm:py-8">

          <Feature
            icon={<ShoppingBag size={26} />}
            value="12+"
            label="Handpicked Exhibitors"
          />

          <Feature
            icon={<Music2 size={26} />}
            value="Live"
            label="Workshops & Music"
          />

          <Feature
            icon={<UtensilsCrossed size={26} />}
            value="Delicious"
            label="Food"
          />

          <Feature
            icon={<Users size={26} />}
            value="Creative"
            label="Community"
          />

        </div>

      </section>


      {/* =====================================================
          ABOUT SECTION
      ====================================================== */}

      <section
        id="about"
        className="px-5 py-8 md:px-15"
      >

        <SectionTitle title="ABOUT THE EVENT" />


        <h2 className="mt-2 font-serif text-[30px] font-bold leading-none tracking-tight">
          A weekend for
          <br />
          every creative soul.
        </h2>


        {/* Orange Line */}
        <div className="my-3 h-[3px] w-11 rounded-full bg-orange-500" />




        {/* Gallery */}
        <div className="mt-5 grid h-[160px] grid-cols-[1.1fr_.9fr_.9fr] gap-1.5 overflow-hidden rounded-lg">

          {galleryImages.map((image, index) => (
            <img
              key={image}
              src={image}
              alt={`Exhibition ${index + 1}`}
              className="h-full w-full object-cover"
            />
          ))}

        </div>


        {/* About Stats */}
        <div className="mt-5 grid grid-cols-4 border-b border-[#e7ddd2] pb-4">

          <Feature
            icon={<ShoppingBag size={26} />}
            value="12+"
            label="Exhibitors"
          />

          <Feature
            icon={<Music2 size={26} />}
            value="Live"
            label="Workshops"
          />

          <Feature
            icon={<UtensilsCrossed size={26} />}
            value="Food"
            label="Beverages"
          />

          <Feature
            icon={<Music2 size={26} />}
            value="Music"
            label="Activities"
          />

        </div>

      </section>


      {/* =====================================================
          EXPLORE SECTION
      ====================================================== */}

      <section
        id="explore"
        className="px-5 py-7 md:px-12"
      >

        {/* Heading */}
        <div className="flex items-center justify-between">

          <SectionTitle title="WHAT TO EXPLORE" />

          <a
            href="#explore"
            className="flex items-center gap-1 text-[13px] font-bold text-orange-500 hover:text-orange-600 sm:text-sm"
          >
            View All
            <ArrowUpRight size={15} />
          </a>

        </div>


        {/* Explore Cards */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">

          {exploreItems.map((item) => (

            <div
              key={item.title}
              className="overflow-hidden rounded-xl border border-[#eee5db] bg-white shadow-sm transition hover:shadow-md"
            >

              <img
                src={item.image}
                alt={item.title}
                className="h-[145px] w-full object-cover sm:h-[185px] md:h-[210px]"
              />


              <div className="p-3 sm:p-4">

                <div className="flex items-center gap-2">

                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-50 text-orange-500 sm:h-8 sm:w-8">
                    {item.icon}
                  </span>

                  <h3 className="text-xs font-bold text-gray-900 sm:text-sm md:text-base">
                    {item.title}
                  </h3>

                </div>


                <p className="mt-1.5 text-[10px] leading-snug text-gray-500 sm:text-xs">
                  {item.subtitle}
                </p>

              </div>

            </div>

          ))}

        </div>

      </section>


      {/* =====================================================
          EVENT VIBES
      ====================================================== */}

      <section
        id="vibes"
        className="px-5 py-7 md:px-12"
      >

        <SectionTitle title="EVENT VIBES" />

        <div className="mt-3 grid h-[140px] grid-cols-[1.2fr_.9fr_.9fr] gap-1.5 overflow-hidden rounded-lg">

          {galleryImages.map((image, index) => (

            <img
              key={image}
              src={image}
              alt={`Event vibe ${index + 1}`}
              className="h-full w-full object-cover"
            />

          ))}

        </div>

      </section>


      {/* =====================================================
          REGISTER / ENTRY PASS BUTTON
      ====================================================== */}

      <section
        id="register"
        className="px-5 pb-8 pt-1 md:px-12"
      >
        <button
          type="button"
          onClick={openPassForm}
          className="group flex w-full items-center justify-between gap-3 rounded-2xl bg-orange-500 px-4 py-3.5 text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-600 active:scale-[0.99] sm:px-6 sm:py-4"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 shrink-0 sm:h-7 sm:w-7"
            >
              <path d="M5 8 C5 5.5 5.5 5 8 5 H9 C9.5 7.5 14.5 7.5 15 5 H16 C18.5 5 19 5.5 19 8 V9 C16.5 9.5 16.5 14.5 19 15 V16 C19 18.5 18.5 19 16 19 H15 C14.5 16.5 9.5 16.5 9 19 H8 C5.5 19 5 18.5 5 16 V15 C7.5 14.5 7.5 9.5 5 9 Z" />
            </svg>

            <span className="text-[15px] font-bold tracking-normal text-white sm:text-lg md:text-xl">
              Get Your Free Entry Pass
            </span>
          </div>

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-orange-500 shadow-sm transition-transform group-hover:translate-x-0.5 sm:h-9 sm:w-9">
            <ChevronRight className="h-5 w-5 stroke-[2.5]" />
          </div>
        </button>

        {savedPasses.length > 0 && (
          <button
            type="button"
            onClick={() => setPreviewPasses(savedPasses)}
            className="mt-3 w-full text-center text-sm font-semibold text-orange-600 underline-offset-4 hover:underline"
          >
            View your passes ({savedPasses.length})
          </button>
        )}
      </section>


      {/* =====================================================
          FOOTER
      ====================================================== */}

      {/*<footer className="flex items-center justify-between px-5 pb-10 pt-4 md:px-12">

         <a href="#top" className="flex items-center">
          <img
            src={logo}
            alt="Woo Woo Art House Logo"
            className="h-10 w-auto object-contain sm:h-12"
          />
        </a>


        <p className="text-right text-[17px] text-gray-500">
          Art • Fashion • Craft
          <br />
          Community
        </p> 

      </footer>*/}

    </div>

    <EntryPassFormModal
      open={passFormOpen}
      onClose={() => setPassFormOpen(false)}
      onGenerate={handleGeneratePasses}
    />

    <EntryPassPreviewModal
      open={previewPasses.length > 0}
      passes={previewPasses}
      onClose={() => setPreviewPasses([])}
      onNewRequest={openPassForm}
    />
    </>
  );
};


// ==========================================================
// REUSABLE FEATURE COMPONENT
// ==========================================================

const Feature = ({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) => {
  return (
    <div className="flex flex-col items-center border-r border-[#e7ddd2] px-1 text-center last:border-r-0 sm:px-3">

      <span className="mb-1.5 text-orange-500">
        {icon}
      </span>

      <strong className="text-[13px] font-bold sm:text-base md:text-lg">
        {value}
      </strong>

      <span className="mt-0.5 text-[9px] leading-tight text-gray-500 sm:text-xs md:text-sm">
        {label}
      </span>

    </div>
  );
};


// ==========================================================
// REUSABLE SECTION TITLE COMPONENT
// ==========================================================

const SectionTitle = ({
  title,
}: {
  title: string;
}) => {
  return (
    <span className="block text-[11px] font-black tracking-[1.5px] text-orange-500 sm:text-xs">
      {title}
    </span>
  );
};


export default Exhibition;