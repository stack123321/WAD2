<script setup>
// Owner: Matrix (landing). The landing hero as a scroll scene, like animejs.com: the hero stays
// pinned while you scroll through it. The headline lifts away, each friend's route draws across a
// simple map of Singapore to the fair spot, the map zooms in on it, and a caption says how fair it
// is. The scroll drives the timeline (anime.js onScroll, synced), so scrolling back plays it in
// reverse. Under reduced motion nothing is pinned or animated: the finished map shows as a still.
// The hero's headline and buttons come in through the default slot.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { createTimeline, onScroll, stagger, svg } from 'animejs'

// Sample friends (the same people as the landing's trip panel), placed on the map's 1000 × 560 grid
const friends = [
  {
    initial: 'S',
    place: 'Woodlands',
    mins: 27,
    x: 440,
    y: 140,
    tone: 'violet',
    route: 'M440 140 Q470 210 545 245',
    chip: [-36, -48],
  },
  {
    initial: 'H',
    place: 'Punggol',
    mins: 27,
    x: 735,
    y: 175,
    tone: 'ochre',
    route: 'M735 175 Q640 190 545 245',
    chip: [-36, -48],
  },
  {
    initial: 'R',
    place: 'Tampines',
    mins: 34,
    x: 845,
    y: 262,
    tone: 'teal',
    route: 'M845 262 Q700 230 545 245',
    chip: [-36, 26],
  },
  {
    initial: 'E',
    place: 'Paya Lebar',
    mins: 22,
    x: 700,
    y: 320,
    tone: 'blue',
    route: 'M700 320 Q620 300 545 245',
    chip: [-36, 26],
  },
  {
    initial: 'N',
    place: 'Jurong East',
    mins: 36,
    x: 245,
    y: 312,
    tone: 'rust',
    route: 'M245 312 Q380 230 545 245',
    chip: [-36, 26],
  },
]
const midpoint = { x: 545, y: 245, name: 'Bishan' }

const longest = Math.max(...friends.map((f) => f.mins))
const shortest = Math.min(...friends.map((f) => f.mins))
const gap = computed(() => longest - shortest)

const section = ref(null)
const animated = ref(false)
let timeline = null

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  animated.value = true
  const el = section.value
  const q = (selector) => el.querySelectorAll(selector)

  // Progress 0 when the section's top reaches the top of the screen, 1 when its bottom reaches
  // the bottom: the whole time the stage is pinned
  timeline = createTimeline({
    defaults: { ease: 'out(3)' },
    autoplay: onScroll({
      target: el,
      enter: { target: 'top', container: 'top' },
      leave: { target: 'bottom', container: 'bottom' },
      sync: 0.6,
    }),
  })
    .add(q('.scroll-copy'), { opacity: [1, 0], translateY: [0, -56], duration: 240 }, 0)
    .add(q('.map-base'), { opacity: [0.55, 1], duration: 200 }, 80)
    .add(q('.friend'), { opacity: [0.3, 1], duration: 200 }, 100)
    .add(
      svg.createDrawable(q('.route')),
      { draw: ['0 0', '0 1'], duration: 320, delay: stagger(45) },
      160,
    )
    .add(
      q('.trip-chip'),
      { opacity: [0, 1], scale: [0.8, 1], duration: 140, delay: stagger(35) },
      380,
    )
    .add(
      q('.mid-pin'),
      { opacity: [0, 1], scale: [0.2, 1], duration: 160, ease: 'outBack(2)' },
      470,
    )
    .add(q('.map-zoom'), { scale: [1, 1.7], duration: 360, ease: 'inOut(2)' }, 560)
    .add(q('.trip-chip'), { opacity: 0, duration: 120 }, 620)
    .add(q('.scroll-caption'), { opacity: [0, 1], translateY: [32, 0], duration: 200 }, 800)
})

onBeforeUnmount(() => {
  timeline?.revert()
})
</script>

<template>
  <section ref="section" class="hero-scroll" :class="{ 'is-animated': animated }">
    <div class="stage">
      <div class="map-frame" aria-hidden="true">
        <div class="map-zoom">
          <svg class="map" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet">
            <g class="map-base">
              <path
                class="land"
                d="M70 330C90 290 150 270 210 262C260 255 300 220 340 180C380 140 430 112 480 118C540 125 590 140 640 138C700 136 760 150 810 185C860 220 920 240 955 265C975 280 965 305 930 315C870 332 800 345 740 360C690 372 650 400 600 412C550 424 500 410 450 405C380 398 320 410 260 400C200 390 140 385 100 370C75 360 62 345 70 330Z"
              />
              <ellipse class="land" cx="565" cy="445" rx="28" ry="9" />
              <ellipse class="land" cx="805" cy="128" rx="40" ry="11" />
              <path
                class="rail"
                d="M245 312C300 230 380 160 440 140C500 150 530 200 545 245C560 300 575 360 590 395"
              />
              <path class="rail" d="M120 335C245 312 400 330 600 380C700 330 800 290 900 270" />
              <path class="rail" d="M735 175C680 230 620 300 600 395" />
            </g>

            <path
              v-for="f in friends"
              :key="`route-${f.initial}`"
              class="route"
              :class="`tone-${f.tone}`"
              :d="f.route"
            />

            <g v-for="f in friends" :key="`pin-${f.initial}`" class="friend">
              <g class="pin-size">
                <circle class="pin" :class="`tone-${f.tone}`" :cx="f.x" :cy="f.y" r="17" />
                <text class="pin-initial" :x="f.x" :y="f.y" dy="0.35em">{{ f.initial }}</text>
              </g>
              <g :transform="`translate(${f.x + f.chip[0]} ${f.y + f.chip[1]})`">
                <g class="chip-size">
                  <g class="trip-chip">
                    <rect width="72" height="26" rx="13" />
                    <text x="36" y="13" dy="0.35em">{{ f.mins }} min</text>
                  </g>
                </g>
              </g>
            </g>

            <g class="mid-pin">
              <circle class="mid-halo" :cx="midpoint.x" :cy="midpoint.y" r="34" />
              <circle class="mid-dot" :cx="midpoint.x" :cy="midpoint.y" r="11" />
            </g>
          </svg>
        </div>
      </div>

      <div class="scroll-copy">
        <slot />
      </div>

      <div class="scroll-caption">
        <p class="caption-title">{{ midpoint.name }}.</p>
        <p class="caption-text">
          Five friends, five trips. The longest is {{ longest }} min, the shortest {{ shortest }}:
          nobody's more than {{ gap }} minutes worse off.
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Pinned scene: the section is tall, the stage sticks to the screen while you scroll through it */
.hero-scroll {
  position: relative;
  height: 300vh;
}

