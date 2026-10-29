<script setup>
// Owner: Ryan
// one hangout on 04 dashboard: a compact row, or the big UP NEXT card with a map when `featured`
// the whole card opens the hangout (the title is a stretched link), the button and the ⋯ menu keep their own clicks
import { computed, ref } from 'vue'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'
import PinIcon from '@/components/dashboard/PinIcon.vue'
import UpNextMap from '@/components/dashboard/UpNextMap.vue'
import WeatherLineIcon from '@/components/dashboard/WeatherLineIcon.vue'
import { isRain, sgHourKey } from '@/services/weather'
import { shortDate, countdownLabel } from '@/utils/dates'
import { getStatus, getProgress } from '@/utils/hangoutStatus'
import { useMediaQuery } from '@/composables/useMediaQuery'

// everything the card shows comes in from the dashboard, so the card never loads data itself
const props = defineProps({
  hangout: { type: Object, required: true }, // same shape as src/mocks/hangout.json
  canDelete: { type: Boolean, default: false }, // true for the host => Delete in the menu
  canLeave: { type: Boolean, default: false }, // true for other members => Leave in the menu
  myId: { type: String, default: null }, // who is looking, so the status can say whose turn it is
  hours: { type: Array, default: () => [] }, // hourly forecast from getHourlyForecast(), shared by all cards
  crowd: { type: String, default: null }, // 'l', 'm' or 'h' at the midpoint station, from getStationCrowd()
  featured: { type: Boolean, default: false }, // the big UP NEXT card
  showDate: { type: Boolean, default: false }, // put the date in the details line, for cards with no day heading above them
  past: { type: Boolean, default: false }, // (surya) on the Past tab: shows "Go again" for decided hangouts
  photos: { type: Array, default: () => [] }, // (surya) this hangout's photos, newest first, from getPhotos()
})

// (surya) a past hangout where a place was chosen (confirmed or done)
const pastAndDecided = computed(() => {
  const h = props.hangout
  if (!props.past || !h.final_shortlist_id) return false
  return (h.shortlist ?? []).some((s) => s.id === h.final_shortlist_id)
})

// (surya) "Go again": same group, place and starting points, you only pick a new date on 05
const goAgainLink = computed(() => {
  const h = props.hangout
  if (!pastAndDecided.value) return null // nothing to go back to
  const others = h.members.map((m) => m.user_id).filter((id) => id !== props.myId)
  return { name: 'create-hangout', query: { again: h.id, with: others } }
})

// (surya) the first 3 photos on the card, and "+4" for the rest, opening the photos on debrief
const shownPhotos = computed(() => props.photos.slice(0, 3))
const morePhotos = computed(() => props.photos.length - 3)

// the card can't change the dashboard's list itself, so it sends these up and the dashboard acts on them
const emit = defineEmits(['delete', 'leave', 'toggle-pin'])

const startsAt = computed(() => new Date(props.hangout.starts_at)) // the start time as a date, used below

// "7:00 pm"
const time = computed(() =>
  startsAt.value.toLocaleTimeString('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Singapore',
  }),
)

// the winning spot once confirmed, otherwise the midpoint
const location = computed(() => {
  const h = props.hangout
  if ((h.status === 'confirmed' || h.status === 'done') && h.final_shortlist_id) {
    const spot = (h.shortlist ?? []).find((s) => s.id === h.final_shortlist_id) // the spot that won the vote
    if (spot) return spot.name
  }
  return h.midpoint_name ? `Midpoint: ${h.midpoint_name}` : 'Midpoint not found yet'
})

// "7:00 pm · Near Bishan", with the date in front when the card has no day heading
const details = computed(() => {
  const when = props.showDate ? `${shortDate(startsAt.value)} · ${time.value}` : time.value
  return `${when} · ${location.value}`
})

// what the status line says, the button and where the card goes
// (surya) on the Past tab, a decided hangout opens its debrief (photos, how it went) even if nobody
// marked it done, so "View plan" becomes "See how it went"; the plan is one tap away from there
const status = computed(() => {
  const s = getStatus(props.hangout, props.myId) // all decided in utils/hangoutStatus.js
  if (pastAndDecided.value) return { ...s, button: 'See how it went', page: 'debrief' }
  return s
})

// the step shown, from the stored status (steps 2 to 4 aren't stored, so collecting stays on step 1)
const STAGES = {
  collecting: { n: 1, name: 'Starting points' },
  voting: { n: 5, name: 'Vote' },
}
// null once confirmed or done: "Confirmed" already says it
const stage = computed(() => STAGES[props.hangout.status] ?? null)

