// Owner: Eashvar (testing). Component test for SpotCard (Week 10b): one spot on 09 Nearby spots,
// with its rating, match %, distance from the station, walk and price, any match notes, and the
// "Add to vote" button, which emits add, or remove once it's added (if this person can remove it).
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SpotCard from '../SpotCard.vue'

const cafe = {
  name: 'Quiet Corner Cafe',
  category: 'cafe',
  rating: 4.5,
  matchPct: 84,
  priceLevel: 2,
  stationDistanceM: 250,
  nearestStationName: 'Bishan',
}

// RouterLink is swapped for a plain link, so the card can be mounted without a router
function mountCard(props = {}) {
  return mount(SpotCard, {
    props: { ...cafe, ...props },
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  })
}

describe('TestSuite: SpotCard', () => {
  it('Test1: shows the rating, match, distance, walk and price', () => {
    const wrapper = mountCard()
    expect(wrapper.find('h3').text()).toContain('Quiet Corner Cafe')
    expect(wrapper.find('.spot-card__rating').text()).toBe('⭐ 4.5')
    expect(wrapper.find('.spot-card__match').text()).toBe('84% match')
    expect(wrapper.text()).toContain('250 m from Bishan')
    expect(wrapper.text()).toContain('3 min walk')
    expect(wrapper.find('.spot-card__price').text()).toBe('$$')
  })

  it('Test2: shows longer distances in km, and a free spot as Free', () => {
    const wrapper = mountCard({ stationDistanceM: 1200, priceLevel: 0 })
    expect(wrapper.text()).toContain('1.2 km from Bishan')
    expect(wrapper.find('.spot-card__price').text()).toBe('Free')
  })

  it("Test3: with a photo and a link, the photo is labelled with the spot's name", () => {
    const wrapper = mountCard({
      imageUrl: '/cafe.jpg',
      to: { name: 'spot-details', params: { spotId: 'quiet-cafe' } },
    })
    expect(wrapper.find('img').attributes('alt')).toBe('Quiet Corner Cafe')
    expect(wrapper.find('.spot-card__link').text()).toBe('Quiet Corner Cafe')
  })

  it('Test4: Add to vote emits add', async () => {
    const wrapper = mountCard()
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('add')).toHaveLength(1)
    expect(wrapper.emitted('remove')).toBeFalsy()
  })

  it("Test5: once added by someone else, the button is off and can't remove it", async () => {
    const wrapper = mountCard({ added: true })
    const button = wrapper.find('button')
    expect(button.text()).toBe('Added to vote')
    expect(button.attributes()).toHaveProperty('disabled')
    await button.trigger('click')
    expect(wrapper.emitted('remove')).toBeFalsy()
  })

  it('Test6: once added by me, the button emits remove', async () => {
    const wrapper = mountCard({ added: true, removable: true })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })

  it('Test7: shows why a spot scores 0, and any other notes, as tags', () => {
    const wrapper = mountCard({
      matchPct: 0,
      vetoReason: 'Closed during your hangout',
      softVetoReasons: ['Far from the midpoint'],
      tags: ['Outdoor seating'],
    })
    const tags = wrapper.findAll('li').map((tag) => tag.text())
    expect(tags).toEqual(['Closed during your hangout', 'Far from the midpoint', 'Outdoor seating'])
  })

  it('Test8: leaves out the rating, match, price and distance when they are unknown', () => {
    const wrapper = mountCard({
      rating: null,
      matchPct: null,
      priceLevel: null,
      stationDistanceM: null,
    })
    expect(wrapper.findAll('.spot-card__rating')).toHaveLength(0)
    expect(wrapper.findAll('.spot-card__match')).toHaveLength(0)
    expect(wrapper.findAll('.spot-card__price')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('from Bishan')
  })
})
