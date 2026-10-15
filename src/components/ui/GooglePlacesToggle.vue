<script setup>
import { googlePlacesEnabled, setGooglePlacesEnabled } from '@/services/places'
//A toggle for enabling/disabling Google Maps API Calls. Beware of exceeding calls in the Free Tier.
</script>

<template>
  
  <label class="form-check form-switch mb-0">
    <input
      class="form-check-input"
      type="checkbox"
      role="switch"
      :checked="googlePlacesEnabled"
      @change="setGooglePlacesEnabled($event.target.checked)"
    />
    <span class="form-check-label">Google Places calls</span>
  </label>
</template>
