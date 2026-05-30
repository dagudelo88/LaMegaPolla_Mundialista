import Image from "next/image";

export function SiteBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
      <Image
        src="/images/mega-polla-hero.jpg"
        alt=""
        fill
        priority
        className="object-cover object-[70%_center] md:object-[center_right]"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[#0a1628]/78" />
    </div>
  );
}