// "2 of 5 added a location", and who is still to do it (their avatars go grey)
const progress = computed(() => getProgress(props.hangout))

// the chip at the top of the UP NEXT card
const countdown = computed(() => (props.hangout.starts_at ? countdownLabel(startsAt.value) : '')) // empty when there's no date

// up to 4 avatars, the rest in a "+2" menu
const shownMembers = computed(() => props.hangout.members.slice(0, 4)) // the first 4
const extraMembers = computed(() => props.hangout.members.length - 4) // how many didn't fit, 0 or less means none

// the forecast hour of this hangout's start, null when there is none (done, no date, or too far ahead)
const hour = computed(() => {
  const h = props.hangout
  if (h.status === 'done' || !h.starts_at) return null
  return props.hours.find((x) => x.time === sgHourKey(h.starts_at)) ?? null // the forecast row for that hour
})

// the weather line: advice only when the weather changes the plan
const weatherLine = computed(() => {
  if (!hour.value) return null // no forecast, no line
  const { rainChance, condition, kind } = hour.value // pull the three fields out of the forecast hour
  const rainy = rainChance >= 50 || isRain(condition) // likely rain, or it's already raining
  // the chance is always shown, so every card reads the same
  let text = `${kind === 'thunder' ? 'Thunderstorms' : condition} · ${rainChance}% rain`
  // storms get stronger advice than rain
  if (kind === 'thunder') text += ', go indoors'
  else if (rainy) text += ', bring an umbrella'
  // a sun or cloud icon beside "80% rain" reads wrong, so use the rain icon unless it's thundery
  return { kind: rainy && kind !== 'thunder' ? 'rain' : kind, text: text, warn: rainy }
})

// the crowd at the midpoint station, only when we have a live reading
const CROWD_WORDS = { l: 'Quiet', m: 'Moderate', h: 'Busy' } // lta's letters as words
const crowdText = computed(() => {
  if (!props.crowd || !props.hangout.midpoint_name) return ''
  return `${CROWD_WORDS[props.crowd]} crowd at ${props.hangout.midpoint_name}` // "Busy crowd at Bishan"
})

// the coloured left edge and the status text colour, by tone
const TONES = {
  amber: { edge: 'edge-amber', text: 'text-warning-emphasis' },
  grey: { edge: 'edge-grey', text: 'text-secondary-emphasis' },
  green: { edge: 'edge-green', text: 'text-success-emphasis' },
}
const tone = computed(() => TONES[status.value.tone]) // the two class names for this card's tone

// the map needs a screen wide enough (576px and up) and somewhere to point at
// useMediaQuery keeps the map from being made at all on phones, which css alone can't do (css can only hide it after it's made).
const wide = useMediaQuery('(min-width: 576px)')
const midpoint = computed(() => {
  const h = props.hangout
  // != null catches both null and undefined, and lets a real 0 through
  return h.midpoint_lat != null && h.midpoint_lng != null
    ? { lat: h.midpoint_lat, lng: h.midpoint_lng }
    : null
})
const hasStart = computed(() => props.hangout.members.some((m) => m.start_lat != null)) // anyone placed on the map
const showMap = computed(() => props.featured && wide.value && (midpoint.value || hasStart.value)) // up next, wide enough, and something to show

// copy the invite link, like the hangout bar does, then say so for 2 seconds
const inviteCopied = ref(false)

async function copyInvite() {
  const link = `${window.location.origin}/login?invite=${props.hangout.invite_code}` // e.g. https://fairpoint.app/login?invite=abc123
  try {
    await navigator.clipboard.writeText(link)
    inviteCopied.value = true // shows "Link copied"
    setTimeout(() => {
      inviteCopied.value = false // and hides it again after 2 seconds
    }, 2000)
  } catch (err) {
    console.error(err)
    window.prompt('Copy this invite link:', link) // some browsers block copying
  }
}
</script>

