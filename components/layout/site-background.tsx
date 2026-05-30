export function SiteBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
      <div
        className="absolute inset-0 bg-cover bg-[70%_center] bg-no-repeat md:bg-[center_right]"
        style={{ backgroundImage: "url(/images/mega-polla-hero.jpg)" }}
      />
      <div className="absolute inset-0 bg-[#0a1628]/78" />
    </div>
  );
}
