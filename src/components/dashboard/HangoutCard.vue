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
import { getStatus } from '@/utils/hangoutStatus'
import { useMediaQuery } from '@/utils/useMediaQuery'

const props = defineProps({
  hangout: { type: Object, required: true }, // same shape as src/mocks/hangout.json
  canDelete: { type: Boolean, default: false }, // true for the host => Delete in the menu
  canLeave: { type: Boolean, default: false }, // true for other members => Leave in the menu
  myId: { type: String, default: null }, // who is looking, so the status can say whose turn it is
  hours: { type: Array, default: () => [] }, // hourly forecast from getHourlyForecast(), shared by all cards
  crowd: { type: String, default: null }, // 'l', 'm' or 'h' at the midpoint station, from getStationCrowd()
  featured: { type: Boolean, default: false }, // the big UP NEXT card
  showDate: { type: Boolean, default: false }, // put the date in the details line, for cards with no day heading above them
})

const emit = defineEmits(['delete', 'leave', 'toggle-pin'])

const startsAt = computed(() => new Date(props.hangout.starts_at))

// "7:00 pm"
const time = computed(() =>
  startsAt.value.toLocaleTimeString('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Singapore',
  }),
)

// the winning spot once confirmed, otherwise the midpoint station
const location = computed(() => {
  const h = props.hangout
  if ((h.status === 'confirmed' || h.status === 'done') && h.final_shortlist_id) {
    const spot = (h.shortlist ?? []).find((s) => s.id === h.final_shortlist_id)
    if (spot) return spot.name
  }
  return h.midpoint_name ? `Near ${h.midpoint_name}` : 'Location not set yet'
})

// "7:00 pm · Near Bishan", with the date in front when the card has no day heading
const details = computed(() => {
  const when = props.showDate ? `${shortDate(startsAt.value)} · ${time.value}` : time.value
  return `${when} · ${location.value}`
})

// what the status line says, the button and where the card goes
const status = computed(() => getStatus(props.hangout, props.myId))

// the chip at the top of the UP NEXT card
const countdown = computed(() => (props.hangout.starts_at ? countdownLabel(startsAt.value) : ''))

// up to 4 avatars, the rest in a "+2" menu
const shownMembers = computed(() => props.hangout.members.slice(0, 4))
const extraMembers = computed(() => props.hangout.members.length - 4)

// the forecast hour of this hangout's start, null when there is none (done, no date, or too far ahead)
const hour = computed(() => {
  const h = props.hangout
  if (h.status === 'done' || !h.starts_at) return null
  return props.hours.find((x) => x.time === sgHourKey(h.starts_at)) ?? null
})

// the weather line: advice only when the weather changes the plan
const weatherLine = computed(() => {
  if (!hour.value) return null
  const rainy = hour.value.rainChance >= 50 || isRain(hour.value.condition)
  let text = hour.value.condition
  if (hour.value.kind === 'thunder') text = 'Thunderstorms, go indoors'
  else if (rainy) text = `${text}, bring an umbrella`
  return { kind: hour.value.kind, text: text, warn: rainy }
})

// the crowd at the midpoint station, only when we have a live reading
const CROWD_WORDS = { l: 'Quiet', m: 'Moderate', h: 'Busy' }
const crowdText = computed(() => {
  if (!props.crowd || !props.hangout.midpoint_name) return ''
  return `${CROWD_WORDS[props.crowd]} crowd at ${props.hangout.midpoint_name}`
})

// the coloured left edge and the status text colour, by tone
const TONES = {
  amber: { edge: 'edge-amber', text: 'text-warning-emphasis' },
  grey: { edge: 'edge-grey', text: 'text-secondary-emphasis' },
  green: { edge: 'edge-green', text: 'text-success-emphasis' },
}
const tone = computed(() => TONES[status.value.tone])

// the map needs a screen wide enough (576px and up) and somewhere to point at
const wide = useMediaQuery('(min-width: 576px)')
const midpoint = computed(() => {
  const h = props.hangout
  return h.midpoint_lat != null && h.midpoint_lng != null
    ? { lat: h.midpoint_lat, lng: h.midpoint_lng }
    : null
})
const hasStart = computed(() => props.hangout.members.some((m) => m.start_lat != null))
const showMap = computed(() => props.featured && wide.value && (midpoint.value || hasStart.value))

// copy the invite link, like the hangout bar does, then say so for 2 seconds
const inviteCopied = ref(false)

async function copyInvite() {
  const link = `${window.location.origin}/login?invite=${props.hangout.invite_code}`
  try {
    await navigator.clipboard.writeText(link)
    inviteCopied.value = true
    setTimeout(() => {
      inviteCopied.value = false
    }, 2000)
  } catch (err) {
    console.error(err)
    window.prompt('Copy this invite link:', link) // some browsers block copying
  }
}
</script>

