<script setup>
// Owner: Ryan
// "hangout with" card on 04 dashboard: 3 newest friends (services/friends.js) with add-to-hangout, plus a link to the full list
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getNewestFriends } from '@/services/friends'

const auth = useAuthStore()
const friends = ref([])
const loading = ref(false)
const error = ref('')

onMounted(async () => {
  loading.value = true
  try {
    const myId = auth.user ? auth.user.id : null
    friends.value = await getNewestFriends(myId, 3)
  } catch (err) {
    console.log(err)
    error.value = 'Could not load your friends.'
  }
  loading.value = false
})
</script>

<template>
  <section class="hangout-with">
    <h2 class="side-title">Hang out with</h2>

    <p v-if="loading" class="text-muted small mb-3">Loading your friends…</p>
    <p v-else-if="error" class="text-danger small mb-3">{{ error }}</p>
    <p v-else-if="friends.length === 0" class="text-muted small mb-3">
      People you hang out with will show up here.
    </p>

    <div v-for="f in friends" :key="f.user_id" class="d-flex align-items-center gap-2 mb-3">
      <span class="avatar" :style="{ background: f.avatar_color }" aria-hidden="true">
        {{ f.display_name[0] }}
      </span>
      <span class="name">{{ f.display_name }}</span>
      <router-link
        :to="{ name: 'create-hangout', query: { with: f.user_id } }"
        class="invite-link ms-auto"
        :aria-label="`Start a hangout with ${f.display_name}`"
      >
        Invite
      </router-link>
    </div>

    <router-link :to="{ name: 'friends' }" class="invite-link all-friends">All friends</router-link>
  </section>
</template>

<style scoped>
.hangout-with {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  box-shadow: var(--fp-shadow);
  padding: 1.5rem;
}

.avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: var(--fp-surface);
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* text-overflow: ellipsis - long names end wif "…" instead of pushing the button off the card */
.name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.side-title {
  margin: 0 0 1rem;
  font-size: 1.375rem;
}

.invite-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: var(--fp-primary);
  font-size: 0.9rem;
  font-weight: 700;
  text-decoration: none;
}

.invite-link:hover {
  color: var(--fp-primary-dark);
}
</style>
