<script setup>
import { ref } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
})

const cardsCarousel = ref(null)
const carouselIndex = ref(0)

function updateCarouselIndex(event) {
  const carousel = event.currentTarget
  carouselIndex.value = Math.round(carousel.scrollLeft / carousel.clientWidth)
}

function scrollToIndex(index) {
  if (!props.items.length) return
  const boundedIndex = Math.max(0, Math.min(index, props.items.length - 1))
  carouselIndex.value = boundedIndex
  cardsCarousel.value?.scrollTo({
    left: cardsCarousel.value.clientWidth * boundedIndex,
    behavior: 'smooth',
  })
}

function showPreviousSpot() {
  if (carouselIndex.value > 0) scrollToIndex(carouselIndex.value - 1)
}

function showNextSpot() {
  if (carouselIndex.value < props.items.length - 1) {
    scrollToIndex(carouselIndex.value + 1)
  }
}

defineExpose({ scrollToIndex })
</script>

<template>
  <section class="cards-carousel">
    <button
      v-if="items.length > 1"
      type="button"
      class="cards-carousel__arrow cards-carousel__arrow--previous"
      aria-label="Previous spot"
      :disabled="carouselIndex === 0"
      @click="showPreviousSpot"
    >
      ‹
    </button>
    <div ref="cardsCarousel" class="cards" @scroll.passive="updateCarouselIndex">
      <slot v-for="(item, index) in items" :key="item.id" :item="item" :index="index" />
    </div>
    <button
      v-if="items.length > 1"
      type="button"
      class="cards-carousel__arrow cards-carousel__arrow--next"
      aria-label="Next spot"
      :disabled="carouselIndex === items.length - 1"
      @click="showNextSpot"
    >
      ›
    </button>
  </section>
</template>

<style scoped>
.cards {
  display: flex;
  gap: 16px;
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 12px;
}

.cards > * {
  flex: 0 0 280px;
}

.cards > :deep(.is-selected) {
  outline: 2px solid #0e7c6b;
  outline-offset: 2px;
}

.cards-carousel {
  display: contents;
}

.cards-carousel__arrow {
  display: none;
}

@media (min-width: 768px) {
  .cards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    /* max-content keeps each row at its card's full height; otherwise grid can shrink rows
       (and clip card text) below content size when this scroll area is shorter than its content. */
    grid-auto-rows: max-content;
    align-content: start;
    flex: 1;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    padding-bottom: 12px;
  }

  .cards > * {
    flex: none;
    min-width: 0;
  }
}

@media (max-width: 767px) {
  .cards {
    display: flex;
    width: 100%;
    height: 100%;
    gap: 0;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    overscroll-behavior-x: contain;
  }

  .cards-carousel {
    position: relative;
    display: block;
    height: 100%;
  }

  .cards-carousel__arrow {
    position: absolute;
    top: 50%;
    z-index: 3;
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    transform: translateY(-50%);
    border: 0;
    border-radius: 50%;
    background: rgb(0 0 0 / 48%);
    color: #fff;
    font-size: 2rem;
    line-height: 1;
  }

  .cards-carousel__arrow--previous {
    left: 0.75rem;
  }

  .cards-carousel__arrow--next {
    right: 0.75rem;
  }

  .cards-carousel__arrow:disabled {
    display: none;
  }

  .cards::-webkit-scrollbar {
    display: none;
  }

  .cards > * {
    flex: 0 0 100%;
    width: 100%;
    min-width: 100%;
    height: 100%;
    scroll-snap-align: start;
  }

  :deep(.spot-card) {
    position: relative;
    height: 100%;
    border: 0;
    border-radius: 0;
    background: #111;
  }

  :deep(.spot-card__image) {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    aspect-ratio: auto;
  }

  :deep(.spot-card__image::after) {
    content: '';
    position: absolute;
    top: 35%;
    right: 0;
    bottom: 0;
    left: 0;
    background: linear-gradient(to bottom, transparent, rgb(0 0 0 / 72%));
    pointer-events: none;
  }

  :deep(.spot-card__image img) {
    aspect-ratio: auto;
  }

  :deep(.spot-card__body) {
    position: absolute;
    z-index: 1;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    padding: 1.25rem 1rem 1.5rem;
    background: transparent;
    color: #fff;
    text-shadow: 0 1px 4px rgb(0 0 0 / 85%);
  }

  :deep(.spot-card__link),
  :deep(.spot-card__rating),
  :deep(.spot-card__meta),
  :deep(.spot-card__price) {
    color: #fff;
  }

  :deep(.spot-card__match) {
    text-shadow: none;
  }

  :deep(.spot-card__tags) {
    scrollbar-width: none;
  }

  :deep(.spot-card__tags::-webkit-scrollbar) {
    display: none;
  }

  :deep(.spot-card__tag) {
    border-color: rgb(255 255 255 / 70%);
    background: transparent;
    color: #fff;
    text-shadow: none;
  }

  :deep(.spot-card .btn) {
    align-self: flex-start;
    text-shadow: none;
  }
}
</style>
