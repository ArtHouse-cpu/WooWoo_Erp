import {toE164} from '../utils/normalize.js';

const GRAPH_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';

const getConfig = () => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.replace(/^["']|["']$/g, '').trim();
  const templateName = (
    process.env.WHATSAPP_TEMPLATE_NAME ||
    process.env.WHATSAPP_OTP_TEMPLATE ||
    'woowoootp'
  ).trim();
  const language = (
    process.env.WHATSAPP_TEMPLATE_LANGUAGE ||
    process.env.WHATSAPP_TEMPLATE_LANG ||
    'en'
  ).trim();

  return {phoneNumberId, accessToken, templateName, language};
};

const getMembershipTemplateConfig = () => {
  const {phoneNumberId, accessToken, language} = getConfig();
  const templateName = (
    process.env.WHATSAPP_MEMBERSHIP_TEMPLATE ||
    'membershippurchase'
  ).trim();
  const membershipLanguage = (
    process.env.WHATSAPP_MEMBERSHIP_TEMPLATE_LANGUAGE ||
    language
  ).trim();
  const urlButtonParam = (
    process.env.WHATSAPP_MEMBERSHIP_VIEW_URL_PARAM ||
    ''
  ).trim();

  return {
    phoneNumberId,
    accessToken,
    templateName,
    language: membershipLanguage,
    urlButtonParam,
  };
};

const getAccountCreatedTemplateConfig = () => {
  const {phoneNumberId, accessToken, language} = getConfig();
  const templateName = (
    process.env.WHATSAPP_ACCOUNT_CREATED_TEMPLATE ||
    'accountcreated'
  ).trim();
  const accountLanguage = (
    process.env.WHATSAPP_ACCOUNT_CREATED_TEMPLATE_LANGUAGE ||
    language
  ).trim();
  const balanceUrlParam = (
    process.env.WHATSAPP_ACCOUNT_CREATED_BALANCE_URL_PARAM ||
    ''
  ).trim();
  const prositeUrlParam = (
    process.env.WHATSAPP_ACCOUNT_CREATED_PROSITE_URL_PARAM ||
    ''
  ).trim();

  return {
    phoneNumberId,
    accessToken,
    templateName,
    language: accountLanguage,
    balanceUrlParam,
    prositeUrlParam,
  };
};

const toWhatsAppRecipient = mobile => {
  const e164 = toE164(mobile);
  if (!e164) return null;
  return e164.replace(/\D/g, '');
};

const buildAuthTemplatePayload = ({to, otp, templateName, language, includeButton}) => {
  const components = [
    {
      type: 'body',
      parameters: [{type: 'text', text: String(otp)}],
    },
  ];

  if (includeButton) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{type: 'text', text: String(otp)}],
    });
  }

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: {code: language},
      components,
    },
  };
};

const buildMembershipTemplatePayload = ({
  to,
  templateName,
  language,
  name,
  membershipLabel,
  validity,
  cashbackLabel,
  urlButtonParam,
}) => {
  const components = [
    {
      type: 'body',
      parameters: [
        {type: 'text', text: String(name || 'Member')},
        {type: 'text', text: String(membershipLabel)},
        {type: 'text', text: String(validity)},
        {type: 'text', text: String(cashbackLabel)},
      ],
    },
  ];

  if (urlButtonParam) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{type: 'text', text: String(urlButtonParam)}],
    });
  }

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: {code: language},
      components,
    },
  };
};

const postTemplateMessage = async ({phoneNumberId, accessToken, payload}) => {
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  const raw = await response.text();
  let json = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }

  return {ok: response.ok, status: response.status, raw, json};
};

const languageCandidates = primary => {
  const list = [primary, 'en_US', 'en'];
  return [...new Set(list.filter(Boolean))];
};

/**
 * Send OTP via WhatsApp Meta Cloud API using an approved template.
 */
