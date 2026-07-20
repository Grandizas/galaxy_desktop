/**
 * Purely decorative CSS nebula. Kept out of WebGL on purpose: three large
 * blurred gradients cost nothing on the compositor and would need an expensive
 * volumetric pass in the scene.
 */
export function Nebula() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-75 mix-blend-screen">
      <div
        className="absolute -top-[25%] -right-[15%] h-[70vw] w-[70vw] blur-[30px]"
        style={{
          background: 'radial-gradient(circle, rgba(147,51,234,.16), rgba(147,51,234,0) 65%)',
          animation: 'nebula-drift 90s ease-in-out infinite alternate',
        }}
      />
      <div
        className="absolute -bottom-[30%] -left-[20%] h-[75vw] w-[75vw] blur-[30px]"
        style={{
          background: 'radial-gradient(circle, rgba(37,99,235,.13), rgba(37,99,235,0) 65%)',
          animation: 'nebula-drift 110s ease-in-out infinite alternate-reverse',
        }}
      />
      <div
        className="absolute top-[20%] left-[30%] h-[45vw] w-[45vw] blur-[30px]"
        style={{
          background: 'radial-gradient(circle, rgba(34,211,238,.07), rgba(34,211,238,0) 60%)',
          animation: 'nebula-drift 70s ease-in-out infinite alternate',
        }}
      />
    </div>
  )
}