<template>
  <!-- the tone class colours the left edge, featured makes it the big up next card -->
  <article class="card hangout" :class="[tone.edge, { featured }]">
    <!-- with a map: map and content side by side (map on the right from 768px), without: just the content -->
    <div :class="showMap ? 'd-flex flex-column flex-md-row-reverse' : ''">
      <UpNextMap
        v-if="showMap"
        class="map-panel"
        :members="hangout.members"
        :midpoint="midpoint"
        :label="hangout.midpoint_name ?? ''"
      />

      <div class="body">
        <!-- countdown, title, details, weather and crowd -->
        <div class="main">
          <span v-if="featured && countdown" class="countdown">{{ countdown }}</span>
          <h3 class="title">
            <!-- stretched-link makes this link cover the whole card, so a tap anywhere opens the hangout -->
            <router-link
              class="stretched-link text-reset text-decoration-none"
              :to="{ name: status.page, params: { id: hangout.id } }"
            >
              {{ hangout.name }}
            </router-link>
            <PinIcon v-if="hangout.pinned" filled :size="14" class="text-success ms-1" />
          </h3>
          <p class="meta">{{ details }}</p>
          <!-- amber text when rain is likely -->
          <!-- (surya) photos from the day, tap to see them all on debrief -->
          <router-link
            v-if="shownPhotos.length > 0"
            class="photo-strip"
            :to="{ name: 'debrief', params: { id: hangout.id }, hash: '#photos' }"
            :aria-label="`See ${photos.length} photos from ${hangout.name}`"
          >
            <img v-for="p in shownPhotos" :key="p.id" :src="p.url" alt="" loading="lazy" />
            <span v-if="morePhotos > 0" class="photo-more">+{{ morePhotos }}</span>
          </router-link>
          <p v-if="weatherLine || crowdText" class="wx" :class="{ 'wx-warn': weatherLine?.warn }">
            <template v-if="weatherLine">
              <WeatherLineIcon :kind="weatherLine.kind" />
              <span>{{ weatherLine.text }}</span>
            </template>
            <span v-if="crowdText">{{ crowdText }}</span>
          </p>
        </div>

        <!-- "step 1 of 6" and its bar, only on compact rows (hidden by css until 992px) -->
        <div v-if="!featured" class="stage">
          <template v-if="stage">
            <span class="stage-label">Step {{ stage.n }} of 6</span>
            <span class="stage-name"> · {{ stage.name }}</span>
            <div class="stage-track" aria-hidden="true">
              <!-- the green fill, e.g. step 1 of 6 fills about 17% -->
              <div class="stage-fill" :style="{ width: (stage.n / 6) * 100 + '%' }"></div>
            </div>
          </template>
        </div>

        <!-- avatars and status on the left, the main button on the right -->
        <div class="foot">
          <div class="people">
            <div class="avatars d-flex align-items-center">
              <!-- people still to act get the is-waiting class, which greys them out -->
              <MemberAvatar
                v-for="m in shownMembers"
                :key="m.user_id"
                :name="m.display_name"
                :color="m.avatar_color"
                :size="featured ? 32 : 28"
                :class="{ 'is-waiting': progress?.waitingIds.includes(m.user_id) }"
              />
              <!-- "+2" opens a list of every member -->
              <div v-if="extraMembers > 0" class="dropdown">
                <button
                  type="button"
                  class="btn btn-sm rounded-pill members-more"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  :aria-label="`Show all ${hangout.members.length} members`"
                >
                  +{{ extraMembers }}
                </button>
                <ul class="dropdown-menu">
                  <li v-for="m in hangout.members" :key="m.user_id" class="dropdown-item-text">
                    {{ m.display_name }}
                  </li>
                </ul>
              </div>
            </div>
            <!-- "Your turn", "Waiting on Mei" or "Confirmed" with a tick -->
            <span class="status" :class="tone.text">
              <svg
                v-if="status.check"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.4"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              {{ status.text }}
            </span>
            <!-- "3 of 4 voted", only while someone is still to act -->
            <span v-if="progress?.waitingIds.length" class="progress-text">{{
              progress.text
            }}</span>
          </div>

          <!-- solid green when it's my turn (fill), a quiet outline otherwise -->
          <div class="act" :class="{ 'act--again': goAgainLink }">
            <!-- (surya) past and decided: do it again with the same group and place -->
            <router-link
              v-if="goAgainLink"
              :to="goAgainLink"
              class="btn btn-outline-primary text-nowrap"
            >
              ↻ Go again
            </router-link>
            <router-link
              :to="{ name: status.page, params: { id: hangout.id } }"
              class="btn text-nowrap"
              :class="status.fill ? 'btn-primary' : 'btn-outline-secondary btn-quiet'"
            >
              {{ status.button }}
            </router-link>
          </div>
        </div>

        <!-- the ⋯ menu in the top right corner -->
        <div class="more dropdown">
          <span v-if="inviteCopied" class="small text-success me-1" role="status">Link copied</span>
          <button
            type="button"
            class="btn btn-link text-muted menu-btn"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            :aria-label="`More options for ${hangout.name}`"
          >
            ···
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li>
              <!-- tells the dashboard to pin or unpin, it saves the change -->
              <button type="button" class="dropdown-item" @click="emit('toggle-pin', hangout)">
                <PinIcon :filled="!!hangout.pinned" :size="14" class="me-2" />{{
                  hangout.pinned ? 'Unpin' : 'Pin to top'
                }}
              </button>
            </li>
            <li>
              <button type="button" class="dropdown-item" @click="copyInvite">
                Copy invite link
              </button>
            </li>
            <!-- a divider only when there's a red option below it -->
            <li v-if="canDelete || canLeave"><hr class="dropdown-divider" /></li>
            <!-- the host can delete, everyone else can leave: data-bs-target opens the dashboard's confirm dialog -->
            <li v-if="canDelete">
              <button
                type="button"
                class="dropdown-item text-danger"
                data-bs-toggle="modal"
                data-bs-target="#confirm-modal"
                @click="emit('delete', hangout)"
              >
                Delete hangout
              </button>
            </li>
            <li v-else-if="canLeave">
              <button
                type="button"
                class="dropdown-item text-danger"
                data-bs-toggle="modal"
                data-bs-target="#confirm-modal"
                @click="emit('leave', hangout)"
              >
                Leave hangout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
