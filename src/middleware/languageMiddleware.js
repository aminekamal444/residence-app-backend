const translator = require('../utils/translator');
const logger = require('../utils/logger');

const languageMiddleware = (req, res, next) => {
  try {
    // Get language from (in order of priority):
    // 1. Query param: ?lang=fr or ?language=ar
    // 2. Body: { language: 'en' }
    // 3. Cookie: language=fr
    // 4. Header: Accept-Language: en-US
    // 5. Default: 'en'

    const queryLang = req.query.lang || req.query.language;
    const bodyLang = req.body?.language;
    const cookieLang = req.cookies?.language;
    const headerLang = req.headers['accept-language']?.split(',')[0]?.split('-')[0];

    const language = queryLang || bodyLang || cookieLang || headerLang || 'en';

    // Validate language is supported
    if (!translator.isSupported(language)) {
      logger.debug(`Language "${language}" not supported. Using default "en"`);
      req.language = 'en';
    } else {
      req.language = language;
    }

    // Create translation function for easy use in controllers/services
    req.t = (key, variables = {}) => translator.t(key, req.language, variables);

    // Add language info to response headers
    res.setHeader('Content-Language', req.language);

    next();
  } catch (error) {
    logger.error('Language middleware error:', error);
    // Fallback to English on error
    req.language = 'en';
    req.t = (key, variables = {}) => translator.t(key, 'en', variables);
    next();
  }
};

module.exports = languageMiddleware;