export const sendWhatsAppOtp = async ({to, otp}) => {
  const {phoneNumberId, accessToken, templateName, language} = getConfig();

  if (!phoneNumberId || !accessToken) {
    console.log(`[Customer OTP][WhatsApp stub] to=${to} otp=${otp}`);
    return {channel: 'whatsapp-stub', delivered: false};
  }

  const recipient = toWhatsAppRecipient(to);
  if (!recipient) {
    const error = new Error('Invalid mobile number for WhatsApp OTP');
    error.status = 400;
    throw error;
  }

  let lastError = null;

  for (const lang of languageCandidates(language)) {
    for (const includeButton of [true, false]) {
      const payload = buildAuthTemplatePayload({
        to: recipient,
        otp,
        templateName,
        language: lang,
        includeButton,
      });

      const result = await postTemplateMessage({
        phoneNumberId,
        accessToken,
        payload,
      });

      if (result.ok) {
        const messageId = result.json?.messages?.[0]?.id || null;
        console.log(
          `[Customer OTP][WhatsApp] delivered to=${recipient} template=${templateName} lang=${lang} button=${includeButton} id=${messageId}`,
        );
        return {
          channel: 'whatsapp',
          delivered: true,
          messageId,
          templateName,
          language: lang,
        };
      }

      lastError = result.json?.error || {message: result.raw, status: result.status};
      const message = String(lastError.message || '');

      if (lastError.code === 190 || /oauth|access token|authenticat/i.test(message)) {
        break;
      }

      if (/language|template name|does not exist|not found/i.test(message)) {
        break;
      }

      if (includeButton && /button|component|parameter/i.test(message)) {
        continue;
      }

      break;
    }

    if (
      lastError?.code === 190 ||
      /oauth|access token|authenticat/i.test(String(lastError?.message || ''))
    ) {
      break;
    }
  }

  const metaMessage =
    lastError?.error_user_msg ||
    lastError?.message ||
    'Unknown WhatsApp API error';

  console.error('[Customer OTP][WhatsApp] failed:', lastError);

  let friendly = `Failed to send WhatsApp OTP: ${metaMessage}`;
  if (lastError?.code === 190) {
    friendly =
      'WhatsApp access token is invalid or expired. Generate a new token in Meta Developer Console and update WHATSAPP_ACCESS_TOKEN.';
  }

  const error = new Error(friendly);
  error.status = 502;
  error.meta = lastError;
  throw error;
};

/**
 * Send membership activation WhatsApp using template `membershippurchase`.
 * Body vars: {{1}} name, {{2}} membership, {{3}} validity, {{4}} cashback (e.g. ₹50)
 */
export const sendMembershipPurchaseWhatsApp = async ({
  to,
  name,
  membershipLabel,
  validity,
  cashbackLabel,
}) => {
  const {phoneNumberId, accessToken, templateName, language, urlButtonParam} =
    getMembershipTemplateConfig();

  if (!phoneNumberId || !accessToken) {
    console.log(
      `[Membership][WhatsApp stub] to=${to} name=${name} plan=${membershipLabel} validity=${validity} cashback=${cashbackLabel}`,
    );
    return {channel: 'whatsapp-stub', delivered: false};
  }

  const recipient = toWhatsAppRecipient(to);
  if (!recipient) {
    const error = new Error('Invalid mobile number for WhatsApp membership message');
    error.status = 400;
    throw error;
  }

  let lastError = null;
  const buttonVariants = urlButtonParam ? [urlButtonParam, ''] : ['', 'membership'];

  for (const lang of languageCandidates(language)) {
    for (const buttonParam of buttonVariants) {
      const payload = buildMembershipTemplatePayload({
        to: recipient,
        templateName,
        language: lang,
        name,
        membershipLabel,
        validity,
        cashbackLabel,
        urlButtonParam: buttonParam || null,
      });

      const result = await postTemplateMessage({
        phoneNumberId,
        accessToken,
        payload,
      });

      if (result.ok) {
        const messageId = result.json?.messages?.[0]?.id || null;
        console.log(
          `[Membership][WhatsApp] delivered to=${recipient} template=${templateName} lang=${lang} button=${Boolean(buttonParam)} id=${messageId}`,
        );
        return {
          channel: 'whatsapp',
          delivered: true,
          messageId,
          templateName,
          language: lang,
        };
      }

      lastError = result.json?.error || {message: result.raw, status: result.status};
      const message = String(lastError.message || '');

      if (lastError.code === 190 || /oauth|access token|authenticat/i.test(message)) {
        break;
      }

      if (/language|template name|does not exist|not found/i.test(message)) {
        break;
      }

      if (/button|component|parameter|expected/i.test(message)) {
        continue;
      }

      break;
    }

    if (
      lastError?.code === 190 ||
      /oauth|access token|authenticat/i.test(String(lastError?.message || ''))
    ) {
      break;
    }
  }

  const metaMessage =
    lastError?.error_user_msg ||
    lastError?.message ||
    'Unknown WhatsApp API error';

  console.error('[Membership][WhatsApp] failed:', lastError);

  return {
    channel: 'whatsapp',
    delivered: false,
    error: metaMessage,
    meta: lastError,
  };
};

