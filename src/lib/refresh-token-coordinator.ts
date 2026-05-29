export type RefreshTokenRequest = () => Promise<string | null>

export const createRefreshTokenCoordinator = (requestRefreshToken: RefreshTokenRequest) => {
  let inFlightRefresh: Promise<string | null> | null = null

  return {
    refresh: () => {
      if (!inFlightRefresh) {
        inFlightRefresh = requestRefreshToken().finally(() => {
          inFlightRefresh = null
        })
      }

      return inFlightRefresh
    },
  }
}
