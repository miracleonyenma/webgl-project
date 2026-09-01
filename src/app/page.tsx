import { Activity, ArrowDown, ArrowUpRight } from "lucide-react";
import { ParticleGlobe } from "@/components/ParticleGlobe";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <ParticleGlobe />
      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="Kloud home">
          <span className={styles.brandMark} aria-hidden="true" />
          KLOUD
        </a>
        <nav className={styles.nav} aria-label="Primary navigation">
          <a href="#network">Network</a>
          <a href="#signals">Signals</a>
          <a href="#about">About</a>
        </nav>
        <a className={styles.launchButton} href="#network">
          Enter network
          <ArrowUpRight size={15} strokeWidth={1.8} />
        </a>
      </header>

      <section className={styles.hero} id="top">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <Activity size={14} />
            Distributed systems, connected
          </p>
          <h1>Open computation, in orbit.</h1>
          <p className={styles.subhead}>
            A live network of independent nodes moving data, models, and ideas
            without a center.
          </p>
        </div>
        <div className={styles.liveStatus}>
          <span className={styles.statusDot} />
          Network live
          <strong>12,000</strong>
          <span>active points</span>
        </div>
        <a className={styles.scrollCue} href="#network">
          <span>Explore the field</span>
          <ArrowDown size={16} />
        </a>
      </section>

      <section className={styles.network} id="network">
        <div className={styles.networkInner}>
          <div className={styles.sectionHeading}>
            <p>01 / Network</p>
            <h2>One field. Thousands of independent signals.</h2>
          </div>
          <div className={styles.metrics} id="signals">
            <div><span>Available compute</span><strong>84.2 PF</strong></div>
            <div><span>Global latency</span><strong>18 ms</strong></div>
            <div><span>Regions online</span><strong>42</strong></div>
          </div>
          <p className={styles.networkCopy} id="about">
            Move your pointer through the field. Each point reacts locally,
            then settles back into the shared system.
          </p>
        </div>
      </section>
    </main>
  );
}
