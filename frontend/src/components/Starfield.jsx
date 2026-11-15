import "./Starfield.css";

/*
 * Seeded PRNG so star positions are stable across renders
 * (no layout shift, no hydration mismatch).
 */
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seededRandom(42);

const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const STARS = Array.from({ length: 60 }, (_, i) => {
  const r = rand();
  const tier = r < 0.18 ? "bright" : r < 0.55 ? "mid" : "dim";
  const isAccent = rand() < 0.05; // ~5 % chance of orange-tinted star
  return {
    id: i,
    x: rand() * 100,
    y: rand() * 100,
    size: tier === "bright" ? 1.4 + rand() * 1.2 : tier === "mid" ? 1 + rand() * 0.6 : 0.6 + rand() * 0.5,
    cls: isAccent ? "star-accent" : `star-${tier}`,
    delay: rand() * 10,                     // 0 – 10 s
    duration: 2.5 + rand() * 5.5,           // 2.5 – 8 s
  };
});

export default function Starfield() {
  return (
    <div className="starfield" aria-hidden="true">
      {STARS.map((s) => (
        <i
          key={s.id}
          className={`star ${s.cls}`}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
