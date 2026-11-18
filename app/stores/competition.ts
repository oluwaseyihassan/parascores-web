import { defineStore } from 'pinia'
import type { ApiResponse, Competition } from '~/types'

export const useCompetitionStore = defineStore('competition', () => {
  const competition = ref<Competition | null>(null)
  const followedCompetitions = ref<Competition[]>([])
  const loading = ref(false)
  const followedLoading = ref(false)
  const error = ref<string | null>(null)

  const { extractErrorMessage } = useErrors()

  async function fetchCompetition(slug: string) {
    loading.value = true
    error.value = null
    try {
      const res = await $publicApi<ApiResponse<Competition>>(`/competitions/${slug}`, {
        method: 'GET',
      })
      if (res.data) {
        competition.value = res.data
      }
      return res
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchFollowedCompetitions() {
    followedLoading.value = true
    try {
      const res = await $api<ApiResponse<Competition[]>>('/competitions/following/mine', {
        method: 'GET',
      })
      if (res.data) {
        followedCompetitions.value = res.data
      }
      return res
    } catch (err: any) {
      console.error('Fetch followed competitions failed:', err)
      throw err
    } finally {
      followedLoading.value = false
    }
  }

  async function followCompetition(competitionId: string, competitionObj?: Competition | null) {
    const c = competitionObj || (competition.value?.id === competitionId || competition.value?.slug === competitionId ? competition.value : null)
    if (c && !followedCompetitions.value.some(x => x.id === c.id)) {
      followedCompetitions.value.unshift(c)
    }

    try {
      await $api(`/competitions/${competitionId}/follow`, { method: 'POST' })
      await fetchFollowedCompetitions().catch(() => {})
    } catch (err: any) {
      if (c) {
        followedCompetitions.value = followedCompetitions.value.filter(x => x.id !== c.id)
      }
      console.error('Follow competition failed:', err)
      throw err
    }
  }

  async function unfollowCompetition(competitionId: string) {
    const previous = [...followedCompetitions.value]
    followedCompetitions.value = followedCompetitions.value.filter(
      c => c.id !== competitionId && c.slug !== competitionId,
    )

    try {
      await $api(`/competitions/${competitionId}/follow`, { method: 'DELETE' })
    } catch (err: any) {
      followedCompetitions.value = previous
      console.error('Unfollow competition failed:', err)
      throw err
    }
  }

  async function checkCompetitionFollowStatus(competitionId: string): Promise<boolean> {
    try {
      const res = await $api<{ success: boolean; data: { isFollowing: boolean } }>(
        `/competitions/${competitionId}/follow-status`,
        { method: 'GET' },
      )
      return res.data?.isFollowing ?? false
    } catch {
      return false
    }
  }

  return {
    competition,
    followedCompetitions,
    loading,
    followedLoading,
    error,
    fetchCompetition,
    fetchFollowedCompetitions,
    followCompetition,
    unfollowCompetition,
    checkCompetitionFollowStatus,
  }
})
