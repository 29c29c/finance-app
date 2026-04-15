async function getSettingsByUserId(db, userId) {
  return db.get(
    'SELECT user_id, provider, endpoint_url, model, api_key, updated_at FROM user_ai_settings WHERE user_id = ?',
    [userId],
  );
}

async function upsertSettings(db, userId, settings) {
  return db.run(
    `INSERT INTO user_ai_settings (user_id, provider, endpoint_url, model, api_key, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       provider = excluded.provider,
       endpoint_url = excluded.endpoint_url,
       model = excluded.model,
       api_key = excluded.api_key,
       updated_at = excluded.updated_at`,
    [
      userId,
      settings.provider,
      settings.endpoint_url,
      settings.model,
      settings.api_key,
      settings.updated_at,
    ],
  );
}

async function getCachedAnalysis(db, userId, scope, periodKey) {
  return db.get(
    `SELECT user_id, scope, period_key, provider, model, analysis, summary_json, updated_at
     FROM user_ai_analysis_cache
     WHERE user_id = ? AND scope = ? AND period_key = ?`,
    [userId, scope, periodKey],
  );
}

async function upsertCachedAnalysis(db, userId, cache) {
  return db.run(
    `INSERT INTO user_ai_analysis_cache
      (user_id, scope, period_key, provider, model, analysis, summary_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, scope, period_key) DO UPDATE SET
       provider = excluded.provider,
       model = excluded.model,
       analysis = excluded.analysis,
       summary_json = excluded.summary_json,
       updated_at = excluded.updated_at`,
    [
      userId,
      cache.scope,
      cache.period_key,
      cache.provider,
      cache.model,
      cache.analysis,
      cache.summary_json,
      cache.updated_at,
    ],
  );
}

module.exports = {
  getSettingsByUserId,
  upsertSettings,
  getCachedAnalysis,
  upsertCachedAnalysis,
};
