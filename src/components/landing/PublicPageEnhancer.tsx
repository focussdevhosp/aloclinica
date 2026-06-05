import { CSSProperties, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type PublicPageEnhancerProps = {
  accent?: string;
  rootSelector?: string;
};

const PublicPageEnhancer = ({ accent = "#0b63f6", rootSelector = ".public-page" }: PublicPageEnhancerProps) => {
  const prefersReducedMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(maxScroll > 0 ? Math.min(window.scrollY / maxScroll, 1) : 0);
    };
    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    const root = document.querySelector(rootSelector);
    if (!root) return;

    const targets = Array.from(
      root.querySelectorAll<HTMLElement>(
        "section, .public-card, .public-media-card, .public-reveal, [data-public-reveal]"
      )
    );

    targets.forEach((target, index) => {
      target.classList.add("public-reveal");
      target.style.setProperty("--public-delay", `${Math.min((index % 7) * 42, 210)}ms`);
    });

    if (prefersReducedMotion) {
      targets.forEach((target) => target.classList.add("public-in"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("public-in");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" }
    );

    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, [prefersReducedMotion, rootSelector]);

  return (
    <motion.div
      className="public-scroll-progress"
      style={{ "--public-accent": accent, transform: `scaleX(${progress})` } as CSSProperties}
      aria-hidden
    />
  );
};

export default PublicPageEnhancer;
