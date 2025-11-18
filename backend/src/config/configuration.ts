export const configuration = () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '5000', 10),
  databaseUrl: process.env.DATABASE_URL as string,
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change_me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
  integrations: {
    goodwillApiKey: process.env.GOODWILL_API_KEY ?? '',
    salvationArmyApiKey: process.env.SALVATION_ARMY_API_KEY ?? '',
    ebayAppId: process.env.EBAY_APP_ID ?? '',
    shippoApiKey: process.env.SHIPPO_API_KEY ?? '',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
    goodwillCsvDirectory: process.env.GOODWILL_CSV_DIRECTORY ?? './data/goodwill',
    goodwill: {
      baseUrl: process.env.GOODWILL_BASE_URL ?? 'https://shopgoodwill.com',
      buyerApiBaseUrl: process.env.GOODWILL_BUYER_API_BASE_URL ?? 'https://buyerapi.shopgoodwill.com',
      loginPagePath: process.env.GOODWILL_LOGIN_PAGE_PATH ?? '/signin',
      loginPath: process.env.GOODWILL_LOGIN_PATH ?? '/api/SignIn/Login',
      loginMethod: process.env.GOODWILL_LOGIN_METHOD ?? 'POST',
      loginContentType: process.env.GOODWILL_LOGIN_CONTENT_TYPE ?? 'application/json',
      loginAppVersion: process.env.GOODWILL_LOGIN_APP_VERSION ?? '',
      loginUserAgent: process.env.GOODWILL_LOGIN_USER_AGENT ?? 'Mozilla/5.0',
      loginRememberMe: (process.env.GOODWILL_LOGIN_REMEMBER_ME ?? 'false') === 'true',
      loginEncryptionKey: process.env.GOODWILL_LOGIN_ENCRYPTION_KEY ?? '',
      usernameField: process.env.GOODWILL_USERNAME_FIELD ?? 'userName',
      passwordField: process.env.GOODWILL_PASSWORD_FIELD ?? 'password',
      loginAdditionalFields: safeParseJson(process.env.GOODWILL_LOGIN_ADDITIONAL_FIELDS, {}),
      loginHeaders: safeParseJson(process.env.GOODWILL_LOGIN_HEADERS, {}),
      openOrdersCsvPath: process.env.GOODWILL_OPEN_CSV_PATH ?? '',
      shippedOrdersCsvPath: process.env.GOODWILL_SHIPPED_CSV_PATH ?? '',
      orderDetailJsonPath: process.env.GOODWILL_ORDER_DETAIL_JSON_PATH ?? '',
      detailThrottleMs: parseInt(process.env.GOODWILL_DETAIL_THROTTLE_MS ?? '1500', 10),
      requestTimeoutSeconds: parseInt(process.env.GOODWILL_REQUEST_TIMEOUT ?? '60', 10),
    },
    salvationArmy: {
      baseUrl: process.env.SALVATION_ARMY_BASE_URL ?? 'https://www.shopthesalvationarmy.com',
      loginPath: process.env.SALVATION_ARMY_LOGIN_PATH ?? '/Account/LogOn',
      invoicesUrl: process.env.SALVATION_ARMY_INVOICES_URL ?? '/Account/Invoices',
      wonUrl: process.env.SALVATION_ARMY_WON_URL ?? '/Account/Won',
      listingBaseUrl: process.env.SALVATION_ARMY_LISTING_BASE_URL ?? 'https://www.shopthesalvationarmy.com',
    },
  },
  media: {
    storagePath: process.env.MEDIA_STORAGE_PATH ?? './storage/media',
  },
  encryptionKey: process.env.ENCRYPTION_KEY ?? '',
});

function safeParseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