.stage {
  position: sticky;
  top: 0;
  height: 100svh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  isolation: isolate;
}

/* The map fills the stage behind the copy, kept at the map's own proportions */
.map-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: -1;
  width: max(100%, 170svh);
  transform: translate(-50%, -50%);
}

.map-zoom {
  transform-origin: 54.5% 43.75%; /* the fair spot on the map */
  will-change: transform;
}

.map {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.land {
  fill: var(--fp-surface);
  stroke: var(--fp-pill);
  stroke-width: 2;
}

.rail {
  fill: none;
  stroke: var(--fp-pill);
  stroke-width: 3;
  stroke-linecap: round;
}

.route {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
}

.pin-initial,
.trip-chip text {
  font-family: var(--fp-font);
  font-weight: 700;
  text-anchor: middle;
}

.pin-initial {
  fill: var(--fp-bg);
  font-size: 15px;
}

.trip-chip rect {
  fill: var(--fp-bg);
  stroke: var(--fp-border);
}

.trip-chip text {
  fill: var(--fp-ink);
  font-size: 13px;
}

.trip-chip,
.mid-pin,
.pin-size,
.chip-size {
  transform-box: fill-box;
  transform-origin: center;
}

.mid-halo {
  fill: var(--fp-tint);
  stroke: var(--fp-primary);
  stroke-width: 2;
}

.mid-dot {
  fill: var(--fp-primary);
}

/* Each friend's colour for their pin (fill) and route (stroke) */
.tone-teal {
  fill: var(--fp-primary);
  stroke: var(--fp-primary);
}

.tone-rust {
  fill: var(--fp-avatar-rust);
  stroke: var(--fp-avatar-rust);
}

.tone-violet {
  fill: var(--fp-avatar-violet);
  stroke: var(--fp-avatar-violet);
}

.tone-ochre {
  fill: var(--fp-avatar-ochre);
  stroke: var(--fp-avatar-ochre);
}

.tone-blue {
  fill: var(--fp-avatar-blue);
  stroke: var(--fp-avatar-blue);
}

.route.tone-teal,
.route.tone-rust,
.route.tone-violet,
.route.tone-ochre,
.route.tone-blue {
  fill: none;
}

.pin {
  stroke: var(--fp-bg);
  stroke-width: 3;
}

.scroll-copy {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 1.5rem;
  text-align: center;
}

/* The closing caption sits low on the stage once the map has zoomed in */
.scroll-caption {
  position: absolute;
  left: 1rem;
  right: 1rem;
  bottom: clamp(2rem, 8svh, 5rem);
  max-width: 34rem;
  margin: 0 auto;
  padding: 1.5rem 1.75rem;
  background: var(--fp-bg);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  text-align: center;
}

.caption-title {
  margin: 0;
  color: var(--fp-primary);
  font-family: var(--fp-display);
  font-weight: 800;
  font-size: clamp(2.5rem, 5vw, 3.5rem);
  line-height: 1;
  letter-spacing: -0.02em;
}

.caption-text {
  margin: 0.6rem 0 0;
  color: var(--fp-muted);
  font-size: 1.05rem;
  line-height: 1.5;
}

/* Before the scroll starts: the caption is hidden and the map is quiet (the timeline takes over) */
.is-animated .scroll-caption {
  opacity: 0;
}

.is-animated .trip-chip,
.is-animated .mid-pin {
  opacity: 0;
}

/* friends' pins start faint so they don't crowd the headline */
.is-animated .friend {
  opacity: 0.3;
}

/* Reduced motion: no pinning, nothing moves; the headline, the finished map and the caption stack */
.hero-scroll:not(.is-animated) {
  height: auto;
}

.hero-scroll:not(.is-animated) .stage {
  position: relative;
  height: auto;
  gap: 2.5rem;
  padding: 5rem 0;
}

.hero-scroll:not(.is-animated) .map-frame {
  position: relative;
  top: auto;
  left: auto;
  z-index: 0;
  order: 2;
  width: min(100%, 1000px);
  transform: none;
}

.hero-scroll:not(.is-animated) .scroll-caption {
  position: relative;
  bottom: auto;
  order: 3;
}

@media (max-width: 575.98px) {
  .hero-scroll {
    height: 260vh;
  }

  /* wide enough to read, narrow enough that every friend stays on screen */
  .map-frame {
    width: 135%;
  }

  /* the map is drawn smaller on a phone, so pins and trip times are drawn bigger to stay legible */
  .pin-size {
    transform: scale(1.5);
  }

  .chip-size {
    transform: scale(1.8);
  }

  .scroll-copy {
    padding: 0 1rem;
  }
}
</style>
