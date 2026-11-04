// Owner: Eashvar (testing). Integration test (Week 10b): the real CandidateList with its real
// CandidateCards. Checks that the list gives each card the right numbers and badges, and that
// clicking a card's Vote button reaches the list's vote event.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CandidateList from '../CandidateList.vue'

const shortlist = [
  { id: 's1', name: 'Hawker', category: 'hawker' },
  { id: 's2', name: 'Coffee', category: 'cafe' },
  { id: 's3', name: 'Bowling', category: 'bowling' },
]

function mountList(props) {
  return mount(CandidateList, {
    props: {
      shortlist,
      counts: { s1: 2, s2: 1 },
      votersBySpot: {},
      totalVotes: 3,
      leaderId: 's1',
      ...props,
    },
  })
}

describe('TestSuite: CandidateList with CandidateCard', () => {
  it('Test1: shows one card per shortlisted spot with its votes', () => {
    const wrapper = mountList()
    expect(wrapper.findAll('article')).toHaveLength(3)
    expect(wrapper.text()).toContain('2 votes · 67%')
    expect(wrapper.text()).toContain('1 vote · 33%')
    expect(wrapper.text()).toContain('0 votes · 0%')
  })

  it('Test2: only the leader shows "Leading"', () => {
    const cards = mountList().findAll('article')
    expect(cards[0].text()).toContain('Leading')
    expect(cards[1].text()).not.toContain('Leading')
  })

  it('Test3: in a tie, the tied spots show "Tied" and nobody shows "Leading"', () => {
    const wrapper = mountList({ counts: { s1: 1, s2: 1 }, tiedIds: ['s1', 's2'] })
    const cards = wrapper.findAll('article')
    expect(cards[0].text()).toContain('Tied')
    expect(cards[1].text()).toContain('Tied')
    expect(wrapper.text()).not.toContain('Leading')
  })

  it('Test4: clicking Vote on a card emits vote from the list with that spot', async () => {
    const wrapper = mountList()
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.emitted('vote')[0]).toEqual(['s2'])
  })

  it('Test5: while a vote is saving, every Vote button is disabled', () => {
    const wrapper = mountList({ savingId: 's1' })
    const buttons = wrapper.findAll('button')
    expect(buttons[0].text()).toBe('Saving…')
    expect(buttons[2].attributes()).toHaveProperty('disabled')
  })

  it('Test6: says so when nothing is shortlisted yet', () => {
    const wrapper = mountList({ shortlist: [] })
    expect(wrapper.text()).toContain('Nothing has been shortlisted yet')
  })
})
