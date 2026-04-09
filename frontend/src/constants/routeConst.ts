
export const SEG = {
  AUTH: "auth",
  GUEST: "guest",
  EMAIL: "email",
  LOGIN: "login",
  SIGNUP: "signup",
  LOBBY: "lobby",
  GAME: "game",
  LEGACY_INDEX: "index",
} as const;

export const ROUTES = {
  HOME: "/",
  AUTH: `/${SEG.AUTH}`,
  AUTH_GUEST: `/${SEG.AUTH}/${SEG.GUEST}`,
  AUTH_EMAIL_LOGIN: `/${SEG.AUTH}/${SEG.EMAIL}/${SEG.LOGIN}`,
  AUTH_EMAIL_SIGNUP: `/${SEG.AUTH}/${SEG.EMAIL}/${SEG.SIGNUP}`,
  LOBBY: `/${SEG.LOBBY}`,
  GAME: `/${SEG.GAME}`,
  LEGACY_INDEX: `/${SEG.LEGACY_INDEX}`,
  NOT_FOUND: "*" as const,
} as const;

export const REDIRECT_ROUTES = {
  HOME: ROUTES.HOME,
  AUTH: ROUTES.AUTH,
  LOBBY: ROUTES.LOBBY,
  AUTH_GUEST: ROUTES.AUTH_GUEST,
  AUTH_EMAIL_LOGIN: ROUTES.AUTH_EMAIL_LOGIN,
  AUTH_EMAIL_SIGNUP: ROUTES.AUTH_EMAIL_SIGNUP,
} as const;

export type AppRoutePath = (typeof ROUTES)[keyof typeof ROUTES];
