import { defineStore } from 'pinia'
import type { ApiResponse, Competition, Tournament } from '~/types'

export const useCompetitionStore = defineStore('competition', () => {
  const competition = ref<Competition | null>(null)
  const orgCompetitions = ref<Competition[]>([])
  const followedCompetitions = ref<Competition[]>([])
  const loading = ref(false)
  const orgLoading = ref(false)
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

  async function fetchOrgCompetitions(organizationId: string) {
    if (!organizationId) {
      orgCompetitions.value = []
      return
    }
    orgLoading.value = true
    error.value = null
    try {
      const res = await $api<ApiResponse<Competition[]>>(
        `/competitions?organizationId=${encodeURIComponent(organizationId)}`,
        { method: 'GET' },
      )
      if (res.data) {
        orgCompetitions.value = res.data
      }
      return res
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      orgLoading.value = false
    }
  }

  async function createCompetition(payload: {
    name: string
    slug?: string
    description?: string
    sport: string
    organization_id: string
    logoUrl?: string
    bannerUrl?: string
  }) {
    const res = await $api<ApiResponse<Competition>>('/competitions', {
      method: 'POST',
      body: payload,
    })
    if (res.data) {
      await fetchOrgCompetitions(payload.organization_id)
    }
    return res
  }

  async function updateCompetition(
    id: string,
    payload: Partial<{
      name: string
      slug: string
      description: string
      sport: string
      logoUrl: string
      bannerUrl: string
    }>,
    organizationId?: string,
  ) {
    const res = await $api<ApiResponse<Competition>>(`/competitions/${id}`, {
      method: 'PATCH',
      body: payload,
    })
    if (organizationId) {
      await fetchOrgCompetitions(organizationId)
    } else if (res.data) {
      const idx = orgCompetitions.value.findIndex((c) => c.id === id)
      if (idx !== -1) {
        orgCompetitions.value[idx] = { ...orgCompetitions.value[idx], ...res.data }
      }
    }
    return res
  }

  async function attachSeason(
    competitionId: string,
    payload: {
      tournamentId: string
      seasonName?: string
      setAsCurrent?: boolean
    },
    organizationId?: string,
  ) {
    const res = await $api<ApiResponse<Tournament>>(
      `/competitions/${competitionId}/seasons/attach`,
      {
        method: 'POST',
        body: payload,
      },
    )
    if (organizationId) {
      await fetchOrgCompetitions(organizationId)
    }
    return res
  }

  async function updateSeason(
    competitionId: string,
    tournamentId: string,
    payload: { seasonName?: string; isCurrentSeason?: boolean },
    organizationId?: string,
  ) {
    const res = await $api<ApiResponse<Tournament>>(
      `/competitions/${competitionId}/seasons/${tournamentId}`,
      {
        method: 'PATCH',
        body: payload,
      },
    )
    if (organizationId) {
      await fetchOrgCompetitions(organizationId)
    }
    return res
  }

  async function detachSeason(
    competitionId: string,
    tournamentId: string,
    organizationId?: string,
  ) {
    const res = await $api<ApiResponse<{ detached: boolean }>>(
      `/competitions/${competitionId}/seasons/${tournamentId}`,
      {
        method: 'DELETE',
      },
    )
    if (organizationId) {
      await fetchOrgCompetitions(organizationId)
    }
    return res
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
    const c =
      competitionObj ||
      (competition.value?.id === competitionId || competition.value?.slug === competitionId
        ? competition.value
        : null)
    if (c && !followedCompetitions.value.some((x) => x.id === c.id)) {
      followedCompetitions.value.unshift(c)
    }

    try {
      await $api(`/competitions/${competitionId}/follow`, { method: 'POST' })
      await fetchFollowedCompetitions().catch(() => {})
    } catch (err: any) {
      if (c) {
        followedCompetitions.value = followedCompetitions.value.filter((x) => x.id !== c.id)
      }
      console.error('Follow competition failed:', err)
      throw err
    }
  }

  async function unfollowCompetition(competitionId: string) {
    const previous = [...followedCompetitions.value]
    followedCompetitions.value = followedCompetitions.value.filter(
      (c) => c.id !== competitionId && c.slug !== competitionId,
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
    orgCompetitions,
    followedCompetitions,
    loading,
    orgLoading,
    followedLoading,
    error,
    fetchCompetition,
    fetchOrgCompetitions,
    createCompetition,
    updateCompetition,
    attachSeason,
    updateSeason,
    detachSeason,
    fetchFollowedCompetitions,
    followCompetition,
    unfollowCompetition,
    checkCompetitionFollowStatus,
  }
})
