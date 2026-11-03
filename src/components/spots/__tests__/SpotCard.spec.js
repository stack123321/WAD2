import { describe, expect, it } from 'vitest'
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

function mountCard(props = {}) {
  return mount(SpotCard, {
    props: { ...cafe, ...props },
    global: {
      stubs: {
        RouterLink: {
          props: ['to'],
          template: '<a :href="typeof to === \'string\' ? to : to.name"><slot /></a>',
        },
      },
    },
  })
}

describe('SpotCard', () => {
  it('renders the spot information and derived travel details', () => {
    const wrapper = mountCard()

    expect(wrapper.find('.spot-card__name').text()).toContain('Quiet Corner Cafe')
    expect(wrapper.find('.spot-card__rating').text()).toBe('⭐ 4.5')
    expect(wrapper.find('.spot-card__match').text()).toBe('84% match')
    expect(wrapper.find('.spot-card__meta').text()).toContain('250 m from Bishan')
    expect(wrapper.find('.spot-card__meta').text()).toContain('3 min walk')
    expect(wrapper.find('.spot-card__price').text()).toBe('$$')
  })

  it('formats kilometre distances and free price', () => {
    const wrapper = mountCard({ stationDistanceM: 1200, priceLevel: 0 })

    expect(wrapper.find('.spot-card__meta').text()).toContain('1.2 km from Bishan')
    expect(wrapper.find('.spot-card__price').text()).toBe('Free')
  })

  it('renders a link and image alternative text when supplied', () => {
    const wrapper = mountCard({
      imageUrl: '/cafe.jpg',
      to: { name: 'spot-details', params: { spotId: 'quiet-cafe' } },
    })

    expect(wrapper.find('.spot-card__image').attributes('href')).toBe('spot-details')
    expect(wrapper.find('.spot-card__image img').attributes('alt')).toBe(cafe.name)
    expect(wrapper.find('.spot-card__link').text()).toBe(cafe.name)
  })

  it('emits add when the spot is not shortlisted', async () => {
    const wrapper = mountCard()

    await wrapper.find('.spot-card__action').trigger('click')

    expect(wrapper.emitted('add')).toHaveLength(1)
    expect(wrapper.emitted('remove')).toBeFalsy()
  })

  it('disables the already-added action when the user cannot remove it', async () => {
    const wrapper = mountCard({ added: true })
    const action = wrapper.find('.spot-card__action')

    expect(action.text()).toBe('Added to vote')
    expect(action.attributes()).toHaveProperty('disabled')
    await action.trigger('click')
    expect(wrapper.emitted('remove')).toBeFalsy()
  })

  it('emits remove when the current user can remove an added spot', async () => {
    const wrapper = mountCard({ added: true, removable: true })

    await wrapper.find('.spot-card__action').trigger('click')

    expect(wrapper.emitted('remove')).toHaveLength(1)
  })

  it('shows hard and soft match explanations as tags', () => {
    const wrapper = mountCard({
      matchPct: 0,
      vetoReason: 'Closed during your hangout',
      softVetoReasons: ['Far from the midpoint'],
      tags: ['Outdoor seating'],
    })

    expect(wrapper.find('.spot-card__tag--veto').text()).toBe('Closed during your hangout')
    expect(wrapper.find('.spot-card__tag--soft-veto').text()).toBe('Far from the midpoint')
    expect(wrapper.findAll('.spot-card__tag').map((tag) => tag.text())).toContain(
      'Outdoor seating',
    )
  })

  it('does not render optional metadata when unavailable', () => {
    const wrapper = mountCard({
      rating: null,
      matchPct: null,
      priceLevel: null,
      stationDistanceM: null,
    })

    expect(wrapper.findAll('.spot-card__rating')).toHaveLength(0)
    expect(wrapper.findAll('.spot-card__match')).toHaveLength(0)
    expect(wrapper.findAll('.spot-card__price')).toHaveLength(0)
    expect(wrapper.findAll('.spot-card__tags')).toHaveLength(1)
  })
})
