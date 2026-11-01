// Owner: Eashvar (testing). Component test for SpinWheel (Week 10b): the tie-break wheel on 11.
// RouterLink (the "See the final plan" button) is replaced with a stub, since there's no router
// in a component test.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SpinWheel from '../SpinWheel.vue'

const spots = [
  { id: 's1', name: 'Hawker' },
  { id: 's2', name: 'Coffee' },
]

function mountWheel(props) {
  return mount(SpinWheel, {
    props: { spots, planTo: { name: 'final-plan' }, ...props },
    global: { stubs: { RouterLink: true } },
  })
}

describe('TestSuite: SpinWheel', () => {
  it('Test1: lists every tied spot', () => {
    const wrapper = mountWheel()
    expect(wrapper.text()).toContain('2 spots have the most votes')
    expect(wrapper.findAll('li')).toHaveLength(2)
  })

  it('Test2: clicking the button emits spin', async () => {
    const wrapper = mountWheel()
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('spin')).toHaveLength(1)
  })

  it('Test3: the button is disabled while the wheel is spinning', () => {
    const wrapper = mountWheel({ spinning: true })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('Test4: once there is a winner, it says which spot the wheel picked', () => {
    const wrapper = mountWheel({ winnerId: 's2' })
    expect(wrapper.text()).toContain('The wheel picked Coffee!')
    expect(wrapper.find('button').exists()).toBeFalsy()
  })
})
