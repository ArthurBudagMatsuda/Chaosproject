import { ArrowDown, ArrowRight, FlaskConical } from "lucide-react";
import { loreChapters, loreCycle } from "@/lib/chaos-lore";
import { Reveal, SectionLabel, Badge } from "./ui";
import { LoreVisual, ChapterBreak } from "./lore-visual";
import { LoreNavigation } from "./lore-navigation";

export function ChaosLore() {
  return <section className="lore-section" id="about" aria-label="The CHAOS story">
    <div className="container lore-intro"><Reveal><div className="section-heading"><span className="mono accent">CHAOS / FIELD NOTES</span><Badge>THE STORY SO FAR</Badge></div><h2>A small change.<br /><span className="serif">A different future.</span></h2><p>Eight observations from an experiment in uncertainty.</p><a className="mono lore-begin" href="#lore-theory">BEGIN THE OBSERVATION <ArrowDown size={12} /></a></Reveal></div>
    <div className="container lore-layout"><aside className="lore-sidebar"><LoreNavigation /></aside><div className="lore-chapters">
      {loreChapters.map((chapter, i) => <section className={`lore-chapter lore-chapter-${chapter.visual}`} id={chapter.id} key={chapter.id} aria-labelledby={`${chapter.id}-title`}>
        <Reveal><SectionLabel number={chapter.number}>{chapter.label}</SectionLabel>
          {chapter.visual !== "ending" && <h3 className="lore-title" id={`${chapter.id}-title`}>{chapter.title}<br /><span className="serif">{chapter.emphasis}</span></h3>}
          <div className="lore-chapter-body"><div className="lore-prose"><p className="lore-lead">{chapter.lead}</p>{chapter.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
            {["attractor", "network", "threshold", "pool", "butterfly"].includes(chapter.visual) && <LoreVisual kind={chapter.visual as "attractor" | "network" | "threshold" | "pool" | "butterfly"} />}
            {chapter.visual === "experiment" && <div className="lore-experiment-note"><FlaskConical size={24} strokeWidth={1} /><span className="mono">EXPERIMENTAL PREMISE</span><blockquote>Observe the system.<br />Give uncertainty<br /><span className="serif">a place in the rules.</span></blockquote><Badge>DESIGN INTENT / NOT LIVE</Badge></div>}
          </div>
          {chapter.visual === "ending" && <h3 className="lore-title lore-final-statement" id={`${chapter.id}-title`}>{chapter.title}<br /><span className="accent">{chapter.emphasis}</span></h3>}
          {chapter.visual === "cycle" && <><ol className="lore-cycle" aria-label="Proposed protocol cycle">{loreCycle.map((step, index) => <li key={step}><span className="mono">{String(index + 1).padStart(2, "0")}</span><span>{step}</span>{index < loreCycle.length - 1 && <ArrowRight size={13} aria-hidden="true" />}</li>)}</ol><p className="mono lore-cycle-caption">CONCEPTUAL FLOW / INSTABILITY MAY RISE OR FALL BEFORE THE THRESHOLD</p></>}
          <div className="mono lore-chapter-note"><span className="hollow-dot" />{chapter.note}</div>
          {chapter.visual === "butterfly" && <a className="mono lore-reading" href="https://www.its.caltech.edu/~mcc/chaos_new/Lor_docs/butterfly.html" target="_blank" rel="noopener noreferrer">SCIENTIFIC READING / CALTECH: SENSITIVITY TO INITIAL CONDITIONS ↗</a>}
          {chapter.visual === "ending" && <a className="button secondary lore-end-link" href="#engine">Observe the proposed mechanism <ArrowDown size={15} /></a>}
        </Reveal>{i < loreChapters.length - 1 && <ChapterBreak />}
      </section>)}
    </div></div>
  </section>;
}