const buildAccountCreatedTemplatePayload = ({
  to,
  templateName,
  language,
  name,
  cashbackLabel,
  balanceUrlParam,
  prositeUrlParam,
}) => {
  const components = [
    {
      type: 'body',
      parameters: [
        {type: 'text', text: String(name || 'Member')},
        {type: 'text', text: String(cashbackLabel)},
      ],
    },
  ];

  // Check Balance / View Prosite URL buttons — only if template has dynamic URL suffixes
  if (balanceUrlParam) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{type: 'text', text: String(balanceUrlParam)}],
    });
  }
  if (prositeUrlParam) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '1',
      parameters: [{type: 'text', text: String(prositeUrlParam)}],
    });
  }

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: {code: language},
      components,
    },
  };
};

/**
 * Send account-created WhatsApp using template `accountcreated`.
 * Body vars: {{1}} name, {{2}} welcome cashback (e.g. ₹21)
 * Buttons: Check Balance (URL), View Prosite (URL), Get help (call) — usually static.
 */
export const sendAccountCreatedWhatsApp = async ({to, name, cashbackLabel}) => {
  const {
    phoneNumberId,
    accessToken,
    templateName,
    language,
    balanceUrlParam,
    prositeUrlParam,
  } = getAccountCreatedTemplateConfig();

  if (!phoneNumberId || !accessToken) {
    console.log(
      `[AccountCreated][WhatsApp stub] to=${to} name=${name} cashback=${cashbackLabel}`,
    );
    return {channel: 'whatsapp-stub', delivered: false};
  }

  const recipient = toWhatsAppRecipient(to);
  if (!recipient) {
    const error = new Error('Invalid mobile number for WhatsApp account message');
    error.status = 400;
    throw error;
  }

  let lastError = null;

  const amountOnly = String(cashbackLabel || '').replace(/[^\d.]/g, '') || '21';

  // Body param variants: name+₹21, name+21, name-only (if template has 1 var)
  const bodyModes = [
    [String(name || 'Member'), String(cashbackLabel || `₹${amountOnly}`)],
    [String(name || 'Member'), amountOnly],
    [String(name || 'Member')],
  ];

  // Try body-only first (static URL/call buttons), then with optional URL params
  const buttonModes = [
    {balanceUrlParam: '', prositeUrlParam: ''},
    {
      balanceUrlParam: balanceUrlParam || 'balance',
      prositeUrlParam: prositeUrlParam || 'prosite',
    },
  ];

  for (const lang of languageCandidates(language)) {
    for (const bodyParams of bodyModes) {
      for (const mode of buttonModes) {
        const components = [
          {
            type: 'body',
            parameters: bodyParams.map(text => ({type: 'text', text})),
          },
        ];

        if (mode.balanceUrlParam) {
          components.push({
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{type: 'text', text: String(mode.balanceUrlParam)}],
          });
        }
        if (mode.prositeUrlParam) {
          components.push({
            type: 'button',
            sub_type: 'url',
            index: '1',
            parameters: [{type: 'text', text: String(mode.prositeUrlParam)}],
          });
        }

        const payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'template',
          template: {
            name: templateName,
            language: {code: lang},
            components,
          },
        };

        const result = await postTemplateMessage({
          phoneNumberId,
          accessToken,
          payload,
        });

        if (result.ok) {
          const messageId = result.json?.messages?.[0]?.id || null;
          console.log(
            `[AccountCreated][WhatsApp] delivered to=${recipient} template=${templateName} lang=${lang} params=${bodyParams.length} id=${messageId}`,
          );
          return {
            channel: 'whatsapp',
            delivered: true,
            messageId,
            templateName,
            language: lang,
          };
        }

        lastError = result.json?.error || {message: result.raw, status: result.status};
        const message = String(lastError.message || '');

        if (lastError.code === 190 || /oauth|access token|authenticat/i.test(message)) {
          break;
        }

        if (/language|template name|does not exist|not found/i.test(message)) {
          break;
        }

        // Try next body/button combination on component mismatch
        if (/button|component|parameter|expected|number of params/i.test(message)) {
          continue;
        }

        break;
      }

      if (
        lastError?.code === 190 ||
        /oauth|access token|authenticat|language|template name|does not exist|not found/i.test(
          String(lastError?.message || ''),
        )
      ) {
        break;
      }
    }

    if (
      lastError?.code === 190 ||
      /oauth|access token|authenticat/i.test(String(lastError?.message || ''))
    ) {
      break;
    }
  }

  const metaMessage =
    lastError?.error_user_msg ||
    lastError?.message ||
    'Unknown WhatsApp API error';

  console.error('[AccountCreated][WhatsApp] failed:', lastError);

  return {
    channel: 'whatsapp',
    delivered: false,
    error: metaMessage,
    meta: lastError,
  };
};
