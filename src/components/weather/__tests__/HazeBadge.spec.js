// Owner: Eashvar (testing; for Surya's weather). Component test for HazeBadge (Week 10b): the
// "Haze · PSI 184 Unhealthy" pill inside the weather cards.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HazeBadge from '../HazeBadge.vue'

const haze = { region: 'central', psi: 184, level: 'Unhealthy', tone: 'bad' }

describe('TestSuite: HazeBadge', () => {
  it('Test1: shows the PSI reading and its level', () => {
    const wrapper = mount(HazeBadge, { props: { haze } })
    expect(wrapper.text()).toContain('Haze · PSI 184 Unhealthy')
  })

  it('Test2: names the region it was measured in', () => {
    const wrapper = mount(HazeBadge, { props: { haze } })
    expect(wrapper.attributes('title')).toContain('central region')
  })

  it('Test3: a different reading shows its own level', () => {
    const wrapper = mount(HazeBadge, {
      props: { haze: { region: 'east', psi: 42, level: 'Good', tone: 'good' } },
    })
    expect(wrapper.text()).toContain('PSI 42 Good')
    expect(wrapper.text()).not.toContain('Unhealthy')
  })
})
