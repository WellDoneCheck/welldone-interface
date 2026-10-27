// Map-page shortcut to place a well by hand, beside the legal well comparison and styled as it is; pressed while the
// next click on the map places one
export default function PinEntry({ placing, onToggle }: { placing: boolean; onToggle: () => void }) {
  return (
    <button type="button" aria-pressed={placing} onClick={onToggle} className="group block w-fit outline-none focus-visible:shadow-[0_0_0_4px_#62A4A7]">
      {/* only the contents lift on hover, like the shortcuts beside it; pressed, it is ringed in the pin's red */}
      <span
        className={`flex h-[84px] items-center gap-[14px] bg-[rgba(247,246,241,0.95)] px-[22px] transition-transform duration-500 ease-[var(--ease-expo)] group-hover:-translate-y-1 ${
          placing ? 'shadow-[inset_0_0_0_3px_#BC5646,8px_8px_50px_0_rgba(0,0,0,0.4)]' : 'shadow-[8px_8px_50px_0_rgba(0,0,0,0.4)]'
        }`}
      >
        <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center bg-[#BC5646]">
          <span className="block h-[30px] w-[30px] bg-white [mask-image:url(/map/pin.png)] [mask-size:100%_100%]" />
        </span>
        <span className="flex flex-col text-left">
          <span className="text-[20px] font-bold leading-none text-[#2C322F]">新增水井</span>
          <span className="mt-[7px] text-[13px] font-bold leading-none text-[#6F7468]">{placing ? '點地圖放置，再按一下取消' : '在地圖上手動標記'}</span>
        </span>
        <span className="text-[22px] text-[#BC5646] transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-y-0.5">+</span>
      </span>
    </button>
  );
}
