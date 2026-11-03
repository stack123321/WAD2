// Owner: Eashvar (testing). Component test for CandidateCard (Week 10b): one shortlisted spot on
// 11, with its tally and vote button, and its photo (or the spot's initial if there's none or it
// fails to load).
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CandidateCard from '../CandidateCard.vue'

const spot = { id: 's1', name: 'Bishan Hawker Centre', category: 'hawker', match_pct: 80 }

describe('TestSuite: CandidateCard', () => {
  it('Test1: shows the spot name and its votes', () => {
    const wrapper = mount(CandidateCard, { props: { spot, count: 2, totalVotes: 4 } })
    expect(wrapper.text()).toContain('Bishan Hawker Centre')
    expect(wrapper.text()).toContain('2 votes · 50%')
  })

  it('Test2: says "vote" for a single vote', () => {
    const wrapper = mount(CandidateCard, { props: { spot, count: 1, totalVotes: 4 } })
    expect(wrapper.text()).toContain('1 vote · 25%')
  })

  it('Test3: shows "Leading" for the leader and "Tied" in a tie', () => {
    const leading = mount(CandidateCard, { props: { spot, leading: true } })
    expect(leading.text()).toContain('Leading')

    const tied = mount(CandidateCard, { props: { spot, leading: true, tied: true } })
    expect(tied.text()).toContain('Tied')
    expect(tied.text()).not.toContain('Leading')
  })

  it('Test4: the button shows "✓ Your vote" when it is my vote', () => {
    const wrapper = mount(CandidateCard, { props: { spot, selected: true } })
    expect(wrapper.find('button').text()).toBe('✓ Your vote')
  })

  it('Test5: clicking Vote emits vote with the spot id', async () => {
    const wrapper = mount(CandidateCard, { props: { spot } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('vote')).toHaveLength(1)
    expect(wrapper.emitted('vote')[0]).toEqual(['s1'])
  })

  it('Test6: a disabled button does not emit vote', async () => {
    const wrapper = mount(CandidateCard, { props: { spot, disabled: true } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('vote')).toBeFalsy()
  })

  it('Test7: shows the photo when the spot has one', () => {
    const withPhoto = { ...spot, image_url: '/api/place-photo?name=places/p1/photos/a' }
    const wrapper = mount(CandidateCard, { props: { spot: withPhoto } })
    expect(wrapper.find('img').attributes('alt')).toBe('Photo of Bishan Hawker Centre')
  })

  it("Test8: a photo that doesn't load is swapped for the spot's initial", async () => {
    const withPhoto = { ...spot, image_url: '/api/place-photo?name=places/p1/photos/a' }
    const wrapper = mount(CandidateCard, { props: { spot: withPhoto } })
    await wrapper.find('img').trigger('error')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('.thumb--empty').text()).toBe('B')
  })
})
