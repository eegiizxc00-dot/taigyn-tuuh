if (!env.DB || !env.SESSION_SECRET) {
  return json({
    error: 'Server is not configured',
    diagnostics: {
      DB: Boolean(env.DB),
      SESSION_SECRET: Boolean(env.SESSION_SECRET)
    }
  }, 500);
}
