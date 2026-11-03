// Owner: Eashvar (testing). Component test for NeedsInputCard (Week 10b): the "Needs your input"
// card on 04 lists only the hangouts waiting on me, each with its button. RouterLink is replaced
// with a custom stub that shows its text, since there's no router in a component test.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NeedsInputCard from '../NeedsInputCard.vue'

// a hangout in voting, with me in it; votedFor is the spot I voted for, or null
function votingHangout(id, name, votedFor) {
  return {
    id,
    name,
    status: 'voting',
    starts_at: '2026-10-23T11:00:00Z', // Fri 23 Oct, 7 pm in Singapore
    members: [{ user_id: 'me', display_name: 'Ryan', start_label: 'Bishan MRT', mode: 'mrt' }],
    votes: votedFor ? [{ user_id: 'me', shortlist_id: votedFor }] : [],
  }
}

function mountCard(hangouts) {
  return mount(NeedsInputCard, {
    props: { hangouts, myId: 'me' },
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  })
}

describe('TestSuite: NeedsInputCard', () => {
  it('Test1: lists a hangout waiting on my vote, with its date and button', () => {
    const wrapper = mountCard([votingHangout('h1', 'Friday dinner', null)])
    expect(wrapper.text()).toContain('Needs your input')
    expect(wrapper.text()).toContain('Friday dinner')
    expect(wrapper.text()).toContain('Fri 23 Oct')
    expect(wrapper.find('a').text()).toContain('Cast your vote')
  })

  it('Test2: leaves out a hangout I have already voted in', () => {
    const wrapper = mountCard([
      votingHangout('h1', 'Friday dinner', null),
      votingHangout('h2', 'Saturday lunch', 's1'),
    ])
    expect(wrapper.text()).toContain('Friday dinner')
    expect(wrapper.text()).not.toContain('Saturday lunch')
  })

  it('Test3: shows nothing when no hangout is waiting on me', () => {
    const wrapper = mountCard([votingHangout('h2', 'Saturday lunch', 's1')])
    expect(wrapper.findAll('section')).toHaveLength(0)
  })

  it('Test4: shows at most 3, then says how many more', () => {
    const hangouts = []
    for (let i = 1; i <= 5; i++) hangouts.push(votingHangout(`h${i}`, `Hangout ${i}`, null))
    const wrapper = mountCard(hangouts)
    expect(wrapper.findAll('a')).toHaveLength(3)
    expect(wrapper.text()).toContain('and 2 more in the list')
  })
})