/* the coloured left edge: amber = your turn, grey = waiting on others, green = confirmed */
.hangout {
  border-left-width: 4px;
}
.edge-amber {
  border-left-color: var(--bs-warning);
}
.edge-grey {
  border-left-color: var(--bs-gray-500);
}
.edge-green {
  border-left-color: var(--bs-success);
}

.body {
  position: relative; /* the ⋯ menu is placed inside this box */
  min-width: 0; /* lets long text shrink instead of pushing the card wider */
  flex: 1 1 auto;
  padding: 0.875rem 3.25rem 0.875rem 1rem; /* extra space on the right for the ⋯ menu */
}
.main {
  min-width: 0;
}
.title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
}
/* the details line stays on one line and ends in … if it's too long */
.meta {
  margin: 0.125rem 0 0;
  color: var(--bs-secondary-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* the weather and crowd line */
.wx {
  display: flex;
  flex-wrap: wrap; /* crowd moves to a new line if there's no room */
  align-items: center;
  gap: 0.125rem 0.5rem;
  margin: 0.125rem 0 0;
  color: var(--bs-secondary-color);
  font-size: 0.78rem;
}
.wx svg {
  flex: none; /* the icon never shrinks */
}
.wx-warn {
  color: var(--bs-warning-text-emphasis); /* amber when rain is likely */
  font-weight: 500;
}

/* avatars and status on the left, button on the right */
.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.75rem;
}
/* phones: avatars, status and progress stacked */
.people {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.3rem;
  min-width: 0;
}
.status {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem; /* space between the tick and the text */
  font-size: 0.85rem;
  font-weight: 600;
}
/* :deep reaches into MemberAvatar, which scoped css can't style otherwise */
.avatars :deep(.avatar) {
  margin-left: -8px; /* avatars overlap a little */
}
.avatars :deep(.avatar:first-child) {
  margin-left: 0; /* except the first */
}
.members-more::after {
  content: '';
  position: absolute;
  inset: -8px -4px; /* a bigger tap area than the small pill */
}
.members-more {
  position: relative;
  z-index: 2; /* above the stretched link, so it opens the member list instead of the hangout */
  margin-left: 0.25rem;
  background: var(--bs-tertiary-bg);
  font-size: 0.75rem;
  font-weight: 600;
}

/* (surya) up to 3 photo thumbnails on a past card, above the stretched link so they open the photos */
.photo-strip {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 0.5rem;
  text-decoration: none;
}
.photo-strip img {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
}
.photo-more {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: var(--bs-tertiary-bg);
  color: var(--bs-emphasis-color);
  font-size: 0.8rem;
  font-weight: 700;
}

/* (surya) past card with "Go again": the two buttons side by side, or stacked in the narrow column */
.act--again {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* buttons sit above the stretched link and are 44px tall on touch screens */
.act .btn,
.menu-btn {
  position: relative;
  z-index: 2;
  min-height: 44px;
  font-weight: 600;
}
.btn-quiet {
  display: none; /* the card itself is the tap target, so outline buttons only show from 576px */
  color: var(--bs-emphasis-color);
  border-color: var(--bs-gray-600);
}
/* the ⋯ menu pinned to the top right corner */
.more {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  display: flex;
  align-items: center;
}
.menu-btn {
  width: 44px;
  padding: 0;
  text-decoration: none;
  letter-spacing: 2px; /* spreads the three dots */
  font-size: 1.25rem;
  line-height: 1;
}

/* UP NEXT */
/* the green "in 2 days" chip */
.countdown {
  display: inline-flex;
  align-items: center;
  min-height: 1.6rem;
  margin-bottom: 0.5rem;
  padding: 0 0.65rem;
  border-radius: 999px;
  background: var(--bs-success-bg-subtle);
  color: var(--bs-success-text-emphasis);
  font-size: 0.78rem;
  font-weight: 700;
}
/* the featured card is roomier, with a bigger title */
.featured .body {
  padding: 1rem 3.5rem 1rem 1rem;
}
.featured .title {
  font-size: 1.3rem;
}
.featured .meta {
  font-size: 0.9rem;
}
.featured .more {
  top: 0.5rem;
  right: 0.5rem;
}
/* a line above the avatars and button */
.featured .foot {
  flex-wrap: wrap;
  justify-content: flex-start;
  margin-top: 0.875rem;
  padding-top: 0.875rem;
  border-top: 1px solid var(--bs-border-color);
}
.featured .people {
  flex-direction: row; /* avatars and status side by side even on phones */
  align-items: center;
  flex-wrap: wrap;
  gap: 0.625rem;
}
.featured .act {
  width: 100%; /* phones: a full-width button on its own line */
}
.featured .btn-quiet {
  display: inline-flex; /* the UP NEXT card keeps its button on phones too */
  align-items: center;
  justify-content: center;
}
.featured .act .btn {
  width: 100%;
}
/* phones: the map is a 140px strip on top with rounded top corners */
.map-panel {
  border-radius: var(--bs-card-inner-border-radius) var(--bs-card-inner-border-radius) 0 0;
  height: 140px;
}

/* the step and its bar: only in the wide row (lg), where there is a column for it */
/* people still to act: faded and grey */
.avatars :deep(.avatar.is-waiting) {
  opacity: 0.4;
  filter: grayscale(1);
}
.progress-text {
  font-size: 0.75rem;
  color: var(--fp-muted);
}
.stage {
  display: none; /* shown from 992px, below */
}
.stage-label {
  font-size: 0.8125rem;
  font-weight: 600;
}
.stage-name {
  font-size: 0.8125rem;
  color: var(--fp-muted);
}
/* the grey track the green fill sits in */
.stage-track {
  height: 6px;
  margin-top: 0.375rem;
  border-radius: 3px;
  background: var(--bs-border-color);
  overflow: hidden;
}
.stage-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--fp-primary);
}

