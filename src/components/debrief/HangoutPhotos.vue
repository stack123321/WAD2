<script setup>
// Owner: Surya. "Photos" on Debrief: everyone in the hangout can add photos from the day, so the
// Past tab is somewhere to look back. Tap a photo to see it big (Esc or ✕ closes it), and remove
// your own (the host can remove any). Photos are shrunk on the phone before uploading.
// Usage: <HangoutPhotos :hangout-id="hangoutId" :my-id="myId" :is-host="isHost" />
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { addPhoto, deletePhoto, getPhotos } from '@/services/photos'
import { isMockHangout } from '@/services/votes'

const props = defineProps({
  hangoutId: { type: String, required: true },
  myId: { type: String, default: null },
  isHost: { type: Boolean, default: false },
})

const route = useRoute()
const isSample = isMockHangout(props.hangoutId)
const section = ref(null)

const photos = ref([])
const loading = ref(true)
const loadError = ref('')

// Part (a) Load the photos
async function loadPhotos() {
  loadError.value = ''
  try {
    photos.value = await getPhotos([props.hangoutId])
  } catch (err) {
    console.error(err)
    loadError.value = 'Couldn’t load the photos. Try again later.'
  }
  loading.value = false
}

// Opened from the photos on a Past card (#photos): scroll down to them once they're loaded
onMounted(async () => {
  await loadPhotos()
  if (route.hash === '#photos') {
    await nextTick()
    section.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
})

// Part (b) Add photos: one at a time, saying how far it's got
const fileInput = ref(null)
const uploading = ref(false)
const progressText = ref('')
const uploadErrors = ref([])

function pickPhotos() {
  fileInput.value.click()
}

async function onFiles(event) {
  const files = [...event.target.files]
  event.target.value = '' // so picking the same photo again still works
  if (files.length === 0) {
    return
  }
  uploading.value = true
  uploadErrors.value = []
  let n = 0
  for (const file of files) {
    n += 1
    progressText.value = `Uploading ${n} of ${files.length}…`
    try {
      await addPhoto(props.hangoutId, props.myId, file)
    } catch (err) {
      console.error(err)
      uploadErrors.value.push(err.message || `Couldn’t upload ${file.name}.`)
    }
  }
  uploading.value = false
  progressText.value = ''
  await loadPhotos()
}

// Part (c) See one photo big
const openPhoto = ref(null)
const viewer = ref(null)

async function show(photo) {
  openPhoto.value = photo
  await nextTick()
  viewer.value.focus() // so Esc works straight away
}

function close() {
  openPhoto.value = null
}

const canDelete = computed(
  () => openPhoto.value && (openPhoto.value.user_id === props.myId || props.isHost),
)

const deleting = ref(false)

async function removeOpen() {
  deleting.value = true
  try {
    await deletePhoto(openPhoto.value)
    photos.value = photos.value.filter((p) => p.id !== openPhoto.value.id)
    close()
  } catch (err) {
    console.error(err)
    uploadErrors.value = ['Couldn’t remove that photo. Try again.']
    close()
  }
  deleting.value = false
}
</script>

<template>
  <section id="photos" ref="section" class="panel" aria-labelledby="photos-heading">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <h2 id="photos-heading" class="h6 mb-0">
        Photos<span v-if="photos.length > 0" class="text-secondary"> ({{ photos.length }})</span>
      </h2>
      <button
        v-if="!isSample"
        type="button"
        class="btn btn-outline-primary add-btn"
        :disabled="uploading"
        @click="pickPhotos"
      >
        {{ uploading ? progressText : '+ Add photos' }}
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        class="d-none"
        aria-label="Choose photos to add"
        @change="onFiles"
      />
    </div>

    <p v-if="isSample" class="small text-secondary mb-0">
      Photos work in real hangouts. Everyone in the hangout can add photos from the day.
    </p>
    <p v-else-if="loading" class="small text-secondary mb-0">Loading photos…</p>
    <p v-else-if="loadError" class="small text-danger mb-0" role="alert">{{ loadError }}</p>
    <p v-else-if="photos.length === 0" class="small text-secondary mb-0">
      No photos yet. Add some from the hangout, everyone in the group will see them.
    </p>

    <ul v-else class="grid list-unstyled mb-0">
      <li v-for="p in photos" :key="p.id">
        <button type="button" class="thumb" aria-label="See this photo bigger" @click="show(p)">
          <img :src="p.url" alt="" loading="lazy" />
        </button>
      </li>
    </ul>

    <ul v-if="uploadErrors.length > 0" class="small text-danger mt-2 mb-0" role="alert">
      <li v-for="(e, i) in uploadErrors" :key="i">{{ e }}</li>
    </ul>

    <!-- one photo, big -->
    <div
      v-if="openPhoto"
      ref="viewer"
      class="viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      tabindex="-1"
      @keydown.esc="close"
      @click.self="close"
    >
      <img :src="openPhoto.url" alt="" class="viewer__img" />
      <div class="viewer__bar">
        <button
          v-if="canDelete"
          type="button"
          class="btn btn-outline-light"
          :disabled="deleting"
          @click="removeOpen"
        >
          {{ deleting ? 'Removing…' : 'Remove' }}
        </button>
        <button type="button" class="btn btn-light" @click="close">✕ Close</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.add-btn {
  min-height: 44px;
  font-weight: 600;
}

/* 3 across on phones, 5 on laptops, all square */
.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

@media (min-width: 992px) {
  .grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.thumb {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  border-radius: var(--fp-radius-sm);
  overflow: hidden;
  background: var(--fp-bg);
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* the photo on a dark background over the whole page */
.viewer {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  background: rgb(0 0 0 / 0.85);
}

.viewer__img {
  max-width: 100%;
  max-height: calc(100% - 4rem);
  object-fit: contain;
  border-radius: var(--fp-radius-sm);
}

.viewer__bar {
  display: flex;
  gap: 0.75rem;
}

.viewer__bar .btn {
  min-height: 44px;
  font-weight: 600;
}
</style>
