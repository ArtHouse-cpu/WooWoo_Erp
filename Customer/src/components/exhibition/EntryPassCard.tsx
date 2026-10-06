import {useEffect, useRef, type ReactNode, type Ref} from 'react';
import JsBarcode from 'jsbarcode';
import {QRCodeCanvas} from 'qrcode.react';
import {CalendarDays, Clock3, MapPin, Sparkles, Ticket, Users} from 'lucide-react';
import logo from '../../assets/woo_woo_art_house_logo.png';
import {EXHIBITION_EVENT, passQrValue, type EntryPass} from './entryPass';

/** Must match the surface behind the card so the perforation notches read as cut-outs. */
export const PASS_NOTCH_COLOR = '#f3ece2';

const Barcode = ({value}: {value: string}) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    JsBarcode(ref.current, value, {
      format: 'CODE128',
      displayValue: false,
      height: 46,
      width: 2,
      margin: 0,
      lineColor: '#1c1917',
      background: '#ffffff',
    });
  }, [value]);

  return <canvas ref={ref} className="block h-11 w-full" aria-label={`Barcode ${value}`} />;
};

const Detail = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) => (
  <div className="min-w-0">
    <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#a8a29e]">
      <span className="text-[#f97316]">{icon}</span>
      {label}
    </p>
    <p className="mt-0.5 truncate text-[13px] font-semibold text-[#1c1917]">{value}</p>
  </div>
);

type Props = {
  pass: EntryPass;
  ref?: Ref<HTMLDivElement>;
};

export default function EntryPassCard({pass, ref}: Props) {
  return (
    <div
      ref={ref}
      className="relative w-full max-w-[360px] overflow-hidden rounded-[22px] bg-white text-left shadow-[0_18px_40px_-18px_rgba(28,25,23,0.45)] print:break-inside-avoid print:shadow-none"
    >
      {/* Header */}
      <div
        className="relative overflow-hidden px-5 pb-5 pt-4 text-white"
        style={{background: 'linear-gradient(135deg, #1c1917 0%, #431407 58%, #c2410c 100%)'}}
      >
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#ffffff14]" />
        <div className="pointer-events-none absolute -bottom-14 right-16 h-28 w-28 rounded-full bg-[#ffffff0d]" />

        <div className="relative flex items-center justify-between gap-3">
          <span className="rounded-xl bg-white px-2 py-1">
            <img src={logo} alt="WOO WOO Art House" className="h-7 w-auto object-contain" />
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f97316] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
            <Ticket size={11} />
            {EXHIBITION_EVENT.passType}
          </span>
        </div>

        <p className="relative mt-4 text-[10px] font-bold uppercase tracking-[0.25em] text-[#fdba74]">
          {EXHIBITION_EVENT.edition}
        </p>
        <h3 className="relative mt-1 font-serif text-[26px] font-black leading-[0.95] tracking-tight">
          CREATIVE
          <br />
          <span className="text-[#fb923c]">EXHIBITION</span>
        </h3>
        <p className="relative mt-2 text-[10px] font-semibold tracking-[0.18em] text-[#ffffffb3]">
          ART • FASHION • CRAFT • COMMUNITY
        </p>
      </div>

      {/* Attendee */}
      <div className="px-5 pt-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#a8a29e]">Attendee</p>
        <p className="mt-0.5 break-words font-serif text-[22px] font-bold leading-tight text-[#1c1917]">
          {pass.fullName}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
          <Detail icon={<CalendarDays size={10} />} label="Date" value={EXHIBITION_EVENT.dateLabel} />
          <Detail icon={<Clock3 size={10} />} label="Time" value={EXHIBITION_EVENT.timeLabel} />
          <Detail icon={<Sparkles size={10} />} label="Interest" value={pass.interest} />
          <Detail
            icon={<Users size={10} />}
            label="Guest"
            value={pass.groupSize > 1 ? `${pass.position} of ${pass.groupSize}` : 'Individual'}
          />
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-snug text-[#78716c]">
          <MapPin size={12} className="mt-px shrink-0 text-[#f97316]" />
          {EXHIBITION_EVENT.venue}
        </p>
      </div>

      {/* Perforation */}
      <div className="relative my-4 h-5">
        <span
          className="absolute -left-2.5 top-0 h-5 w-5 rounded-full"
          style={{backgroundColor: PASS_NOTCH_COLOR}}
        />
        <span
          className="absolute -right-2.5 top-0 h-5 w-5 rounded-full"
          style={{backgroundColor: PASS_NOTCH_COLOR}}
        />
        <div className="absolute left-4 right-4 top-1/2 border-t-2 border-dashed border-[#e7e5e4]" />
      </div>

      {/* Stub */}
      <div className="flex items-center gap-4 px-5 pb-4">
        <div className="shrink-0 rounded-xl border border-[#e7e5e4] bg-white p-1.5">
          <QRCodeCanvas
            value={passQrValue(pass)}
            size={92}
            level="M"
            marginSize={0}
            fgColor="#1c1917"
            bgColor="#ffffff"
            title={`QR code for pass ${pass.code}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#a8a29e]">Pass Code</p>
          <p className="mt-0.5 font-mono text-[15px] font-bold tracking-[0.12em] text-[#1c1917]">
            {pass.code}
          </p>
          <div className="mt-2">
            <Barcode value={pass.code} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#fff7ed] px-5 py-2.5 text-center text-[10px] font-medium text-[#9a3412]">
        Show this pass at the entrance · Valid for one person
      </div>
    </div>
  );
}
