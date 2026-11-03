// Owner: Eashvar (testing). Component test for SpinWheel (Week 10b): the tie-break wheel on 11.
// It's greyed out with a lock until there's a tie, and only the host gets the Spin button.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SpinWheel from '../SpinWheel.vue'

const spots = [
  { id: 's1', name: 'Hawker' },
  { id: 's2', name: 'Coffee' },
]

// the host's view of a tie, unless the test says otherwise
function mountWheel(props) {
  return mount(SpinWheel, {
    props: { spots, canSpin: true, hostName: 'Ryan', ...props },
  })
}

describe('TestSuite: SpinWheel', () => {
  it('Test1: lists every tied spot', () => {
    const wrapper = mountWheel()
    expect(wrapper.text()).toContain('Hawker and Coffee have the most votes')
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

  it('Test5: someone who is not the host gets no button and is told the host spins', () => {
    const wrapper = mountWheel({ canSpin: false })
    expect(wrapper.find('button').exists()).toBeFalsy()
    expect(wrapper.text()).toContain('Only the host can spin. Waiting for Ryan to spin…')
  })

  it('Test6: with no tie, it is locked: no spots, no button, and it says who spins', () => {
    const wrapper = mountWheel({ spots: [], locked: true })
    expect(wrapper.find('section').classes()).toContain('is-locked')
    expect(wrapper.find('h2').text()).toBe('Tie-break wheel')
    expect(wrapper.text()).toContain('Ryan (the host) spins it')
    expect(wrapper.text()).toContain("Locked until there's a tie")
    expect(wrapper.findAll('li')).toHaveLength(0)
    expect(wrapper.find('button').exists()).toBeFalsy()
  })
})
