import detect from '../../../../utils/lang_detect';

/**
 * 检测文本语言
 * @param {string} text - 要检测的文本
 * @param {Function} setDetectLanguage - 设置检测语言的函数
 * @returns {Promise<string>} - 检测到的语言
 */
export const detectLanguage = async (text, setDetectLanguage) => {
  const detected = await detect(text);
  setDetectLanguage(detected);
  return detected;
};

/**
 * 处理文本清理操作，如删除换行符
 * @param {string} text - 要处理的文本
 * @param {boolean} shouldDeleteNewline - 是否删除换行符
 * @returns {string} - 处理后的文本
 */
export const cleanText = (text, shouldDeleteNewline) => {
  if (!text) return '';

  let newText = text.trim();
  if (shouldDeleteNewline) {
    newText = newText.replace(/\-\s+/g, '').replace(/\s+/g, ' ');
  }
  return newText;
};

/**
 * 更新源文本并处理动态翻译
 * @param {string} text - 新的源文本
 * @param {Function} setDetectLanguage - 设置检测语言的函数
 * @param {Function} setSourceText - 设置源文本的函数
 * @param {Function} syncSourceText - 同步源文本的函数
 * @param {boolean} dynamicTranslate - 是否启用动态翻译
 * @returns {Function} - 清除定时器的函数
 */
export const updateSourceText = (
  text,
  setDetectLanguage,
  setSourceText,
  syncSourceText,
  dynamicTranslate
) => {
  let timer = null;

  const changeSourceText = async (newText) => {
    setDetectLanguage('');
    await setSourceText(newText);

    if (dynamicTranslate) {
      // 如果启用动态翻译，等待用户停止输入后自动翻译
      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(() => {
        detectLanguage(newText, setDetectLanguage).then(() => {
          syncSourceText();
        });
      }, 1000);
    }
  };

  return {
    changeSourceText,
    clearTimer: () => timer && clearTimeout(timer)
  };
};

export default {
  detectLanguage,
  cleanText,
  updateSourceText
};
