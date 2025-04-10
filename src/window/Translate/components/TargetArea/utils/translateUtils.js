import { nanoid } from 'nanoid';
import { writeText } from '@tauri-apps/api/clipboard';
import { sendNotification } from '@tauri-apps/api/notification';
import { invoke_plugin } from '../../../../../utils/invoke_plugin';
import { getServiceName, getServiceSouceType, whetherPluginService, ServiceSourceType } from '../../../../../utils/service_instance';
import { info } from 'tauri-plugin-log-api';
import Database from 'tauri-plugin-sql-api';

/**
 * Creates a function that can only be invoked once
 */
export function invokeOnce(fn) {
  let isInvoke = false;

  return (...args) => {
    if (isInvoke) {
      return;
    } else {
      fn(...args);
      isInvoke = true;
    }
  };
}

/**
 * Add translation to history database
 */
export const addToHistory = async (text, source, target, serviceInstanceKey, result) => {
  const db = await Database.load('sqlite:history.db');

  try {
    await db.execute(
      'INSERT into history (text, source, target, service, result, timestamp) VALUES ($1, $2, $3, $4, $5, $6)',
      [text, source, target, serviceInstanceKey, result, Date.now()]
    );
    db.close();
  } catch (e) {
    await db.execute(
      'CREATE TABLE history(id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL,source TEXT NOT NULL,target TEXT NOT NULL,service TEXT NOT NULL, result TEXT NOT NULL,timestamp INTEGER NOT NULL)'
    );
    db.close();
    await addToHistory(text, source, target, serviceInstanceKey, result);
  }
};

/**
 * Handle auto copy based on settings
 */
export const handleAutoCopy = (autoCopy, sourceText, result, hideWindow, t) => {
  switch (autoCopy) {
    case 'target':
      writeText(result).then(() => {
        if (hideWindow) {
          sendNotification({ title: t('common.write_clipboard'), body: result });
        }
      });
      break;
    case 'source_target':
      writeText(sourceText.trim() + '\n\n' + result).then(() => {
        if (hideWindow) {
          sendNotification({
            title: t('common.write_clipboard'),
            body: sourceText.trim() + '\n\n' + result,
          });
        }
      });
      break;
    default:
      break;
  }
};

/**
 * Handle plugin-based translation
 */
export const translateWithPlugin = async ({
  currentTranslateServiceInstanceKey,
  pluginList,
  sourceLanguage,
  targetLanguage,
  detectLanguage,
  translateSecondLanguage,
  sourceText,
  serviceInstanceConfigMap,
  setIsLoading,
  setHide,
  setResult,
  setError,
  index,
  historyDisable,
  autoCopy,
  hideWindow,
  clipboardMonitor,
  t
}) => {
  let id = nanoid();
  const translateID = [];
  translateID[index] = id;

  const translateServiceName = getServiceName(currentTranslateServiceInstanceKey);
  const pluginInfo = pluginList['translate'][translateServiceName];

  if (!(sourceLanguage in pluginInfo.language && targetLanguage in pluginInfo.language)) {
    setError('Language not supported');
    return;
  }

  let newTargetLanguage = targetLanguage;
  if (sourceLanguage === 'auto' && targetLanguage === detectLanguage) {
    newTargetLanguage = translateSecondLanguage;
  }

  setIsLoading(true);
  setHide(true);

  const instanceConfig = serviceInstanceConfigMap[currentTranslateServiceInstanceKey];
  instanceConfig['enable'] = 'true';

  const setHideOnce = invokeOnce(setHide);

  try {
    let [func, utils] = await invoke_plugin('translate', translateServiceName);

    func(sourceText.trim(), pluginInfo.language[sourceLanguage], pluginInfo.language[newTargetLanguage], {
      config: instanceConfig,
      detect: detectLanguage,
      setResult: (v) => {
        if (translateID[index] !== id) return;
        setResult(v);
        setHideOnce(false);
      },
      utils,
    }).then(
      (v) => {
        info(`[${currentTranslateServiceInstanceKey}]resolve:` + v);
        if (translateID[index] !== id) return;

        const formattedResult = typeof v === 'string' ? v.trim() : v;
        setResult(formattedResult);
        setIsLoading(false);

        if (v !== '') {
          setHideOnce(false);
        }

        if (!historyDisable) {
          addToHistory(
            sourceText.trim(),
            detectLanguage,
            newTargetLanguage,
            translateServiceName,
            formattedResult
          );
        }

        if (index === 0 && !clipboardMonitor) {
          handleAutoCopy(autoCopy, sourceText, v, hideWindow, t);
        }
      },
      (e) => {
        info(`[${currentTranslateServiceInstanceKey}]reject:` + e);
        if (translateID[index] !== id) return;
        setError(e.toString());
        setIsLoading(false);
      }
    );

    return id;
  } catch (error) {
    setError(error.toString());
    setIsLoading(false);
    return id;
  }
};