/* sm 576: status beside the avatars, all buttons shown, the map above the content */
@media (min-width: 576px) {
  .people {
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.625rem;
  }
  .btn-quiet {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .featured .act {
    width: auto;
    margin-left: auto; /* pushes the button to the right */
  }
  .featured .act .btn {
    width: auto;
  }
}

/* md 768: the map sits beside the content */
@media (min-width: 768px) {
  .map-panel {
    flex: 0 0 41.6667%; /* 5 of bootstrap's 12 columns */
    height: auto;
    min-height: 200px;
    border-radius: 0 var(--bs-card-inner-border-radius) var(--bs-card-inner-border-radius) 0; /* rounded on the right now */
  }
}

/* lg 992: a row becomes a five column grid: content | step | avatars + status | button | ⋯ */
@media (min-width: 992px) {
  .map-panel {
    flex-basis: 33.3333%; /* 4 of 12 columns */
  }
  .featured .title {
    font-size: 1.5rem;
  }
  .hangout:not(.featured) .body {
    display: grid;
    /* fixed widths so every row's columns line up */
    grid-template-columns: minmax(0, 1fr) 190px 200px 170px 44px;
    align-items: center;
    column-gap: 1.5rem;
    padding: 0.875rem 1rem;
  }
  .hangout:not(.featured) .stage {
    display: block;
  }
  /* contents removes the foot's own box, so its children become grid columns */
  .hangout:not(.featured) .foot {
    display: contents;
  }
  .hangout:not(.featured) .people {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  .hangout:not(.featured) .status {
    white-space: nowrap;
  }
  .hangout:not(.featured) .act {
    justify-self: center;
  }
  .hangout:not(.featured) .act--again {
    flex-direction: column;
  }
  .hangout:not(.featured) .act .btn {
    min-width: 150px;
    min-height: 44px;
  }
  /* the ⋯ menu becomes the last grid column instead of floating in the corner */
  .hangout:not(.featured) .more {
    position: static;
  }
  .hangout:not(.featured) .menu-btn {
    width: 44px;
    min-height: 44px;
  }
}
</style>
