// Owner: Eashvar (testing). Component test for SpotCarousel (Week 10b): the swipeable row of spot
// cards on 09 Nearby spots on a phone. Every spot gets a card, and the Previous / Next arrows show
// only when there's more than one spot. Pressing the arrows scrolls the row, which jsdom can't do,
// so that's tested on 09 in a real browser (tests/e2e/explore.spec.js and assistant.spec.js).
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SpotCarousel from '../SpotCarousel.vue'

const spots = [
  { id: 'one', name: 'Spot One' },
  { id: 'two', name: 'Spot Two' },
  { id: 'three', name: 'Spot Three' },
]

// each spot's card comes from the page through the slot; a plain card is enough here
function mountCarousel(items) {
  return mount(SpotCarousel, { props: { items }, slots: { default: '<article>Card</article>' } })
}

describe('TestSuite: SpotCarousel', () => {
  it('Test1: shows a card for every spot', () => {
    expect(mountCarousel(spots).findAll('article')).toHaveLength(3)
  })

  it('Test2: with one spot there are no arrows', () => {
    expect(mountCarousel([spots[0]]).findAll('button')).toHaveLength(0)
  })

  it('Test3: with several spots, Previous starts switched off and Next is on', () => {
    const [previous, next] = mountCarousel(spots).findAll('button')
    expect(previous.attributes('aria-label')).toBe('Previous spot')
    expect(previous.attributes()).toHaveProperty('disabled')
    expect(next.attributes('aria-label')).toBe('Next spot')
    expect(next.attributes()).not.toHaveProperty('disabled')
  })
})
