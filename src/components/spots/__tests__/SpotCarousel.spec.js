import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SpotCarousel from '../SpotCarousel.vue'

const spots = [
  { id: 'one', name: 'Spot One' },
  { id: 'two', name: 'Spot Two' },
  { id: 'three', name: 'Spot Three' },
]

function mountCarousel(items = spots) {
  const wrapper = mount(SpotCarousel, {
    props: { items },
    slots: {
      default: '<template #default="{ item }"><article>{{ item.name }}</article></template>',
    },
  })
  const viewport = wrapper.find('.cards').element
  // jsdom has no layout, so the viewport is given a width, and scrollTo (which jsdom lacks) writes
  // down where it was asked to scroll
  Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 320 })
  const scrolls = []
  viewport.scrollTo = (options) => scrolls.push(options)
  return { wrapper, scrolls }
}

describe('SpotCarousel', () => {
  it('renders each item and only shows arrows when there are multiple items', () => {
    const { wrapper } = mountCarousel()

    expect(wrapper.findAll('.cards article').map((card) => card.text())).toEqual([
      'Spot One',
      'Spot Two',
      'Spot Three',
    ])
    expect(wrapper.find('[aria-label="Previous spot"]').attributes()).toHaveProperty('disabled')
    expect(wrapper.findAll('[aria-label="Next spot"]')).toHaveLength(1)

    const singleItem = mountCarousel([spots[0]]).wrapper
    expect(singleItem.findAll('[aria-label="Previous spot"]')).toHaveLength(0)
    expect(singleItem.findAll('[aria-label="Next spot"]')).toHaveLength(0)
  })

  it('moves through items and disables arrows at the ends', async () => {
    const { wrapper, scrolls } = mountCarousel()
    const previous = wrapper.find('[aria-label="Previous spot"]')
    const next = wrapper.find('[aria-label="Next spot"]')

    await next.trigger('click')
    expect(scrolls[scrolls.length - 1]).toEqual({ left: 320, behavior: 'smooth' })
    expect(previous.attributes()).not.toHaveProperty('disabled')
    expect(next.attributes()).not.toHaveProperty('disabled')

    await next.trigger('click')
    expect(scrolls[scrolls.length - 1]).toEqual({ left: 640, behavior: 'smooth' })
    expect(next.attributes()).toHaveProperty('disabled')

    await previous.trigger('click')
    expect(scrolls[scrolls.length - 1]).toEqual({ left: 320, behavior: 'smooth' })
    expect(next.attributes()).not.toHaveProperty('disabled')
  })

  it('clamps externally requested indexes to the available items', async () => {
    const { wrapper, scrolls } = mountCarousel()

    wrapper.vm.scrollToIndex(-4)
    expect(scrolls[scrolls.length - 1]).toEqual({ left: 0, behavior: 'smooth' })

    wrapper.vm.scrollToIndex(99)
    await wrapper.vm.$nextTick()
    expect(scrolls[scrolls.length - 1]).toEqual({ left: 640, behavior: 'smooth' })
    expect(wrapper.find('[aria-label="Next spot"]').attributes()).toHaveProperty('disabled')
  })
})