<template>
  <article class="card hangout" :class="[tone.edge, { featured }]">
    <div :class="showMap ? 'd-flex flex-column flex-md-row-reverse' : ''">
      <UpNextMap v-if="showMap" class="map-panel" :members="hangout.members" :midpoint="midpoint" />

      <div class="body">
        <div class="main">
          <span v-if="featured && countdown" class="countdown">{{ countdown }}</span>
          <h3 class="title">
            <router-link
              class="stretched-link text-reset text-decoration-none"
              :to="{ name: status.page, params: { id: hangout.id } }"
            >
              {{ hangout.name }}
            </router-link>
            <PinIcon v-if="hangout.pinned" filled :size="14" class="text-success ms-1" />
          </h3>
          <p class="meta">{{ details }}</p>
          <p v-if="weatherLine || crowdText" class="wx" :class="{ 'wx-warn': weatherLine?.warn }">
            <template v-if="weatherLine">
              <WeatherLineIcon :kind="weatherLine.kind" />
              <span>{{ weatherLine.text }}</span>
            </template>
            <span v-if="crowdText">{{ crowdText }}</span>
          </p>
        </div>

        <div class="foot">
          <div class="people">
            <div class="avatars d-flex align-items-center">
              <MemberAvatar
                v-for="m in shownMembers"
                :key="m.user_id"
                :name="m.display_name"
                :color="m.avatar_color"
                :size="featured ? 32 : 28"
              />
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
          </div>

          <div class="act">
            <router-link
              :to="{ name: status.page, params: { id: hangout.id } }"
              class="btn text-nowrap"
              :class="status.fill ? 'btn-primary' : 'btn-outline-secondary btn-quiet'"
            >
              {{ status.button }}
            </router-link>
          </div>
        </div>

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
            <li v-if="canDelete || canLeave"><hr class="dropdown-divider" /></li>
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
  position: relative;
  min-width: 0;
  flex: 1 1 auto;
  padding: 0.875rem 3.25rem 0.875rem 1rem;
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
.meta {
  margin: 0.125rem 0 0;
  color: var(--bs-secondary-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wx {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.125rem 0.5rem;
  margin: 0.125rem 0 0;
  color: var(--bs-secondary-color);
  font-size: 0.78rem;
}
.wx svg {
  flex: none;
}
.wx-warn {
  color: var(--bs-warning-text-emphasis);
  font-weight: 500;
}

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.75rem;
}
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
  gap: 0.25rem;
  font-size: 0.85rem;
  font-weight: 600;
}
.avatars :deep(.avatar) {
  margin-left: -8px;
}
.avatars :deep(.avatar:first-child) {
  margin-left: 0;
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
  letter-spacing: 2px;
  font-size: 1.25rem;
  line-height: 1;
}

/* UP NEXT */
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
.featured .foot {
  flex-wrap: wrap;
  justify-content: flex-start;
  margin-top: 0.875rem;
  padding-top: 0.875rem;
  border-top: 1px solid var(--bs-border-color);
}
.featured .people {
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.625rem;
}
.featured .act {
  width: 100%;
}
.featured .btn-quiet {
  display: inline-flex; /* the UP NEXT card keeps its button on phones too */
  align-items: center;
  justify-content: center;
}
.featured .act .btn {
  width: 100%;
}
.map-panel {
  border-radius: var(--bs-card-inner-border-radius) var(--bs-card-inner-border-radius) 0 0;
  height: 140px;
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
    margin-left: auto;
  }
  .featured .act .btn {
    width: auto;
  }
}

/* md 768: the map sits beside the content */
@media (min-width: 768px) {
  .map-panel {
    flex: 0 0 41.6667%;
    height: auto;
    min-height: 200px;
    border-radius: 0 var(--bs-card-inner-border-radius) var(--bs-card-inner-border-radius) 0;
  }
}

/* lg 992: a row becomes a four column grid: content | avatars + status | button | ⋯ */
@media (min-width: 992px) {
  .map-panel {
    flex-basis: 33.3333%;
  }
  .featured .title {
    font-size: 1.5rem;
  }
  .hangout:not(.featured) .body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 240px 170px 32px;
    align-items: center;
    column-gap: 1rem;
    padding: 0.875rem 1rem;
  }
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
  .hangout:not(.featured) .act .btn {
    min-width: 150px;
    min-height: 38px;
  }
  .hangout:not(.featured) .more {
    position: static;
  }
  .hangout:not(.featured) .menu-btn {
    width: 32px;
    min-height: 32px;
  }
}
</style>