/**
 * Handle built-in translation service
 */
export const translateWithBuiltin = async ({
  currentTranslateServiceInstanceKey,
  builtinServices,
  sourceLanguage,
  targetLanguage,
  detectLanguage,
  translateSecondLanguage,
  sourceText,
  serviceInstanceConfigMap,
  setIsLoading,
  setHide,
  setResult,
  setError,
  index,
  historyDisable,
  autoCopy,
  hideWindow,
  clipboardMonitor,
  t
}) => {
  let id = nanoid();
  const translateID = [];
  translateID[index] = id;

  const translateServiceName = getServiceName(currentTranslateServiceInstanceKey);
  const LanguageEnum = builtinServices[translateServiceName].Language;

  if (!(sourceLanguage in LanguageEnum && targetLanguage in LanguageEnum)) {
    setError('Language not supported');
    return;
  }

  let newTargetLanguage = targetLanguage;
  if (sourceLanguage === 'auto' && targetLanguage === detectLanguage) {
    newTargetLanguage = translateSecondLanguage;
  }

  setIsLoading(true);
  setHide(true);

  const instanceConfig = serviceInstanceConfigMap[currentTranslateServiceInstanceKey];
  const setHideOnce = invokeOnce(setHide);

  try {
    builtinServices[translateServiceName]
      .translate(sourceText.trim(), LanguageEnum[sourceLanguage], LanguageEnum[newTargetLanguage], {
        config: instanceConfig,
        detect: detectLanguage,
        setResult: (v) => {
          if (translateID[index] !== id) return;
          setResult(v);
          setHideOnce(false);
        },
      })
      .then(
        (v) => {
          info(`[${currentTranslateServiceInstanceKey}]resolve:` + v);
          if (translateID[index] !== id) return;

          const formattedResult = typeof v === 'string' ? v.trim() : v;
          setResult(formattedResult);
          setIsLoading(false);

          if (v !== '') {
            setHideOnce(false);
          }

          if (!historyDisable) {
            addToHistory(
              sourceText.trim(),
              detectLanguage,
              newTargetLanguage,
              translateServiceName,
              formattedResult
            );
          }

          if (index === 0 && !clipboardMonitor) {
            handleAutoCopy(autoCopy, sourceText, v, hideWindow, t);
          }
        },
        (e) => {
          info(`[${currentTranslateServiceInstanceKey}]reject:` + e);
          if (translateID[index] !== id) return;
          setError(e.toString());
          setIsLoading(false);
        }
      );

    return id;
  } catch (error) {
    setError(error.toString());
    setIsLoading(false);
    return id;
  }
};

/**
 * Handle collection service
 */
export const handleCollectionService = async ({
  collectionServiceInstanceName,
  sourceText,
  result,
  serviceInstanceConfigMap,
  pluginList,
  builtinCollectionServices,
  toastStyle,
  t
}) => {
  try {
    if (getServiceSouceType(collectionServiceInstanceName) === ServiceSourceType.PLUGIN) {
      const pluginConfig = serviceInstanceConfigMap[collectionServiceInstanceName];
      let [func, utils] = await invoke_plugin(
        'collection',
        getServiceName(collectionServiceInstanceName)
      );

      await func(sourceText.trim(), result.toString(), {
        config: pluginConfig,
        utils,
      });

    } else {
      const instanceConfig = serviceInstanceConfigMap[collectionServiceInstanceName];
      await builtinCollectionServices[getServiceName(collectionServiceInstanceName)]
        .collection(sourceText, result, {
          config: instanceConfig,
        });
    }

    return true;
  } catch (e) {
    return Promise.reject(e);
  }
};
